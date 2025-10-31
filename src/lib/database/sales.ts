import { prisma } from "./prismaClient";
import { findOrCreateManualProduct } from "./manualProducts";
import { findOrCreateService } from "./services";

// Helper function to clean up orphaned services created from ServiceAppointments
async function cleanupOrphanedServices(tx: any, saleItems: any[], saleId: string) {
  for (const item of saleItems) {
    if (item.service && item.service.serviceAppointmentId) {
      // Check if this service is used in any other sales
      const otherSalesCount = await tx.saleItem.count({
        where: {
          serviceId: item.service.id,
          saleId: { not: saleId }
        }
      });

      // If no other sales use this service, delete it
      if (otherSalesCount === 0) {
        await tx.service.delete({
          where: { id: item.service.id }
        });
      }
    }
  }
}
import { getPurchasesByDateRange } from "./purchases";

// Maximum value for INT column in SQLite (2^31 - 1)
const MAX_PRICE = 2147483647;

export async function createSale(data: {
  clientId?: string;
  items: {
    productId?: string;
    quantity: number;
    price: number;
    boughtPrice?: number; // Add boughtPrice for products
    manualProductName?: string;
    manualProductType?: string;
    manualProductCostPrice?: number;
    serviceName?: string;
    serviceDescription?: string;
    serviceCostPrice?: number;
    serviceAppointmentId?: string; // Add serviceAppointmentId for proper ID tracking
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
    if (item.price > MAX_PRICE) {
      throw new Error(`Item price cannot exceed ${MAX_PRICE.toLocaleString()}`);
    }
    if (item.manualProductCostPrice && item.manualProductCostPrice > MAX_PRICE) {
      throw new Error(`Manual product cost price cannot exceed ${MAX_PRICE.toLocaleString()}`);
    }
    if (item.serviceCostPrice && item.serviceCostPrice > MAX_PRICE) {
      throw new Error(`Service cost price cannot exceed ${MAX_PRICE.toLocaleString()}`);
    }
  }

  // Pre-process items to create/find manual products and services outside the transaction
  // Batch process manual products and services for better performance
  const manualProductKeys = new Set<string>();
  const serviceKeys = new Set<string>();
  
  // Collect unique manual products and services
  data.items.forEach(item => {
    if (item.manualProductName && item.manualProductType) {
      manualProductKeys.add(`${item.manualProductName}|${item.manualProductType}`);
    }
    if (item.serviceName) {
      serviceKeys.add(item.serviceName);
    }
  });

  // Only process manual products and services if they exist
  const manualProductMap = new Map<string, string>();
  const serviceMap = new Map<string, string>();

  // Process manual products only if needed
  if (manualProductKeys.size > 0) {
    // Find existing manual products
    const existingManualProducts = await prisma.manualProduct.findMany({
      where: {
        OR: Array.from(manualProductKeys).map(key => {
          const [name, type] = key.split('|');
          return { name, type };
        })
      }
    });
    
    // Map existing products
    existingManualProducts.forEach(product => {
      const key = `${product.name}|${product.type}`;
      manualProductMap.set(key, product.id);
    });
    
    // Create missing manual products
    const missingKeys = Array.from(manualProductKeys).filter(key => 
      !manualProductMap.has(key)
    );
    
    if (missingKeys.length > 0) {
      await prisma.manualProduct.createMany({
        data: missingKeys.map(key => {
          const [name, type] = key.split('|');
          return { name, type, costPrice: 0 };
        })
      });
      
      // Fetch the created products to get their IDs
      const createdProducts = await prisma.manualProduct.findMany({
        where: {
          OR: missingKeys.map(key => {
            const [name, type] = key.split('|');
            return { name, type };
          })
        }
      });
      
      createdProducts.forEach(product => {
        const key = `${product.name}|${product.type}`;
        manualProductMap.set(key, product.id);
      });
    }
  }

  // Process services using findOrCreateService to ensure proper serviceAppointmentId tracking
  if (serviceKeys.size > 0) {
    // Process each service individually to ensure proper serviceAppointmentId handling
    for (const serviceName of serviceKeys) {
      const items = data.items.filter(i => i.serviceName === serviceName);
      for (const item of items) {
        const service = await findOrCreateService({
          name: serviceName,
          description: item.serviceDescription,
          costPrice: item.serviceCostPrice,
          serviceAppointmentId: item.serviceAppointmentId,
        });
        // Use a unique key that includes serviceAppointmentId to avoid conflicts
        const uniqueKey = item.serviceAppointmentId 
          ? `${serviceName}-${item.serviceAppointmentId}` 
          : serviceName;
        serviceMap.set(uniqueKey, service.id);
      }
    }
  }

  // Process items with pre-created IDs
  const processedItems = data.items.map(item => {
    let manualProductId = null;
    let serviceId = null;

    if (item.manualProductName && item.manualProductType) {
      const key = `${item.manualProductName}|${item.manualProductType}`;
      manualProductId = manualProductMap.get(key) || null;
    }

    if (item.serviceName) {
      // Use the same unique key logic to retrieve the service ID
      const uniqueKey = item.serviceAppointmentId 
        ? `${item.serviceName}-${item.serviceAppointmentId}` 
        : item.serviceName;
      serviceId = serviceMap.get(uniqueKey) || null;
    }

    return {
      ...item,
      manualProductId,
      serviceId,
    };
  });

  return await prisma.$transaction(async (tx) => {
    // Optimized: Batch fetch all products at once and update quantities
    const productIds = processedItems
      .filter(item => item.productId)
      .map(item => item.productId as string);
    
    // Fetch all products in a single query
    const products = productIds.length > 0
      ? await tx.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, quantity: true, boughtPrice: true }
        })
      : [];
    
    // Create a map for quick lookup
    const productMap = new Map(products.map(p => [p.id, p]));
    
    // Update product quantities only if there are products
    if (products.length > 0) {
      // Group quantity changes by product ID
      const quantityChanges = new Map<string, number>();
      processedItems
        .filter(item => item.productId)
        .forEach(item => {
          const productId = item.productId as string;
          const currentChange = quantityChanges.get(productId) || 0;
          quantityChanges.set(productId, currentChange - item.quantity);
        });

      // Execute updates using raw SQL for better performance
      if (quantityChanges.size > 0) {
        for (const [productId, quantityChange] of quantityChanges) {
          await tx.$executeRaw`
            UPDATE "Product" 
            SET quantity = MAX(0, quantity - ${Math.abs(quantityChange)})
            WHERE id = ${productId}
          `;
        }
      }
    }

    // Calculate totals for performance
    const totalAmount = processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalAmountWithDiscount = totalAmount - (data.discount ?? 0);
    const totalItems = processedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    // Calculate total cost and profit
    const totalCost = processedItems.reduce((sum, item) => {
      let boughtPrice = 0;
      
      if (item.productId && item.boughtPrice !== undefined) {
        boughtPrice = item.boughtPrice;
      } else if (item.manualProductId && item.manualProductCostPrice !== undefined) {
        boughtPrice = item.manualProductCostPrice;
      } else if (item.serviceId && item.serviceCostPrice !== undefined) {
        boughtPrice = item.serviceCostPrice;
      } else if (item.productId) {
        // Fallback: get boughtPrice from product map if not provided
        const product = productMap.get(item.productId);
        boughtPrice = product?.boughtPrice || 0;
      }
      
      return sum + (boughtPrice * item.quantity);
    }, 0);
    
    const totalProfit = totalAmountWithDiscount - totalCost;

    // Create sale with items and pre-calculated totals
    const sale = await tx.sale.create({
      data: {
        clientId: data.clientId,
        discount: data.discount ?? 0,
        totalAmount,
        totalAmountWithDiscount,
        totalItems,
        totalCost,
        totalProfit,
        saleItems: {
          create: processedItems.map((item) => {
            let boughtPrice = null;

            // Get bought price from the item data first, then fallback to product map
            if (item.productId) {
              if (item.boughtPrice !== undefined) {
                // Use the boughtPrice from the cart item (captured at time of adding to cart)
                boughtPrice = item.boughtPrice;
              } else {
                // Fallback to current product boughtPrice (for backward compatibility)
                const product = productMap.get(item.productId);
                boughtPrice = product?.boughtPrice || null;
              }
            }
            
            // For manual products, use the cost price from the sale data
            if (item.manualProductId && item.manualProductCostPrice !== undefined) {
              boughtPrice = item.manualProductCostPrice;
            }
            
            // For services, use the cost price from the sale data
            if (item.serviceId && item.serviceCostPrice !== undefined) {
              boughtPrice = item.serviceCostPrice;
            }

            return {
              productId: item.productId || null,
              manualProductId: item.manualProductId,
              serviceId: item.serviceId,
              quantity: item.quantity,
              price: item.price,
              boughtPrice: boughtPrice,
            };
          }),
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
      boughtPrice?: number; // Add boughtPrice for products
      manualProductName?: string;
      manualProductType?: string;
      manualProductCostPrice?: number;
      serviceName?: string;
      serviceDescription?: string;
      serviceCostPrice?: number;
      serviceAppointmentId?: string; // Add serviceAppointmentId for proper ID tracking
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
    if (item.price > MAX_PRICE) {
      throw new Error(`Item price cannot exceed ${MAX_PRICE.toLocaleString()}`);
    }
    if (item.manualProductCostPrice && item.manualProductCostPrice > MAX_PRICE) {
      throw new Error(`Manual product cost price cannot exceed ${MAX_PRICE.toLocaleString()}`);
    }
    if (item.serviceCostPrice && item.serviceCostPrice > MAX_PRICE) {
      throw new Error(`Service cost price cannot exceed ${MAX_PRICE.toLocaleString()}`);
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
          serviceAppointmentId: item.serviceAppointmentId, // Pass the ServiceAppointment ID
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
      // Get the original sale with items and services
      const originalSale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { 
          saleItems: {
            include: {
              service: true
            }
          }
        },
      });

      if (!originalSale) {
        throw new Error("Sale not found");
      }

      // Optimized: Batch fetch all affected products (old and new)
      const oldProductIds = originalSale.saleItems
        .filter(item => item.productId)
        .map(item => item.productId as string);
      
      const newProductIds = processedItems
        .filter(item => item.productId)
        .map(item => item.productId as string);
      
      const allProductIds = [...new Set([...oldProductIds, ...newProductIds])];
      
      // Fetch all products in a single query
      const products = allProductIds.length > 0
        ? await tx.product.findMany({
            where: { id: { in: allProductIds } },
            select: { id: true, quantity: true, boughtPrice: true }
          })
        : [];
      
      const productMap = new Map(products.map(p => [p.id, p]));
      
      // Restore original quantities in batch
      if (oldProductIds.length > 0) {
        await Promise.all(
          originalSale.saleItems
            .filter(item => item.productId)
            .map(item => {
              const productId = item.productId as string;
              const product = productMap.get(productId);
              if (product) {
                const newQty = product.quantity + item.quantity;
                return tx.product.update({
                  where: { id: productId },
                  data: { quantity: newQty },
                });
              }
              return Promise.resolve();
            })
        );
      }

      // Remove old sale items
      await tx.saleItem.deleteMany({
        where: { saleId },
      });

      // Update quantities for new items in batch
      if (newProductIds.length > 0) {
        await Promise.all(
          processedItems
            .filter(item => item.productId)
            .map(item => {
              const productId = item.productId as string;
              const product = productMap.get(productId);
              if (product) {
                const newQty = Math.max(0, product.quantity - item.quantity);
                return tx.product.update({
                  where: { id: productId },
                  data: { quantity: newQty },
                });
              }
              return Promise.resolve();
            })
        );
      }

      // Calculate totals for performance
      const totalAmount = processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const totalAmountWithDiscount = totalAmount - (data.discount ?? 0);
      const totalItems = processedItems.reduce((sum, item) => sum + item.quantity, 0);
      
      // Calculate total cost and profit
      const totalCost = processedItems.reduce((sum, item) => {
        let boughtPrice = 0;
        
        if (item.productId && item.boughtPrice !== undefined) {
          boughtPrice = item.boughtPrice;
        } else if (item.manualProductId && item.manualProductCostPrice !== undefined) {
          boughtPrice = item.manualProductCostPrice;
        } else if (item.serviceId && item.serviceCostPrice !== undefined) {
          boughtPrice = item.serviceCostPrice;
        } else if (item.productId) {
          // Fallback: get boughtPrice from product map if not provided
          const product = productMap.get(item.productId);
          boughtPrice = product?.boughtPrice || 0;
        }
        
        return sum + (boughtPrice * item.quantity);
      }, 0);
      
      const totalProfit = totalAmountWithDiscount - totalCost;

      // Get serviceIds that will be used in new items
      const newServiceIds = new Set(
        processedItems
          .filter(item => item.serviceId)
          .map(item => item.serviceId as string)
      );

      // Update the sale with pre-calculated totals
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          clientId: data.clientId,
          discount: data.discount ?? 0,
          totalAmount,
          totalAmountWithDiscount,
          totalItems,
          totalCost,
          totalProfit,
          saleItems: {
            create: processedItems.map((item) => {
              let boughtPrice = null;

              // Get bought price from the item data first, then fallback to product map
              if (item.productId) {
                if (item.boughtPrice !== undefined) {
                  // Use the boughtPrice from the item data (captured at time of adding to cart)
                  boughtPrice = item.boughtPrice;
                } else {
                  // Fallback to current product boughtPrice (for backward compatibility)
                  const product = productMap.get(item.productId);
                  boughtPrice = product?.boughtPrice || null;
                }
              }
              
              // For manual products, use the cost price from the sale data
              if (item.manualProductId && item.manualProductCostPrice !== undefined) {
                boughtPrice = item.manualProductCostPrice;
              }
              
              // For services, use the cost price from the sale data
              if (item.serviceId && item.serviceCostPrice !== undefined) {
                boughtPrice = item.serviceCostPrice;
              }

              return {
                productId: item.productId || null,
                manualProductId: item.manualProductId,
                serviceId: item.serviceId,
                quantity: item.quantity,
                price: item.price,
                boughtPrice: boughtPrice,
              };
            }),
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

      // Clean up orphaned services AFTER creating new items
      // Only clean up services from old items that are NOT being reused in new items
      const servicesToCleanup = originalSale.saleItems.filter(item => 
        item.service && 
        item.service.serviceAppointmentId && 
        !newServiceIds.has(item.service.id)
      );
      
      if (servicesToCleanup.length > 0) {
        await cleanupOrphanedServices(tx, servicesToCleanup, saleId);
      }

      // Use stored totals for performance
      const paidAmount = updatedSale.payment
        ? updatedSale.payment.givenAmount || 0
        : updatedSale.totalAmountWithDiscount;

      return {
        ...updatedSale,
        paidAmount,
        remainingAmount: updatedSale.totalAmountWithDiscount - paidAmount,
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
    // Get the sale with items and services
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { 
        saleItems: {
          include: {
            service: true
          }
        }
      },
    });

    if (!sale) {
      throw new Error("Sale not found");
    }

    // Optimized: Batch fetch all products and restore quantities
    const productIds = sale.saleItems
      .filter(item => item.productId)
      .map(item => item.productId as string);
    
    if (productIds.length > 0) {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, quantity: true }
      });
      
      const productMap = new Map(products.map(p => [p.id, p]));
      
      // Restore quantities in batch
      await Promise.all(
        sale.saleItems
          .filter(item => item.productId)
          .map(item => {
            const productId = item.productId as string;
            const product = productMap.get(productId);
            if (product) {
              const newQty = product.quantity + item.quantity;
              return tx.product.update({
                where: { id: productId },
                data: { quantity: newQty },
              });
            }
            return Promise.resolve();
          })
      );
    }

    // Delete associated payment if exists
    await tx.payment.deleteMany({
      where: { saleId },
    });

    // Delete sale items
    await tx.saleItem.deleteMany({
      where: { saleId },
    });

    // Clean up orphaned services
    await cleanupOrphanedServices(tx, sale.saleItems, saleId);

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
    // Use pre-calculated totals from database for performance
    const totalAmount = sale.totalAmount || 0;
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const totalItems = sale.totalItems || 0;

    // If no payment recorded, it was paid in cash
    // If payment exists, use the givenAmount (can be 0 for zero-payment credit)
    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount; // Cash payment - full amount paid

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

// ULTRA FAST: Lightweight version for dashboard - only pre-calculated totals
export async function getAllLight() {
  const sales = await prisma.sale.findMany({
    select: {
      id: true,
      clientId: true,
      totalAmount: true,
      totalAmountWithDiscount: true,
      totalItems: true,
      totalCost: true,
      totalProfit: true,
      discount: true,
      createdAt: true,
      updatedAt: true,
      client: {
        select: {
          id: true,
          name: true,
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
    // Use pre-calculated totals from database for performance
    const totalAmount = sale.totalAmount || 0;
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const totalItems = sale.totalItems || 0;

    // If no payment recorded, it was paid in cash
    // If payment exists, use the givenAmount (can be 0 for zero-payment credit)
    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount; // Cash payment - full amount paid

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

export async function getRecentSales(limit = 50, offset = 0, days = 7) {
  // Calculate date filter - configurable number of days
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of today
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0); // Start of the day 'days' ago
  
  console.log("getRecentSales called with days:", days, "Start date:", startDate, "End date:", endDate);

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
        gte: startDate,
        lte: endDate,
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
    // Use pre-calculated totals from database for performance
    const totalAmount = sale.totalAmount || 0;
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const totalItems = sale.totalItems || 0;

    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount;

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

  console.log(`Found ${salesWithTotals.length} sales in the last ${days} days`);
  if (salesWithTotals.length > 0) {
    console.log("Sample sale dates:", salesWithTotals.slice(0, 3).map(s => s.createdAt));
  }

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
  // Import bills module to get bills payments data
  const { bills } = await import("./bills");
  
  // ULTRA FAST: Only fetch pre-calculated totals - NO sale items, products, or services!
  const [sales, purchases, billsPayments] = await Promise.all([
    prisma.sale.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        totalAmountWithDiscount: true,
        totalProfit: true,
        totalItems: true,
        createdAt: true,
        payment: {
          select: {
            type: true,
            paidDate: true,
          },
        },
      },
    }),
    getPurchasesByDateRange(startDate, endDate),
    bills.getBillsPaymentsAggregatedByPeriod(period, startDate, endDate),
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
      billsPayments: number;
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

    // Use pre-calculated totals for performance
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const profit = sale.totalProfit || 0;
    
    

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
        billsPayments: 0, // Will be set by bills payments data
      });
    }
  });

  // Process purchase data to sum purchase amounts
  purchases.forEach((purchase) => {
    const purchaseDate = new Date(purchase.createdAt);
    let periodKey: string;

    if (period === "day") {
      // Use local timezone to match sales data processing
      const year = purchaseDate.getFullYear();
      const month = String(purchaseDate.getMonth() + 1).padStart(2, "0");
      const day = String(purchaseDate.getDate()).padStart(2, "0");
      periodKey = `${year}-${month}-${day}`;
    } else if (period === "month") {
      periodKey = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, "0")}`;
    } else {
      periodKey = purchaseDate.getFullYear().toString();
    }

    // Calculate total purchase amount from all items
    const totalPurchaseAmount = purchase.PurchaseItems.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    const existing = groupedData.get(periodKey);
    if (existing) {
      existing.purchases += totalPurchaseAmount; // Sum purchase amounts
    } else {
      groupedData.set(periodKey, {
        period: periodKey,
        revenue: 0,
        profit: 0,
        purchases: totalPurchaseAmount, // Sum purchase amounts
        count: 0,
        billsPayments: 0, // Will be set by bills payments data
      });
    }
  });

  // Process bills payments data
  billsPayments.forEach((billsData) => {
    const existing = groupedData.get(billsData.period);
    if (existing) {
      existing.billsPayments += billsData.totalAmount;
    } else {
      groupedData.set(billsData.period, {
        period: billsData.period,
        revenue: 0,
        profit: 0,
        purchases: 0,
        count: 0,
        billsPayments: billsData.totalAmount,
      });
    }
  });

  // No filling of missing periods - only show existing data

  // Convert to array and sort by period
  const result = Array.from(groupedData.values()).sort((a, b) =>
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

    // Use pre-calculated totals for performance
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const totalItems = sale.totalItems || 0;

    totalRevenue += totalAmountWithDiscount;
    totalProfit += sale.totalProfit || 0;
    totalPurchases += totalItems;
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

export async function getSalesByClient(clientId: string) {
  try {
    console.log("getSalesByClient called with clientId:", clientId);
    
    const sales = await prisma.sale.findMany({
      where: {
        clientId: clientId,
      },
      include: {
        client: true,
        saleItems: {
          include: {
            product: {
              select: {
                name: true,
                categoryName: true,
              },
            },
            service: {
              select: {
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
    });

    console.log("Found sales for client:", sales.length);
    return sales;
  } catch (error) {
    console.error("Error in getSalesByClient:", error);
    throw error;
  }
}

export async function getSaleById(saleId: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
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
            dueDate: true,
          },
        },
      },
    });

    if (!sale) {
      return null;
    }

    // Use pre-calculated totals for performance
    const totalAmount = sale.totalAmount || 0;
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const totalItems = sale.totalItems || 0;
    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount;

    return {
      ...sale,
      totalAmount,
      totalAmountWithDiscount,
      paidAmount,
      remainingAmount: totalAmountWithDiscount - paidAmount,
      totalItems,
      isPaidInCash: !sale.payment,
    };
  } catch (error) {
    console.error("Error in getSaleById:", error);
    throw error;
  }
}

export async function searchSales(
  searchTerm: string,
  limit = 100,
  offset = 0,
  days = 7
) {
  // Calculate date filter - configurable number of days
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of today
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0); // Start of the day 'days' ago

  console.log("searchSales called with searchTerm:", searchTerm, "days:", days, "Start date:", startDate, "End date:", endDate);

  // const searchLower = searchTerm.toLowerCase(); // Removed unused variable

  const sales = await prisma.sale.findMany({
    where: {
      AND: [
        {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        {
          OR: [
            // Search in client name
            {
              client: {
                name: {
                  contains: searchTerm,
                },
              },
            },
            // Search in sale ID
            {
              id: {
                contains: searchTerm,
              },
            },
            // Search in product names
            {
              saleItems: {
                some: {
                  product: {
                    name: {
                      contains: searchTerm,
                    },
                  },
                },
              },
            },
            // Search in manual product names
            {
              saleItems: {
                some: {
                  manualProduct: {
                    name: {
                      contains: searchTerm,
                    },
                  },
                },
              },
            },
            // Search in service names
            {
              saleItems: {
                some: {
                  service: {
                    name: {
                      contains: searchTerm,
                    },
                  },
                },
              },
            },
          ],
        },
      ],
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

  // Filter to exclude unpaid VERSEMENT sales and apply case-insensitive search
  const filteredSales = sales.filter((sale) => {
    // First filter: exclude unpaid VERSEMENT sales
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

    if (isUnpaidVersement) {
      return false;
    }

    // Second filter: case-insensitive search (since Prisma doesn't support mode: 'insensitive')
    const searchLower = searchTerm.toLowerCase();
    
    // Search in client name
    if (sale.client?.name.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in sale ID
    if (sale.id.toLowerCase().includes(searchLower)) {
      return true;
    }

    // Search in product names
    if (sale.saleItems.some((item) => {
      const productName = item.product?.name || "";
      return productName.toLowerCase().includes(searchLower);
    })) {
      return true;
    }

    // Search in manual product names
    if (sale.saleItems.some((item) => {
      const manualProductName = item.manualProduct?.name || "";
      return manualProductName.toLowerCase().includes(searchLower);
    })) {
      return true;
    }

    // Search in service names
    if (sale.saleItems.some((item) => {
      const serviceName = item.service?.name || "";
      return serviceName.toLowerCase().includes(searchLower);
    })) {
      return true;
    }

    return false;
  });

  const salesWithTotals = filteredSales.map((sale) => {
    // Use pre-calculated totals for performance
    const totalAmount = sale.totalAmount || 0;
    const totalAmountWithDiscount = sale.totalAmountWithDiscount || 0;
    const totalItems = sale.totalItems || 0;

    const paidAmount = sale.payment
      ? sale.payment.givenAmount || 0
      : totalAmountWithDiscount;

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

  console.log(`Found ${salesWithTotals.length} sales matching "${searchTerm}" in the last ${days} days`);

  return {
    sales: salesWithTotals,
    totalCount: filteredSales.length,
    hasMore: false,
  };
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
