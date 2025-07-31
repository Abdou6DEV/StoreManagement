import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";
import EditStockForm from "./editStockForm";
import type { ProductWithSales } from "../../../types";

interface EditProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string | null;
  setProductId: (id: string | null) => void;
  products: ProductWithSales[];
}

export const EditProductModal = ({
  open,
  onOpenChange,
  productId,
  setProductId,
  products,
}: EditProductModalProps) => {
  const { t } = useTranslation();
  const isRTL = i18n.language === "ar";

  const currentProduct = products.find((product) => product.id === productId);

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5/7" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Edit className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2
                  className={`text-xl font-bold text-foreground ${isRTL ? "text-right" : "text-left"}`}
                >
                  {t("stock.editTitle", "Edit Product")}
                </h2>
                <p
                  className={`text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}
                >
                  Editing {currentProduct?.name || "Unknown"}
                </p>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>
        <EditStockForm productID={productId} setProductID={setProductId} />
      </DialogContent>
    </Dialog>
  );
};
