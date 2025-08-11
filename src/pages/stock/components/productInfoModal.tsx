import { useTranslation } from "react-i18next";
import { Info, Package, ShoppingCart } from "lucide-react";
import { Modal } from "../../../lib/components/Modal";
import { Client, Sale, SaleItem } from "@prisma/client";
import { ProductAvatar } from "../../../lib/components/productAvatar";

interface ProductInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productData: {
    id: string;
    name: string;
    categoryName: string;
    quantity: number;
    boughtPrice: number;
    sellingPrice: number;
    codebar: string | null;
    photo: string | null;
    PurchaseItems?: Array<{
      id: string;
      quantity: number;
      price: number;
      createdAt: string;
      purchase: {
        id: string;
        seller: {
          name: string;
        } | null;
      };
    }>;
    saleItems?: Array<SaleItem & { sale: Sale & { client: Client | null } }>;
  } | null;
  loading: boolean;
}

export const ProductInfoModal = ({
  open,
  onOpenChange,
  productData,
  loading,
}: ProductInfoModalProps) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("stock.productInfo", "Product Information")}
      subtitle={productData?.name || "Loading..."}
      icon={<Info className="w-5 h-5 text-blue-600" />}
      showCloseButton={false}
      size="lg"
      className="min-w-[70%] max-h-[70vh] overflow-y-auto"
      showFooter={false}
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : productData ? (
        <div className="space-y-6">
          {/* Product Photo */}
          <div className="flex justify-center">
            {productData.photo ? (
              <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-border">
                <img
                  src={productData.photo}
                  alt={productData.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                />
              </div>
            ) : (
              <ProductAvatar name={productData.name} size="lg" />
            )}
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("stock.productName", "Product Name")}
              </label>
              <p className="text-foreground font-medium">{productData.name}</p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("stock.category", "Category")}
              </label>
              <p className="text-foreground">{productData.categoryName}</p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("stock.currentStock", "Current Stock")}
              </label>
              <p className="text-foreground font-medium">
                {productData.quantity}
              </p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("stock.boughtPrice", "Bought Price")}
              </label>
              <p className="text-foreground">{productData.boughtPrice}</p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("stock.sellingPrice", "Selling Price")}
              </label>
              <p className="text-foreground">{productData.sellingPrice}</p>
            </div>
            <div className={isRTL ? "text-right" : "text-left"}>
              <label className="text-sm font-medium text-muted-foreground">
                {t("stock.barcode", "Barcode")}
              </label>
              <p className="text-foreground">{productData.codebar || "N/A"}</p>
            </div>
          </div>

          {/* Purchase History */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3
                className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <Package className="w-5 h-5" />
                {t("stock.purchaseHistory", "Purchase History")}
              </h3>
              {productData.PurchaseItems &&
                productData.PurchaseItems.length > 0 && (
                  <div
                    className={`flex gap-4 text-sm text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
                  >
                    <span>
                      {t("stock.totalPurchases", "Total Purchases")}:{" "}
                      {productData.PurchaseItems.length}
                    </span>
                    <span>
                      {t("stock.totalQuantityPurchased", "Total Quantity")}:{" "}
                      {productData.PurchaseItems.reduce(
                        (sum: number, item: { quantity: number }) =>
                          sum + item.quantity,
                        0,
                      )}
                    </span>
                    <span>
                      {t("stock.totalCost", "Total Cost")}:{" "}
                      {productData.PurchaseItems.reduce(
                        (
                          sum: number,
                          item: { quantity: number; price: number },
                        ) => sum + item.quantity * item.price,
                        0,
                      )}
                    </span>
                  </div>
                )}
            </div>

            {productData.PurchaseItems &&
            productData.PurchaseItems.length > 0 ? (
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.purchaseId", "Purchase ID")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.date", "Date")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.seller", "Seller")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.quantity", "Quantity")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.price", "Price")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.total", "Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productData.PurchaseItems.map(
                        (
                          purchaseItem: {
                            id: string;
                            quantity: number;
                            price: number;
                            createdAt: string;
                            purchase: {
                              id: string;
                              seller: { name: string } | null;
                            };
                          },
                          index: number,
                        ) => (
                          <tr
                            key={index}
                            className="hover:bg-muted/40 transition"
                          >
                            <td
                              className={`px-4 py-3 text-sm font-mono text-blue-600 font-medium ${isRTL ? "text-right" : "text-left"}`}
                            >
                              #{purchaseItem.purchase.id.slice(-8)}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {new Date(
                                purchaseItem.createdAt,
                              ).toLocaleDateString()}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {purchaseItem.purchase.seller?.name ||
                                t("stock.noSeller", "No Seller")}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
                                <span className="text-xs">+</span>
                                {purchaseItem.quantity}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {purchaseItem.price || "N/A"}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm font-medium text-blue-600 ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {purchaseItem.quantity *
                                (purchaseItem.price || 0)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div
                className={`text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed ${isRTL ? "text-right" : "text-center"}`}
              >
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
              <h3
                className={`text-lg font-semibold flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <ShoppingCart className="w-5 h-5" />
                {t("stock.salesHistory", "Sales History")}
              </h3>
              {productData.saleItems && productData.saleItems.length > 0 && (
                <div
                  className={`flex gap-4 text-sm text-muted-foreground ${isRTL ? "flex-row-reverse" : ""}`}
                >
                  <span>
                    {t("stock.totalSales", "Total Sales")}:{" "}
                    {productData.saleItems.length}
                  </span>
                  <span>
                    {t("stock.totalQuantitySold", "Total Quantity")}:{" "}
                    {productData.saleItems.reduce(
                      (sum: number, item: SaleItem) => sum + item.quantity,
                      0,
                    )}
                  </span>
                  <span>
                    {t("stock.totalRevenue", "Total Revenue")}:{" "}
                    {productData.saleItems.reduce(
                      (sum: number, item: SaleItem) =>
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
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.saleId", "Sale ID")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.date", "Date")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.client", "Client")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.quantity", "Quantity")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.price", "Price")}
                        </th>
                        <th
                          className={`px-4 py-3 text-sm font-semibold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                        >
                          {t("stock.total", "Total")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {productData.saleItems.map(
                        (
                          saleItem: SaleItem & {
                            sale: Sale & { client: Client };
                          },
                          index: number,
                        ) => (
                          <tr
                            key={index}
                            className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                          >
                            <td
                              className={`px-4 py-3 text-sm font-mono text-blue-600 font-medium ${isRTL ? "text-right" : "text-left"}`}
                            >
                              #{saleItem.sale.id.slice(-8)}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {new Date(
                                saleItem.sale.createdAt,
                              ).toLocaleDateString()}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {saleItem.sale.client?.name ||
                                t("stock.noClient", "No Client")}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm font-medium">
                                <span className="text-xs">-</span>
                                {saleItem.quantity}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 text-sm text-foreground ${isRTL ? "text-right" : "text-left"}`}
                            >
                              {saleItem.price}
                            </td>
                            <td
                              className={`px-4 py-3 text-sm font-medium text-green-600 ${isRTL ? "text-right" : "text-left"}`}
                            >
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
              <div
                className={`text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed ${isRTL ? "text-right" : "text-center"}`}
              >
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2 text-center">
                  {t("stock.noSalesHistory", "No sales history available")}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`text-center py-8 text-muted-foreground ${isRTL ? "text-right" : "text-center"}`}
        >
          <p>
            {t(
              "stock.errorLoadingProduct",
              "Error loading product information",
            )}
          </p>
        </div>
      )}
    </Modal>
  );
};
