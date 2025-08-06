import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock, User, ShoppingBag, Search, Eye, Trash2 } from "lucide-react";
import { Input } from "../../../lib/components/input";
import SaleDetailsModal from "../../../lib/components/saleDetailsModal";
import { useStock } from "../../../lib/contexts/stockContext";
import { useToast } from "../../../lib/contexts/toastContext";
import { Sale } from "../../../types";
import rendererLogger from "../../../lib/logger/rendererLogger";

interface HistoryBrowserProps {
  onSaleSelect?: (sale: Sale) => void;
  salesRefreshKey?: number;
}

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
            item.product?.name || item.manualProduct?.name || "";
          return productName.toLowerCase().includes(searchLower);
        })
      )
        return true;

      // Search in sale ID
      if (sale.id.toLowerCase().includes(searchLower)) return true;

      return false;
    });
  }, [sales, searchTerm]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const saleDate = new Date(date);
    const diffInHours = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return saleDate.toLocaleDateString();
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

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
      showToast(
        t("cashier.saleDeleted", "Sale deleted successfully"),
        "success",
      );
    } catch (error) {
      rendererLogger.error("Error deleting sale", "HistoryBrowser", error);
      showToast(t("cashier.saleDeleteError", "Failed to delete sale"), "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSaleToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Search Bar */}
      <div className="bg-muted/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t(
              "cashier.searchSalesOrScan",
              "Search sales or scan the receipt barcode...",
            )}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-sm border-1 border-border hover:border-primary/50 focus:border-primary transition-colors"
          />
          {refreshing && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Sales List */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground text-sm">
              {t("cashier.loading", "Loading...")}
            </div>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
            <div className="text-sm">
              {searchTerm
                ? t("cashier.noMatchingSales", "No matching sales found")
                : t("cashier.noSalesHistory", "No sales history")}
            </div>
            <div className="text-xs">
              {t(
                "cashier.salesWillAppearHere",
                "Recent sales will appear here",
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale, index) => (
              <div
                key={sale.id}
                onClick={() => handleSaleClick(sale)}
                className={`bg-card border border-border rounded-lg p-4 hover:bg-muted/30 hover:shadow-md transition-all duration-300 cursor-pointer ${
                  refreshing && index === 0 ? "animate-pulse bg-primary/5" : ""
                }`}
              >
                {/* Header with date, client, and total */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDate(sale.createdAt)}
                    </div>
                    {sale.client && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {sale.client.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-semibold text-green-600">
                    {formatCurrency(sale.totalWithDiscount)}
                  </div>
                </div>

                {/* Sale items preview */}
                <div className="mb-3">
                  <div className="text-sm font-medium text-foreground line-clamp-1">
                    {sale.saleItems
                      .slice(0, 2)
                      .map(
                        (item) =>
                          item.product?.name ||
                          item.manualProduct?.name ||
                          t("cashier.manualProduct", "Manual Product"),
                      )
                      .join(", ")}
                    {sale.saleItems.length > 2 &&
                      ` +${sale.saleItems.length - 2} ${t("cashier.more", "more")}`}
                  </div>
                </div>

                {/* Footer with items count and action buttons */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-orange-600">
                    <ShoppingBag className="w-4 h-4" />
                    {sale.totalItems} {t("cashier.items", "items")}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDeleteSale(sale, e)}
                      className="px-3 py-1.5 text-red-600 border border-red-300 text-xs rounded-md bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      title={t("cashier.deleteSale", "Delete Sale")}
                    >
                      <Trash2 className="w-3 h-3" />
                      {t("cashier.delete", "Delete")}
                    </button>
                    <div className="px-3 py-1.5 text-primary border border-primary/30 text-xs rounded-md bg-primary/5 flex items-center gap-1.5">
                      <Eye className="w-3 h-3" />
                      {t("cashier.view", "View")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
      {showDeleteConfirm && saleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-background border border-border/50 rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {t("cashier.confirmDelete", "Confirm Delete")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "cashier.deleteSaleWarning",
                    "This action cannot be undone",
                  )}
                </p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              {t(
                "cashier.deleteSaleMessage",
                "Are you sure you want to delete this sale? This will restore the product quantities to your inventory.",
              )}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSaleToDelete(null);
                }}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("cashier.cancel", "Cancel")}
              </button>
              <button
                onClick={confirmDeleteSale}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting
                  ? t("cashier.deleting", "Deleting...")
                  : t("cashier.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryBrowser;
