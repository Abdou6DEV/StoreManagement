import { useState, useEffect } from "react";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import type { AggregationLevel, AggregatedData } from "../../../../types";

export function useGeneralHistoryData() {
  const [aggregationLevel, setAggregationLevel] = useState<AggregationLevel>("day");
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

  return {
    aggregationLevel,
    setAggregationLevel,
    aggregatedData,
    loading,
    currentPage,
    setCurrentPage,
    totalPages,
    currentData,
  };
}
