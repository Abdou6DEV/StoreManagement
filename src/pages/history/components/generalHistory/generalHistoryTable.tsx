import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { AggregatedData, AggregationLevel } from "../../../../types";
import {
  formatCurrency,
  formatNumber,
  formatPeriod,
  calculateGrowthRate,
  formatGrowthRate,
} from "./generalHistoryUtils";
import { Tooltip } from "../../../../lib/components/tooltip";

interface GeneralHistoryTableProps {
  data: AggregatedData[];
  allData: AggregatedData[]; // Full dataset for average calculation
  aggregationLevel: AggregationLevel;
  onRowDoubleClick: (period: string) => void;
  highlightEnabled: boolean;
  netProfitEnabled: boolean;
  showTotalsRow: boolean;
  currentPage: number;
  itemsPerPage: number;
}

export default function GeneralHistoryTable({
  data,
  allData,
  aggregationLevel,
  onRowDoubleClick,
  highlightEnabled,
  netProfitEnabled,
  showTotalsRow,
  currentPage,
  itemsPerPage,
}: GeneralHistoryTableProps) {
  const { t } = useTranslation();

  const getBillsPaymentsValue = (item: AggregatedData) => {
    const amount = typeof item.billsPayments === "number" ? item.billsPayments : 0;
    return amount / 100;
  };

  const getProfitValue = (item: AggregatedData) => {
    const baseProfit = item.profit || 0;
    return netProfitEnabled ? baseProfit - getBillsPaymentsValue(item) : baseProfit;
  };

  // Calculate simple average profit from all filtered periods
  const averageProfit = allData.length > 0
    ? allData.reduce((sum, item) => sum + getProfitValue(item), 0) / allData.length
    : 0;

  const getRowHighlightClass = (profit: number) => {
    if (!highlightEnabled) return "";

    // Compare with average profit
    const profitDiff =
      ((profit - averageProfit) / Math.abs(averageProfit)) * 100;

    if (profitDiff >= 10) {
      return "bg-green-500/20 hover:bg-green-500/30";
    } else if (profitDiff < 0) {
      return "bg-red-500/20 hover:bg-red-500/30";
    }
    return "hover:bg-muted/50";
  };

  const getProfitTextClass = (profit: number) => {
    if (!highlightEnabled) {
      return "text-foreground";
    }

    const profitDiff =
      ((profit - averageProfit) / Math.abs(averageProfit)) * 100;

    if (profitDiff >= 10) {
      return "text-green-600 dark:text-green-400 font-bold";
    } else if (profitDiff < 0) {
      return "text-red-600 dark:text-red-400 font-bold";
    }
    return "text-foreground";
  };

  const getGrowthRateForRow = (item: AggregatedData, currentPageIndex: number) => {
    // Simple: Compare this period's profit with the average of all other periods
    return calculateGrowthRate(getProfitValue(item), averageProfit);
  };

  const getGrowthRateTextClass = (growthRate: number) => {
    if (growthRate > 0) {
      return "text-green-600 dark:text-green-400 font-bold";
    } else if (growthRate < 0) {
      return "text-red-600 dark:text-red-400 font-bold";
    }
    return "text-muted-foreground";
  };

  const pageFooterStats = useMemo(() => {
    if (!showTotalsRow || data.length === 0) return null;
    const totals = data.reduce(
      (acc, item) => ({
        count: acc.count + (item.count || 0),
        revenue: acc.revenue + (item.revenue || 0),
        profit: acc.profit + getProfitValue(item),
        purchases: acc.purchases + (item.purchases || 0),
        bills: acc.bills + getBillsPaymentsValue(item),
      }),
      { count: 0, revenue: 0, profit: 0, purchases: 0, bills: 0 },
    );
    const eps = 1e-6;
    let aboveAverageCount = 0;
    let belowAverageCount = 0;
    for (const item of data) {
      const p = getProfitValue(item);
      if (p - averageProfit > eps) aboveAverageCount += 1;
      else if (averageProfit - p > eps) belowAverageCount += 1;
    }
    return {
      ...totals,
      aboveAverageCount,
      belowAverageCount,
    };
  }, [data, averageProfit, netProfitEnabled, showTotalsRow]);

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border">
              <th className="text-left rtl:text-right p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.period")}
              </th>
              <th className="text-right rtl:text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.sales")}
              </th>
              <th className="text-right rtl:text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.revenue")}
              </th>
              <th className="text-right rtl:text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t(netProfitEnabled ? "history.netProfit" : "history.profit")}
              </th>
              <th className="text-right rtl:text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.purchases")}
              </th>
              <th className="text-right rtl:text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.billsPayments")}
              </th>
              <th className="text-right rtl:text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.averagepercent")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((item, index) => {
              return (
                <tr
                  key={item.period}
                  className={`group transition-all duration-200 hover:border-l-primary hover:border-r-primary border-l-4 border-r-4 border-l-transparent border-r-transparent cursor-pointer ${getRowHighlightClass(getProfitValue(item))}`}
                  onDoubleClick={() => onRowDoubleClick(item.period)}
                >
                <td className="px-4 py-3 font-medium text-foreground">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                    <span className="text-sm font-semibold">
                      {formatPeriod(item.period, aggregationLevel)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-[0.9375rem]">
                      {formatNumber(item.count)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-[0.9375rem]">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-semibold text-[0.9375rem] ${getProfitTextClass(getProfitValue(item))}`}
                    >
                      {formatCurrency(getProfitValue(item))}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-[0.9375rem]">
                      {formatCurrency(item.purchases)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-[0.9375rem]">
                      {formatCurrency(getBillsPaymentsValue(item))}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-semibold text-[0.9375rem] ${getGrowthRateTextClass(getGrowthRateForRow(item, index))}`}
                    >
                      {formatGrowthRate(getGrowthRateForRow(item, index))}
                    </span>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
          {pageFooterStats ? (
            <tfoot>
              <tr
                className="bg-muted/45 border-t-2 border-border font-semibold text-foreground"
                aria-label={t("history.totalsRowLabel")}
              >
                <td className="px-4 py-3 text-left rtl:text-right align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-tight">
                      {t("history.totalsRowLabel")}
                    </span>
                    <span className="text-xs text-muted-foreground/80 leading-tight">
                      {t("history.totalRowPageScope")}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right rtl:text-left align-top">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
                      {t("history.totalRowSales")}
                    </span>
                    <span className="text-lg md:text-xl font-bold tabular-nums leading-tight text-orange-600">
                      {formatNumber(pageFooterStats.count)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right rtl:text-left align-top">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
                      {t("history.totalRowRevenue")}
                    </span>
                    <span className="text-lg md:text-xl font-bold tabular-nums leading-tight text-primary">
                      {formatCurrency(pageFooterStats.revenue)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right rtl:text-left align-top">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
                      {t(netProfitEnabled ? "history.totalRowNetProfit" : "history.totalRowProfit")}
                    </span>
                    <span className="text-lg md:text-xl font-bold tabular-nums leading-tight text-green-600 dark:text-green-400">
                      {formatCurrency(pageFooterStats.profit)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right rtl:text-left align-top">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
                      {t("history.totalRowPurchases")}
                    </span>
                    <span className="text-lg md:text-xl font-bold tabular-nums leading-tight text-orange-600 dark:text-orange-400">
                      {formatCurrency(pageFooterStats.purchases)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right rtl:text-left align-top">
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
                      {t("history.totalRowBillsPayments")}
                    </span>
                    <span className="text-lg md:text-xl font-bold tabular-nums leading-tight text-purple-600 dark:text-purple-400">
                      {formatCurrency(pageFooterStats.bills)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right rtl:text-left align-top">
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide leading-none">
                      {t("history.totalRowVsAverage")}
                    </span>
                    <span className="inline-flex flex-wrap items-baseline justify-end gap-1.5">
                      <span className="text-sm md:text-sm font-bold tabular-nums leading-none text-green-600 dark:text-green-400">
                        {pageFooterStats.aboveAverageCount}
                      </span>
                      <span className="text-sm text-foreground">{t("history.totalRowAboveAverageSuffix")}</span>
                    </span>
                    <span className="inline-flex flex-wrap items-baseline justify-end gap-1.5">
                      <span className="text-sm md:text-sm font-bold tabular-nums leading-none text-red-600 dark:text-red-400">
                        {pageFooterStats.belowAverageCount}
                      </span>
                      <span className="text-sm text-foreground">{t("history.totalRowBelowAverageSuffix")}</span>
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
