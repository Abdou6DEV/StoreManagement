import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../lib/components/modal";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { DatePicker } from "../../../lib/components/datePicker";
import { Package, X } from "lucide-react";
import type { CartItem } from "../../../types";

interface CategoryInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onSubmit: (info: CategoryInfo) => void;
  cartItems: CartItem[];
  categoriesRequiringInfo: string[];
  allProducts: any[];
}

export interface CategoryInfo {
  imeiSerialNumber?: string;
  warranty?: string;
  usedNew?: "used" | "new";
  problemsReplacedParts?: string;
}

export default function CategoryInfoModal({
  open,
  onClose,
  onSkip,
  onSubmit,
  cartItems,
  categoriesRequiringInfo,
  allProducts,
}: CategoryInfoModalProps) {
  const { t } = useTranslation();
  const [categoryInfo, setCategoryInfo] = useState<CategoryInfo>({
    imeiSerialNumber: "",
    warranty: "",
    usedNew: "new",
    problemsReplacedParts: "",
  });

  // Get products that require additional information
  const productsRequiringInfo = cartItems.filter((item) => {
    if (item.isManual || item.isService) return false;
    const product = allProducts.find((p) => p.id === item.id);
    return product && categoriesRequiringInfo.includes(product.categoryName || "");
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(categoryInfo);
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleCancel = () => {
    onClose();
  };

  const resetForm = () => {
    setCategoryInfo({
      imeiSerialNumber: "",
      warranty: "",
      usedNew: "new",
      problemsReplacedParts: "",
    });
  };

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t("cashier.categoryInfoRequired", "Additional Information Required")}
      subtitle={t("cashier.categoryInfoDesc", "Please provide additional information for products in this category")}
      icon={<Package className="w-6 h-6 text-blue-600" />}
      showFooter={false}
    >
      <div className="space-y-6">
        {/* Products requiring info */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">
            {t("cashier.productsRequiringInfo", "Products requiring additional information")}:
          </h4>
          <div className="space-y-1">
            {productsRequiringInfo.map((item) => (
              <div key={item.id} className="text-sm text-muted-foreground">
                • {item.name} (x{item.qty})
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IMEI/Serial Number */}
          <div className="space-y-2">
            <label htmlFor="imeiSerialNumber" className="text-sm font-medium">
              {t("cashier.imeiSerialNumber", "IMEI/Serial Number")}
            </label>
            <Input
              id="imeiSerialNumber"
              value={categoryInfo.imeiSerialNumber || ""}
              onChange={(e) =>
                setCategoryInfo((prev) => ({
                  ...prev,
                  imeiSerialNumber: e.target.value,
                }))
              }
              placeholder={t("cashier.imeiSerialNumberPlaceholder", "Enter IMEI or serial number")}
            />
          </div>

          {/* Warranty */}
          <div className="space-y-2">
            <label htmlFor="warranty" className="text-sm font-medium">
              {t("cashier.warranty", "Warranty")}
            </label>
            <DatePicker
              value={categoryInfo.warranty || ""}
              onChange={(date) =>
                setCategoryInfo((prev) => ({
                  ...prev,
                  warranty: date,
                }))
              }
              placeholder={t("cashier.warrantyPlaceholder", "Select warranty date")}
            />
          </div>

          {/* Used/New */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("cashier.condition", "Condition")}
            </label>
            <div className="flex gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="usedNew"
                  value="new"
                  checked={categoryInfo.usedNew === "new"}
                  onChange={(e) =>
                    setCategoryInfo((prev) => ({
                      ...prev,
                      usedNew: e.target.value as "used" | "new",
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">{t("cashier.new", "New")}</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="usedNew"
                  value="used"
                  checked={categoryInfo.usedNew === "used"}
                  onChange={(e) =>
                    setCategoryInfo((prev) => ({
                      ...prev,
                      usedNew: e.target.value as "used" | "new",
                    }))
                  }
                  className="w-4 h-4"
                />
                <span className="text-sm">{t("cashier.used", "Used")}</span>
              </label>
            </div>
          </div>

          {/* Problems/Replaced Parts */}
          <div className="space-y-2">
            <label htmlFor="problemsReplacedParts" className="text-sm font-medium">
              {t("cashier.problemsReplacedParts", "Problems/Replaced Parts")}
            </label>
            <textarea
              id="problemsReplacedParts"
              value={categoryInfo.problemsReplacedParts || ""}
              onChange={(e) =>
                setCategoryInfo((prev) => ({
                  ...prev,
                  problemsReplacedParts: e.target.value,
                }))
              }
              placeholder={t("cashier.problemsReplacedPartsPlaceholder", "Describe any problems or replaced parts")}
              className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full sm:w-auto"
            >
              <X className="w-4 h-4 mr-2" />
              {t("cashier.cancel", "Cancel")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleSkip}
              className="w-full sm:w-auto"
            >
              {t("cashier.skip", "Skip")}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
            >
              {t("cashier.submit", "Submit")}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
