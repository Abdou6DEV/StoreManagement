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

export async function updateSale(
  saleId: string,
  data: {
    clientId?: string;
    items: { productId: string; quantity: number; price: number }[];
    discount?: number;
  },
) {
  return await prisma.$transaction(async (tx) => {
    // Get the original sale with items
    const originalSale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { saleItems: true },
    });

    if (!originalSale) {
      throw new Error("Sale not found");
    }

    // Restore original quantities to products
    for (const item of originalSale.saleItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (product) {
        const newQty = product.quantity + item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQty },
        });
      }
    }

    // Remove old sale items
    await tx.saleItem.deleteMany({
      where: { saleId },
    });

    // Update quantities for new items
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

    // Update the sale
    const updatedSale = await tx.sale.update({
      where: { id: saleId },
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
      include: {
        client: true,
        saleItems: {
          include: {
            product: true,
          },
        },
        payment: true,
      },
    });

    // Calculate totals
    const totalAmount = updatedSale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const totalWithDiscount = totalAmount - updatedSale.discount;

    const totalPaid = updatedSale.payment
      ? updatedSale.payment.givenAmount || 0
      : totalWithDiscount;

    const totalItems = updatedSale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      ...updatedSale,
      totalAmount,
      totalWithDiscount,
      totalPaid,
      totalItems,
      remainingAmount: totalWithDiscount - totalPaid,
      isPaidInCash: !updatedSale.payment,
    };
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
      payment: true,
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

    // If no payment recorded, it was paid in cash
    const totalPaid = sale.payment
      ? sale.payment.givenAmount || 0
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
      isPaidInCash: !sale.payment,
    };
  });
}
