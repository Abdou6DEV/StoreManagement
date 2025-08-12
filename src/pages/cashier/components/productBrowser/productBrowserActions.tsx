import React from "react";
import { useTranslation } from "react-i18next";
import type { ProductBrowserActionsProps } from "./productBrowserTypes";

const ProductBrowserActions: React.FC<ProductBrowserActionsProps> = ({
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-center gap-2 mt-2">
      <button
        onClick={onConfirm}
        className="py-2 px-4 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 border border-border"
      >
        {t("cashier.confirm", "Confirm")}
      </button>
      <button
        onClick={onCancel}
        className="py-2 px-4 rounded-md font-medium bg-muted text-foreground hover:bg-muted/80 border border-border"
      >
        {t("cashier.cancel", "Cancel")}
      </button>
    </div>
  );
};

export default ProductBrowserActions;
