import React, { useState, useEffect, useRef } from "react";
import { PackageX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "./confirmDialog";
import { Modal } from "./modal";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  printReturnSupplierLabels,
  type ServiceLabelSize,
} from "../../pages/services/utils/serviceLabelPrintUtils";
import { useToast } from "../contexts/toastContext";
import { useStock } from "../contexts/stockContext";

export type SupplierReturnCandidate = {
  productId: string;
  name: string;
  deletedQty: number;
};

type SaleItemForReturnCandidates = {
  quantity: number;
  product?: { id?: string; name?: string } | null;
  productId?: string | null;
  service?: unknown | null;
  serviceId?: string | null;
  manualProduct?: unknown | null;
  manualProductId?: string | null;
};

/** Stock products only — skip services and manual items (they cannot be returned to a supplier). */
export function getNormalProductReturnCandidates(
  saleItems: SaleItemForReturnCandidates[] | undefined | null,
): SupplierReturnCandidate[] {
  if (!saleItems?.length) return [];
  const map = new Map<string, SupplierReturnCandidate>();
  for (const si of saleItems) {
    if (si.service || si.serviceId || si.manualProduct || si.manualProductId) continue;
    const pid = si.product?.id || si.productId;
    if (!pid) continue;
    const prev = map.get(pid);
    map.set(pid, {
      productId: pid,
      name: si.product?.name ?? prev?.name ?? "?",
      deletedQty: (prev?.deletedQty ?? 0) + si.quantity,
    });
  }
  return Array.from(map.values()).filter((c) => c.deletedQty > 0);
}

type SupplierOption = {
  sellerId: string;
  sellerName: string;
  lastPrice: number;
  lastDate?: string;
};

interface SupplierReturnFlowProps {
  /** When true the supplier-return confirm dialog is shown immediately. */
  open: boolean;
  candidates: SupplierReturnCandidate[];
  /** Called when the flow fully ends (dismissed, skipped, or after printing). */
  onDone: () => void;
  /**
   * When true, stock already matches the return (e.g. quantity lowered in edit product).
   * Hides the “subtract from stock” checkbox and never deducts again.
   */
  inventoryAlreadyReduced?: boolean;
}

/**
 * Self-contained supplier-return flow.
 * Renders the "Return to supplier?" confirm dialog and, if the user says Yes,
 * the product-selection modal with supplier, price, issue, and label printing.
 *
 * The parent controls the flow via `open` / `candidates` and is notified when
 * it ends via `onDone`. All internal state lives here.
 */
const SupplierReturnFlow: React.FC<SupplierReturnFlowProps> = ({
  open,
  candidates,
  onDone,
  inventoryAlreadyReduced = false,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refetchProducts } = useStock();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [supplierReturnSelected, setSupplierReturnSelected] = useState<Record<string, boolean>>({});
  const [supplierReturnQty, setSupplierReturnQty] = useState<Record<string, number>>({});
  const [supplierOptionsByProduct, setSupplierOptionsByProduct] = useState<Record<string, SupplierOption[]>>({});
  const [selectedSupplierByProduct, setSelectedSupplierByProduct] = useState<Record<string, string>>({});
  const [manualSupplierByProduct, setManualSupplierByProduct] = useState<Record<string, string>>({});
  const [returnPriceByProduct, setReturnPriceByProduct] = useState<Record<string, number | "">>({});
  const [returnIssueByProduct, setReturnIssueByProduct] = useState<Record<string, string>>({});
  const [lastPurchaseByProduct, setLastPurchaseByProduct] = useState<
    Record<string, { lastPrice: number; lastDate?: string }>
  >({});
  const [returnLabelSize, setReturnLabelSize] = useState<ServiceLabelSize>(() => {
    try {
      const cached =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("supplierReturn_labelSize")
          : null;
      return cached === "20x40" || cached === "35x45" || cached === "25x50"
        ? (cached as ServiceLabelSize)
        : "20x40";
    } catch {
      return "20x40";
    }
  });
  const [isPrintingReturnLabels, setIsPrintingReturnLabels] = useState(false);
  const [isApplyingInventory, setIsApplyingInventory] = useState(false);
  const [reduceInventoryChecked, setReduceInventoryChecked] = useState(true);

  // Prevents calling onDone when merely transitioning from confirm → modal.
  const advancingToReturnModalRef = useRef(false);

  // When parent opens the flow, first check if any label printer is configured.
  // If none is set up, skip the entire flow silently and call onDone immediately.
  useEffect(() => {
    if (open && candidates.length > 0) {
      const start = async () => {
        try {
          const [p1, p2, p3, pfallback] = await Promise.all([
            window.api.database.options.get("labelPrinterName_20x40"),
            window.api.database.options.get("labelPrinterName_35x45"),
            window.api.database.options.get("labelPrinterName_25x50"),
            window.api.database.options.get("labelPrinterName"),
          ]);
          const hasAnyPrinter = [p1, p2, p3, pfallback].some((v) => v && String(v).trim());
          if (!hasAnyPrinter) {
            onDone();
            return;
          }
        } catch {
          // If the check itself fails, skip the flow to avoid blocking the user.
          onDone();
          return;
        }

        const initialSelected: Record<string, boolean> = {};
        const initialQty: Record<string, number> = {};
        const initialIssues: Record<string, string> = {};
        const initialPrices: Record<string, number | ""> = {};
        candidates.forEach((c) => {
          initialSelected[c.productId] = true;
          initialQty[c.productId] = c.deletedQty;
          initialIssues[c.productId] = "";
          initialPrices[c.productId] = "";
        });
        setSupplierReturnSelected(initialSelected);
        setSupplierReturnQty(initialQty);
        setReturnIssueByProduct(initialIssues);
        setReturnPriceByProduct(initialPrices);
        setReduceInventoryChecked(true);
        setConfirmOpen(true);
      };
      start();
    } else if (!open) {
      setConfirmOpen(false);
      setModalOpen(false);
    }
  }, [open]); // `candidates` intentionally omitted – we only re-init on open-toggle

  // Load supplier options from purchase history when the selection modal opens.
  useEffect(() => {
    if (!modalOpen || candidates.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        candidates.map(async (c) => {
          if (!c.productId || c.productId.startsWith("name:")) {
            return [
              c.productId,
              [] as SupplierOption[],
              { lastPrice: 0 } as { lastPrice: number; lastDate?: string },
            ] as const;
          }
          try {
            const productWithHistory =
              await window.api.database.products.getWithPurchaseHistory(c.productId);
            const purchaseItems: any[] = productWithHistory?.PurchaseItems ?? [];

            const seen = new Set<string>();
            const options: SupplierOption[] = [];
            for (const pi of purchaseItems) {
              const seller = pi?.purchase?.seller;
              const sellerId: string | undefined = seller?.id;
              const sellerName: string | undefined = seller?.name;
              if (!sellerId || !sellerName) continue;
              if (seen.has(sellerId)) continue;
              seen.add(sellerId);
              const dateVal: unknown = pi?.purchase?.createdAt ?? pi?.createdAt;
              options.push({
                sellerId,
                sellerName,
                lastPrice: Number(pi?.price ?? 0),
                lastDate: dateVal
                  ? new Date(dateVal as string | number | Date).toISOString()
                  : undefined,
              });
            }

            const overallPi = purchaseItems.find((pi) => pi != null) ?? null;
            const overallDateVal: unknown =
              overallPi?.purchase?.createdAt ?? overallPi?.createdAt;
            const overall = overallPi
              ? {
                  lastPrice: Number(overallPi?.price ?? 0),
                  lastDate: overallDateVal
                    ? new Date(overallDateVal as string | number | Date).toISOString()
                    : undefined,
                }
              : ({ lastPrice: 0 } as { lastPrice: number; lastDate?: string });

            return [c.productId, options, overall] as const;
          } catch {
            return [
              c.productId,
              [] as SupplierOption[],
              { lastPrice: 0 } as { lastPrice: number; lastDate?: string },
            ] as const;
          }
        }),
      );

      if (cancelled) return;

      const map: Record<string, SupplierOption[]> = {};
      const selected: Record<string, string> = {};
      const overallByProduct: Record<string, { lastPrice: number; lastDate?: string }> = {};
      for (const [productId, opts, overall] of entries as any) {
        map[productId] = opts;
        if (opts.length > 0) selected[productId] = opts[0].sellerId;
        overallByProduct[productId] = overall;
      }
      setSupplierOptionsByProduct(map);
      setSelectedSupplierByProduct((prev) => ({ ...selected, ...prev }));
      setLastPurchaseByProduct(overallByProduct);
      setReturnPriceByProduct((prev) => {
        const next = { ...prev };
        for (const [productId, opts, overall] of entries as any) {
          const current = next[productId];
          if (current !== undefined && current !== "") continue;
          if (opts?.length > 0) next[productId] = Number(opts[0]?.lastPrice ?? 0);
          else if (overall && Number(overall.lastPrice ?? 0) > 0)
            next[productId] = Number(overall.lastPrice ?? 0);
        }
        return next;
      });
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [modalOpen, candidates]);

  const resetInternalState = () => {
    setConfirmOpen(false);
    setModalOpen(false);
    setSupplierReturnSelected({});
    setSupplierReturnQty({});
    setSupplierOptionsByProduct({});
    setSelectedSupplierByProduct({});
    setManualSupplierByProduct({});
    setReturnPriceByProduct({});
    setReturnIssueByProduct({});
    setLastPurchaseByProduct({});
    setReduceInventoryChecked(true);
    advancingToReturnModalRef.current = false;
  };

  const applyInventoryReductionIfNeeded = async () => {
    if (inventoryAlreadyReduced) return;
    if (!reduceInventoryChecked) return;
    let anySuccess = false;
    for (const c of candidates) {
      if (!supplierReturnSelected[c.productId]) continue;
      if (!c.productId || c.productId.startsWith("name:")) continue;
      const maxAllowed = Math.floor(Math.max(0, Number(c.deletedQty)));
      if (maxAllowed < 1) continue;
      const qtyRaw = supplierReturnQty[c.productId] ?? c.deletedQty;
      const deduct = Math.min(
        Math.max(1, Math.floor(Number(qtyRaw))),
        maxAllowed,
      );
      try {
        const row = await window.api.database.products.getWithPurchaseHistory(c.productId);
        const current = Number(row?.quantity ?? 0);
        const newQty = Math.max(0, current - deduct);
        await window.api.database.products.update(
          c.productId,
          { quantity: newQty },
          "unknown",
          undefined,
          true,
        );
        anySuccess = true;
      } catch {
        showToast(
          t(
            "supplierReturn.reduceInventoryError",
            "Failed to update stock for {{name}}",
            { name: c.name },
          ),
          "error",
        );
      }
    }
    if (anySuccess) {
      try {
        await refetchProducts();
      } catch {
        // ignore refetch failure
      }
    }
  };

  const finishFlow = () => {
    resetInternalState();
    onDone();
  };

  return (
    <>
      {/* Supplier Return Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(isOpen) => {
          setConfirmOpen(isOpen);
          if (!isOpen) {
            if (advancingToReturnModalRef.current) {
              advancingToReturnModalRef.current = false;
              return;
            }
            resetInternalState();
            onDone();
          }
        }}
        title={t("supplierReturn.confirmTitle")}
        message={t("supplierReturn.confirmMessage")}
        confirmText={t("supplierReturn.yes")}
        cancelText={t("supplierReturn.no")}
        variant="warning"
        onConfirm={() => {
          advancingToReturnModalRef.current = true;
          setConfirmOpen(false);
          // Allow the confirm dialog to fully unmount before opening the modal.
          setTimeout(() => setModalOpen(true), 0);
        }}
        onCancel={() => {
          resetInternalState();
          onDone();
        }}
      />

      {/* Supplier Return Selection Modal */}
      <Modal
        open={modalOpen}
        onOpenChange={(isOpen) => {
          setModalOpen(isOpen);
          if (!isOpen) {
            resetInternalState();
            onDone();
          }
        }}
        title={t("supplierReturn.modalTitle")}
        subtitle={t("supplierReturn.modalDesc")}
        icon={
          <PackageX
            className="h-5 w-5 shrink-0 text-orange-600 dark:text-orange-500"
            aria-hidden
          />
        }
        size="2xl"
        showFooter={false}
      >
        <div className="flex min-h-0 flex-col gap-4">
          {/* Label size selection */}
          <div className="flex shrink-0 flex-col items-center space-y-2">
            <span className="text-sm font-medium text-foreground block">
              {t("supplierReturn.labelSize", "Label size")}
            </span>
            <div className="flex flex-wrap gap-3 justify-center">
              {(["20x40", "35x45", "25x50"] as ServiceLabelSize[]).map((size) => (
                <Checkbox
                  key={size}
                  checked={returnLabelSize === size}
                  onChange={(checked) => {
                    if (checked) {
                      setReturnLabelSize(size);
                      try {
                        localStorage.setItem("supplierReturn_labelSize", size);
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  label={`${size.replace("x", "×")} mm`}
                  color="orange"
                />
              ))}
            </div>
          </div>

          {/* Product list — scrolls when many rows; header stays visible */}
          <div className="rounded-lg border p-2">
            <div className="scrollbar-themed max-h-[min(52vh,560px)] overflow-y-auto overscroll-contain sm:max-h-[min(58vh,640px)]">
              <div className="sticky top-0 z-[1] grid grid-cols-24 gap-2 border-b border-border bg-muted/95 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                <div className="col-span-5">{t("supplierReturn.product")}</div>
                <div className="col-span-6">{t("supplierReturn.supplier", "Supplier")}</div>
                <div className="col-span-3">{t("supplierReturn.price", "Price")}</div>
                <div className="col-span-5">{t("supplierReturn.issue", "Issue/Problem")}</div>
                <div className="col-span-2 text-center">{t("supplierReturn.deletedQty")}</div>
                <div className="col-span-3 text-center">{t("supplierReturn.returnQty")}</div>
              </div>
              <div className="divide-y">
              {candidates.map((c) => {
                const checked = supplierReturnSelected[c.productId] ?? false;
                const qty = supplierReturnQty[c.productId] ?? c.deletedQty;
                const min = 1;
                const max = c.deletedQty;
                const supplierOptions = supplierOptionsByProduct[c.productId] ?? [];
                const selectedSupplierId = selectedSupplierByProduct[c.productId] ?? "";
                return (
                  <div key={c.productId} className="grid grid-cols-24 gap-2 px-4 py-3 items-center">
                    {/* Product name + checkbox */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <Checkbox
                        checked={checked}
                        onChange={(v) =>
                          setSupplierReturnSelected((prev) => ({ ...prev, [c.productId]: v }))
                        }
                        color="orange"
                      />
                      <div className="truncate">
                        <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="col-span-6">
                      {checked ? (
                        <div className="space-y-1">
                          {supplierOptions.length > 0 ? (
                            <Select
                              value={selectedSupplierId}
                              onValueChange={(value) => {
                                setSelectedSupplierByProduct((prev) => ({
                                  ...prev,
                                  [c.productId]: value,
                                }));
                                const opt = supplierOptions.find((o) => o.sellerId === value);
                                if (opt) {
                                  setReturnPriceByProduct((prev) => ({
                                    ...prev,
                                    [c.productId]: Number(opt.lastPrice ?? 0),
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder={t("supplierReturn.supplier", "Supplier")} />
                              </SelectTrigger>
                              <SelectContent>
                                {supplierOptions.map((o) => (
                                  <SelectItem key={o.sellerId} value={o.sellerId}>
                                    {`${o.sellerName} — ${Number(o.lastPrice).toLocaleString()} ${t("currency")}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={manualSupplierByProduct[c.productId] ?? ""}
                              onChange={(e) =>
                                setManualSupplierByProduct((prev) => ({
                                  ...prev,
                                  [c.productId]: e.target.value,
                                }))
                              }
                              placeholder={t(
                                "supplierReturn.manualSupplierPlaceholder",
                                "Enter supplier name",
                              )}
                              className="h-10"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="col-span-3">
                      {checked ? (
                        <Input
                          inputMode="decimal"
                          value={returnPriceByProduct[c.productId] ?? ""}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const parsed = raw === "" ? "" : Number(raw);
                            setReturnPriceByProduct((prev) => ({
                              ...prev,
                              [c.productId]:
                                raw === "" ? "" : Number.isFinite(parsed) ? parsed : "",
                            }));
                          }}
                          placeholder={t("supplierReturn.price", "Price")}
                          className="h-10 text-center"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </div>

                    {/* Issue / Problem */}
                    <div className="col-span-5">
                      {checked ? (
                        <Input
                          value={returnIssueByProduct[c.productId] ?? ""}
                          onChange={(e) =>
                            setReturnIssueByProduct((prev) => ({
                              ...prev,
                              [c.productId]: e.target.value,
                            }))
                          }
                          placeholder={t("supplierReturn.issuePlaceholder", "Type the issue")}
                          className="h-10"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </div>

                    {/* Deleted qty */}
                    <div className="col-span-2 text-center text-sm">{c.deletedQty}</div>

                    {/* Return qty */}
                    <div className="col-span-3 flex items-center justify-center">
                      {checked && c.deletedQty > 1 ? (
                        <input
                          type="number"
                          inputMode="numeric"
                          min={min}
                          max={max}
                          value={Math.min(Math.max(qty, min), max)}
                          onFocus={(e) => e.currentTarget.select()}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const clamped = Number.isFinite(v)
                              ? Math.min(Math.max(v, min), max)
                              : min;
                            setSupplierReturnQty((prev) => ({
                              ...prev,
                              [c.productId]: clamped,
                            }));
                          }}
                          className="w-24 px-3 py-2 rounded-md border border-border bg-background text-sm text-center"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          {checked ? 1 : "-"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>

          {/* Footer: optional reduce-stock + actions */}
          <div
            className={`flex shrink-0 border-t border-border/60 pt-3 gap-2 ${
              inventoryAlreadyReduced
                ? "flex-row items-center justify-end"
                : "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            }`}
          >
            {!inventoryAlreadyReduced && (
              <Checkbox
                checked={reduceInventoryChecked}
                onChange={setReduceInventoryChecked}
                disabled={isPrintingReturnLabels || isApplyingInventory}
                label={t(
                  "supplierReturn.reduceInventoryLabel",
                  "Subtract return quantities from stock (checked products only).",
                )}
                color="orange"
                className="items-start min-w-0 flex-1"
                labelClassName="text-xs sm:text-sm text-foreground leading-snug"
              />
            )}
            <div className="flex shrink-0 items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  setIsApplyingInventory(true);
                  try {
                    await applyInventoryReductionIfNeeded();
                    finishFlow();
                  } finally {
                    setIsApplyingInventory(false);
                  }
                }}
                disabled={isPrintingReturnLabels || isApplyingInventory}
              >
                {t("supplierReturn.skipPrinting")}
              </Button>
              <Button
                disabled={
                  isPrintingReturnLabels ||
                  isApplyingInventory ||
                  !candidates.some((c) => supplierReturnSelected[c.productId])
                }
                onClick={async () => {
                if (!candidates.some((c) => supplierReturnSelected[c.productId])) return;
                try {
                  setIsPrintingReturnLabels(true);
                  const compactReturnTo = t("supplierReturn.returnTo", "Return To");
                  const titleFull = t("supplierReturn.labelTitle", "Return To Supplier");
                  const dateLabel = t("supplierReturn.date", "Date");
                  const priceLabel = t("supplierReturn.price", "Price");
                  const issueLabel = t("supplierReturn.panne", "Issue");

                  const labels: Array<{
                    title: string;
                    productName: string;
                    supplierName: string;
                    boughtPrice: number | string;
                    dateLabel: string;
                    priceLabel: string;
                    issueLabel: string;
                    purchaseDate?: string;
                    issue?: string;
                  }> = [];

                  for (const c of candidates) {
                    const checked = supplierReturnSelected[c.productId] ?? false;
                    if (!checked) continue;
                    const qty = supplierReturnQty[c.productId] ?? c.deletedQty;
                    const supplierOptions = supplierOptionsByProduct[c.productId] ?? [];
                    const selectedSupplierId = selectedSupplierByProduct[c.productId] ?? "";
                    const selectedSupplier = supplierOptions.find(
                      (o) => o.sellerId === selectedSupplierId,
                    );
                    const manualSupplier = (manualSupplierByProduct[c.productId] ?? "").trim();
                    let fallback = lastPurchaseByProduct[c.productId];

                    // Fetch fallback on-demand if not already loaded.
                    if (!fallback && c.productId && !c.productId.startsWith("name:")) {
                      try {
                        const productWithHistory =
                          await window.api.database.products.getWithPurchaseHistory(c.productId);
                        const purchaseItems: any[] = productWithHistory?.PurchaseItems ?? [];
                        const overallPi = purchaseItems.find((pi) => pi != null) ?? null;
                        const overallDateVal: unknown =
                          overallPi?.purchase?.createdAt ?? overallPi?.createdAt;
                        fallback = overallPi
                          ? {
                              lastPrice: Number(overallPi?.price ?? 0),
                              lastDate: overallDateVal
                                ? new Date(
                                    overallDateVal as string | number | Date,
                                  ).toISOString()
                                : undefined,
                            }
                          : { lastPrice: 0 };
                      } catch {
                        fallback = { lastPrice: 0 };
                      }
                    }

                    const supplierName = selectedSupplier?.sellerName ?? manualSupplier ?? "";
                    const enteredPrice = returnPriceByProduct[c.productId];
                    const boughtPrice =
                      typeof enteredPrice === "number"
                        ? enteredPrice
                        : selectedSupplier?.lastPrice ?? fallback?.lastPrice ?? 0;
                    const purchaseDate =
                      selectedSupplier?.lastDate ?? fallback?.lastDate ?? undefined;
                    const issue = (returnIssueByProduct[c.productId] ?? "").trim();

                    const count = Math.max(1, Number.isFinite(qty) ? Math.floor(qty) : 1);
                    for (let i = 0; i < count; i++) {
                      labels.push({
                        title:
                          returnLabelSize === "20x40"
                            ? `${compactReturnTo}: ${supplierName || "—"}`
                            : titleFull,
                        productName: c.name,
                        supplierName: supplierName || "—",
                        boughtPrice,
                        dateLabel: `${dateLabel}:`,
                        priceLabel: `${priceLabel}:`,
                        issueLabel: `${issueLabel}:`,
                        purchaseDate,
                        issue: issue || undefined,
                      });
                    }
                  }

                  if (labels.length > 0) {
                    await printReturnSupplierLabels(labels, returnLabelSize);
                  }

                  await applyInventoryReductionIfNeeded();
                  finishFlow();
                } catch {
                  showToast(
                    t("supplierReturn.printError", "Failed to print return labels"),
                    "error",
                  );
                } finally {
                  setIsPrintingReturnLabels(false);
                }
              }}
            >
              {t("supplierReturn.printReturnLabel")}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SupplierReturnFlow;
