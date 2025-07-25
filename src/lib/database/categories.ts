import { prisma } from "./prismaClient";

export async function getAllCategories() {
  return await prisma.category.findMany();
}

export async function ensureCategory(name: string) {
  let category = await prisma.category.findUnique({ where: { name } });

  if (!category) {
    category = await prisma.category.create({ data: { name } });
  }

  return category;
}
