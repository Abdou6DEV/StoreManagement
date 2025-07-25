import { prisma } from "./prismaClient";

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

export async function getAllSales() {
  const sales = await prisma.sale.findMany({
    include: {
      client: true,
      saleItems: {
        include: {
          product: true,
        },
      },
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return sales.map((sale) => {
    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalWithDiscount = totalAmount - sale.discount;

    // If no payments recorded, it was paid in cash
    const totalPaid =
      sale.payments.length > 0
        ? sale.payments.reduce(
            (sum, payment) => sum + (payment.paidAmount || 0),
            0,
          )
        : totalWithDiscount; // Cash payment - full amount paid

    const totalItems = sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      ...sale,
      totalAmount,
      totalWithDiscount,
      totalPaid,
      totalItems,
      remainingAmount: totalWithDiscount - totalPaid,
      isPaidInCash: sale.payments.length === 0,
    };
  });
}
