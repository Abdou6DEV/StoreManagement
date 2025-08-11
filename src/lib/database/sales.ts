import { prisma } from "./prismaClient";
import { findOrCreateManualProduct } from "./manualProducts";
import { findOrCreateService } from "./services";

export async function createSale(data: {
  clientId?: string;
  items: {
    productId?: string;
    quantity: number;
    price: number;
    manualProductName?: string;
    manualProductType?: string;
    serviceName?: string;
    serviceDescription?: string;
  }[];
  discount?: number;
}) {
  // Pre-process items to create/find manual products and services outside the transaction
  const processedItems = await Promise.all(
    data.items.map(async (item) => {
      let manualProductId = null;
      let serviceId = null;

      if (item.manualProductName && item.manualProductType) {
        const manualProduct = await findOrCreateManualProduct({
          name: item.manualProductName,
          type: item.manualProductType,
        });
        manualProductId = manualProduct.id;
      }

      if (item.serviceName) {
        const service = await findOrCreateService({
          name: item.serviceName,
          description: item.serviceDescription,
        });
        serviceId = service.id;
      }

      return {
        ...item,
        manualProductId,
        serviceId,
      };
    }),
  );

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
          create: processedItems.map((item) => ({
            productId: item.productId || null,
            manualProductId: item.manualProductId,
            serviceId: item.serviceId,
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
    items: {
      productId?: string;
      quantity: number;
      price: number;
      manualProductName?: string;
      manualProductType?: string;
      serviceName?: string;
      serviceDescription?: string;
    }[];
    discount?: number;
  },
) {
  // Pre-process items to create/find manual products and services outside the transaction
  const processedItems = await Promise.all(
    data.items.map(async (item) => {
      let manualProductId = null;
      let serviceId = null;

      if (item.manualProductName && item.manualProductType) {
        const manualProduct = await findOrCreateManualProduct({
          name: item.manualProductName,
          type: item.manualProductType,
        });
        manualProductId = manualProduct.id;
      }

      if (item.serviceName) {
        const service = await findOrCreateService({
          name: item.serviceName,
          description: item.serviceDescription,
        });
        serviceId = service.id;
      }

      return {
        ...item,
        manualProductId,
        serviceId,
      };
    }),
  );

  return await prisma.$transaction(
    async (tx) => {
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
            create: processedItems.map((item) => ({
              productId: item.productId || null,
              manualProductId: item.manualProductId,
              serviceId: item.serviceId,
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
              manualProduct: true,
              service: true,
            },
          },
          payment: {
            select: {
              id: true,
              givenAmount: true,
              type: true,
              paidDate: true,
            },
          },
        },
      });

      // Calculate totals
      const totalAmount = updatedSale.saleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );

      const totalAmountWithDiscount = totalAmount - updatedSale.discount;

      const paidAmount = updatedSale.payment
        ? updatedSale.payment.givenAmount || 0
        : totalAmountWithDiscount;

      const totalItems = updatedSale.saleItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      return {
        ...updatedSale,
        totalAmount,
        totalAmountWithDiscount,
        paidAmount,
        remainingAmount: totalAmountWithDiscount - paidAmount,
        totalItems,
        isPaidInCash: !updatedSale.payment,
      };
    },
    {
      timeout: 10000, // 10 seconds timeout
    },
  );
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
          service: true,
        },
      },
      payment: {
        select: {
          id: true,
          givenAmount: true,
          type: true,
          paidDate: true,
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
    const totalAmountWithDiscount = totalAmount - sale.discount;

    // If no payment recorded, it was paid in cash
    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount; // Cash payment - full amount paid

    const totalItems = sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      ...sale,
      totalAmount,
      totalAmountWithDiscount,
      paidAmount,
      remainingAmount: totalAmountWithDiscount - paidAmount,
      totalItems,
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
          service: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      },
      payment: {
        select: {
          id: true,
          givenAmount: true,
          type: true,
          paidDate: true,
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
    const totalAmountWithDiscount = totalAmount - sale.discount;

    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount;

    const totalItems = sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return {
      ...sale,
      totalAmount,
      totalAmountWithDiscount,
      paidAmount,
      remainingAmount: totalAmountWithDiscount - paidAmount,
      totalItems,
      isPaidInCash: !sale.payment,
    };
  });

  return {
    sales: salesWithTotals,
    totalCount,
    hasMore: offset + limit < totalCount,
  };
}

export async function getSalesAggregatedByPeriod(
  period: "day" | "month" | "year",
  startDate: Date,
  endDate: Date,
) {
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      saleItems: {
        include: {
          product: true,
          manualProduct: true,
          service: true,
        },
      },
    },
  });

  // Group sales by period
  const groupedData = new Map<
    string,
    {
      period: string;
      revenue: number;
      profit: number;
      purchases: number;
      count: number;
    }
  >();

  sales.forEach((sale) => {
    const saleDate = new Date(sale.createdAt);
    let periodKey: string;

    if (period === "day") {
      periodKey = saleDate.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (period === "month") {
      periodKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      periodKey = saleDate.getFullYear().toString();
    }

    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalAmountWithDiscount = totalAmount - sale.discount;

    // Calculate profit (revenue - cost)
    const totalCost = sale.saleItems.reduce((sum, item) => {
      if (item.product) {
        return sum + item.product.boughtPrice * item.quantity;
      }
      // For manual products and services, assume 70% profit margin
      return sum + item.price * item.quantity * 0.3;
    }, 0);

    const profit = totalAmountWithDiscount - totalCost;

    const existing = groupedData.get(periodKey);
    if (existing) {
      existing.revenue += totalAmountWithDiscount;
      existing.profit += profit;
      existing.purchases += sale.saleItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      existing.count += 1;
    } else {
      groupedData.set(periodKey, {
        period: periodKey,
        revenue: totalAmountWithDiscount,
        profit: profit,
        purchases: sale.saleItems.reduce((sum, item) => sum + item.quantity, 0),
        count: 1,
      });
    }
  });

  // Convert to array and sort by period
  const result = Array.from(groupedData.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  );

  return result;
}

export async function getSalesSummary(startDate: Date, endDate: Date) {
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      saleItems: {
        include: {
          product: true,
          manualProduct: true,
          service: true,
        },
      },
    },
  });

  let totalRevenue = 0;
  let totalProfit = 0;
  let totalPurchases = 0;
  const totalSales = sales.length;

  sales.forEach((sale) => {
    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const totalAmountWithDiscount = totalAmount - sale.discount;

    // Calculate profit (revenue - cost)
    const totalCost = sale.saleItems.reduce((sum, item) => {
      if (item.product) {
        return sum + item.product.boughtPrice * item.quantity;
      }
      // For manual products and services, assume 70% profit margin
      return sum + item.price * item.quantity * 0.3;
    }, 0);

    totalRevenue += totalAmountWithDiscount;
    totalProfit += totalAmountWithDiscount - totalCost;
    totalPurchases += sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
  });

  return {
    totalRevenue,
    totalProfit,
    totalPurchases,
    totalSales,
    averageRevenue: totalSales > 0 ? totalRevenue / totalSales : 0,
    averageProfit: totalSales > 0 ? totalProfit / totalSales : 0,
  };
}

export async function getSalesByDateRange(startDate: Date, endDate: Date) {
  return await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      client: true,
      saleItems: {
        include: {
          product: true,
          manualProduct: true,
          service: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getSalesBySpecificPeriod(
  period: "day" | "month" | "year",
  periodValue: string,
) {
  let startDate: Date;
  let endDate: Date;

  if (period === "day") {
    // periodValue is in format "YYYY-MM-DD"
    startDate = new Date(periodValue);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(periodValue);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    // periodValue is in format "YYYY-MM"
    const [year, month] = periodValue.split("-");
    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(parseInt(year), parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // periodValue is in format "YYYY"
    const year = parseInt(periodValue);
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);
  }

  return await getSalesByDateRange(startDate, endDate);
}
