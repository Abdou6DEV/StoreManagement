import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart } from "lucide-react";
import { SegmentedToggle } from "../../../../lib/components/segmentedToggle";

interface PurchaseToggleProps {
  isPurchaseMode: boolean;
  setIsPurchaseMode: (checked: boolean) => void;
  /** When true, skip outer card chrome (used inside a shared toggle group). */
  bare?: boolean;
}

export default function PurchaseToggle({
  isPurchaseMode,
  setIsPurchaseMode,
  bare = false,
}: PurchaseToggleProps) {
  const { t } = useTranslation();

  return (
    <div
      className={
        bare
          ? "flex items-center justify-between gap-4 px-4 py-3"
          : "flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4"
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <ShoppingCart className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h3 className="text-sm font-medium">
            {isPurchaseMode
              ? t("stock.purchaseMode", "Purchase Mode")
              : t("stock.inventoryMode", "Inventory Mode")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isPurchaseMode
              ? t(
                  "stock.purchaseModeDesc",
                  "Record as purchase and track spending",
                )
              : t(
                  "stock.inventoryModeDesc",
                  "Add to inventory without purchase record",
                )}
          </p>
        </div>
      </div>

      <SegmentedToggle
        aria-label={t("stock.purchaseMode", "Purchase Mode")}
        accent="green"
        value={isPurchaseMode ? "purchase" : "inventory"}
        onChange={(v) => setIsPurchaseMode(v === "purchase")}
        options={[
          { value: "inventory", label: t("stock.inventoryOnly", "Inventory") },
          { value: "purchase", label: t("stock.recordPurchase", "Purchase") },
        ]}
      />
    </div>
  );
}
