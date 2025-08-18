import { useTranslation } from "react-i18next";
import type { AggregatedData, AggregationLevel } from "../../../../types";
import {
  formatCurrency,
  formatNumber,
  formatPeriod,
} from "./generalHistoryUtils";

interface GeneralHistoryTableProps {
  data: AggregatedData[];
  aggregationLevel: AggregationLevel;
  onRowDoubleClick: (period: string) => void;
  highlightEnabled: boolean;
}

export default function GeneralHistoryTable({
  data,
  aggregationLevel,
  onRowDoubleClick,
  highlightEnabled,
}: GeneralHistoryTableProps) {
  const { t } = useTranslation();

  // Calculate average profit for comparison
  const averageProfit = data.length > 0 
    ? data.reduce((sum, item) => sum + item.profit, 0) / data.length 
    : 0;

  const getRowHighlightClass = (profit: number) => {
    console.log('Highlight enabled:', highlightEnabled);
    console.log('Profit:', profit);
    console.log('Average profit:', averageProfit);
    
    if (!highlightEnabled) return "";
    
    // Compare with average profit
    const profitDiff = ((profit - averageProfit) / Math.abs(averageProfit)) * 100;
    console.log('Profit difference:', profitDiff);
    
    if (profitDiff >= 10) {
      console.log('Should be green');
      return "bg-green-500/20 hover:bg-green-500/30";
    } else if (profitDiff < 0) {
      console.log('Should be red');
      return "bg-red-500/20 hover:bg-red-500/30";
    }
    return "hover:bg-muted/50";
  };

  const getProfitTextClass = (profit: number) => {
    if (!highlightEnabled) {
      return "text-foreground";
    }
    
    const profitDiff = ((profit - averageProfit) / Math.abs(averageProfit)) * 100;
    
    if (profitDiff >= 10) {
      return "text-green-600 dark:text-green-400 font-bold";
    } else if (profitDiff < 0) {
      return "text-red-600 dark:text-red-400 font-bold";
    }
    return "text-foreground";
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border">
              <th className="text-left p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.period")}
              </th>
              <th className="text-right p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.revenue")}
              </th>
              <th className="text-right p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.profit")}
              </th>
              <th className="text-right p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.purchases")}
              </th>
              <th className="text-right p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.sales")}
              </th>
              <th className="text-right p-4 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.averagepercent")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.map((item) => (
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
                      {formatNumber(item.purchases)}
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
                    <span className={`font-semibold text-base ${getProfitTextClass(item.profit)}`}>
                      {((item.profit - averageProfit) / Math.abs(averageProfit) * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
