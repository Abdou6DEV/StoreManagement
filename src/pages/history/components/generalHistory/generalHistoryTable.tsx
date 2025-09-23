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
  currentPage: number;
  itemsPerPage: number;
}

export default function GeneralHistoryTable({
  data,
  allData,
  aggregationLevel,
  onRowDoubleClick,
  highlightEnabled,
  currentPage,
  itemsPerPage,
}: GeneralHistoryTableProps) {
  const { t } = useTranslation();


  // Calculate simple average profit from all filtered periods
  const averageProfit = allData.length > 0 
    ? allData.reduce((sum, item) => sum + item.profit, 0) / allData.length 
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
    return calculateGrowthRate(item.profit, averageProfit);
  };

  const getGrowthRateTextClass = (growthRate: number) => {
    if (growthRate > 0) {
      return "text-green-600 dark:text-green-400 font-bold";
    } else if (growthRate < 0) {
      return "text-red-600 dark:text-red-400 font-bold";
    }
    return "text-muted-foreground";
  };

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
                {t("history.profit")}
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
                  className={`group transition-all duration-200 hover:border-l-primary hover:border-r-primary border-l-4 border-r-4 border-l-transparent border-r-transparent cursor-pointer ${getRowHighlightClass(item.profit)}`}
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
                    <span className="font-semibold text-foreground text-base">
                      {formatNumber(item.count)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-base">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-semibold text-base ${getProfitTextClass(item.profit)}`}
                    >
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-base">
                      {formatCurrency(item.purchases)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-base">
                      {formatCurrency(item.billsPayments / 100)}
                    </span>
                  </div>
                </td>
                <td className="px-4 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-semibold text-base ${getGrowthRateTextClass(getGrowthRateForRow(item, index))}`}
                    >
                      {formatGrowthRate(getGrowthRateForRow(item, index))}
                    </span>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
