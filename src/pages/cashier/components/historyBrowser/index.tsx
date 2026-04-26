import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import SaleDetailsModal from "../../../../lib/components/saleDetailsModal";
import { useStock } from "../../../../lib/contexts/stockContext";
import { useToast } from "../../../../lib/contexts/toastContext";
import { useCashierHistory } from "../../../../lib/contexts/cashierHistoryContext";
import { Sale } from "../../../../types";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import { HistoryBrowserProps } from "./types";
import SearchBar from "./searchBar";
import SalesList from "./salesList";
import { ConfirmDialog } from "../../../../lib/components/confirmDialog";
import { Lock } from "lucide-react";
import { useAuth } from "../../../../lib/contexts/authContext";
import { printReceiptDirectly } from "../receiptModal";
import { NoPrinterModal } from "../../../../lib/components/noPrinterModal";
import type { CartItem } from "../../../../types";
import { Modal } from "../../../../lib/components/modal";
import { Button } from "../../../../lib/components/button";
import { Checkbox } from "../../../../lib/components/checkbox";
import { Input } from "../../../../lib/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../lib/components/select";
import {
  printReturnSupplierLabels,
  type ServiceLabelSize,
} from "../../../services/utils/serviceLabelPrintUtils";

const HistoryBrowser: React.FC<HistoryBrowserProps> = ({
  onSaleSelect,
  salesRefreshKey,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refetchProducts } = useStock();
  const { showToast } = useToast();
  const { isEnabled: isHistoryEnabled, isLoading: isHistoryLoading } = useCashierHistory();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showNoReceiptPrinterModal, setShowNoReceiptPrinterModal] = useState(false);
  type SupplierReturnCandidate = { productId: string; name: string; deletedQty: number };
  type SupplierOption = { sellerId: string; sellerName: string; lastPrice: number; lastDate?: string };
  const [supplierReturnConfirmOpen, setSupplierReturnConfirmOpen] = useState(false);
  const [supplierReturnModalOpen, setSupplierReturnModalOpen] = useState(false);
  const [supplierReturnCandidates, setSupplierReturnCandidates] = useState<SupplierReturnCandidate[]>([]);
  const [supplierReturnSelected, setSupplierReturnSelected] = useState<Record<string, boolean>>({});
  const [supplierReturnQty, setSupplierReturnQty] = useState<Record<string, number>>({});
  const [supplierOptionsByProduct, setSupplierOptionsByProduct] = useState<Record<string, SupplierOption[]>>({});
  const [selectedSupplierByProduct, setSelectedSupplierByProduct] = useState<Record<string, string>>({});
  const [manualSupplierByProduct, setManualSupplierByProduct] = useState<Record<string, string>>({});
  const [returnIssueByProduct, setReturnIssueByProduct] = useState<Record<string, string>>({});
  const [lastPurchaseByProduct, setLastPurchaseByProduct] = useState<
    Record<string, { lastPrice: number; lastDate?: string }>
  >({});
  const [returnLabelSize, setReturnLabelSize] = useState<ServiceLabelSize>(() => {
    try {
      const cached = typeof localStorage !== "undefined" ? localStorage.getItem("supplierReturn_labelSize") : null;
      return cached === "20x40" || cached === "35x45" || cached === "25x50" ? (cached as ServiceLabelSize) : "20x40";
    } catch {
      return "20x40";
    }
  });
  const [isPrintingReturnLabels, setIsPrintingReturnLabels] = useState(false);
  /** Avoid duplicate fetch: salesRefreshKey effect already loads on mount; search effect would fire again after 300ms for "". */
  const skipSearchDebounceOnMount = useRef(true);

  const fetchSales = async (searchTerm?: string) => {
    try {
      // Don't show loading state if we already have data (smoother refresh)
      if (sales.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      // Get the configurable number of days from options
      const daysSetting = await window.api.database.options.get("cashierSalesHistoryDays");
      const days = daysSetting ? Number(daysSetting) : 7; // Default to 7 days
      
      console.log("Cashier Sales History Days setting:", daysSetting, "Parsed days:", days);

      let result;
      if (searchTerm && searchTerm.trim()) {
        // Use server-side search
        result = await window.api.database.sales.search({ 
          searchTerm: searchTerm.trim(), 
          limit: 100, 
          days 
        });
      } else {
        // Use regular recent sales fetch
        result = await window.api.database.sales.getRecent({ limit: 100, days });
      }
      
      setSales(result.sales);
    } catch (error) {
      rendererLogger.error("Error fetching sales", "HistoryBrowser", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [salesRefreshKey]);

  // Debounced search when the user edits the query (not on initial mount — covered by salesRefreshKey effect).
  useEffect(() => {
    if (skipSearchDebounceOnMount.current) {
      skipSearchDebounceOnMount.current = false;
      return;
    }
    const timeoutId = setTimeout(() => {
      fetchSales(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // No more client-side filtering - sales are already filtered by the server
  const filteredSales = sales;

  const handleSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowModal(true);
    onSaleSelect?.(sale);
  };

  const handlePrintReceipt = async (sale: Sale) => {
    try {
      const receiptPrinterName = (await window.api.database.options.get("receiptPrinterName")) ?? "";
      if (!receiptPrinterName.trim()) {
        setShowNoReceiptPrinterModal(true);
        return;
      }

      rendererLogger.debug("Printing receipt for sale", "HistoryBrowser", {
        saleId: sale.id,
      });

      // Convert saleItems to CartItem format
      const cartItems: CartItem[] = sale.saleItems.map((item) => ({
        id: item.product?.id || item.service?.id || `manual-${item.id}`,
        name:
          item.product?.name ||
          item.manualProduct?.name ||
          item.service?.name ||
          "",
        price: item.price,
        qty: item.quantity,
        boughtPrice: item.boughtPrice || undefined,
        isManual: !item.product && !item.service,
        isService: !!item.service,
        manualProductType: item.manualProduct?.type,
        description: item.service?.description,
        serviceCostPrice: item.service ? (item.boughtPrice || item.service?.costPrice) : undefined,
        serviceAppointmentId: item.service?.serviceAppointmentId || undefined,
      }));

      // Determine payment type
      const paymentType: "none" | "credit" | "versement" = sale.isPaidInCash
        ? "none"
        : sale.payment?.type === "VERSEMENT"
          ? "versement"
          : "credit";

      const paymentDate = sale.payment?.paidDate
        ? new Date(sale.payment.paidDate)
        : undefined;
      const dueDate = sale.payment?.dueDate
        ? new Date(sale.payment.dueDate)
        : undefined;

      // Call print function
      await printReceiptDirectly(
        cartItems,
        sale.client?.name || "",
        sale.discount,
        sale.paidAmount,
        paymentType,
        paymentDate,
        sale.id,
        (message, type) => showToast(message, type || "info"),
        dueDate,
        new Date(sale.createdAt) // Pass the sale date
      );
    } catch (error) {
      rendererLogger.error("Failed to print receipt", "HistoryBrowser", error);
      showToast(t("cashier.printError", "Failed to print receipt"), "error");
    }
  };

  const handleModifySale = (sale: Sale) => {
    // This is now handled in the modal
    rendererLogger.debug("Modifying sale", "HistoryBrowser", {
      saleId: sale.id,
    });
  };

  const handleSaleUpdated = async (updatedSale: Sale) => {
    // Update the sale in the local state
    setSales((prevSales) =>
      prevSales.map((sale) =>
        sale.id === updatedSale.id ? updatedSale : sale,
      ),
    );

    // Update the selected sale if it's the same one
    if (selectedSale?.id === updatedSale.id) {
      setSelectedSale(updatedSale);
    }

    // Refresh stock context to update product quantities and sales counts
    try {
      await refetchProducts();
    } catch (error) {
      rendererLogger.error(
        "Error refreshing stock context",
        "HistoryBrowser",
        error,
      );
    }
  };

  const handleSaleDeleted = async (saleId: string) => {
    // Remove the sale from the local state
    setSales((prevSales) => prevSales.filter((sale) => sale.id !== saleId));

    // Clear the selected sale if it's the same one
    if (selectedSale?.id === saleId) {
      setSelectedSale(null);
      setShowModal(false);
    }

    // Refresh stock context to update product quantities and sales counts
    try {
      await refetchProducts();
    } catch (error) {
      rendererLogger.error(
        "Error refreshing stock context",
        "HistoryBrowser",
        error,
      );
    }
  };

  const handleDeleteSale = async (sale: Sale, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the modal
    setSaleToDelete(sale);
    setShowDeleteConfirm(true);
  };

  const computeDeletedNormalProductsForDeleteSale = (s: Sale | null): SupplierReturnCandidate[] => {
    if (!s) return [];
    const map = new Map<string, SupplierReturnCandidate>();
    s.saleItems.forEach((si) => {
      const pid = si.product?.id;
      if (!pid) return;
      const prev = map.get(pid);
      map.set(pid, {
        productId: pid,
        name: si.product?.name ?? prev?.name ?? "?",
        deletedQty: (prev?.deletedQty ?? 0) + si.quantity,
      });
    });
    return Array.from(map.values()).filter((c) => c.deletedQty > 0);
  };

  const confirmDeleteSale = async (): Promise<boolean> => {
    if (!saleToDelete) return;

    setIsDeleting(true);
    try {
      await window.api.database.sales.delete(saleToDelete.id);
      const itemCount = saleToDelete.saleItems?.length ?? 0;
      const clientName = saleToDelete.client?.name ? ` Client: ${saleToDelete.client.name}` : "";
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.saleDeleted",
        details: `Sale ID: ${saleToDelete.id}. Items: ${itemCount}.${clientName}`,
      }).catch(() => {});

      // Remove the sale from the local state
      setSales((prevSales) =>
        prevSales.filter((s) => s.id !== saleToDelete.id),
      );

      // Clear the selected sale if it's the same one
      if (selectedSale?.id === saleToDelete.id) {
        setSelectedSale(null);
        setShowModal(false);
      }

      // Refresh stock context to update product quantities and sales counts
      await refetchProducts();

      // Show success toast
      showToast("Sale deleted successfully", "success");
      return true;
    } catch (error) {
      rendererLogger.error("Error deleting sale", "HistoryBrowser", error);
      showToast("Failed to delete sale", "error");
      return false;
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
    }
  };

  const startDeleteWithSupplierReturnFlow = async () => {
    const candidates = computeDeletedNormalProductsForDeleteSale(saleToDelete);
    const ok = await confirmDeleteSale();
    if (!ok) return;
    if (candidates.length === 0) return;

    const initialSelected: Record<string, boolean> = {};
    const initialQty: Record<string, number> = {};
    const initialIssues: Record<string, string> = {};
    candidates.forEach((c) => {
      initialSelected[c.productId] = true;
      initialQty[c.productId] = c.deletedQty;
      initialIssues[c.productId] = "";
    });
    setSupplierReturnCandidates(candidates);
    setSupplierReturnSelected(initialSelected);
    setSupplierReturnQty(initialQty);
    setReturnIssueByProduct(initialIssues);
    setSupplierReturnConfirmOpen(true);
  };

  useEffect(() => {
    if (!supplierReturnModalOpen) return;
    if (supplierReturnCandidates.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        supplierReturnCandidates.map(async (c) => {
          if (!c.productId || c.productId.startsWith("name:")) {
            return [c.productId, [] as SupplierOption[]] as const;
          }
          try {
            const productWithHistory = await window.api.database.products.getWithPurchaseHistory(
              c.productId,
            );
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
                lastDate: dateVal ? new Date(dateVal as string | number | Date).toISOString() : undefined,
              });
            }
            const overallDateVal: unknown =
              purchaseItems?.[0]?.purchase?.createdAt ?? purchaseItems?.[0]?.createdAt;
            const overall = purchaseItems?.[0]
              ? {
                  lastPrice: Number(purchaseItems?.[0]?.price ?? 0),
                  lastDate: overallDateVal
                    ? new Date(overallDateVal as string | number | Date).toISOString()
                    : undefined,
                }
              : ({ lastPrice: 0 } as { lastPrice: number; lastDate?: string });
            return [c.productId, options, overall] as const;
          } catch {
            return [c.productId, [] as SupplierOption[], { lastPrice: 0 } as { lastPrice: number; lastDate?: string }] as const;
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
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [supplierReturnModalOpen, supplierReturnCandidates]);

  // Show disabled message if history is not enabled
  if (!isHistoryEnabled) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Lock className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">
          {t("cashier.historyDisabled", "History Disabled")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("cashier.historyDisabledDesc", "Cashier history has been disabled by the administrator")}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        refreshing={refreshing}
      />

      <div className="flex-1 overflow-y-auto p-3">
        <SalesList
          sales={filteredSales}
          loading={loading}
          refreshing={refreshing}
          searchTerm={searchTerm}
          onSaleClick={handleSaleClick}
          onDeleteSale={handleDeleteSale}
        />
      </div>

      {/* Sale Details Modal */}
      <SaleDetailsModal
        sale={selectedSale}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onPrint={handlePrintReceipt}
        onModify={handleModifySale}
        onSaleUpdated={handleSaleUpdated}
        onSaleDeleted={handleSaleDeleted}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) {
            setSaleToDelete(null);
          }
        }}
        title={t("cashier.confirmDelete", "Confirm Delete")}
        message={t(
          "cashier.deleteSaleMessage",
          "Are you sure you want to delete this sale? This will restore the product quantities to your inventory.",
        )}
        confirmText={t("cashier.delete", "Delete")}
        cancelText={t("cashier.cancel", "Cancel")}
        variant="danger"
        onConfirm={startDeleteWithSupplierReturnFlow}
        loading={isDeleting}
      />

      {/* Supplier Return Confirm */}
      <ConfirmDialog
        open={supplierReturnConfirmOpen}
        onOpenChange={setSupplierReturnConfirmOpen}
        title={t("supplierReturn.confirmTitle")}
        message={t("supplierReturn.confirmMessage")}
        confirmText={t("supplierReturn.yes")}
        cancelText={t("supplierReturn.no")}
        variant="warning"
        onConfirm={() => {
          setSupplierReturnConfirmOpen(false);
          setSupplierReturnModalOpen(true);
        }}
        onCancel={async () => {
          setSupplierReturnCandidates([]);
          setSupplierReturnSelected({});
          setSupplierReturnQty({});
          setSupplierOptionsByProduct({});
          setSelectedSupplierByProduct({});
          setManualSupplierByProduct({});
          setReturnIssueByProduct({});
          setLastPurchaseByProduct({});
        }}
      />

      <Modal
        open={supplierReturnModalOpen}
        onOpenChange={(open) => {
          setSupplierReturnModalOpen(open);
          if (!open) {
            setSupplierReturnCandidates([]);
            setSupplierReturnSelected({});
            setSupplierReturnQty({});
            setSupplierOptionsByProduct({});
            setSelectedSupplierByProduct({});
            setManualSupplierByProduct({});
            setReturnIssueByProduct({});
            setLastPurchaseByProduct({});
          }
        }}
        title={t("supplierReturn.modalTitle")}
        subtitle={t("supplierReturn.modalDesc")}
        size="xl"
        showFooter={false}
      >
        <div className="space-y-4">
          <div className="space-y-2 flex flex-col items-center">
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
                  color="cyan"
                />
              ))}
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-20 gap-2 px-4 py-2 bg-muted/40 text-sm font-medium">
              <div className="col-span-5">{t("supplierReturn.product")}</div>
              <div className="col-span-5">{t("supplierReturn.supplier", "Supplier")}</div>
              <div className="col-span-5">{t("supplierReturn.issue", "Issue/Problem")}</div>
              <div className="col-span-2 text-center">{t("supplierReturn.deletedQty")}</div>
              <div className="col-span-3 text-center">{t("supplierReturn.returnQty")}</div>
            </div>
            <div className="divide-y">
              {supplierReturnCandidates.map((c) => {
                const checked = supplierReturnSelected[c.productId] ?? false;
                const qty = supplierReturnQty[c.productId] ?? c.deletedQty;
                const min = 1;
                const max = c.deletedQty;
                const supplierOptions = supplierOptionsByProduct[c.productId] ?? [];
                const selectedSupplierId = selectedSupplierByProduct[c.productId] ?? "";
                const selectedSupplier = supplierOptions.find((o) => o.sellerId === selectedSupplierId);
                return (
                  <div key={c.productId} className="grid grid-cols-20 gap-2 px-4 py-3 items-center">
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
                    <div className="col-span-5">
                      {checked ? (
                        <div className="space-y-1">
                          {supplierOptions.length > 0 ? (
                            <Select
                              value={selectedSupplierId}
                              onValueChange={(value) =>
                                setSelectedSupplierByProduct((prev) => ({
                                  ...prev,
                                  [c.productId]: value,
                                }))
                              }
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder={t("supplierReturn.supplier", "Supplier")} />
                              </SelectTrigger>
                              <SelectContent>
                                {supplierOptions.map((o) => (
                                  <SelectItem key={o.sellerId} value={o.sellerId}>
                                    {o.sellerName}
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
                          {selectedSupplier ? (
                            <div className="text-xs text-muted-foreground">
                              {t("supplierReturn.lastPurchasePrice", "Last purchase")}:{" "}
                              {`${Number(selectedSupplier.lastPrice).toLocaleString()} ${t("currency")}`}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </div>
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
                    <div className="col-span-2 text-center text-sm">{c.deletedQty}</div>
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
                            const clamped = Number.isFinite(v) ? Math.min(Math.max(v, min), max) : min;
                            setSupplierReturnQty((prev) => ({ ...prev, [c.productId]: clamped }));
                          }}
                          className="w-24 px-3 py-2 rounded-md border border-border bg-background text-sm text-center"
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground">{checked ? 1 : "-"}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setSupplierReturnModalOpen(false);
                setSupplierReturnCandidates([]);
                setSupplierReturnSelected({});
                setSupplierReturnQty({});
                setSupplierOptionsByProduct({});
                setSelectedSupplierByProduct({});
                setManualSupplierByProduct({});
                setReturnIssueByProduct({});
                setLastPurchaseByProduct({});
              }}
              disabled={isPrintingReturnLabels}
            >
              {t("supplierReturn.skipPrinting")}
            </Button>
            <Button
              onClick={async () => {
                try {
                  setIsPrintingReturnLabels(true);
                  const compactReturnTo = t("supplierReturn.returnTo", "Return To");
                  const titleFull = t("supplierReturn.labelTitle", "Return To Supplier");
                  const dateLabel = t("supplierReturn.date", "Date");
                  const priceLabel = t("supplierReturn.price", "Price");
                  const labels: Array<{
                    title: string;
                    productName: string;
                    supplierName: string;
                    boughtPrice: number | string;
                    dateLabel: string;
                    priceLabel: string;
                    purchaseDate?: string;
                    issue?: string;
                  }> = [];

                  for (const c of supplierReturnCandidates) {
                    const checked = supplierReturnSelected[c.productId] ?? false;
                    if (!checked) continue;
                    const qty = supplierReturnQty[c.productId] ?? c.deletedQty;
                    const supplierOptions = supplierOptionsByProduct[c.productId] ?? [];
                    const selectedSupplierId = selectedSupplierByProduct[c.productId] ?? "";
                    const selectedSupplier = supplierOptions.find((o) => o.sellerId === selectedSupplierId);
                    const manualSupplier = (manualSupplierByProduct[c.productId] ?? "").trim();
                    const fallback = lastPurchaseByProduct[c.productId];

                    const supplierName = selectedSupplier?.sellerName ?? manualSupplier ?? "";
                    const boughtPrice = selectedSupplier?.lastPrice ?? fallback?.lastPrice ?? 0;
                    const purchaseDate = selectedSupplier?.lastDate ?? fallback?.lastDate ?? undefined;
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
                        purchaseDate,
                        issue: issue || undefined,
                      });
                    }
                  }

                  if (labels.length > 0) {
                    await printReturnSupplierLabels(labels, returnLabelSize);
                  }

                  setSupplierReturnModalOpen(false);
                  setSupplierReturnCandidates([]);
                  setSupplierReturnSelected({});
                  setSupplierReturnQty({});
                  setSupplierOptionsByProduct({});
                  setSelectedSupplierByProduct({});
                  setManualSupplierByProduct({});
                  setReturnIssueByProduct({});
                  setLastPurchaseByProduct({});
                } catch (e) {
                  showToast(t("supplierReturn.printError", "Failed to print return labels"), "error");
                } finally {
                  setIsPrintingReturnLabels(false);
                }
              }}
              disabled={isPrintingReturnLabels}
            >
              {t("supplierReturn.printReturnLabel")}
            </Button>
          </div>
        </div>
      </Modal>

      <NoPrinterModal
        open={showNoReceiptPrinterModal}
        onOpenChange={setShowNoReceiptPrinterModal}
        printerType="receipt"
      />
    </div>
  );
};

export default HistoryBrowser;
