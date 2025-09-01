import { Product } from "@prisma/client";
import { prisma } from "./prismaClient";

export async function getAllProducts() {
  return await prisma.product.findMany();
}

export async function addProduct(product: Product) {
  return await prisma.product.create({ data: product });
}

export async function deleteProduct(id: string) {
  return await prisma.product.delete({
    where: { id },
  });
}

export async function updateProduct(id: string, data: any) {
  const { categoryName, ...rest } = data;
  const updateData: any = { ...rest };

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
    // Create the product
    const product = await tx.product.create({
      data: productData,
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
