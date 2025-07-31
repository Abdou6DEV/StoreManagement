import { useTranslation } from "react-i18next";
import { Info, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";

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
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t("stock.purchaseHistory", "Purchase History")}
              </h3>

              {productData.purchases && productData.purchases.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            {t("stock.date", "Date")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            {t("stock.seller", "Seller")}
                          </th>
                          <th className="px-4 py-3 text-left text-sm font-medium">
                            {t("stock.quantity", "Quantity")}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {productData.purchases.map(
                          (purchase: any, index: number) => (
                            <tr key={index} className="hover:bg-muted/30">
                              <td className="px-4 py-3 text-sm">
                                {new Date(
                                  purchase.createdAt,
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                {purchase.seller?.name ||
                                  t("stock.noSeller", "No Seller")}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium">
                                {purchase.quantity}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {t(
                      "stock.noPurchaseHistory",
                      "No purchase history available",
                    )}
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
