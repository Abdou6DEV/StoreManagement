import { prisma } from "./prismaClient";

export async function createService(data: {
  name: string;
  description?: string;
}) {
  return await prisma.service.create({
    data: {
      name: data.name,
      description: data.description,
    },
  });
}

export async function findOrCreateService(data: {
  name: string;
  description?: string;
}) {
  // Try to find existing service
  const existing = await prisma.service.findUnique({
    where: {
      name: data.name,
    },
  });

  if (existing) {
    return existing;
  }

  // Create new service if not found
  return await createService(data);
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
