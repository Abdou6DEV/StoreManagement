import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import SaleDetailsModal from "../../../../lib/components/saleDetailsModal";
import { useStock } from "../../../../lib/contexts/stockContext";
import { useToast } from "../../../../lib/contexts/toastContext";
import { Sale } from "../../../../types";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import { HistoryBrowserProps } from "./types";
import SearchBar from "./searchBar";
import SalesList from "./salesList";
import { ConfirmDialog } from "../../../../lib/components/confirmDialog";

const HistoryBrowser: React.FC<HistoryBrowserProps> = ({
  onSaleSelect,
  salesRefreshKey,
}) => {
  const { t } = useTranslation();
  const { refetchProducts } = useStock();
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSales = async () => {
    try {
      // Don't show loading state if we already have data (smoother refresh)
      if (sales.length === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      const result = await window.api.database.sales.getRecent({ limit: 100 });
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

  // Filter and search sales (only search filter needed since date is already filtered)
  const filteredSales = useMemo(() => {
    if (!searchTerm.trim()) {
      return sales; // No search term, return all recent sales
    }

    const searchLower = searchTerm.toLowerCase();
    return sales.filter((sale) => {
      // Search in client name
      if (sale.client?.name.toLowerCase().includes(searchLower)) return true;

      // Search in product names
      if (
        sale.saleItems.some((item) => {
          const productName =
            item.product?.name ||
            item.manualProduct?.name ||
            item.service?.name ||
            "";
          return productName.toLowerCase().includes(searchLower);
        })
      )
        return true;

      // Search in sale ID
      if (sale.id.toLowerCase().includes(searchLower)) return true;

      return false;
    });
  }, [sales, searchTerm]);

  const handleSaleClick = (sale: Sale) => {
    setSelectedSale(sale);
    setShowModal(true);
    onSaleSelect?.(sale);
  };

  const handlePrintReceipt = (sale: Sale) => {
    // TODO: Implement print functionality
    rendererLogger.debug("Printing receipt for sale", "HistoryBrowser", {
      saleId: sale.id,
    });
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
