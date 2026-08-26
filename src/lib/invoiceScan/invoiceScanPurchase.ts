export function roundMoney(value: number | string | undefined): number {
  const num = Number(value || 0);
  return Math.round(num * 100) / 100;
}

export function unitPurchasePrice(line: {
  actualPurchasePrice?: number;
  boughtPrice: number;
}): number {
  return line.actualPurchasePrice && line.actualPurchasePrice > 0
    ? line.actualPurchasePrice
    : line.boughtPrice;
}

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
    return addQty > 0
      ? incomingCost / addQty
      : unitPurchasePrice(group[group.length - 1]);
  }
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return unitPurchasePrice(group[group.length - 1]);
  return (currentQty * catalogPrice + incomingCost) / totalQty;
}

export type InvoiceScanNewProduct = {
  name: string;
  categoryName: string;
  quantity: number;
  boughtPrice: number;
  sellingPrice: number;
  codebar: string;
};

export type InvoiceScanExistingLine = {
  quantity: number;
  unitPrice: number;
  priceStrategy?: "weighted" | "new";
};

export type InvoiceScanExistingGroup = {
  productId: string;
  sellingPrice: number;
  lines: InvoiceScanExistingLine[];
};

export type InvoiceScanPurchaseInput = {
  sellerId: string;
  username?: string;
  newProducts: InvoiceScanNewProduct[];
  existingGroups: InvoiceScanExistingGroup[];
};

export type InvoiceScanSaveErrorCode =
  | "invalid"
  | "duplicate_new_name"
  | "name_exists"
  | "duplicate_barcode"
  | "barcode_exists"
  | "product_missing"
  | "unknown";

export type InvoiceScanSaveResult =
  | { success: true }
  | { success: false; code: InvoiceScanSaveErrorCode; name?: string };

export type InvoiceScanCatalogRow = {
  id: string;
  name: string;
  codebar: string | null;
};

function positiveQty(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.max(1, Math.round(value));
}

export function normalizeInvoiceScanPurchase(
  raw: InvoiceScanPurchaseInput,
): InvoiceScanPurchaseInput | { success: false; code: "invalid" } {
  const sellerId = typeof raw?.sellerId === "string" ? raw.sellerId.trim() : "";
  if (!sellerId) return { success: false, code: "invalid" };

  const newProducts: InvoiceScanNewProduct[] = [];
  for (const row of Array.isArray(raw.newProducts) ? raw.newProducts : []) {
    const name = typeof row?.name === "string" ? row.name.trim() : "";
    const categoryName =
      typeof row?.categoryName === "string" ? row.categoryName.trim() : "";
    const quantity = positiveQty(row?.quantity);
    const boughtPrice = roundMoney(row?.boughtPrice);
    const sellingPrice = roundMoney(row?.sellingPrice);
    if (!name || !categoryName || quantity == null || boughtPrice <= 0) {
      return { success: false, code: "invalid" };
    }
    newProducts.push({
      name,
      categoryName,
      quantity,
      boughtPrice,
      sellingPrice,
      codebar: typeof row?.codebar === "string" ? row.codebar.trim() : "",
    });
  }

  const existingGroups: InvoiceScanExistingGroup[] = [];
  for (const group of Array.isArray(raw.existingGroups) ? raw.existingGroups : []) {
    const productId =
      typeof group?.productId === "string" ? group.productId.trim() : "";
    const linesRaw = Array.isArray(group?.lines) ? group.lines : [];
    if (!productId || linesRaw.length === 0) {
      return { success: false, code: "invalid" };
    }
    const lines: InvoiceScanExistingLine[] = [];
    for (const line of linesRaw) {
      const quantity = positiveQty(line?.quantity);
      const unitPrice = roundMoney(line?.unitPrice);
      if (quantity == null || unitPrice <= 0) {
        return { success: false, code: "invalid" };
      }
      const strategy = line?.priceStrategy;
      lines.push({
        quantity,
        unitPrice,
        priceStrategy: strategy === "weighted" || strategy === "new" ? strategy : undefined,
      });
    }
    existingGroups.push({
      productId,
      sellingPrice: roundMoney(group?.sellingPrice),
      lines,
    });
  }

  if (newProducts.length === 0 && existingGroups.length === 0) {
    return { success: false, code: "invalid" };
  }

  return {
    sellerId,
    username: typeof raw.username === "string" ? raw.username : undefined,
    newProducts,
    existingGroups,
  };
}

export function findInvoiceScanConflicts(
  input: InvoiceScanPurchaseInput,
  catalog: InvoiceScanCatalogRow[],
): Extract<InvoiceScanSaveResult, { success: false }> | null {
  const seenNames = new Map<string, true>();
  for (const product of input.newProducts) {
    if (seenNames.has(product.name)) {
      return { success: false, code: "duplicate_new_name", name: product.name };
    }
    seenNames.set(product.name, true);
  }

  const seenBarcodes = new Map<string, true>();
  for (const product of input.newProducts) {
    if (!product.codebar) continue;
    if (seenBarcodes.has(product.codebar)) {
      return { success: false, code: "duplicate_barcode", name: product.codebar };
    }
    seenBarcodes.set(product.codebar, true);
  }

  for (const product of input.newProducts) {
    if (catalog.some((row) => row.name === product.name)) {
      return { success: false, code: "name_exists", name: product.name };
    }
    if (
      product.codebar &&
      catalog.some((row) => row.codebar === product.codebar)
    ) {
      return { success: false, code: "barcode_exists", name: product.codebar };
    }
  }

  const catalogIds = new Set(catalog.map((row) => row.id));
  for (const group of input.existingGroups) {
    if (!catalogIds.has(group.productId)) {
      return { success: false, code: "product_missing" };
    }
  }

  return null;
}
