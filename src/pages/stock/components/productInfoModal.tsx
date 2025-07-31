import { useTranslation } from "react-i18next";
import { Info, Package, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";
import { Purchase, Seller } from "@prisma/client";

interface ProductInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productData: any | null;
  loading: boolean;
}

export const ProductInfoModal = ({
  open,
  onOpenChange,
  productData,
  loading,
}: ProductInfoModalProps) => {
  const { t } = useTranslation();

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="min-w-6xl max-h-[80vh] overflow-y-auto"
        showCloseButton={true}
      >
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {t("stock.productInfo", "Product Information")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {productData?.name || "Loading..."}
                </p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : productData ? (
          <div className="space-y-6">
            {/* Product Details */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("stock.productName", "Product Name")}
                </label>
                <p className="text-foreground font-medium">
                  {productData.name}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("stock.category", "Category")}
                </label>
                <p className="text-foreground">{productData.categoryName}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("stock.currentStock", "Current Stock")}
                </label>
                <p className="text-foreground font-medium">
                  {productData.quantity}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("stock.boughtPrice", "Bought Price")}
                </label>
                <p className="text-foreground">{productData.bought}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("stock.sellingPrice", "Selling Price")}
                </label>
                <p className="text-foreground">{productData.selling}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("stock.barcode", "Barcode")}
                </label>
                <p className="text-foreground">
                  {productData.codebar || "N/A"}
                </p>
              </div>
            </div>

            {/* Purchase History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  {t("stock.purchaseHistory", "Purchase History")}
                </h3>
                {productData.purchases && productData.purchases.length > 0 && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      {t("stock.totalPurchases", "Total Purchases")}:{" "}
                      {productData.purchases.length}
                    </span>
                    <span>
                      {t("stock.totalQuantityPurchased", "Total Quantity")}:{" "}
                      {productData.purchases.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0,
                      )}
                    </span>
                    <span>
                      {t("stock.totalCost", "Total Cost")}:{" "}
                      {productData.purchases.reduce(
                        (sum: number, item: any) =>
                          sum + item.quantity * item.price,
                        0,
                      )}
                    </span>
                  </div>
                )}
              </div>

              {productData.purchases && productData.purchases.length > 0 ? (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.purchaseId", "Purchase ID")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.date", "Date")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.seller", "Seller")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.quantity", "Quantity")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.price", "Price")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.total", "Total")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {productData.purchases.map(
                          (
                            purchase: Purchase & { seller: Seller },
                            index: number,
                          ) => (
                            <tr
                              key={index}
                              className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                            >
                              <td className="px-4 py-3 text-sm font-mono text-blue-600 font-medium">
                                #{purchase.id.slice(-8)}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {new Date(
                                  purchase.createdAt,
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {purchase.seller?.name ||
                                  t("stock.noSeller", "No Seller")}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                                  <span className="text-xs">+</span>
                                  {purchase.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {purchase.price || "N/A"}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-blue-600">
                                {purchase.quantity * (purchase.price || 0)}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">
                    {t(
                      "stock.noPurchaseHistory",
                      "No purchase history available",
                    )}
                  </p>
                  <p className="text-sm opacity-70">
                    Purchase records will appear here when stock is added
                  </p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>

            {/* Sales History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {t("stock.salesHistory", "Sales History")}
                </h3>
                {productData.saleItems && productData.saleItems.length > 0 && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>
                      {t("stock.totalSales", "Total Sales")}:{" "}
                      {productData.saleItems.length}
                    </span>
                    <span>
                      {t("stock.totalQuantitySold", "Total Quantity")}:{" "}
                      {productData.saleItems.reduce(
                        (sum: number, item: any) => sum + item.quantity,
                        0,
                      )}
                    </span>
                    <span>
                      {t("stock.totalRevenue", "Total Revenue")}:{" "}
                      {productData.saleItems.reduce(
                        (sum: number, item: any) =>
                          sum + item.quantity * item.price,
                        0,
                      )}
                    </span>
                  </div>
                )}
              </div>

              {productData.saleItems && productData.saleItems.length > 0 ? (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead className="bg-muted/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.saleId", "Sale ID")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.date", "Date")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.client", "Client")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.quantity", "Quantity")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.price", "Price")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">
                            {t("stock.total", "Total")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {productData.saleItems.map(
                          (saleItem: any, index: number) => (
                            <tr
                              key={index}
                              className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                            >
                              <td className="px-4 py-3 text-sm font-mono text-blue-600 font-medium">
                                #{saleItem.sale.id.slice(-8)}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {new Date(
                                  saleItem.sale.createdAt,
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {saleItem.sale.client?.name ||
                                  t("stock.noClient", "No Client")}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">
                                  <span className="text-xs">-</span>
                                  {saleItem.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-foreground">
                                {saleItem.price}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-green-600">
                                {saleItem.quantity * saleItem.price}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">
                    {t("stock.noSalesHistory", "No sales history available")}
                  </p>
                  <p className="text-sm opacity-70">
                    Sales records will appear here when this product is sold
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>
              {t(
                "stock.errorLoadingProduct",
                "Error loading product information",
              )}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
