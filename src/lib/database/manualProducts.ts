import { prisma } from "./prismaClient";

export async function createManualProduct(data: {
  name: string;
  type: string;
  costPrice?: number;
}) {
  return await prisma.manualProduct.create({
    data: {
      name: data.name,
      type: data.type,
      costPrice: data.costPrice || 0,
    },
  });
}

export async function findOrCreateManualProduct(data: {
  name: string;
  type: string;
  costPrice?: number;
}) {
  // Try to find existing manual product
  const existing = await prisma.manualProduct.findUnique({
    where: {
      name_type: {
        name: data.name,
        type: data.type,
      },
    },
  });

  if (existing) {
    // Update costPrice if provided (to remember the latest cost price used)
    if (data.costPrice !== undefined && data.costPrice > 0) {
      return await prisma.manualProduct.update({
        where: { id: existing.id },
        data: { costPrice: data.costPrice },
      });
    }
    return existing;
  }

  // Create new manual product if not found
  return await createManualProduct({
    name: data.name,
    type: data.type,
    costPrice: data.costPrice || 0,
  });
}

export async function searchManualProducts(query: string) {
  if (!query.trim()) {
    return [];
  }

  return await prisma.manualProduct.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
          },
        },
        {
          type: {
            contains: query,
          },
        },
      ],
    },
    orderBy: [{ name: "asc" }, { type: "asc" }],
    take: 10,
  });
}

export async function getAllManualProducts() {
  return await prisma.manualProduct.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getManualProductById(id: string) {
  return await prisma.manualProduct.findUnique({
    where: { id },
  });
}

export async function updateManualProduct(
  id: string,
  data: {
    name?: string;
    type?: string;
    costPrice?: number;
  },
) {
  return await prisma.manualProduct.update({
    where: { id },
    data,
  });
}

export async function deleteManualProduct(id: string) {
  return await prisma.manualProduct.delete({
    where: { id },
  });
}