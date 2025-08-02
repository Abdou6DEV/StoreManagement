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
      purchases: {
        include: {
          seller: true,
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

    // Create the purchase record
    await tx.purchase.create({
      data: {
        productId: product.id,
        sellerId: purchaseData.sellerId || null,
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
) {
  return await prisma.$transaction(async (tx) => {
    // Update product quantity
    const product = await tx.product.update({
      where: { id: productId },
      data: {
        quantity: {
          increment: additionalQuantity,
        },
      },
    });

    // Create the purchase record
    await tx.purchase.create({
      data: {
        productId: productId,
        sellerId: purchaseData.sellerId || null,
        quantity: purchaseData.quantity,
        price: purchaseData.price,
      },
    });

    return product;
  });
}
