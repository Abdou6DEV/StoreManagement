import { Product } from "@prisma/client";
import { prisma } from "./prismaClient";

export async function getAllProducts() {
  return await prisma.product.findMany();
}

// Check if a barcode already exists
export async function isBarcodeExists(codebar: string): Promise<boolean> {
  if (!codebar || codebar.trim() === '') {
    return false;
  }
  
  const existing = await prisma.product.findFirst({
    where: { codebar: codebar.trim() }
  });
  
  return !!existing;
}

// Find product by barcode
export async function findProductByBarcode(codebar: string) {
  if (!codebar || codebar.trim() === '') {
    return null;
  }
  
  return await prisma.product.findFirst({
    where: { codebar: codebar.trim() }
  });
}

// Generate a unique barcode with collision detection and retry mechanism
export async function generateUniqueBarcode(): Promise<string> {
  const maxAttempts = 10;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      // Generate barcode using the existing generator
      const { generateBarcode } = await import('../utils/barcodeGenerator');
      const barcode = await generateBarcode();
      
      // Check if barcode already exists in database
      const existing = await prisma.product.findFirst({
        where: { codebar: barcode }
      });
      
      if (!existing) {
        return barcode;
      }
      
      // If barcode exists, wait a bit and try again
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    } catch (error) {
      console.error(`Barcode generation attempt ${attempts + 1} failed:`, error);
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error(`Unable to generate unique barcode after ${maxAttempts} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  throw new Error('Unable to generate unique barcode after maximum attempts');
}

export async function addProduct(product: Product) {
  // Check barcode uniqueness if provided and not empty
  if (product.codebar && product.codebar.trim() !== '') {
    const exists = await isBarcodeExists(product.codebar);
    if (exists) {
      throw new Error(`Barcode '${product.codebar}' already exists. Please use a different barcode.`);
    }
  }
  
  // Set empty barcodes to null to avoid unique constraint issues
  const productData = {
    ...product,
    codebar: product.codebar && product.codebar.trim() !== '' ? product.codebar : null
  };
  
  return await prisma.product.create({ data: productData });
}

export async function deleteProduct(id: string) {
  await prisma.purchaseItem.deleteMany({ where: { productId: id } });
  await prisma.saleItem.deleteMany({ where: { productId: id } });
  return await prisma.product.delete({
    where: { id },
  });
}

export async function cleanupUnusedProducts() {
  const unusedProducts = await getUnusedProducts(3); // Default to 3 months
  
  if (unusedProducts.length === 0) {
    return { deletedCount: 0, message: "No unused products found" };
  }

  const productIds = unusedProducts.map(p => p.id);

  // Delete unused products in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Delete purchase items first (due to foreign key constraints)
    await tx.purchaseItem.deleteMany({
      where: {
        productId: { in: productIds }
      }
    });

    // Delete the products
    const deleteResult = await tx.product.deleteMany({
      where: {
        id: { in: productIds }
      }
    });

    return deleteResult;
  });

  return {
    deletedCount: result.count,
    message: `Successfully deleted ${result.count} unused products`,
    deletedProducts: unusedProducts.map(p => p.name)
  };
}

export async function updateProduct(id: string, data: any) {
  const { categoryName, ...rest } = data;
  const updateData: any = { ...rest };

  // Check barcode uniqueness if provided and not empty
  if (data.codebar && data.codebar.trim() !== '') {
    const existing = await prisma.product.findFirst({
      where: { 
        codebar: data.codebar.trim(),
        id: { not: id }  // Exclude current product
      }
    });
    if (existing) {
      throw new Error(`Barcode '${data.codebar}' already exists. Please use a different barcode.`);
    }
  }

  // Set empty barcodes to null to avoid unique constraint issues
  if (data.codebar !== undefined) {
    updateData.codebar = data.codebar && data.codebar.trim() !== '' ? data.codebar : null;
  }

  if (categoryName) {
    updateData.category = { connect: { name: categoryName } };
  }

  return await prisma.product.update({
    where: { id },
    data: updateData,
  });
}

export async function getProductWithPurchaseHistory(id: string) {
  return await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      PurchaseItems: {
        include: {
          purchase: {
            include: {
              seller: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      saleItems: {
        include: {
          sale: {
            include: {
              client: true,
            },
          },
        },
        orderBy: {
          sale: { createdAt: "desc" },
        },
      },
    },
  });
}

export async function createProductWithPurchase(
  productData: Omit<Product, "id" | "createdAt" | "updatedAt"> & {
    photo?: string | null;
  },
  purchaseData: {
    sellerId?: string;
    quantity: number;
    price: number;
  },
) {
  return await prisma.$transaction(async (tx) => {
    // Check barcode uniqueness if provided and not empty
    if (productData.codebar && productData.codebar.trim() !== '') {
      const existing = await tx.product.findFirst({
        where: { codebar: productData.codebar.trim() }
      });
      if (existing) {
        throw new Error(`Barcode '${productData.codebar}' already exists. Please use a different barcode.`);
      }
    }
    
    // Set empty barcodes to null to avoid unique constraint issues
    const processedProductData = {
      ...productData,
      codebar: productData.codebar && productData.codebar.trim() !== '' ? productData.codebar : null
    };
    
    // Create the product
    const product = await tx.product.create({
      data: processedProductData,
    });

    // Create the purchase record with purchase item
    const purchase = await tx.purchase.create({
      data: {
        sellerId: purchaseData.sellerId || null,
      },
    });

    // Create the purchase item
    await tx.purchaseItem.create({
      data: {
        productId: product.id,
        purchaseId: purchase.id,
        quantity: purchaseData.quantity,
        price: purchaseData.price,
      },
    });

    return product;
  });
}

export async function updateProductWithPurchase(
  productId: string,
  additionalQuantity: number,
  purchaseData: {
    sellerId?: string;
    quantity: number;
    price: number;
  },
  updateBoughtPrice = false,
  newSellingPrice?: number,
) {
  return await prisma.$transaction(async (tx) => {
    const updateData: any = {
      quantity: {
        increment: additionalQuantity,
      },
    };

    // If we need to update the bought price
    if (updateBoughtPrice !== undefined) {
      if (updateBoughtPrice) {
        // Calculate weighted average
        const product = await tx.product.findUnique({
          where: { id: productId },
          include: {
            PurchaseItems: true,
          },
        });

        if (product) {
          const totalQuantity = product.quantity + additionalQuantity;
          const totalValue = (product.boughtPrice * product.quantity) + (purchaseData.price * additionalQuantity);
          const weightedAveragePrice = Math.round(totalValue / totalQuantity);
          
          updateData.boughtPrice = weightedAveragePrice;
        }
      } else {
        // Keep the NEW price (not the old one!)
        updateData.boughtPrice = purchaseData.price;
      }
    }

    // Always update the selling price with the new one if provided
    if (newSellingPrice !== undefined) {
      updateData.sellingPrice = newSellingPrice;
    }

    // Update product
    const product = await tx.product.update({
      where: { id: productId },
      data: updateData,
    });

    // Create the purchase record
    const purchase = await tx.purchase.create({
      data: {
        sellerId: purchaseData.sellerId || null,
      },
    });

    // Create the purchase item
    await tx.purchaseItem.create({
      data: {
        productId: productId,
        purchaseId: purchase.id,
        quantity: purchaseData.quantity,
        price: purchaseData.price,
      },
    });

    return product;
  });
}

export async function getUnusedProducts(periodMonths = 3) {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - periodMonths);

  console.log(`🔍 getUnusedProducts: Looking for products with quantity=0 that haven't been sold since ${cutoffDate.toISOString()}`);

  try {
    // Use a more efficient approach with a single query using raw SQL
    const unusedProducts = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      categoryName: string;
      quantity: number;
      createdAt: Date;
      lastSoldDate: Date | null;
    }>>`
      SELECT 
        p.id,
        p.name,
        p.categoryName,
        p.quantity,
        p.createdAt,
        MAX(s.createdAt) as lastSoldDate
      FROM Product p
      LEFT JOIN SaleItem si ON p.id = si.productId
      LEFT JOIN Sale s ON si.saleId = s.id
      WHERE p.quantity = 0
        AND p.id NOT IN (
          SELECT DISTINCT si2.productId 
          FROM SaleItem si2 
          JOIN Sale s2 ON si2.saleId = s2.id 
          WHERE si2.productId IS NOT NULL 
            AND s2.createdAt >= ${cutoffDate}
        )
      GROUP BY p.id, p.name, p.categoryName, p.quantity, p.createdAt
      ORDER BY p.createdAt DESC
    `;

    const result = unusedProducts.map(product => ({
      id: product.id,
      name: product.name,
      categoryName: product.categoryName,
      quantity: product.quantity,
      lastSoldDate: product.lastSoldDate ? new Date(Number(product.lastSoldDate)) : null,
      createdAt: new Date(Number(product.createdAt))
    }));

    console.log(`✅ getUnusedProducts: Found ${result.length} unused products`);
    return result;
  } catch (error) {
    console.error('Error in getUnusedProducts:', error);
    
    // Fallback to the previous method if raw SQL fails
    try {
      console.log('Falling back to Prisma ORM method...');
      
      // First, get all products with zero quantity
      const zeroQuantityProducts = await prisma.product.findMany({
        where: {
          quantity: 0
        },
        select: {
          id: true,
          name: true,
          categoryName: true,
          quantity: true,
          createdAt: true
        },
        take: 1000 // Limit to prevent timeouts
      });

      // Then, get products that have been sold in the specified period
      const recentlySoldProductIds = await prisma.saleItem.findMany({
        where: {
          sale: {
            createdAt: {
              gte: cutoffDate
            }
          },
          productId: {
            not: null
          }
        },
        select: {
          productId: true
        },
        distinct: ['productId']
      });

      const recentlySoldIds = new Set(recentlySoldProductIds.map(item => item.productId).filter(Boolean));
      console.log(`🔍 Fallback: Found ${zeroQuantityProducts.length} products with quantity=0`);
      console.log(`🔍 Fallback: Found ${recentlySoldIds.size} products sold since cutoff date`);

      // Filter out products that were recently sold
      const unusedProducts = zeroQuantityProducts.filter(product => 
        !recentlySoldIds.has(product.id)
      );
      console.log(`🔍 Fallback: After filtering, ${unusedProducts.length} products are unused`);

      // Get last sold date for each unused product (limit to first 100 to avoid timeout)
      const productsWithLastSold = await Promise.all(
        unusedProducts.slice(0, 100).map(async (product) => {
          const lastSaleItem = await prisma.saleItem.findFirst({
            where: {
              productId: product.id
            },
            orderBy: {
              sale: {
                createdAt: 'desc'
              }
            },
            select: {
              sale: {
                select: {
                  createdAt: true
                }
              }
            }
          });

          return {
            id: product.id,
            name: product.name,
            categoryName: product.categoryName,
            quantity: product.quantity,
            lastSoldDate: lastSaleItem?.sale?.createdAt ? new Date(lastSaleItem.sale.createdAt) : null,
            createdAt: new Date(product.createdAt)
          };
        })
      );

      console.log(`✅ Fallback: Returning ${productsWithLastSold.length} unused products`);
      return productsWithLastSold;
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      throw new Error('Failed to fetch unused products');
    }
  }
}

export async function deleteMultipleProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return { deletedCount: 0, message: "No products to delete" };
  }

  try {
    // Process products in smaller batches to avoid transaction timeouts and database locks
    const BATCH_SIZE = 25; // Reduced batch size to prevent database locks
    let totalDeleted = 0;
    const errors: string[] = [];

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      
      try {
        // Delete each batch in its own transaction with shorter timeout
        const result = await prisma.$transaction(async (tx) => {
          // Delete purchase items first (due to foreign key constraints)
          await tx.purchaseItem.deleteMany({
            where: {
              productId: { in: batch }
            }
          });

          // Delete the products
          const deleteResult = await tx.product.deleteMany({
            where: {
              id: { in: batch }
            }
          });

          return deleteResult;
        }, {
          timeout: 15000, // 15 second timeout per batch
        });

        totalDeleted += result.count;
        console.log(`✅ Deleted batch ${Math.floor(i / BATCH_SIZE) + 1}: ${result.count} products`);
        
        // Add a small delay between batches to prevent database locks
        if (i + BATCH_SIZE < productIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        }
      } catch (batchError) {
        console.error(`❌ Error deleting batch ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError}`);
        
        // Add longer delay on error to let database recover
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay on error
      }
    }

    return {
      deletedCount: totalDeleted,
      message: `Successfully deleted ${totalDeleted} products${errors.length > 0 ? ` (${errors.length} batches failed)` : ''}`,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Error in deleteMultipleProducts:', error);
    throw new Error('Failed to delete products');
  }
}
