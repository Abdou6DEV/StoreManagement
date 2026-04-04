import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Edit } from "lucide-react";
import { Modal } from "../../../lib/components/modal";
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
  const [formDirty, setFormDirty] = useState(false);

  useEffect(() => {
    if (!open) setFormDirty(false);
  }, [open]);

  const currentProduct = products.find((product) => product.id === productId);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("stock.editTitle", "Edit Product")}
      subtitle={`Editing ${currentProduct?.name || "Unknown"}`}
      icon={<Edit className="w-5 h-5 text-green-600" />}
      size="lg"
      className="min-w-[85%]"
      showCloseButton={false}
      showFooter={false}
      hasUnsavedChanges={formDirty}
      onDiscard={() => {
        setFormDirty(false);
        setProductId(null);
      }}
    >
      <EditStockForm
        productID={productId}
        setProductID={setProductId}
        onDirtyChange={setFormDirty}
      />
    </Modal>
  );
};
