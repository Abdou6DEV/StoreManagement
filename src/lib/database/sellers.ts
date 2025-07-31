import { Seller } from "@prisma/client";
import { prisma } from "./prismaClient";

export async function getAllSellers() {
  return await prisma.seller.findMany({
    orderBy: {
      name: "asc",
    },
  });
}

export async function createSeller(data: Omit<Seller, "id" | "createdAt" | "updatedAt">) {
  return await prisma.seller.create({
    data,
  });
}

export async function updateSeller(id: string, data: Partial<Omit<Seller, "id" | "createdAt" | "updatedAt">>) {
  return await prisma.seller.update({
    where: { id },
    data,
  });
}

export async function deleteSeller(id: string) {
  return await prisma.seller.delete({
    where: { id },
  });
}

export async function getSellerById(id: string) {
  return await prisma.seller.findUnique({
    where: { id },
  });
}
