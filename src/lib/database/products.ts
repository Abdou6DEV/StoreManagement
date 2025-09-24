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
  return await prisma.product.delete({
    where: { id },
  });
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
          createdAt: "desc",
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
