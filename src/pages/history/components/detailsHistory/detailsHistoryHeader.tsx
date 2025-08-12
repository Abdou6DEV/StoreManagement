import { useTranslation } from "react-i18next";
import { FileText, ShoppingCart, CreditCard } from "lucide-react";
import type { SelectedPeriod } from "../../../../types";

interface DetailsHistoryHeaderProps {
  selectedPeriod: SelectedPeriod;
  salesCount: number;
  paymentsCount: number;
  purchasesCount: number;
}

export default function DetailsHistoryHeader({
  selectedPeriod,
  salesCount,
  paymentsCount,
  purchasesCount,
}: DetailsHistoryHeaderProps) {
  const { t } = useTranslation();

  const getPeriodDisplayName = () => {
    if (selectedPeriod.period === "day") {
      return new Date(selectedPeriod.periodValue).toLocaleDateString();
    } else if (selectedPeriod.period === "month") {
      const [year, month] = selectedPeriod.periodValue.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      });
    } else {
      return selectedPeriod.periodValue;
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/3 to-primary/6 border border-primary/15 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {t("history.detailedHistory")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {getPeriodDisplayName()}
          </p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-600" />
            <span>{salesCount} Sales</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-green-600" />
            <span>{paymentsCount} Payments</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-600" />
            <span>{purchasesCount} Purchases</span>
          </div>
        </div>
      </div>
    </div>
  );
}
