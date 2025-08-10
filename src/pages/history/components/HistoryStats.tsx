import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingCart, CreditCard, DollarSign, TrendingUp } from "lucide-react";
import type { HistoryTab } from "../index";

interface HistoryStatsProps {
  stats: {
    totalSales: number;
    totalRevenue: number;
    totalPayments: number;
    totalPaymentAmount: number;
  };
  activeTab: HistoryTab;
}

export const HistoryStats: React.FC<HistoryStatsProps> = React.memo(({ stats, activeTab }) => {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  if (activeTab === "sales") {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-medium text-muted-foreground">
              {t("history.totalSales", "Total Sales")}
            </div>
          </div>
          <div className="text-2xl font-bold">{formatNumber(stats.totalSales)}</div>
          <p className="text-xs text-muted-foreground">
            {t("history.salesInPeriod", "Sales in selected period")}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-medium text-muted-foreground">
              {t("history.totalRevenue", "Total Revenue")}
            </div>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          <p className="text-xs text-muted-foreground">
            {t("history.revenueInPeriod", "Revenue in selected period")}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <div className="text-sm font-medium text-muted-foreground">
              {t("history.averageSale", "Average Sale")}
            </div>
          </div>
          <div className="text-2xl font-bold">
            {stats.totalSales > 0 ? formatCurrency(stats.totalRevenue / stats.totalSales) : formatCurrency(0)}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("history.perTransaction", "Per transaction")}
          </p>
        </div>


      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm font-medium text-muted-foreground">
            {t("history.totalPayments", "Total Payments")}
          </div>
        </div>
        <div className="text-2xl font-bold">{formatNumber(stats.totalPayments)}</div>
        <p className="text-xs text-muted-foreground">
          {t("history.paymentsInPeriod", "Payments in selected period")}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm font-medium text-muted-foreground">
            {t("history.totalAmount", "Total Amount")}
          </div>
        </div>
        <div className="text-2xl font-bold">{formatCurrency(stats.totalPaymentAmount)}</div>
        <p className="text-xs text-muted-foreground">
          {t("history.amountInPeriod", "Amount in selected period")}
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <div className="text-sm font-medium text-muted-foreground">
            {t("history.averagePayment", "Average Payment")}
          </div>
        </div>
        <div className="text-2xl font-bold">
          {stats.totalPayments > 0 ? formatCurrency(stats.totalPaymentAmount / stats.totalPayments) : formatCurrency(0)}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("history.perPayment", "Per payment")}
        </p>
      </div>


    </div>
  );
});
