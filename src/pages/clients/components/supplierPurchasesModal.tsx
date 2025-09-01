import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Package, Clock, User, DollarSign, Loader2, ChevronDown } from "lucide-react";
import { Modal } from "../../../lib/components/modal";
import type { Seller } from "@prisma/client";
import type { PurchaseWithItems } from "../../../lib/database/purchases";

interface SupplierPurchasesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Seller | null;
}

export const SupplierPurchasesModal = ({
  open,
  onOpenChange,
  supplier,
}: SupplierPurchasesModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [purchases, setPurchases] = useState<PurchaseWithItems[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLimit, setPurchaseLimit] = useState(10);

  // Fetch purchases when modal opens
  useEffect(() => {
    if (open && supplier) {
      fetchPurchases();
    }
  }, [open, supplier]);

  const fetchPurchases = async () => {
    if (!supplier) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const purchasesData = await window.api.database.purchases.getBySeller(supplier.id);
      setPurchases(purchasesData);
    } catch (err) {
      setError(t("suppliers.fetchError", "Failed to fetch purchases"));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    const saleDate = new Date(date);
    const now = new Date();

    // Check if it's today
    const isToday = saleDate.toDateString() === now.toDateString();
    
    const hours = saleDate.getHours().toString().padStart(2, '0');
    const minutes = saleDate.getMinutes().toString().padStart(2, '0');

    if (isToday) {
      return `${t("today")} - ${hours}:${minutes}`;
    } else {
      // Format: DD/MM/YYYY - HH:MM
      const day = saleDate.getDate().toString().padStart(2, '0');
      const month = (saleDate.getMonth() + 1).toString().padStart(2, '0');
      const year = saleDate.getFullYear();

      return `${day}/${month}/${year} - ${hours}:${minutes}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  // Calculate summary statistics
  const totalPurchases = purchases.length;
  const totalQuantity = purchases.reduce((sum, purchase) => 
    sum + purchase.PurchaseItems.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  );
  const totalCost = purchases.reduce((sum, purchase) => 
    sum + purchase.PurchaseItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0), 0
  );

  if (!supplier) return null;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("suppliers.supplierPurchases", "Supplier Purchases")}
      subtitle={t("suppliers.supplierPurchasesFor", { name: supplier.name })}
      icon={<Package className="w-5 h-5 text-blue-600" />}
      showCloseButton={true}
      size="xl"
      className="min-w-[80%] max-h-[80vh] overflow-y-auto"
      showFooter={false}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">
            {t("suppliers.noPurchasesFound", "No purchases found for this supplier")}
          </p>
          <p className="text-sm opacity-70">
            {t("suppliers.noPurchasesDesc", "This supplier has no purchase history yet")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className={`text-center ${isRTL ? "text-right" : "text-left"}`}>
              <div className="text-2xl font-bold text-primary">
                {totalPurchases}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("suppliers.totalPurchases", "Total Purchases")}
              </div>
            </div>
            <div className={`text-center ${isRTL ? "text-right" : "text-left"}`}>
              <div className="text-2xl font-bold text-green-600">
                {totalQuantity}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("suppliers.totalQuantity", "Total Quantity")}
              </div>
            </div>
            <div className={`text-center ${isRTL ? "text-right" : "text-left"}`}>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalCost)}
              </div>
              <div className="text-sm text-muted-foreground">
                {t("suppliers.totalCost", "Total Cost")}
              </div>
            </div>
          </div>

          {/* Purchases Table */}
          <div className="border rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.purchaseId", "Purchase ID")}
                    </th>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.date", "Date")}
                    </th>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.product", "Product")}
                    </th>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.category", "Category")}
                    </th>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.quantity", "Quantity")}
                    </th>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.price", "Price")}
                    </th>
                    <th
                      className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                    >
                      {t("suppliers.total", "Total")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.slice(0, purchaseLimit).map((purchase) =>
                    purchase.PurchaseItems.map((item, index) => (
                      <tr
                        key={`${purchase.id}-${item.id}`}
                        className="hover:bg-muted/40 transition"
                      >
                        <td
                          className={`px-4 py-3 text-sm font-mono text-blue-600 font-medium ${isRTL ? "text-right" : "text-left"}`}
                        >
                          #{purchase.id.slice(-8)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {formatDate(purchase.createdAt)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {item.product.name}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {item.product.categoryName}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                            <span className="text-xs">+</span>
                            {item.quantity}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {formatCurrency(item.price)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm font-medium text-blue-600 ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {formatCurrency(item.quantity * item.price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Show More Button */}
          {purchases.length > 10 && (
            <div className="flex justify-center mt-4">
              {purchaseLimit < purchases.length ? (
                <button
                  onClick={() => setPurchaseLimit(prev => Math.min(prev + 10, purchases.length))}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  {t("stock.showMore", "Show More")} ({Math.min(10, purchases.length - purchaseLimit)} {t("stock.more", "more")})
                </button>
              ) : (
                <button
                  onClick={() => setPurchaseLimit(10)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("stock.showLess", "Show Less")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default SupplierPurchasesModal;
