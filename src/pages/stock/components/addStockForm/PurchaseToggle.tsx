import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { Switch } from "../../../../lib/components/switch";

interface PurchaseToggleProps {
  isPurchaseMode: boolean;
  setIsPurchaseMode: (checked: boolean) => void;
}

export default function PurchaseToggle({
  isPurchaseMode,
  setIsPurchaseMode,
}: PurchaseToggleProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <ShoppingCart className="w-5 h-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-sm">
            {isPurchaseMode
              ? t("stock.purchaseMode", "Purchase Mode")
              : t("stock.inventoryMode", "Inventory Mode")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isPurchaseMode
              ? t(
                  "stock.purchaseModeDesc",
                  "Record as purchase and track spending"
                )
              : t(
                  "stock.inventoryModeDesc",
                  "Add to inventory without purchase record"
                )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {t("stock.inventoryOnly", "Inventory")}
        </span>
        <Switch checked={isPurchaseMode} onCheckedChange={setIsPurchaseMode} />
        <span className="text-sm text-muted-foreground">
          {t("stock.recordPurchase", "Purchase")}
        </span>
      </div>
    </div>
  );
}
