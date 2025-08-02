import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Clock, User, ShoppingBag, Search, Eye } from "lucide-react";
import { Input } from "../../../lib/components/input";
import SaleDetailsModal from "../../../lib/components/saleDetailsModal";
import { useStock } from "../../../lib/contexts/stockContext";
import { Sale } from "../../../types";

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showModal, setShowModal] = useState(false);

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
      console.error("Error fetching sales:", error);
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
        sale.saleItems.some((item) =>
          item.product.name.toLowerCase().includes(searchLower),
        )
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
    console.log("Printing receipt for sale:", sale.id);
  };

  const handleModifySale = (sale: Sale) => {
    // This is now handled in the modal
    console.log("Modifying sale:", sale.id);
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
      console.error("Error refreshing stock context:", error);
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
                className={`bg-card border border-border rounded-lg p-3 hover:bg-muted/30 transition-all duration-300 ${
                  refreshing && index === 0 ? "animate-pulse bg-primary/5" : ""
                }`}
              >
                {/* Header with date, client, and total */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {formatDate(sale.createdAt)}
                    </div>
                    {sale.client && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        {sale.client.name}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-semibold text-green-500">
                    {formatCurrency(sale.totalWithDiscount)}
                  </div>
                </div>

                {/* Sale items preview */}
                <div className="mb-2">
                  <div className="text-sm font-medium text-foreground line-clamp-1">
                    {sale.saleItems
                      .slice(0, 2)
                      .map((item) => item.product.name)
                      .join(", ")}
                    {sale.saleItems.length > 2 &&
                      ` +${sale.saleItems.length - 2} ${t("cashier.more", "more")}`}
                  </div>
                </div>

                {/* Footer with items count and view button */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-orange-500">
                    <ShoppingBag className="w-4 h-4" />
                    {sale.totalItems} {t("cashier.items", "items")}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaleClick(sale);
                    }}
                    className="px-3 py-1 text-primary border border-primary/30 text-xs rounded-md hover:bg-primary/10 hover:border-primary/50 transition-all duration-200 flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    {t("cashier.view", "View")}
                  </button>
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
      />
    </div>
  );
};

export default HistoryBrowser;
