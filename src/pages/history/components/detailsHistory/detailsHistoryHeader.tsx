import { useTranslation } from "react-i18next";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import type { SelectedPeriod } from "../../../../types";
import { formatCurrency } from "../generalHistory/generalHistoryUtils";
import { AnimatedNumber } from "../../../../lib/components/animatedNumber";

/** Same display rules as the main period title (localized date / month / year). */
function formatPeriodDisplayName(period: SelectedPeriod): string {
  if (period.period === "day") {
    return new Date(period.periodValue).toLocaleDateString();
  }
  if (period.period === "month") {
    const [year, month] = period.periodValue.split("-");
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "long",
      },
    );
  }
  return period.periodValue;
}

interface DetailsHistoryHeaderProps {
  selectedPeriod: SelectedPeriod;
  salesCount: number;
  purchasesCount: number;
  billsPaymentsCount: number;
  billsPaymentsTotal: number;
  salesTotal: number;
  salesProfit: number;
  purchasesTotal: number;
  previousPeriodRevenue: number;
  previousPeriodProfit: number;
  growthBaselineAvailable: boolean;
  comparisonPeriod: SelectedPeriod | null;
}

function GrowthBadge({
  rate,
  unavailable,
  comparedPeriodLabel,
}: {
  rate: number;
  unavailable: boolean;
  comparedPeriodLabel: string | null;
}) {
  const { t } = useTranslation();

  if (unavailable) {
    return (
      <div
        className="w-full flex justify-center text-center text-sm text-muted-foreground tabular-nums"
        title={t("history.growthNoPreviousPeriod")}
      >
        —
      </div>
    );
  }

  const safe = isNaN(rate) || !isFinite(rate) ? 0 : rate;
  const positive = safe >= 0;
  const tooltip =
    comparedPeriodLabel !== null
      ? t("history.growthVsPreviousPeriodDetail", {
          period: comparedPeriodLabel,
        })
      : t("history.growthVsPreviousPeriod");

  return (
    <p
      className="w-full text-center text-sm leading-normal"
      title={tooltip}
    >
      <span
        className={`inline-flex align-middle items-center gap-1 ${
          positive
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {positive ? (
          <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <TrendingDown className="h-4 w-4 shrink-0" aria-hidden />
        )}
        <span className="font-semibold tabular-nums">
          {positive ? "+" : ""}
          {safe.toFixed(1)}%
        </span>
      </span>
      {comparedPeriodLabel !== null ? (
        <>
          {" "}
          <span className="align-middle text-xs text-muted-foreground">
            {t("history.growthFromPeriod", { period: comparedPeriodLabel })}
          </span>
        </>
      ) : null}
    </p>
  );
}

export default function DetailsHistoryHeader({
  selectedPeriod,
  salesCount,
  purchasesCount,
  billsPaymentsCount,
  billsPaymentsTotal,
  salesTotal,
  salesProfit,
  purchasesTotal,
  previousPeriodRevenue,
  previousPeriodProfit,
  growthBaselineAvailable,
  comparisonPeriod,
}: DetailsHistoryHeaderProps) {
  const { t } = useTranslation();

  const getPeriodDisplayName = () => formatPeriodDisplayName(selectedPeriod);

  const comparedPeriodLabel =
    growthBaselineAvailable && comparisonPeriod !== null
      ? formatPeriodDisplayName(comparisonPeriod)
      : null;

  const calculateGrowthRate = (current: number, previous: number) => {
    if (isNaN(current) || isNaN(previous) || !isFinite(current) || !isFinite(previous)) {
      return 0;
    }
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const salesGrowthRate = calculateGrowthRate(salesTotal, previousPeriodRevenue);
  const profitGrowthRate = calculateGrowthRate(salesProfit, previousPeriodProfit);

  const safeSalesTotal = isNaN(salesTotal) ? 0 : salesTotal;
  const safeProfit = isNaN(salesProfit) ? 0 : salesProfit;
  const safeBillsTotal = isNaN(billsPaymentsTotal) ? 0 : billsPaymentsTotal / 100;
  const safePurchasesTotal = isNaN(purchasesTotal) ? 0 : purchasesTotal;

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border space-y-6">
      <div className="flex items-center justify-center gap-2 flex-wrap text-center px-2">
        <Calendar className="h-6 w-6 text-primary shrink-0" aria-hidden />
        <h2 className="text-xl font-semibold text-foreground tracking-tight">
          {getPeriodDisplayName()}
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("dashboard.revenue")}
          </span>
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0">
            <AnimatedNumber
              value={safeSalesTotal}
              className="text-3xl font-bold text-primary leading-none"
              format={(amount) => formatCurrency(amount)}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap leading-none">
              {salesCount.toLocaleString()} {t("history.sales")}
            </span>
          </div>
          <GrowthBadge
            rate={salesGrowthRate}
            unavailable={!growthBaselineAvailable}
            comparedPeriodLabel={comparedPeriodLabel}
          />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("dashboard.profit")}
          </span>
          <AnimatedNumber
            value={safeProfit}
            className="text-3xl font-bold text-green-600 dark:text-green-400"
            format={(amount) => formatCurrency(amount)}
          />
          <GrowthBadge
            rate={profitGrowthRate}
            unavailable={!growthBaselineAvailable}
            comparedPeriodLabel={comparedPeriodLabel}
          />
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("history.totalBillsPayments")}
          </span>
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0">
            <AnimatedNumber
              value={safeBillsTotal}
              className="text-3xl font-bold text-purple-600 dark:text-purple-400 leading-none"
              format={(amount) => formatCurrency(amount)}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap leading-none">
              {billsPaymentsCount.toLocaleString()} {t("history.payments")}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("history.totalPurchases")}
          </span>
          <div className="flex flex-wrap items-baseline justify-center gap-x-2 gap-y-0">
            <AnimatedNumber
              value={safePurchasesTotal}
              className="text-3xl font-bold text-orange-600 dark:text-orange-400 leading-none"
              format={(amount) => formatCurrency(amount)}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap leading-none">
              {purchasesCount.toLocaleString()} {t("history.purchases")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
