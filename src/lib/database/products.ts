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
