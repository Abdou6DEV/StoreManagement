import { useTranslation } from "react-i18next";
import { DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface TotalsFooterProps {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
}

export const TotalsFooter = ({
  totalRevenue,
  totalCost,
  totalProfit,
  completedCount,
  pendingCount,
  overdueCount,
}: TotalsFooterProps) => {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency", "DA")}`;
  };

  return (
    <div className="border-t border-border bg-muted/20">
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          {/* Revenue */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-muted-foreground">{t("services.totalRevenue", "Total Revenue")}</div>
              <div className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</div>
            </div>
          </div>

          {/* Cost */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-600" />
            <div>
              <div className="text-muted-foreground">{t("services.totalCost", "Total Cost")}</div>
              <div className="font-semibold text-orange-600">{formatCurrency(totalCost)}</div>
            </div>
          </div>

          {/* Profit */}
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-muted-foreground">{t("services.totalProfit", "Total Profit")}</div>
              <div className={`font-semibold ${totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(totalProfit)}
              </div>
            </div>
          </div>

          {/* Completed */}
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-muted-foreground">{t("services.completed", "Completed")}</div>
              <div className="font-semibold text-green-600">{completedCount}</div>
            </div>
          </div>

          {/* Pending */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-muted-foreground">{t("services.pending", "Pending")}</div>
              <div className="font-semibold text-blue-600">{pendingCount}</div>
            </div>
          </div>

          {/* Overdue */}
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div>
              <div className="text-muted-foreground">{t("services.overdue", "Overdue")}</div>
              <div className="font-semibold text-red-600">{overdueCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

