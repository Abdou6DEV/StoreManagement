import { prisma } from "./prismaClient";

export async function createService(data: {
  name: string;
  description?: string;
  costPrice?: number;
}) {
  return await prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
      costPrice: data.costPrice || 0,
    },
  });
}

export async function findOrCreateService(data: {
  name: string;
  description?: string;
  costPrice?: number;
}) {
  // Try to find existing service
  const existing = await prisma.service.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existing) {
    // Just return existing - each sale stores its own cost price
    return existing;
  }

  // Create new service if not found (costPrice is just for template)
  return await createService({
    name: data.name,
    description: data.description,
    costPrice: 0, // Always 0 - each sale has its own cost
  });
}

export async function searchServices(query: string) {
  if (!query.trim()) {
    return [];
  }

  return await prisma.service.findMany({
    where: {
      OR: [
        {
          name: {
            contains: query,
          },
        },
        {
          description: {
            contains: query,
          },
        },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
  });
}

export async function getAllServices() {
  return await prisma.service.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getServiceById(id: string) {
  return await prisma.service.findUnique({
    where: { id },
  });
}

export async function updateService(
  id: string,
  data: {
    name?: string;
    description?: string;
    costPrice?: number;
  },
) {
  return await prisma.service.update({
    where: { id },
    data,
  });
}

export async function deleteService(id: string) {
  return await prisma.service.delete({
    where: { id },
  });
}
