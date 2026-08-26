import { Prisma } from "@prisma/client";
import { createActivityLog } from "./activityLogs";
import { prisma, prismaPromise } from "./prismaClient";
import {
  findInvoiceScanConflicts,
  mergedCatalogBoughtPrice,
  normalizeInvoiceScanPurchase,
  roundMoney,
  type InvoiceScanPurchaseInput,
  type InvoiceScanSaveResult,
} from "../invoiceScan/invoiceScanPurchase";

type SaveFail = Extract<InvoiceScanSaveResult, { success: false }>;

class InvoiceScanSaveAbort extends Error {
  result: SaveFail;
  constructor(result: SaveFail) {
    super(result.code);
    this.result = result;
  }
}

export async function applyInvoiceScanPurchase(
  raw: InvoiceScanPurchaseInput,
): Promise<InvoiceScanSaveResult> {
  await prismaPromise;
  const input = normalizeInvoiceScanPurchase(raw);
  if ("success" in input) return input;

  const username =
    typeof input.username === "string" && input.username.trim()
      ? input.username.trim()
      : "unknown";

  const createdNames: string[] = [];
  const updated: Array<{ name: string; quantity: number; sellingPrice: number }> =
    [];

  try {
    await prisma.$transaction(
      async (tx) => {
        const catalog = await tx.product.findMany({
          select: { id: true, name: true, codebar: true },
        });
        const conflict = findInvoiceScanConflicts(input, catalog);
        if (conflict) throw new InvoiceScanSaveAbort(conflict);

        const purchaseItems: Array<{
          productId: string;
          quantity: number;
          price: number;
        }> = [];

        for (const product of input.newProducts) {
          await tx.category.upsert({
            where: { name: product.categoryName },
            create: { name: product.categoryName },
            update: {},
          });
          const created = await tx.product.create({
            data: {
              name: product.name,
              categoryName: product.categoryName,
              quantity: product.quantity,
              boughtPrice: product.boughtPrice,
              sellingPrice: product.sellingPrice,
              codebar: product.codebar || null,
              photo: null,
            },
          });
          createdNames.push(created.name);
          purchaseItems.push({
            productId: created.id,
            quantity: product.quantity,
            price: product.boughtPrice,
          });
        }

        for (const group of input.existingGroups) {
          const current = await tx.product.findUnique({
            where: { id: group.productId },
          });
          if (!current) {
            throw new InvoiceScanSaveAbort({
              success: false,
              code: "product_missing",
            });
          }
          const addQty = group.lines.reduce((sum, line) => sum + line.quantity, 0);
          const boughtPrice = roundMoney(
            mergedCatalogBoughtPrice(
              group.lines.map((line) => ({
                quantity: line.quantity,
                boughtPrice: line.unitPrice,
                actualPurchasePrice: line.unitPrice,
                priceStrategy: line.priceStrategy,
              })),
              current,
            ),
          );
          const sellingPrice = roundMoney(group.sellingPrice);
          const updatedRow = await tx.product.update({
            where: { id: group.productId },
            data: {
              quantity: { increment: addQty },
              boughtPrice,
              sellingPrice,
            },
          });
          updated.push({
            name: updatedRow.name,
            quantity: updatedRow.quantity,
            sellingPrice: updatedRow.sellingPrice,
          });
          for (const line of group.lines) {
            purchaseItems.push({
              productId: group.productId,
              quantity: line.quantity,
              price: line.unitPrice,
            });
          }
        }

        await tx.purchase.create({
          data: {
            sellerId: input.sellerId,
            PurchaseItems: {
              create: purchaseItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
        });
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    if (error instanceof InvoiceScanSaveAbort) return error.result;
    if (error instanceof Error && error.cause instanceof InvoiceScanSaveAbort) {
      return error.cause.result;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");
      if (target.includes("name")) {
        return { success: false, code: "name_exists" };
      }
      if (target.includes("codebar")) {
        return { success: false, code: "barcode_exists" };
      }
      return { success: false, code: "unknown" };
    }
    console.error("[invoiceScan] applyInvoiceScanPurchase failed", error);
    return { success: false, code: "unknown" };
  }

  for (const name of createdNames) {
    try {
      await createActivityLog({
        username,
        action: "activityLog.actions.productAdded",
        details: `Product: ${name}`,
      });
    } catch (e) {
      console.error("[ActivityLog] Product added log failed", e);
    }
  }
  for (const row of updated) {
    try {
      await createActivityLog({
        username,
        action: "activityLog.actions.quantityAdded",
        details: `Product: ${row.name}\nQuantity: ${row.quantity}\nSelling price: ${row.sellingPrice}`,
      });
    } catch (e) {
      console.error("[ActivityLog] Product update log failed", e);
    }
  }

  return { success: true };
}
