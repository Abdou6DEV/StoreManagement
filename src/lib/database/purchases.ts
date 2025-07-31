import { Purchase } from "@prisma/client";
import { prisma } from "./prismaClient";

export async function getAllPurchases() {
  return await prisma.purchase.findMany({
    include: {
      product: true,
      seller: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function createPurchase(
  data: Omit<Purchase, "id" | "createdAt" | "updatedAt">,
) {
  return await prisma.purchase.create({
    data,
  });
}

export async function updatePurchase(
  id: string,
  data: Partial<Omit<Purchase, "id" | "createdAt" | "updatedAt">>,
) {
  return await prisma.purchase.update({
    where: { id },
    data,
  });
}

export async function deletePurchase(id: string) {
  return await prisma.purchase.delete({
    where: { id },
  });
}

export async function getPurchaseById(id: string) {
  return await prisma.purchase.findUnique({
    where: { id },
    include: {
      product: true,
      seller: true,
    },
  });
}

export async function getPurchasesByProduct(productId: string) {
  return await prisma.purchase.findMany({
    where: { productId },
    include: {
      seller: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPurchasesBySeller(sellerId: string) {
  return await prisma.purchase.findMany({
    where: { sellerId },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
