import { useTranslation } from "react-i18next";
import type { AggregatedData, AggregationLevel } from "../../../../types";
import { formatCurrency, formatNumber, formatPeriod } from "./generalHistoryUtils";

interface GeneralHistoryTableProps {
  data: AggregatedData[];
  aggregationLevel: AggregationLevel;
  onRowDoubleClick: (period: string) => void;
}

export default function GeneralHistoryTable({
  data,
  aggregationLevel,
  onRowDoubleClick,
}: GeneralHistoryTableProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Hint */}
      <div className="bg-muted/30 border-b border-border px-6 py-3">
        <p className="text-sm text-muted-foreground text-center">
          💡 {t("history.doubleClickHint")}
        </p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border">
              <th className="text-left p-6 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.period")}
              </th>
              <th className="text-right p-6 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.revenue")}
              </th>
              <th className="text-right p-6 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.profit")}
              </th>
              <th className="text-right p-6 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.purchases")}
              </th>
              <th className="text-right p-6 font-semibold text-foreground text-sm uppercase tracking-wide">
                {t("history.sales")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((item) => (
              <tr
                key={item.period}
                className="group transition-all duration-200 hover:bg-muted/90 bg-muted/5 cursor-pointer"
                onDoubleClick={() => onRowDoubleClick(item.period)}
              >
                <td className="p-6 font-medium text-foreground">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                    <span className="text-sm font-semibold">
                      {formatPeriod(item.period, aggregationLevel)}
                    </span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-lg">
                      {formatCurrency(item.revenue)}
                    </span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-semibold text-lg ${
                        item.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(item.profit)}
                    </span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-lg">
                      {formatNumber(item.purchases)}
                    </span>
                  </div>
                </td>
                <td className="p-6 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-semibold text-foreground text-lg">
                      {formatNumber(item.count)}
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
