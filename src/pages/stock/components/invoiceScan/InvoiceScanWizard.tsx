import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "@prisma/client";
import { Loader2 } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../lib/components/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../lib/components/command";
import { useAuth } from "../../../../lib/contexts/authContext";
import { useStock } from "../../../../lib/contexts/stockContext";
import { useToast } from "../../../../lib/contexts/toastContext";
import type { ScanReceiptExtraction } from "../../../../lib/ai/scanReceiptTypes";
import { rankNameMatches } from "../../../../lib/invoiceScan/fuzzyMatch";
import { PriceConfirmationDialog } from "../priceConfirmationDialog";
import { SellingPriceWarningDialog } from "../sellingPriceWarningDialog";
import ScanProductLine from "./ScanProductLine";
import type { WizardLine } from "./wizardTypes";

type Seller = {
  id: string;
  name: string;
  phone?: string;
};

type Step = "supplier" | "products" | "review";

const fieldClass =
  "w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all";

const safePrice = (value: number | string | undefined): number => {
  const num = Number(value || 0);
  return Math.round(num * 100) / 100;
};

const isPriceDifferent = (a: number, b: number) => Math.abs(a - b) > 0.01;

const unitPurchasePrice = (line: WizardLine) =>
  line.actualPurchasePrice && line.actualPurchasePrice > 0
    ? line.actualPurchasePrice
    : line.boughtPrice;

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap text-sm">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </span>
  );
}

function mergedCatalogBoughtPrice(
  group: WizardLine[],
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
    return addQty > 0 ? incomingCost / addQty : unitPurchasePrice(group[group.length - 1]);
  }
  const totalQty = currentQty + addQty;
  if (totalQty <= 0) return unitPurchasePrice(group[group.length - 1]);
  return (currentQty * catalogPrice + incomingCost) / totalQty;
}

function buildInitialLines(extraction: ScanReceiptExtraction): WizardLine[] {
  return extraction.items.map((item, i) => ({
    key: `line-${i}-${item.name.slice(0, 24)}`,
    aiName: item.name,
    productName: item.name,
    categoryName: "",
    quantity: item.quantity > 0 ? item.quantity : 1,
    boughtPrice: item.boughtPrice != null && item.boughtPrice > 0 ? item.boughtPrice : 0,
    sellingPrice: 0,
    codebar: "",
    isNewProduct: false,
    confirmed: false,
    skipped: false,
  }));
}

export default function InvoiceScanWizard({
  extraction,
  onBack,
  onDone,
}: {
  extraction: ScanReceiptExtraction;
  onBack: () => void;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products, categories, refetchProducts, refetchCategories } = useStock();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>("supplier");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [sellerId, setSellerId] = useState("");
  const [newSellerName, setNewSellerName] = useState("");
  const [sellerOpen, setSellerOpen] = useState(false);
  const [lines, setLines] = useState<WizardLine[]>(() => buildInitialLines(extraction));
  const [saving, setSaving] = useState(false);

  const [priceOpen, setPriceOpen] = useState(false);
  const [priceData, setPriceData] = useState<{
    lineKey: string;
    productId: string;
    newPrice: number;
    previousPrice: number;
    newSellingPrice: number;
    previousSellingPrice: number;
    currentQuantity: number;
    newQuantity: number;
    sellerName: string | null;
    codebar: string;
    purchaseHistory?: Array<{
      id: string;
      quantity: number;
      price: number;
      createdAt: string;
      purchase: { id: string; seller: { name: string } | null };
    }>;
  } | null>(null);

  const [sellWarnOpen, setSellWarnOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const data = await window.api.database.sellers.getAll();
        setSellers(data.map((s: Seller) => ({ id: s.id, name: s.name, phone: s.phone })));
      } catch {
        setSellers([]);
      }
    })();
  }, []);

  const aiSupplierName = extraction.supplierName?.trim() || "";
  const sellerMatches = useMemo(
    () => (aiSupplierName ? rankNameMatches(aiSupplierName, sellers, 5) : []),
    [aiSupplierName, sellers],
  );
  const selectedSeller = sellers.find((s) => s.id === sellerId);
  const supplierReady = !!sellerId || !!newSellerName.trim();

  useEffect(() => {
    if (!aiSupplierName || sellerId || newSellerName) return;
    if (sellers.length === 0) return;
    if (sellerMatches.length === 0) {
      setNewSellerName(aiSupplierName);
    }
  }, [aiSupplierName, sellerId, newSellerName, sellers.length, sellerMatches.length]);

  const updateLine = (key: string, patch: Partial<WizardLine>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  };

  const commitExisting = (
    line: WizardLine,
    product: Product,
    sellingPrice: number,
    codebar: string,
    boughtPrice: number,
    strategy?: "weighted" | "new",
    catalogBought?: number,
  ) => {
    const bought = boughtPrice > 0 ? boughtPrice : product.boughtPrice;
    const weighted =
      strategy === "weighted" && catalogBought != null
        ? Math.round(
            ((product.quantity * catalogBought + line.quantity * bought) /
              (product.quantity + line.quantity)) *
              100,
          ) / 100
        : bought;
    updateLine(line.key, {
      confirmed: true,
      isNewProduct: false,
      existingProductId: product.id,
      productName: product.name,
      categoryName: product.categoryName,
      sellingPrice: sellingPrice > 0 ? sellingPrice : product.sellingPrice,
      boughtPrice: strategy === "weighted" ? weighted : bought,
      actualPurchasePrice: bought,
      originalBoughtPrice: product.boughtPrice,
      priceStrategy: strategy,
      codebar,
    });
  };

  const requestExistingConfirm = async (
    line: WizardLine,
    product: Product,
    sellingPrice: number,
    codebar: string,
    boughtPrice: number,
  ) => {
    const bought = boughtPrice > 0 ? boughtPrice : product.boughtPrice;
    if (!isPriceDifferent(bought, product.boughtPrice)) {
      commitExisting(line, product, sellingPrice, codebar, bought);
      return;
    }
    let history:
      | Array<{
          id: string;
          quantity: number;
          price: number;
          createdAt: string;
          purchase: { id: string; seller: { name: string } | null };
        }>
      | undefined;
    try {
      const withHistory = await window.api.database.products.getWithPurchaseHistory(product.id);
      history = withHistory?.PurchaseItems || [];
    } catch {
      history = undefined;
    }
    setPriceData({
      lineKey: line.key,
      productId: product.id,
      newPrice: bought,
      previousPrice: product.boughtPrice,
      newSellingPrice: sellingPrice > 0 ? sellingPrice : product.sellingPrice,
      previousSellingPrice: product.sellingPrice,
      currentQuantity: product.quantity,
      newQuantity: line.quantity,
      sellerName: selectedSeller?.name ?? newSellerName.trim() ?? null,
      codebar,
      purchaseHistory: history,
    });
    setPriceOpen(true);
  };

  const applyWeighted = () => {
    if (!priceData) return;
    const line = lines.find((l) => l.key === priceData.lineKey);
    const product = products.find((p) => p.id === priceData.productId);
    if (!line || !product) return;
    commitExisting(
      line,
      product,
      priceData.newSellingPrice,
      priceData.codebar,
      priceData.newPrice,
      "weighted",
      priceData.previousPrice,
    );
    setPriceOpen(false);
    setPriceData(null);
  };

  const applyKeepNew = () => {
    if (!priceData) return;
    const line = lines.find((l) => l.key === priceData.lineKey);
    const product = products.find((p) => p.id === priceData.productId);
    if (!line || !product) return;
    commitExisting(
      line,
      product,
      priceData.newSellingPrice,
      priceData.codebar,
      priceData.newPrice,
      "new",
    );
    setPriceOpen(false);
    setPriceData(null);
  };

  const ensureSeller = async (): Promise<string | null> => {
    if (sellerId) return sellerId;
    const name = newSellerName.trim();
    if (!name) return null;
    const existing = sellers.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      setSellerId(existing.id);
      return existing.id;
    }
    const created = await window.api.database.sellers.create({ name });
    setSellers((prev) => [...prev, { id: created.id, name: created.name, phone: created.phone }]);
    setSellerId(created.id);
    return created.id;
  };

  const activeLines = lines.filter((l) => !l.skipped);
  const productsStepValid = activeLines.length > 0 && activeLines.every((l) => l.confirmed);

  const existingLineGroups = useMemo(() => {
    const map = new Map<string, WizardLine[]>();
    for (const line of lines) {
      if (line.skipped || line.isNewProduct || !line.existingProductId) continue;
      const group = map.get(line.existingProductId) ?? [];
      group.push(line);
      map.set(line.existingProductId, group);
    }
    return map;
  }, [lines]);

  const reviewGroups = useMemo(() => {
    const seen = new Set<string>();
    const groups: WizardLine[][] = [];
    for (const line of activeLines) {
      if (!line.isNewProduct && line.existingProductId) {
        if (seen.has(line.existingProductId)) continue;
        seen.add(line.existingProductId);
        groups.push(existingLineGroups.get(line.existingProductId) ?? [line]);
      } else {
        groups.push([line]);
      }
    }
    return groups;
  }, [activeLines, existingLineGroups]);

  const purchaseTotal = activeLines.reduce(
    (sum, line) => sum + line.quantity * unitPurchasePrice(line),
    0,
  );
  const currency = t("cashier.currency", "DA");
  const money = (value: number) => `${safePrice(value).toLocaleString()} ${currency}`;

  const runSave = async () => {
    const sid = await ensureSeller();
    if (!sid) {
      showToast(
        t("stock.invoiceScan.supplierRequired", "Please select or add a supplier."),
        "error",
      );
      setStep("supplier");
      return;
    }
    if (!productsStepValid) {
      showToast(
        t(
          "stock.invoiceScan.linesInvalid",
          "Confirm each product (or skip it) before continuing.",
        ),
        "error",
      );
      setStep("products");
      return;
    }
    const lossLines = activeLines.filter(
      (l) => l.sellingPrice > 0 && l.sellingPrice < l.boughtPrice,
    );
    if (lossLines.length > 0) {
      setSellWarnOpen(true);
      return;
    }
    await saveAll(sid);
  };

  const saveAll = async (sid: string) => {
    setSaving(true);
    try {
      const purchaseItems: Array<{ productId: string; quantity: number; price: number }> = [];

      for (const line of activeLines.filter((l) => l.isNewProduct)) {
        await window.api.database.categories.ensure(line.categoryName);
        const created = await window.api.database.products.add({
          product: {
            name: line.productName.trim(),
            categoryName: line.categoryName.trim(),
            quantity: line.quantity,
            boughtPrice: safePrice(line.boughtPrice),
            sellingPrice: safePrice(line.sellingPrice),
            codebar: line.codebar,
            photo: null,
          },
          username: user?.username ?? "unknown",
        });
        purchaseItems.push({
          productId: created.id,
          quantity: line.quantity,
          price: line.actualPurchasePrice || line.boughtPrice,
        });
      }

      for (const [productId, group] of existingLineGroups) {
        const current = products.find((p) => p.id === productId);
        const currentQty = current?.quantity || 0;
        const addQty = group.reduce((sum, line) => sum + line.quantity, 0);
        const last = group[group.length - 1];
        await window.api.database.products.update(
          productId,
          {
            quantity: currentQty + addQty,
            boughtPrice: safePrice(mergedCatalogBoughtPrice(group, current)),
            sellingPrice: safePrice(last.sellingPrice),
          },
          user?.username ?? "unknown",
          "activityLog.actions.quantityAdded",
        );
        for (const line of group) {
          purchaseItems.push({
            productId,
            quantity: line.quantity,
            price: unitPurchasePrice(line),
          });
        }
      }

      if (purchaseItems.length > 0) {
        await window.api.database.purchases.createWithItems({
          sellerId: sid,
          items: purchaseItems,
        });
      }

      await refetchProducts();
      await refetchCategories();
      showToast(
        t("stock.purchaseCompletedSuccess", "Purchase completed successfully!"),
        "success",
      );
      onDone();
    } catch (e) {
      showToast(
        t("stock.invoiceScan.saveFailed", "Could not save the stock purchase."),
        "error",
      );
      console.error(e);
    } finally {
      setSaving(false);
      setSellWarnOpen(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap gap-2 text-sm text-muted-foreground">
        <span className={step === "supplier" ? "font-semibold text-foreground" : ""}>
          1. {t("stock.invoiceScan.stepSupplier", "Supplier")}
        </span>
        <span>→</span>
        <span className={step === "products" ? "font-semibold text-foreground" : ""}>
          2. {t("stock.invoiceScan.stepProducts", "Products")}
        </span>
        <span>→</span>
        <span className={step === "review" ? "font-semibold text-foreground" : ""}>
          3. {t("stock.invoiceScan.stepReview", "Review")}
        </span>
      </div>

      {step === "supplier" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
            {aiSupplierName ? (
              sellerMatches.length > 0 ? (
                <p>
                  {t(
                    "stock.invoiceScan.supplierSuggested",
                    "Suggested from the receipt: {{name}}",
                    { name: aiSupplierName },
                  )}
                </p>
              ) : (
                <p>
                  <span className="font-medium">{aiSupplierName}</span>
                  <span className="text-muted-foreground">
                    {" — "}
                    {t(
                      "stock.invoiceScan.supplierNotFound",
                      "No matching supplier was found. Choose one or add a new name.",
                    )}
                  </span>
                </p>
              )
            ) : (
              <p className="text-muted-foreground">
                {t(
                  "stock.invoiceScan.supplierNotRead",
                  "The receipt did not include a supplier name. Choose one or add a new name.",
                )}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("stock.seller", "Seller")}</label>
            <Popover open={sellerOpen} onOpenChange={setSellerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`${fieldClass} text-left ${!sellerId ? "text-muted-foreground" : ""}`}
                >
                  {selectedSeller
                    ? selectedSeller.name
                    : t("stock.chooseSeller", "Choose seller")}
                </button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput
                    placeholder={t("stock.searchSeller", "Search seller...")}
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>{t("stock.noSellerFound", "No seller found")}</CommandEmpty>
                    {sellerMatches.length > 0 ? (
                      <CommandGroup
                        heading={t("stock.invoiceScan.possibleMatches", "Possible matches")}
                      >
                        {sellerMatches.map((seller) => (
                          <CommandItem
                            key={`suggest-${seller.id}`}
                            value={`suggest ${seller.name}`}
                            onSelect={() => {
                              setSellerId(seller.id);
                              setNewSellerName("");
                              setSellerOpen(false);
                            }}
                          >
                            <span className="flex flex-col">
                              <span className="text-sm font-medium">{seller.name}</span>
                              {seller.phone ? (
                                <span className="text-xs text-muted-foreground">
                                  {seller.phone}
                                </span>
                              ) : null}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : null}
                    <CommandGroup heading={t("stock.invoiceScan.allSuppliers", "All suppliers")}>
                      {sellers.map((seller) => (
                        <CommandItem
                          key={seller.id}
                          value={seller.name}
                          onSelect={() => {
                            setSellerId(seller.id);
                            setNewSellerName("");
                            setSellerOpen(false);
                          }}
                        >
                          <span className="flex flex-col">
                            <span className="text-sm font-medium">{seller.name}</span>
                            {seller.phone ? (
                              <span className="text-xs text-muted-foreground">
                                {seller.phone}
                              </span>
                            ) : null}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("stock.invoiceScan.addSupplier", "Or type a new supplier name")}
            </label>
            <input
              type="text"
              value={newSellerName}
              onChange={(e) => {
                setNewSellerName(e.target.value);
                if (e.target.value.trim()) setSellerId("");
              }}
              className={fieldClass}
              placeholder={t("stock.seller", "Seller")}
            />
          </div>
          </div>

          <div className="flex shrink-0 justify-between gap-2">
            <Button type="button" variant="outline" onClick={onBack}>
              {t("stock.invoiceScan.back", "Back")}
            </Button>
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={!supplierReady}
              onClick={() => setStep("products")}
            >
              {t("stock.invoiceScan.next", "Next")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "products" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <p className="shrink-0 text-sm text-muted-foreground">
            {t(
              "stock.invoiceScan.productsHint",
              "Match each scanned line, or create a new product.",
            )}
          </p>
          <div className="scrollbar-themed min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-2 pb-2">
            {lines.map((line) => (
              <ScanProductLine
                key={line.key}
                line={line}
                products={products}
                categories={categories}
                onSkip={() => updateLine(line.key, { skipped: !line.skipped, confirmed: false })}
                onChange={() =>
                  updateLine(line.key, {
                    confirmed: false,
                    existingProductId: undefined,
                    isNewProduct: false,
                  })
                }
                onConfirmExisting={(product, sellingPrice, codebar, boughtPrice) => {
                  void requestExistingConfirm(line, product, sellingPrice, codebar, boughtPrice);
                }}
                onConfirmNew={(data) => {
                  updateLine(line.key, {
                    confirmed: true,
                    isNewProduct: true,
                    existingProductId: undefined,
                    productName: data.name,
                    categoryName: data.categoryName,
                    sellingPrice: data.sellingPrice,
                    boughtPrice: data.boughtPrice,
                    codebar: data.codebar,
                    actualPurchasePrice: data.boughtPrice,
                  });
                }}
              />
            ))}
          </div>
          <div className="flex shrink-0 justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("supplier")}>
              {t("stock.invoiceScan.back", "Back")}
            </Button>
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={!productsStepValid}
              onClick={() => setStep("review")}
            >
              {t("stock.invoiceScan.next", "Next")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="shrink-0 space-y-2">
            <p className="text-sm text-muted-foreground">
              {t(
                "stock.invoiceScan.reviewHint",
                "Check supplier and products before adding this purchase to stock.",
              )}
            </p>
            <div className="rounded-md border border-border bg-card px-3 py-1.5">
              <p className="text-xs text-muted-foreground">
                {t("stock.invoiceScan.supplier", "Supplier")}
                {": "}
                <span className="text-sm font-semibold text-foreground">
                  {selectedSeller?.name || newSellerName.trim()}
                </span>
              </p>
            </div>
          </div>

          <div className="scrollbar-themed min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
            {reviewGroups.map((group) => {
              const first = group[0];
              const combined = group.length > 1;
              const catalog = products.find((p) => p.id === first.existingProductId);
              const addQty = group.reduce((sum, line) => sum + line.quantity, 0);
              const lineTotal = group.reduce(
                (sum, line) => sum + line.quantity * unitPurchasePrice(line),
                0,
              );
              const selling = group[group.length - 1].sellingPrice;
              const stockBought = combined
                ? safePrice(mergedCatalogBoughtPrice(group, catalog))
                : first.boughtPrice;
              const weighted = group.some((line) => line.priceStrategy === "weighted");
              const keepNew = group.some((line) => line.priceStrategy === "new");
              const showScannedAs =
                !combined && first.aiName && first.aiName !== first.productName;
              const showStockBought =
                !first.isNewProduct &&
                isPriceDifferent(first.boughtPrice, unitPurchasePrice(first));

              return (
                <div
                  key={first.existingProductId || first.key}
                  className="rounded-md border border-border bg-card px-3 py-1.5"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="min-w-0 truncate text-sm font-medium">{first.productName}</p>
                    {first.categoryName ? (
                      <span className="text-xs text-muted-foreground">{first.categoryName}</span>
                    ) : null}
                    <span
                      className={
                        first.isNewProduct
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700"
                          : "rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      }
                    >
                      {first.isNewProduct
                        ? t("stock.invoiceScan.newProduct", "New product")
                        : t("stock.invoiceScan.existingProduct", "Existing")}
                    </span>
                    {weighted ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                        {t("stock.invoiceScan.weighted", "Weighted avg")}
                      </span>
                    ) : null}
                    {keepNew ? (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                        {t("stock.newPrice", "New Price")}
                      </span>
                    ) : null}
                    {showScannedAs ? (
                      <span className="text-xs text-muted-foreground">
                        {t("stock.invoiceScan.scannedAs", "On the receipt: {{name}}", {
                          name: first.aiName,
                        })}
                      </span>
                    ) : null}
                    <span className="ms-auto rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      {t("stock.invoiceScan.lineTotal", "Line total")}: {money(lineTotal)}
                    </span>
                  </div>

                  {combined ? (
                    <div className="mt-1.5 space-y-1">
                      {group.map((line) => (
                        <div
                          key={line.key}
                          className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded border border-border/70 bg-background px-2 py-1"
                        >
                          <p className="min-w-0 flex-1 truncate text-sm">{line.aiName}</p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {t("stock.quantity", "Quantity")}:{" "}
                            <span className="font-semibold text-foreground">{line.quantity}</span>
                            {" · "}
                            {t("stock.boughtPrice", "Bought Price")}:{" "}
                            <span className="font-semibold text-foreground">
                              {money(unitPurchasePrice(line))}
                            </span>
                          </p>
                        </div>
                      ))}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded border border-green-200 bg-green-50 px-2 py-1 dark:border-green-900/50 dark:bg-green-950/30">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-green-800 dark:text-green-300">
                          {t("stock.invoiceScan.stockAfterPurchase", "After this purchase")}
                        </span>
                        <ReviewStat
                          label={t("stock.invoiceScan.qtyToAdd", "Quantity to add")}
                          value={String(addQty)}
                        />
                        <ReviewStat
                          label={t("stock.invoiceScan.stockBoughtPrice", "Stock bought price")}
                          value={money(stockBought)}
                        />
                        <ReviewStat
                          label={t("stock.sellingPrice", "Selling Price")}
                          value={money(selling)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <ReviewStat
                        label={t("stock.quantity", "Quantity")}
                        value={String(first.quantity)}
                      />
                      <ReviewStat
                        label={t("stock.boughtPrice", "Bought Price")}
                        value={money(unitPurchasePrice(first))}
                      />
                      <ReviewStat
                        label={t("stock.sellingPrice", "Selling Price")}
                        value={money(first.sellingPrice)}
                      />
                      {showStockBought ? (
                        <ReviewStat
                          label={t("stock.invoiceScan.stockBoughtPrice", "Stock bought price")}
                          value={money(first.boughtPrice)}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base">
              <span className="text-muted-foreground">
                {t("stock.invoiceScan.purchaseTotal", "Purchase total")}:{" "}
              </span>
              <span className="text-lg font-semibold tabular-nums">{money(purchaseTotal)}</span>
            </p>
            <div className="flex justify-between gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setStep("products")}>
                {t("stock.invoiceScan.back", "Back")}
              </Button>
              <Button
                type="button"
                className="h-11 bg-green-600 px-5 text-base text-white hover:bg-green-700"
                disabled={saving}
                onClick={() => void runSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("stock.invoiceScan.saving", "Saving…")}
                  </>
                ) : (
                  t("stock.invoiceScan.confirm", "Confirm & add stock")
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <PriceConfirmationDialog
        open={priceOpen}
        onOpenChange={setPriceOpen}
        newPrice={priceData?.newPrice || 0}
        previousPrice={priceData?.previousPrice || 0}
        newSellingPrice={priceData?.newSellingPrice || 0}
        previousSellingPrice={priceData?.previousSellingPrice || 0}
        sellerName={priceData?.sellerName ?? null}
        currentQuantity={priceData?.currentQuantity || 0}
        newQuantity={priceData?.newQuantity || 0}
        purchaseHistory={priceData?.purchaseHistory}
        onCalculateWeightedAverage={applyWeighted}
        onKeepNewPrice={applyKeepNew}
      />

      <SellingPriceWarningDialog
        open={sellWarnOpen}
        onOpenChange={setSellWarnOpen}
        sellingPrice={activeLines[0]?.sellingPrice || 0}
        boughtPrice={activeLines[0]?.boughtPrice || 0}
        isMultiMode
        productCount={activeLines.filter((l) => l.sellingPrice < l.boughtPrice).length}
        onConfirm={() => {
          void (async () => {
            const sid = await ensureSeller();
            if (sid) await saveAll(sid);
          })();
        }}
        onCancel={() => setSellWarnOpen(false)}
      />
    </div>
  );
}
