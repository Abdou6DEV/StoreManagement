import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { ShoppingCart, CreditCard } from "lucide-react";
import type { HistoryTab } from "../index";

interface HistoryTabsProps {
  activeTab: HistoryTab;
  onTabChange: (tab: HistoryTab) => void;
}

export const HistoryTabs: React.FC<HistoryTabsProps> = React.memo(({
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex space-x-1 rounded-lg bg-muted p-1">
      <Button
        variant={activeTab === "sales" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("sales")}
        className={`flex items-center gap-2 ${activeTab === "sales" ? "" : "border border-gray-300"}`}
      >
        <ShoppingCart className="h-4 w-4" />
        {t("history.sales", "Sales")}
      </Button>
      <Button
        variant={activeTab === "payments" ? "default" : "ghost"}
        size="sm"
        onClick={() => onTabChange("payments")}
        className={`flex items-center gap-2 ${activeTab === "payments" ? "" : "border border-gray-300"}`}
      >
        <CreditCard className="h-4 w-4" />
        {t("history.payments", "Payments")}
      </Button>
    </div>
  );
});
