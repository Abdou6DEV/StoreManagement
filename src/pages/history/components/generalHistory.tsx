import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import rendererLogger from "../../../lib/logger/rendererLogger";
import type { AggregationLevel, AggregatedData } from "../../../types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../lib/components/pagination";

interface GeneralHistoryProps {
  onPeriodSelect?: (period: AggregationLevel, periodValue: string) => void;
}

export default function GeneralHistory({ onPeriodSelect }: GeneralHistoryProps) {
  const { t } = useTranslation();
  const [aggregationLevel, setAggregationLevel] =
    useState<AggregationLevel>("day");
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate pagination
  const totalPages = Math.ceil(aggregatedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = aggregatedData.slice(startIndex, endIndex);

  // Reset to first page when aggregation level changes
  useEffect(() => {
    setCurrentPage(1);
  }, [aggregationLevel]);

  // Fetch data when aggregation level changes
  useEffect(() => {
    fetchData();
  }, [aggregationLevel]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch aggregated data for all time (no date restrictions)
      const aggregated = await window.api.database.sales.getAggregatedByPeriod(
        aggregationLevel,
        new Date(0), // Start from beginning of time
        new Date(), // End at current date
      );

      // Sort data from newest to oldest
      const sortedData = aggregated.sort(
        (a: AggregatedData, b: AggregatedData) => {
          if (aggregationLevel === "day") {
            return new Date(b.period).getTime() - new Date(a.period).getTime();
          } else if (aggregationLevel === "month") {
            const [bYear, bMonth] = b.period.split("-");
            const [aYear, aMonth] = a.period.split("-");
            return (
              new Date(parseInt(bYear), parseInt(bMonth) - 1).getTime() -
              new Date(parseInt(aYear), parseInt(aMonth) - 1).getTime()
            );
          } else {
            return parseInt(b.period) - parseInt(a.period);
          }
        },
      );

      setAggregatedData(sortedData);

      rendererLogger.debug(
        "History data fetched successfully",
        "GeneralHistory",
        {
          aggregationLevel,
          dataPoints: aggregated.length,
        },
      );
    } catch (error) {
      rendererLogger.error(
        "Error fetching history data",
        "GeneralHistory",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DA`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const formatPeriod = (period: string) => {
    if (aggregationLevel === "day") {
      return new Date(period).toLocaleDateString();
    } else if (aggregationLevel === "month") {
      const [year, month] = period.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "short",
        },
      );
    } else {
      return period;
    }
  };

  const handleRowDoubleClick = (period: string) => {
    if (onPeriodSelect) {
      onPeriodSelect(aggregationLevel, period);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gradient-to-r from-primary/3 to-primary/6 border border-primary/15 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
              {t("history.aggregationLevel")}
            </label>
            <p className="text-xs text-muted-foreground">
              Select how you want to group your data
            </p>
          </div>
          <div className="flex items-center gap-2 bg-background/80 rounded-xl p-1 border border-primary/15">
            {[
              { value: "day" as const, label: t("history.daily"), icon: "📅" },
              {
                value: "month" as const,
                label: t("history.monthly"),
                icon: "📊",
              },
              {
                value: "year" as const,
                label: t("history.yearly"),
                icon: "📈",
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setAggregationLevel(option.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  aggregationLevel === option.value
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <span className="text-base">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {/* Hint */}
        <div className="bg-muted/30 border-b border-border px-6 py-3">
          <p className="text-sm text-muted-foreground text-center">
            💡 {t("history.doubleClickHint")}
          </p>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span>{t("history.loadingData")}</span>
            </div>
          </div>
        ) : aggregatedData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-muted-foreground">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">
                {t("history.noDataAvailable")}
              </p>
              <p className="text-sm mt-1">
                No sales data found for the selected period
              </p>
            </div>
          </div>
        ) : (
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
                {currentData.map((item) => (
                  <tr
                    key={item.period}
                    className="group transition-all duration-200 hover:bg-muted/90 bg-muted/5 cursor-pointer"
                    onDoubleClick={() => handleRowDoubleClick(item.period)}
                  >
                    <td className="p-6 font-medium text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary/60"></div>
                        <span className="text-sm font-semibold">
                          {formatPeriod(item.period)}
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
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationPrevious
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className={
                currentPage === 1 ? "pointer-events-none opacity-50" : ""
              }
            />
            <PaginationContent>
              {(() => {
                const pages = [];
                const maxVisiblePages = 10;

                // Calculate start and end of visible page range
                let startPage = Math.max(
                  1,
                  currentPage - Math.floor(maxVisiblePages / 2),
                );
                const endPage = Math.min(
                  totalPages,
                  startPage + maxVisiblePages - 1,
                );

                // Adjust start if we're near the end
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }

                // Generate visible page numbers
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <PaginationItem key={i}>
                      <PaginationLink
                        onClick={() => setCurrentPage(i)}
                        isActive={i === currentPage}
                      >
                        {i}
                      </PaginationLink>
                    </PaginationItem>,
                  );
                }

                return pages;
              })()}
            </PaginationContent>
            <PaginationNext
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              className={
                currentPage === totalPages
                  ? "pointer-events-none opacity-50"
                  : ""
              }
            />
          </Pagination>
        </div>
      )}
    </div>
  );
}
