import React, { useState, useEffect, useMemo } from "react";
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
import { printReceiptDirectly } from "../receiptModal";
import type { CartItem } from "../../../../types";

const HistoryBrowser: React.FC<HistoryBrowserProps> = ({
  onSaleSelect,
  salesRefreshKey,
}) => {
  const { t } = useTranslation();
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

  // Search effect - trigger search when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSales(searchTerm);
    }, 300); // Debounce search by 300ms

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

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;

    setIsDeleting(true);
    try {
      await window.api.database.sales.delete(saleToDelete.id);

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
    } catch (error) {
      rendererLogger.error("Error deleting sale", "HistoryBrowser", error);
      showToast("Failed to delete sale", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
    }
  };

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
        onConfirm={confirmDeleteSale}
        loading={isDeleting}
      />
    </div>
  );
};

export default HistoryBrowser;
