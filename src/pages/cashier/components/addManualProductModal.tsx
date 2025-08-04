import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormModal } from "../../../lib/components/Modal";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Plus } from "lucide-react";
import type { CartItem } from "../../../types";

interface AddManualProductModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (product: CartItem) => void;
}

export default function AddManualProductModal({
  open,
  onClose,
  onAdd,
}: AddManualProductModalProps) {
  const { t } = useTranslation();
  const [manualProduct, setManualProduct] = useState({
    name: "",
    type: "",
    sold: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !manualProduct.name.trim() ||
      !manualProduct.type.trim() ||
      !manualProduct.sold
    )
      return;

    onAdd({
      id: `manual-${Date.now()}`,
      name: manualProduct.name,
      price: manualProduct.sold,
      qty: 1,
      isManual: true,
      manualProductType: manualProduct.type,
    });

    // Reset form
    setManualProduct({ name: "", type: "", sold: 0 });
    onClose();
  };

  const handleClose = () => {
    setManualProduct({ name: "", type: "", sold: 0 });
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={t("cashier.addManualProduct", "Add Manual Product")}
      subtitle={t(
        "cashier.addManualProductDesc",
        "Add a product that is not in your inventory",
      )}
      icon={<Plus className="w-5 h-5 text-green-500" />}
      size="lg"
      className="max-w-md"
      onSubmit={handleSubmit}
      submitText={t("cashier.addToCart", "Add to Cart")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={
        !manualProduct.name.trim() ||
        !manualProduct.type.trim() ||
        !manualProduct.sold
      }
    >
      {/* Product Information Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.productName", "Product Name")} *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={manualProduct.name}
              onChange={(e) =>
                setManualProduct((p) => ({ ...p, name: e.target.value }))
              }
              placeholder={t("cashier.enterProductName", "Enter product name")}
              required
            />
          </Legend>
          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.type", "Type")} *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={manualProduct.type}
              onChange={(e) =>
                setManualProduct((p) => ({ ...p, type: e.target.value }))
              }
              placeholder={t("cashier.enterType", "Enter product type")}
              required
            />
          </Legend>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="space-y-4">
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t("cashier.pricing", "Pricing Information")}
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <Legend>
              <label className="text-sm font-medium text-foreground">
                {t("cashier.soldPrice", "Sold Price")} *
              </label>
              <div className="w-full">
                <StyledNumberInput
                  value={manualProduct.sold}
                  onChange={(val) =>
                    setManualProduct((p) => ({
                      ...p,
                      sold: val === "" ? 0 : val,
                    }))
                  }
                  min={0}
                  placeholder="0"
                />
              </div>
            </Legend>
          </div>
        </div>
      </div>
    </FormModal>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}
