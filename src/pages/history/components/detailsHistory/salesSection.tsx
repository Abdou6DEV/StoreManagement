// Force refresh - React import fix
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import type { SaleForHistory, Sale, CartItem } from "../../../../types";
import SaleCard from "./saleCard";
import SharedPagination from "../sharedPagination";
import SaleDetailsModal from "../../../../lib/components/saleDetailsModal";
import SectionControls from "./sectionControls";
import { ConfirmDialog } from "../../../../lib/components/confirmDialog";
import { useToast } from "../../../../lib/contexts/toastContext";
import { useAuth } from "../../../../lib/contexts/authContext";
import { useStock } from "../../../../lib/contexts/stockContext";
import { printReceiptDirectly } from "../../../cashier/components/receiptModal";
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

interface SalesSectionProps {
  sales: SaleForHistory[];
  currentSales: SaleForHistory[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
}

export default function SalesSection({
  sales,
  currentSales,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh,
}: SalesSectionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { refetchProducts } = useStock();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [saleToDelete, setSaleToDelete] = useState<SaleForHistory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filteredPage, setFilteredPage] = useState(1);
  type SupplierReturnCandidate = { productId: string; name: string; deletedQty: number };
  type SupplierOption = { sellerId: string; sellerName: string; lastPrice: number; lastDate?: string };
  const [supplierReturnConfirmOpen, setSupplierReturnConfirmOpen] = useState(false);
  const [supplierReturnModalOpen, setSupplierReturnModalOpen] = useState(false);
  const [supplierReturnCandidates, setSupplierReturnCandidates] = useState<SupplierReturnCandidate[]>([]);
  const [supplierReturnSelected, setSupplierReturnSelected] = useState<Record<string, boolean>>({});
  const [supplierReturnQty, setSupplierReturnQty] = useState<Record<string, number>>({});
  const [pendingPostDeleteSaleId, setPendingPostDeleteSaleId] = useState<string | null>(null);
  const advancingToReturnModalRef = useRef(false);
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

  // Transform SaleForHistory to Sale format that the modal expects
  const transformSaleForHistory = (saleForHistory: SaleForHistory): Sale => {
    // Use pre-calculated totals for performance
    const totalAmount = saleForHistory.totalAmount || 0;
    const totalAmountWithDiscount = saleForHistory.totalAmountWithDiscount || 0;
    const totalItems = saleForHistory.totalItems || 0;

    // Handle credit sales properly
    const hasPayment = saleForHistory.payment !== null && saleForHistory.payment !== undefined;
    const paidAmount = hasPayment ? (saleForHistory.payment?.givenAmount || 0) : totalAmountWithDiscount;
    const remainingAmount = totalAmountWithDiscount - paidAmount;
    const isPaidInCash = !hasPayment;



    return {
      ...saleForHistory,
      totalAmount,
      totalAmountWithDiscount,
      paidAmount,
      remainingAmount,
      totalItems,
      isPaidInCash,
      payment: saleForHistory.payment,
    };
  };

  const handleViewSale = (sale: SaleForHistory) => {
    const transformedSale = transformSaleForHistory(sale);
    setSelectedSale(transformedSale);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSale(null);
  };

  const handlePrintReceipt = async (sale: Sale) => {
    try {
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

      // Get payment & due dates
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
      console.error("Failed to print receipt:", error);
      showToast(
        t("cashier.printError", "Failed to print receipt"),
        "error"
      );
    }
  };

  const handleModifySale = (sale: Sale) => {
    // This is handled in the modal
  };

  const handleSaleUpdated = async (updatedSale: Sale) => {
    // Update the selected sale if it's the same one
    if (selectedSale?.id === updatedSale.id) {
      setSelectedSale(updatedSale);
    }

    // Refresh the sales data to reflect the update
    if (onRefresh) {
      await onRefresh();
    }
    // Refresh stock so product quantities stay in sync
    try {
      await refetchProducts();
    } catch (error) {
      console.error("Error refreshing stock after sale update:", error);
    }
  };

  const handleSaleDeleted = async (saleId: string) => {
    handleCloseModal();
    if (onRefresh) onRefresh();
    // Refresh stock so product quantities stay in sync
    try {
      await refetchProducts();
    } catch (error) {
      console.error("Error refreshing stock after sale delete:", error);
    }
  };

  const handleDeleteSale = (sale: SaleForHistory) => {
    setSaleToDelete(sale);
    setShowDeleteConfirm(true);
  };

  const runPostDeleteEffects = async (saleId: string) => {
    // Refresh the data after successful deletion
    if (onRefresh) {
      onRefresh();
    }
    // Refresh stock so product quantities stay in sync
    try {
      await refetchProducts();
    } catch (error) {
      console.error("Error refreshing stock after sale delete:", error);
    }
    setPendingPostDeleteSaleId(null);
  };

  const confirmDeleteSale = async (): Promise<boolean> => {
    if (!saleToDelete) return;
    
    setIsDeleting(true);
    try {
      // Delete the sale using the API
      await window.api.database.sales.delete(saleToDelete.id);
      const itemCount = saleToDelete.saleItems?.length ?? 0;
      const clientName = saleToDelete.client?.name ? ` Client: ${saleToDelete.client.name}` : "";
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.saleDeleted",
        details: `Sale ID: ${saleToDelete.id}. Items: ${itemCount}.${clientName}`,
      }).catch(() => {});
      
      // Close the dialog
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
      // Delay refresh until after supplier-return dialogs (if any)
      setPendingPostDeleteSaleId(saleToDelete.id);

      // Show success message
      showToast(t("cashier.saleDeleted", "Sale deleted successfully"), "success");
      return true;
    } catch (error) {
      console.error("Failed to delete sale:", error);
      
      // Show error message
      showToast(t("cashier.saleDeleteError", "Failed to delete sale"), "error");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const computeDeletedNormalProductsForDeleteSale = (s: SaleForHistory | null): SupplierReturnCandidate[] => {
    if (!s) return [];
    const map = new Map<string, SupplierReturnCandidate>();
    s.saleItems.forEach((si) => {
      // In details history, product objects may not include `id`.
      // Try `saleItem.productId` first, then `product.id`, finally fall back to name-key.
      const name = si.product?.name ?? "?";
      const key =
        (si as unknown as { productId?: string | null }).productId ||
        (si.product as unknown as { id?: string | null } | null)?.id ||
        `name:${name}`;
      const prev = map.get(key);
      map.set(key, {
        productId: key,
        name: name ?? prev?.name ?? "?",
        deletedQty: (prev?.deletedQty ?? 0) + si.quantity,
      });
    });
    return Array.from(map.values()).filter((c) => c.deletedQty > 0);
  };

  const startDeleteWithSupplierReturnFlow = async () => {
    const candidates = computeDeletedNormalProductsForDeleteSale(saleToDelete);
    const ok = await confirmDeleteSale();
    if (!ok) return;
    if (candidates.length === 0) {
      if (pendingPostDeleteSaleId) {
        await runPostDeleteEffects(pendingPostDeleteSaleId);
      }
      return;
    }

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

  // Filter sales based on search term - search through ALL sales data
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const searchLower = searchTerm.toLowerCase();
    return sales.filter((sale) => {
      // Search by sale ID
      if (sale.id.toLowerCase().includes(searchLower)) return true;
      
      // Search by client name
      if (sale.client?.name.toLowerCase().includes(searchLower)) return true;
      
      // Search by product names
      const hasMatchingProduct = sale.saleItems.some((item) => {
        const productName = item.product?.name || 
                           item.manualProduct?.name || 
                           item.service?.name || "";
        return productName.toLowerCase().includes(searchLower);
      });
      
      return hasMatchingProduct;
    });
  }, [sales, searchTerm]);

  // Pagination for filtered results
  const itemsPerPage = 10; // Same as the original pagination
  const filteredTotalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const currentFilteredSales = filteredSales.slice(
    (filteredPage - 1) * itemsPerPage,
    filteredPage * itemsPerPage
  );

  // Reset filtered page when search term changes
  useEffect(() => {
    setFilteredPage(1);
  }, [searchTerm]);

  // Determine what to display
  const isSearching = searchTerm.trim().length > 0;
  const displaySales = isSearching ? currentFilteredSales : currentSales;
  const displayTotalPages = isSearching ? filteredTotalPages : totalPages;
  const displayCurrentPage = isSearching ? filteredPage : currentPage;
  const displayOnPageChange = isSearching ? setFilteredPage : onPageChange;





  return (
    <div className="space-y-4">
      <SectionControls
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder={t("history.searchSales", "Search by products, clients, or sale ID...")}
      />
      
             {displaySales.length === 0 ? (
         <div className="text-center py-8 text-muted-foreground">
           <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-40" />
           <p>
             {isSearching 
               ? t("history.noSalesFoundForSearch", "No sales found matching your search")
               : t("history.noSalesFoundForPeriod", "No sales found for this period")
             }
           </p>
         </div>
       ) : (
         <div className={viewMode === "grid" 
           ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
           : "space-y-3"
         }>
           {displaySales.map((sale, index) => (
             <SaleCard
               key={sale.id}
               sale={sale}
               index={index}
               onView={handleViewSale}
               onDelete={handleDeleteSale}
             />
           ))}
         </div>
       )}
             <SharedPagination
         currentPage={displayCurrentPage}
         totalPages={displayTotalPages}
         onPageChange={displayOnPageChange}
       />

      {/* Sale Details Modal - Same as cashier history browser */}
      <SaleDetailsModal
        sale={selectedSale}
        isOpen={showModal}
        onClose={handleCloseModal}
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
        onOpenChange={(open) => {
          setSupplierReturnConfirmOpen(open);
          // If the dialog was dismissed by clicking outside / Esc, ensure we refresh.
          // If it was closed because user clicked "Yes", we must NOT refresh here.
          if (!open && pendingPostDeleteSaleId) {
            if (advancingToReturnModalRef.current) {
              advancingToReturnModalRef.current = false;
              return;
            }
            runPostDeleteEffects(pendingPostDeleteSaleId);
          }
        }}
        title={t("supplierReturn.confirmTitle")}
        message={t("supplierReturn.confirmMessage")}
        confirmText={t("supplierReturn.yes")}
        cancelText={t("supplierReturn.no")}
        variant="warning"
        onConfirm={() => {
          advancingToReturnModalRef.current = true;
          setSupplierReturnConfirmOpen(false);
          // Ensure modal opens AFTER confirm closes (avoid refresh/remount races)
          setTimeout(() => setSupplierReturnModalOpen(true), 0);
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
          if (pendingPostDeleteSaleId) {
            await runPostDeleteEffects(pendingPostDeleteSaleId);
          }
        }}
      />

      <Modal
        open={supplierReturnModalOpen}
        onOpenChange={(open) => {
          setSupplierReturnModalOpen(open);
          // If the modal was dismissed by clicking outside / Esc, ensure we refresh.
          if (!open) {
            setSupplierReturnCandidates([]);
            setSupplierReturnSelected({});
            setSupplierReturnQty({});
            setSupplierOptionsByProduct({});
            setSelectedSupplierByProduct({});
            setManualSupplierByProduct({});
            setReturnIssueByProduct({});
            setLastPurchaseByProduct({});
            if (pendingPostDeleteSaleId) {
              runPostDeleteEffects(pendingPostDeleteSaleId);
            }
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
                if (pendingPostDeleteSaleId) {
                  await runPostDeleteEffects(pendingPostDeleteSaleId);
                }
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
                  if (pendingPostDeleteSaleId) {
                    await runPostDeleteEffects(pendingPostDeleteSaleId);
                  }
                } catch (e) {
                  // eslint-disable-next-line no-console
                  console.error(e);
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
    </div>
  );
}
