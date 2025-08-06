import { prisma } from "./prismaClient";
import { findOrCreateManualProduct } from "./manualProducts";

export async function createSale(data: {
  clientId?: string;
  items: {
    productId?: string;
    quantity: number;
    price: number;
    manualProductName?: string;
    manualProductType?: string;
  }[];
  discount?: number;
}) {
  return await prisma.$transaction(async (tx) => {
    for (const item of data.items) {
      // Only update product quantity if it's a regular product (has productId)
      if (item.productId) {
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
    }

    const sale = await tx.sale.create({
      data: {
        clientId: data.clientId,
        discount: data.discount ?? 0,
        saleItems: {
          create: await Promise.all(
            data.items.map(async (item) => {
              let manualProductId = null;

              if (item.manualProductName && item.manualProductType) {
                const manualProduct = await findOrCreateManualProduct({
                  name: item.manualProductName,
                  type: item.manualProductType,
                });
                manualProductId = manualProduct.id;
              }

              return {
                productId: item.productId || null,
                manualProductId,
                quantity: item.quantity,
                price: item.price,
              };
            }),
          ),
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
    items: {
      productId?: string;
      quantity: number;
      price: number;
      manualProductName?: string;
      manualProductType?: string;
    }[];
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

    // Restore original quantities to products (only for regular products)
    for (const item of originalSale.saleItems) {
      if (item.productId) {
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
    }

    // Remove old sale items
    await tx.saleItem.deleteMany({
      where: { saleId },
    });

    // Update quantities for new items (only for regular products)
    for (const item of data.items) {
      if (item.productId) {
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
    }

    // Update the sale
    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: {
        clientId: data.clientId,
        discount: data.discount ?? 0,
        saleItems: {
          create: await Promise.all(
            data.items.map(async (item) => {
              let manualProductId = null;

              if (item.manualProductName && item.manualProductType) {
                const manualProduct = await findOrCreateManualProduct({
                  name: item.manualProductName,
                  type: item.manualProductType,
                });
                manualProductId = manualProduct.id;
              }

              return {
                productId: item.productId || null,
                manualProductId,
                quantity: item.quantity,
                price: item.price,
              };
            }),
          ),
        },
      },
      include: {
        client: true,
        saleItems: {
          include: {
            product: true,
            manualProduct: true,
          },
        },
        payment: {
          select: {
            id: true,
            givenAmount: true,
            type: true,
          },
        },
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

export async function deleteSale(saleId: string) {
  return await prisma.$transaction(async (tx) => {
    // Get the sale with items
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { saleItems: true },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    // Restore quantities to products (only for regular products)
    for (const item of sale.saleItems) {
      if (item.productId) {
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
    }

    // Delete associated payment if exists
    await tx.payment.deleteMany({
      where: { saleId },
    });

    // Delete sale items
    await tx.saleItem.deleteMany({
      where: { saleId },
    });

    // Delete the sale
    await tx.sale.delete({
      where: { id: saleId },
    });

    return { success: true };
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
          manualProduct: true,
        },
      },
      payment: {
        select: {
          id: true,
          givenAmount: true,
          type: true,
        },
      },
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

export async function getRecentSales(limit = 50, offset = 0) {
  // Calculate date filter - last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  oneWeekAgo.setHours(0, 0, 0, 0);

  // Get total count first
  const totalCount = await prisma.sale.count({
    where: {
      createdAt: {
        gte: oneWeekAgo,
      },
    },
  });

  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: oneWeekAgo,
      },
    },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      saleItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          manualProduct: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          givenAmount: true,
          type: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  const salesWithTotals = sales.map((sale) => {
    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalWithDiscount = totalAmount - sale.discount;

    const totalPaid = sale.payment
      ? sale.payment.givenAmount || 0
      : totalWithDiscount;

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

  return {
    sales: salesWithTotals,
    totalCount,
    hasMore: offset + limit < totalCount,
  };
}
