import { prisma } from "./prismaClient";

export async function updateProduct(id: string, data: any) {
  const { categoryName, totalSold, createdAt, updatedAt, ...rest } = data;
  const updateData: any = { ...rest };

  if (categoryName) {
    updateData.category = { connect: { name: categoryName } };
  }

  return await prisma.product.update({
    where: { id },
    data: updateData,
  });
}
