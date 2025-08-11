import { Purchase } from "@prisma/client";
import { prisma } from "./prismaClient";

// Updated for new PurchaseItems structure

// Types for creating purchases with items
export type CreatePurchaseItemData = {
  productId: string;
  quantity: number;
  price: number;
};

export type CreatePurchaseWithItemsData = {
  sellerId?: string;
  items: CreatePurchaseItemData[];
};

export type PurchaseWithItems = Purchase & {
  PurchaseItems: {
    id: string;
    productId: string;
    purchaseId: string;
    quantity: number;
    price: number;
    createdAt: Date;
    updatedAt: Date;
    product: {
      id: string;
      name: string;
      categoryName: string;
      quantity: number;
      boughtPrice: number;
      sellingPrice: number;
      codebar: string | null;
      photo: string | null;
    };
  }[];
  seller: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    notes: string | null;
  } | null;
};

export async function getAllPurchases(): Promise<PurchaseWithItems[]> {
  return (await prisma.purchase.findMany({
    include: {
      PurchaseItems: {
        include: {
          product: true,
        },
      },
      seller: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as PurchaseWithItems[];
}

export async function createPurchase(
  data: Omit<Purchase, "id" | "createdAt" | "updatedAt">,
) {
  return await prisma.purchase.create({
    data,
  });
}

export async function createPurchaseWithItems(
  data: CreatePurchaseWithItemsData,
): Promise<PurchaseWithItems> {
  return (await prisma.purchase.create({
    data: {
      sellerId: data.sellerId,
      PurchaseItems: {
        create: data.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    },
    include: {
      PurchaseItems: {
        include: {
          product: true,
        },
      },
      seller: true,
    },
  })) as PurchaseWithItems;
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

export async function getPurchaseById(
  id: string,
): Promise<PurchaseWithItems | null> {
  return (await prisma.purchase.findUnique({
    where: { id },
    include: {
      PurchaseItems: {
        include: {
          product: true,
        },
      },
      seller: true,
    },
  })) as PurchaseWithItems | null;
}

export async function getPurchasesByProduct(productId: string) {
  return (await prisma.purchase.findMany({
    where: {
      PurchaseItems: {
        some: {
          productId: productId,
        },
      },
    },
    include: {
      PurchaseItems: {
        include: {
          product: true,
        },
      },
      seller: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as PurchaseWithItems[];
}

export async function getPurchasesBySeller(
  sellerId: string,
): Promise<PurchaseWithItems[]> {
  return (await prisma.purchase.findMany({
    where: { sellerId },
    include: {
      PurchaseItems: {
        include: {
          product: true,
        },
      },
      seller: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as PurchaseWithItems[];
}

export async function getPurchasesByDateRange(startDate: Date, endDate: Date): Promise<PurchaseWithItems[]> {
  return (await prisma.purchase.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      PurchaseItems: {
        include: {
          product: true,
        },
      },
      seller: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })) as PurchaseWithItems[];
}

export async function getPurchasesBySpecificPeriod(
  period: "day" | "month" | "year",
  periodValue: string,
): Promise<PurchaseWithItems[]> {
  let startDate: Date;
  let endDate: Date;

  if (period === "day") {
    // periodValue is in format "YYYY-MM-DD"
    startDate = new Date(periodValue);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(periodValue);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === "month") {
    // periodValue is in format "YYYY-MM"
    const [year, month] = periodValue.split("-");
    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(parseInt(year), parseInt(month), 0);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // periodValue is in format "YYYY"
    const year = parseInt(periodValue);
    startDate = new Date(year, 0, 1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(year, 11, 31);
    endDate.setHours(23, 59, 59, 999);
  }

  return await getPurchasesByDateRange(startDate, endDate);
}

// PurchaseItem management functions
export async function createPurchaseItem(data: {
  productId: string;
  purchaseId: string;
  quantity: number;
  price: number;
}) {
  return await prisma.purchaseItem.create({
    data,
    include: {
      product: true,
      purchase: true,
    },
  });
}

export async function updatePurchaseItem(
  id: string,
  data: Partial<{
    quantity: number;
    price: number;
  }>,
) {
  return await prisma.purchaseItem.update({
    where: { id },
    data,
    include: {
      product: true,
      purchase: true,
    },
  });
}

export async function deletePurchaseItem(id: string) {
  return await prisma.purchaseItem.delete({
    where: { id },
  });
}

export async function getPurchaseItemsByPurchase(purchaseId: string) {
  return await prisma.purchaseItem.findMany({
    where: { purchaseId },
    include: {
      product: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function updatePurchaseWithItems(
  purchaseId: string,
  data: {
    sellerId?: string;
    items: (CreatePurchaseItemData & { id?: string })[];
  },
): Promise<PurchaseWithItems> {
  return await prisma.$transaction(async (tx) => {
    // Update the purchase
    await tx.purchase.update({
      where: { id: purchaseId },
      data: {
        sellerId: data.sellerId,
      },
    });

    // Get existing items
    const existingItems = await tx.purchaseItem.findMany({
      where: { purchaseId },
    });

    // Delete items that are no longer needed
    const itemIdsToKeep = data.items
      .filter((item) => item.id)
      .map((item) => item.id as string);
    const itemsToDelete = existingItems.filter(
      (item) => !itemIdsToKeep.includes(item.id),
    );

    for (const item of itemsToDelete) {
      await tx.purchaseItem.delete({
        where: { id: item.id },
      });
    }

    // Update or create items
    for (const item of data.items) {
      if (item.id) {
        // Update existing item
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            price: item.price,
          },
        });
      } else {
        // Create new item
        await tx.purchaseItem.create({
          data: {
            purchaseId,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });
      }
    }

    // Return the updated purchase with items
    return (await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        PurchaseItems: {
          include: {
            product: true,
          },
        },
        seller: true,
      },
    })) as PurchaseWithItems;
  });
}
