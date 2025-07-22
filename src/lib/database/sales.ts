import { prisma } from "../prismaClient";

export async function createSale(data: {
  clientId?: string;
  items: { productId: string; quantity: number; price: number }[];
  discount?: number;
}) {
  return await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (product) {
        const newQty = Math.max(0, product.quantity - item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQty },
        });
      }
    }

    const sale = await tx.sale.create({
      data: {
        clientId: data.clientId,
        discount: data.discount ?? 0,
        saleItems: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
    });

    return sale;
  });
}

export async function getProductSalesCounts() {
  const sales = await prisma.saleItem.groupBy({
    by: ["productId"],
    _sum: { quantity: true },
  });

  return sales.map((s) => ({
    productId: s.productId,
    totalSold: s._sum.quantity || 0,
  }));
}
