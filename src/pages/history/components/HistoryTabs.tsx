import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, CreditCard } from "lucide-react";
import type { HistoryTab } from "../index";

interface HistoryTabsProps {
  activeTab: HistoryTab;
  onTabChange: (tab: HistoryTab) => void;
}

export const HistoryTabs: React.FC<HistoryTabsProps> = React.memo(
  ({ activeTab, onTabChange }) => {
    const { t } = useTranslation();

    return (
      <div className="flex w-full max-w-md mx-auto bg-card rounded-xl p-1.5 shadow-sm border border-border/50 gap-2">
        <button
          onClick={() => onTabChange("sales")}
          className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "sales"
              ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <ShoppingCart className={`h-4 w-4 transition-transform duration-200 ${
            activeTab === "sales" ? "scale-110" : ""
          }`} />
          <span className="text-sm font-medium">{t("history.sales", "Sales")}</span>
        </button>
        
        <button
          onClick={() => onTabChange("payments")}
          className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 ${
            activeTab === "payments"
              ? "bg-primary text-primary-foreground shadow-sm scale-[1.02]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          }`}
        >
          <CreditCard className={`h-4 w-4 transition-transform duration-200 ${
            activeTab === "payments" ? "scale-110" : ""
          }`} />
          <span className="text-sm font-medium">{t("history.payments", "Payments")}</span>
        </button>
      </div>
    );
  },
);
