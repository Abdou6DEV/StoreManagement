import { prisma } from "./prismaClient";
import { findOrCreateManualProduct } from "./manualProducts";
import { findOrCreateService } from "./services";
import { getPurchasesByDateRange } from "./purchases";

export async function createSale(data: {
  clientId?: string;
  items: {
    productId?: string;
    quantity: number;
    price: number;
    manualProductName?: string;
    manualProductType?: string;
    manualProductCostPrice?: number;
    serviceName?: string;
    serviceDescription?: string;
    serviceCostPrice?: number;
  }[];
  discount?: number;
}) {
  // Basic validation
  if (data.discount && data.discount < 0) {
    throw new Error("Discount cannot be negative");
  }

  for (const item of data.items) {
    if (item.quantity <= 0) {
      throw new Error("Item quantity must be greater than 0");
    }
    if (item.price < 0) {
      throw new Error("Item price cannot be negative");
    }
  }

  // Pre-process items to create/find manual products and services outside the transaction
  const processedItems = await Promise.all(
    data.items.map(async (item) => {
      let manualProductId = null;
      let serviceId = null;

      if (item.manualProductName && item.manualProductType) {
        const manualProduct = await findOrCreateManualProduct({
          name: item.manualProductName,
          type: item.manualProductType,
          costPrice: item.manualProductCostPrice,
        });
        manualProductId = manualProduct.id;
      }

      if (item.serviceName) {
        const service = await findOrCreateService({
          name: item.serviceName,
          description: item.serviceDescription,
          costPrice: item.serviceCostPrice,
        });
        serviceId = service.id;
      }

      return {
        ...item,
        manualProductId,
        serviceId,
      };
    })
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
          create: await Promise.all(
            processedItems.map(async (item) => {
              let boughtPrice = null;

              // Get the current bought price for regular products
              if (item.productId) {
                const product = await tx.product.findUnique({
                  where: { id: item.productId },
                  select: { boughtPrice: true },
                });
                boughtPrice = product?.boughtPrice || null;
              }

              return {
                productId: item.productId || null,
                manualProductId: item.manualProductId,
                serviceId: item.serviceId,
                quantity: item.quantity,
                price: item.price,
                boughtPrice: boughtPrice,
              };
            })
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
      manualProductCostPrice?: number;
      serviceName?: string;
      serviceDescription?: string;
      serviceCostPrice?: number;
    }[];
    discount?: number;
  }
) {
  // Basic validation
  if (data.discount && data.discount < 0) {
    throw new Error("Discount cannot be negative");
  }

  for (const item of data.items) {
    if (item.quantity <= 0) {
      throw new Error("Item quantity must be greater than 0");
    }
    if (item.price < 0) {
      throw new Error("Item price cannot be negative");
    }
  }

  // Pre-process items to create/find manual products and services outside the transaction
  const processedItems = await Promise.all(
    data.items.map(async (item) => {
      let manualProductId = null;
      let serviceId = null;

      if (item.manualProductName && item.manualProductType) {
        const manualProduct = await findOrCreateManualProduct({
          name: item.manualProductName,
          type: item.manualProductType,
          costPrice: item.manualProductCostPrice,
        });
        manualProductId = manualProduct.id;
      }

      if (item.serviceName) {
        const service = await findOrCreateService({
          name: item.serviceName,
          description: item.serviceDescription,
          costPrice: item.serviceCostPrice,
        });
        serviceId = service.id;
      }

      return {
        ...item,
        manualProductId,
        serviceId,
      };
    })
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
            create: await Promise.all(
              processedItems.map(async (item) => {
                let boughtPrice = null;

                // Get the current bought price for regular products
                if (item.productId) {
                  const product = await tx.product.findUnique({
                    where: { id: item.productId },
                    select: { boughtPrice: true },
                  });
                  boughtPrice = product?.boughtPrice || null;
                }

                return {
                  productId: item.productId || null,
                  manualProductId: item.manualProductId,
                  serviceId: item.serviceId,
                  quantity: item.quantity,
                  price: item.price,
                  boughtPrice: boughtPrice,
                };
              })
            ),
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
        0
      );

      const totalAmountWithDiscount = totalAmount - updatedSale.discount;

      const paidAmount = updatedSale.payment
        ? updatedSale.payment.givenAmount || 0
        : totalAmountWithDiscount;

      const totalItems = updatedSale.saleItems.reduce(
        (sum, item) => sum + item.quantity,
        0
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
    }
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

  // Filter to exclude unpaid VERSEMENT sales only
  const filteredSales = sales.filter((sale) => {
    // Cash sales (no payment record) are always included
    if (!sale.payment) {
      return true;
    }

    // CREDIT sales are always included
    if (sale.payment.type === "CREDIT") {
      return true;
    }

    // VERSEMENT sales are only excluded if not paid
    return !(
      sale.payment.type === "VERSEMENT" && sale.payment.paidDate === null
    );
  });

  return filteredSales.map((sale) => {
    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalAmountWithDiscount = totalAmount - sale.discount;

    // If no payment recorded, it was paid in cash
    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount; // Cash payment - full amount paid

    const totalItems = sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0
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

  // Get total count first (for potential future use)
  // const totalCount = await prisma.sale.count({
  //   where: {
  //     createdAt: {
  //       gte: oneWeekAgo,
  //     },
  //   },
  // });

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

  // Filter to exclude unpaid VERSEMENT sales only
  const filteredSales = sales.filter((sale) => {
    // Cash sales (no payment record) are always included
    if (!sale.payment) {
      return true;
    }

    // CREDIT sales are always included
    if (sale.payment.type === "CREDIT") {
      return true;
    }

    // VERSEMENT sales are only excluded if not paid
    return !(
      sale.payment.type === "VERSEMENT" && sale.payment.paidDate === null
    );
  });

  const salesWithTotals = filteredSales.map((sale) => {
    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalAmountWithDiscount = totalAmount - sale.discount;

    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount;

    const totalItems = sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0
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
    totalCount: filteredSales.length, // Update count to reflect filtered results
    hasMore: false, // Since we're filtering, pagination might not work as expected
  };
}

export async function getSalesAggregatedByPeriod(
  period: "day" | "month" | "year",
  startDate: Date,
  endDate: Date
) {
  // Fetch both sales and purchases data
  const [sales, purchases] = await Promise.all([
    prisma.sale.findMany({
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
        payment: {
          select: {
            id: true,
            givenAmount: true,
            type: true,
            paidDate: true,
          },
        },
      },
    }),
    getPurchasesByDateRange(startDate, endDate),
  ]);

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

  // Process sales data - only exclude unpaid VERSEMENT sales
  sales.forEach((sale) => {
    // Check if this is an unpaid VERSEMENT sale
    const isUnpaidVersement = (() => {
      // Cash sales (no payment record) are always included
      if (!sale.payment) {
        return false;
      }

      // CREDIT sales are always included
      if (sale.payment.type === "CREDIT") {
        return false;
      }

      // VERSEMENT sales are only excluded if not paid
      return (
        sale.payment.type === "VERSEMENT" && sale.payment.paidDate === null
      );
    })();

    // Skip unpaid VERSEMENT sales
    if (isUnpaidVersement) {
      return;
    }

    const saleDate = new Date(sale.createdAt);
    let periodKey: string;

    if (period === "day") {
      // Use local timezone to avoid UTC conversion issues
      const year = saleDate.getFullYear();
      const month = String(saleDate.getMonth() + 1).padStart(2, "0");
      const day = String(saleDate.getDate()).padStart(2, "0");
      periodKey = `${year}-${month}-${day}`;
    } else if (period === "month") {
      periodKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      periodKey = saleDate.getFullYear().toString();
    }

    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalAmountWithDiscount = totalAmount - sale.discount;

    // Calculate profit (revenue - cost)
    const totalCost = sale.saleItems.reduce((sum, item) => {
      if (item.product) {
        // Use stored bought price if available, otherwise use current product bought price
        const boughtPrice =
          (item as { boughtPrice?: number }).boughtPrice ||
          item.product.boughtPrice;
        return sum + boughtPrice * item.quantity;
      }
      if (
        item.manualProduct &&
        (item.manualProduct as { costPrice?: number }).costPrice
      ) {
        return (
          sum +
          (item.manualProduct as { costPrice: number }).costPrice *
            item.quantity
        );
      }
      if (item.service && (item.service as { costPrice?: number }).costPrice) {
        return (
          sum +
          (item.service as { costPrice: number }).costPrice * item.quantity
        );
      }
      // Fallback: if no cost price is available, assume 70% profit margin
      return sum + item.price * item.quantity * 0.3;
    }, 0);

    const profit = totalAmountWithDiscount - totalCost;

    const existing = groupedData.get(periodKey);
    if (existing) {
      existing.revenue += totalAmountWithDiscount;
      existing.profit += profit;
      existing.count += 1;
    } else {
      groupedData.set(periodKey, {
        period: periodKey,
        revenue: totalAmountWithDiscount,
        profit: profit,
        purchases: 0, // Will be set by purchase data
        count: 1,
      });
    }
  });

  // Process purchase data to count actual purchases
  purchases.forEach((purchase) => {
    const purchaseDate = new Date(purchase.createdAt);
    let periodKey: string;

    if (period === "day") {
      periodKey = purchaseDate.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (period === "month") {
      periodKey = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      periodKey = purchaseDate.getFullYear().toString();
    }

    const existing = groupedData.get(periodKey);
    if (existing) {
      existing.purchases += 1; // Count each purchase transaction
    } else {
      groupedData.set(periodKey, {
        period: periodKey,
        revenue: 0,
        profit: 0,
        purchases: 1, // Count each purchase transaction
        count: 0,
      });
    }
  });

  // Fill in missing periods with zero values
  const fillMissingPeriods = (data: Map<string, any>, start: Date, end: Date, period: "day" | "month" | "year") => {
    const filledData = new Map(data);
    const current = new Date(start);
    
    while (current <= end) {
      let periodKey: string;
      
      if (period === "day") {
        periodKey = current.toISOString().split("T")[0]; // YYYY-MM-DD
      } else if (period === "month") {
        periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
      } else {
        periodKey = current.getFullYear().toString();
      }
      
      if (!filledData.has(periodKey)) {
        filledData.set(periodKey, {
          period: periodKey,
          revenue: 0,
          profit: 0,
          purchases: 0,
          count: 0,
        });
      }
      
      // Move to next period
      if (period === "day") {
        current.setDate(current.getDate() + 1);
      } else if (period === "month") {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setFullYear(current.getFullYear() + 1);
      }
    }
    
    return filledData;
  };

  // Fill missing periods
  const filledData = fillMissingPeriods(groupedData, startDate, endDate, period);

  // Convert to array and sort by period
  const result = Array.from(filledData.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
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

  let totalRevenue = 0;
  let totalProfit = 0;
  let totalPurchases = 0;
  let totalSales = 0;

  sales.forEach((sale) => {
    // Check if this is an unpaid VERSEMENT sale
    const isUnpaidVersement = (() => {
      // Cash sales (no payment record) are always included
      if (!sale.payment) {
        return false;
      }

      // CREDIT sales are always included
      if (sale.payment.type === "CREDIT") {
        return false;
      }

      // VERSEMENT sales are only excluded if not paid
      return (
        sale.payment.type === "VERSEMENT" && sale.payment.paidDate === null
      );
    })();

    // Skip unpaid VERSEMENT sales
    if (isUnpaidVersement) {
      return;
    }

    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const totalAmountWithDiscount = totalAmount - sale.discount;

    // Calculate profit (revenue - cost)
    const totalCost = sale.saleItems.reduce((sum, item) => {
      if (item.product) {
        // Use stored bought price if available, otherwise use current product bought price
        const boughtPrice =
          (item as { boughtPrice?: number }).boughtPrice ||
          item.product.boughtPrice;
        return sum + boughtPrice * item.quantity;
      }
      if (
        item.manualProduct &&
        (item.manualProduct as { costPrice?: number }).costPrice
      ) {
        return (
          sum +
          (item.manualProduct as { costPrice: number }).costPrice *
            item.quantity
        );
      }
      if (item.service && (item.service as { costPrice?: number }).costPrice) {
        return (
          sum +
          (item.service as { costPrice: number }).costPrice * item.quantity
        );
      }
      // Fallback: if no cost price is available, assume 70% profit margin
      return sum + item.price * item.quantity * 0.3;
    }, 0);

    totalRevenue += totalAmountWithDiscount;
    totalProfit += totalAmountWithDiscount - totalCost;
    totalPurchases += sale.saleItems.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
    totalSales += 1;
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
  const sales = await prisma.sale.findMany({
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

  // Filter to exclude unpaid VERSEMENT sales only
  return sales.filter((sale) => {
    // Cash sales (no payment record) are always included
    if (!sale.payment) {
      return true;
    }

    // CREDIT sales are always included
    if (sale.payment.type === "CREDIT") {
      return true;
    }

    // VERSEMENT sales are only excluded if not paid
    return !(
      sale.payment.type === "VERSEMENT" && sale.payment.paidDate === null
    );
  });
}

export async function getSalesBySpecificPeriod(
  period: "day" | "month" | "year",
  periodValue: string
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
