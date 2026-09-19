import { toMoneyInt } from "../moneyInt";

export { toMoneyInt };

export function unitPurchasePrice(line: {
  actualPurchasePrice?: number;
  boughtPrice: number;
}): number {
  return line.actualPurchasePrice && line.actualPurchasePrice > 0
    ? line.actualPurchasePrice
    : line.boughtPrice;
}

/**
 * Catalog bought price after applying confirmed invoice lines.
 * Always an integer so Prisma `Product.boughtPrice Int` accepts it.
 */
export function mergedCatalogBoughtPrice(
  group: Array<{
    quantity: number;
    boughtPrice: number;
    actualPurchasePrice?: number;
    priceStrategy?: "weighted" | "new";
    originalBoughtPrice?: number;
  }>,
  current: { quantity: number; boughtPrice: number } | undefined,
): number {
  const currentQty = current?.quantity || 0;
  const catalogPrice = current?.boughtPrice ?? group[0]?.originalBoughtPrice ?? 0;
  const addQty = group.reduce((sum, line) => sum + line.quantity, 0);
  const incomingCost = group.reduce(
    (sum, line) => sum + line.quantity * unitPurchasePrice(line),
    0,
  );
  const replaceCatalog = group.every((line) => line.priceStrategy === "new");
  if (replaceCatalog) {
    const raw =
      addQty > 0
        ? incomingCost / addQty
        : unitPurchasePrice(group[group.length - 1]);
    return toMoneyInt(raw);
  }
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return toMoneyInt(unitPurchasePrice(group[group.length - 1]));
  return toMoneyInt((currentQty * catalogPrice + incomingCost) / totalQty);
}
