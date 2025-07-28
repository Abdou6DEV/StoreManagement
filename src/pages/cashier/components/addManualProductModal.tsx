import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";
import { Button } from "../../../lib/components/button";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { X } from "lucide-react";
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
    bought: 0,
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
    });

    // Reset form
    setManualProduct({ name: "", type: "", bought: 0, sold: 0 });
    onClose();
  };

  const handleClose = () => {
    setManualProduct({ name: "", type: "", bought: 0, sold: 0 });
    onClose();
  };

  return (
    <Dialog modal open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent showCloseButton={false} style={{ maxWidth: 500 }}>
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">
            {t("cashier.addManualProduct", "Add Manual Product")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              "cashier.addManualProductDesc",
              "Add a product that is not in your inventory",
            )}
          </p>
        </DialogHeader>
        <Button
          variant="outline"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>
        <form className="space-y-6" onSubmit={handleSubmit}>
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
                  placeholder={t(
                    "cashier.enterProductName",
                    "Enter product name",
                  )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Legend>
                  <label className="text-sm font-medium text-foreground">
                    {t("cashier.boughtPrice", "Bought Price")}
                  </label>
                  <div className="w-full">
                    <StyledNumberInput
                      value={manualProduct.bought}
                      onChange={(val) =>
                        setManualProduct((p) => ({
                          ...p,
                          bought: val === "" ? 0 : val,
                        }))
                      }
                      min={0}
                      placeholder="0"
                    />
                  </div>
                </Legend>
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="submit" className="flex-1">
              {t("cashier.addToCart", "Add to Cart")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}
