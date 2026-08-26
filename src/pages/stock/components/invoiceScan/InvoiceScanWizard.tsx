import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Product } from "@prisma/client";
import { Banknote, Boxes, Loader2, Package } from "lucide-react";
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
import type { ScanLabelItem } from "./ScanPrintLabelsModal";

type Seller = {
  id: string;
  name: string;
  phone?: string;
};

type Step = "supplier" | "products" | "review";

export type WizardStep = Step;

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

function ScanStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="text-[11px] leading-tight">{label}</span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
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
  step,
  onStepChange,
  onBack,
  onDone,
}: {
  extraction: ScanReceiptExtraction;
  step: Step;
  onStepChange: (step: Step) => void;
  onBack: () => void;
  onDone: (labels: ScanLabelItem[]) => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { products, categories, refetchProducts, refetchCategories } = useStock();
  const { showToast } = useToast();

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
  const [openLineKey, setOpenLineKey] = useState<string | null>(
    () => lines.find((line) => !line.confirmed && !line.skipped)?.key ?? lines[0]?.key ?? null,
  );

  useEffect(() => {
    const pending = lines.filter((line) => !line.confirmed && !line.skipped);
    if (pending.length === 0) {
      if (openLineKey != null) setOpenLineKey(null);
      return;
    }
    const open = lines.find((line) => line.key === openLineKey);
    if (open && !open.confirmed && !open.skipped) return;
    const idx = openLineKey ? lines.findIndex((line) => line.key === openLineKey) : -1;
    const next =
      (idx >= 0 ? lines.slice(idx + 1).find((line) => !line.confirmed && !line.skipped) : null) ??
      pending[0];
    if (next.key !== openLineKey) setOpenLineKey(next.key);
  }, [lines, openLineKey]);

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
  const scanStats = useMemo(() => {
    const items = extraction.items;
    return {
      products: items.length,
      quantities: items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0),
      total: items.reduce((sum, item) => {
        const qty = item.quantity > 0 ? item.quantity : 0;
        const price = item.boughtPrice != null && item.boughtPrice > 0 ? item.boughtPrice : 0;
        return sum + qty * price;
      }, 0),
    };
  }, [extraction.items]);
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
      onStepChange("supplier");
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
      onStepChange("products");
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
      const createdByLineKey = new Map<string, { id: string; name: string; codebar: string }>();

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
        createdByLineKey.set(line.key, {
          id: created.id,
          name: created.name,
          codebar: created.codebar ?? "",
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

      const labels: ScanLabelItem[] = [];
      for (const group of reviewGroups) {
        const first = group[0];
        if (!first) continue;
        if (first.isNewProduct) {
          const created = createdByLineKey.get(first.key);
          if (!created) continue;
          labels.push({
            key: created.id,
            productName: (created.name || first.productName).trim(),
            sellingPrice: safePrice(first.sellingPrice),
            codebar: (created.codebar || first.codebar || "").trim(),
            quantity: first.quantity,
          });
          continue;
        }
        if (!first.existingProductId) continue;
        const current = products.find((p) => p.id === first.existingProductId);
        const last = group[group.length - 1];
        labels.push({
          key: first.existingProductId,
          productName: (last.productName || current?.name || "").trim(),
          sellingPrice: safePrice(last.sellingPrice),
          codebar: (current?.codebar || last.codebar || "").trim(),
          quantity: group.reduce((sum, line) => sum + line.quantity, 0),
        });
      }
      onDone(labels);
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
      {step === "supplier" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto p-px pr-1">
            <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
              <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    {t("stock.invoiceScan.receiptSnapshot", "What the AI read")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "stock.invoiceScan.supplierPageHint",
                      "Confirm the supplier and check that the receipt totals look right.",
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <ScanStat
                    icon={Package}
                    label={t("stock.invoiceScan.productsScanned", "Products scanned")}
                    value={String(scanStats.products)}
                  />
                  <ScanStat
                    icon={Boxes}
                    label={t("stock.invoiceScan.quantitiesScanned", "Quantities scanned")}
                    value={String(scanStats.quantities)}
                  />
                  <ScanStat
                    icon={Banknote}
                    label={t("stock.invoiceScan.totalAmount", "Total amount")}
                    value={money(scanStats.total)}
                  />
                </div>

                {extraction.items.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("stock.invoiceScan.receiptLines", "Receipt lines")}
                    </p>
                    <ul className="max-h-[min(22rem,42dvh)] overflow-y-auto overscroll-contain rounded-lg border border-border divide-y divide-border py-1 scrollbar-themed">
                      {extraction.items.map((item, i) => (
                        <li
                          key={`${item.name}-${i}`}
                          className="flex items-baseline justify-between gap-3 px-3 py-2 text-sm scroll-my-1"
                        >
                          <span className="min-w-0 truncate font-medium">{item.name}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {item.quantity}
                            {" × "}
                            {item.boughtPrice != null && item.boughtPrice > 0
                              ? money(item.boughtPrice)
                              : t("stock.invoiceScan.none", "none")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>

              <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">
                    {t("stock.invoiceScan.chooseSupplierHeading", "Choose the supplier")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "stock.invoiceScan.chooseSupplierHint",
                      "Select an existing supplier or add a new name.",
                    )}
                  </p>
                </div>

                {aiSupplierName ? (
                  <div className="rounded-lg border border-border bg-background px-4 py-3">
                    <p className="text-xs text-muted-foreground">
                      {t("stock.invoiceScan.onTheReceipt", "On the receipt")}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold">{aiSupplierName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {sellerMatches.length > 0
                        ? t("stock.invoiceScan.supplierMatched", "Found in your suppliers")
                        : t(
                            "stock.invoiceScan.supplierNotFound",
                            "No matching supplier was found. Choose one or add a new name.",
                          )}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    {t(
                      "stock.invoiceScan.supplierNotRead",
                      "The receipt did not include a supplier name. Choose one or add a new name.",
                    )}
                  </div>
                )}

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
              </section>
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
              onClick={() => onStepChange("products")}
            >
              {t("stock.invoiceScan.next", "Next")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "products" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <p className="shrink-0 text-sm leading-relaxed text-muted-foreground">
            {t(
              "stock.invoiceScan.productsHint",
              "Match one receipt line at a time: pick a suggested product, choose another from stock, or create a new one, then confirm. The next line opens automatically. Click a line to switch, or skip it if you do not want to add it.",
            )}
          </p>
          <div className="scrollbar-themed min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-2 pb-2">
            {lines.map((line) => (
              <ScanProductLine
                key={line.key}
                line={line}
                products={products}
                categories={categories}
                expanded={!line.confirmed && !line.skipped && openLineKey === line.key}
                onOpen={() => setOpenLineKey(line.key)}
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
            <Button type="button" variant="outline" onClick={() => onStepChange("supplier")}>
              {t("stock.invoiceScan.back", "Back")}
            </Button>
            <Button
              type="button"
              className="bg-green-600 text-white hover:bg-green-700"
              disabled={!productsStepValid}
              onClick={() => onStepChange("review")}
            >
              {t("stock.invoiceScan.next", "Next")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="shrink-0 space-y-1">
            <h3 className="text-base font-semibold">
              {t("stock.invoiceScan.reviewHeading", "Stock to add")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("stock.invoiceScan.reviewHint", "This is what will be added to stock.")}
            </p>
            <p className="text-sm">
              <span className="text-muted-foreground">
                {t("stock.invoiceScan.supplier", "Supplier")}
                {": "}
              </span>
              <span className="font-medium">
                {selectedSeller?.name || newSellerName.trim()}
              </span>
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border">
            <div className="scrollbar-themed h-full overflow-auto overscroll-contain">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-muted text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-start font-medium first:rounded-ss-xl">
                    {t("stock.invoiceScan.productName", "Product name")}
                  </th>
                  <th className="px-4 py-2.5 text-end font-medium">
                    {t("stock.quantity", "Quantity")}
                  </th>
                  <th className="px-4 py-2.5 text-end font-medium">
                    {t("stock.boughtPrice", "Bought Price")}
                  </th>
                  <th className="px-4 py-2.5 text-end font-medium">
                    {t("stock.invoiceScan.reviewColTotal", "Total")}
                  </th>
                  <th className="px-4 py-2.5 text-end font-medium last:rounded-se-xl">
                    {t("stock.sellingPrice", "Selling Price")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewGroups.map((group) => {
                  const first = group[0];
                  const addQty = group.reduce((sum, line) => sum + line.quantity, 0);
                  const lineTotal = group.reduce(
                    (sum, line) => sum + line.quantity * unitPurchasePrice(line),
                    0,
                  );
                  const unitBought = addQty > 0 ? lineTotal / addQty : unitPurchasePrice(first);
                  const selling = group[group.length - 1].sellingPrice;

                  return (
                    <tr key={first.existingProductId || first.key}>
                      <td className="max-w-0 border-t border-border px-4 py-2.5">
                        <span className="block truncate font-medium">{first.productName}</span>
                        {first.isNewProduct ? (
                          <span className="text-xs text-muted-foreground">
                            {t("stock.invoiceScan.newProduct", "New product")}
                          </span>
                        ) : null}
                      </td>
                      <td className="border-t border-border px-4 py-2.5 text-end tabular-nums">
                        {addQty}
                      </td>
                      <td className="border-t border-border px-4 py-2.5 text-end tabular-nums whitespace-nowrap">
                        {money(unitBought)}
                      </td>
                      <td className="border-t border-border px-4 py-2.5 text-end tabular-nums font-medium whitespace-nowrap">
                        {money(lineTotal)}
                      </td>
                      <td className="border-t border-border px-4 py-2.5 text-end tabular-nums whitespace-nowrap">
                        {money(selling)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-base">
              <span className="text-muted-foreground">
                {t("stock.invoiceScan.purchaseTotal", "Purchase total")}:{" "}
              </span>
              <span className="text-lg font-semibold tabular-nums">{money(purchaseTotal)}</span>
            </p>
            <div className="flex justify-between gap-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onStepChange("products")}>
                {t("stock.invoiceScan.back", "Back")}
              </Button>
              <Button
                type="button"
                className="bg-green-600 text-white hover:bg-green-700"
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
