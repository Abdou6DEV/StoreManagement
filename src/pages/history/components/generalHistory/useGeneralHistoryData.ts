import { useState, useEffect } from "react";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import type { AggregationLevel, AggregatedData } from "../../../../types";

export function useGeneralHistoryData() {
  const [aggregationLevel, setAggregationLevel] =
    useState<AggregationLevel>("day");
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // Default to last month
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Calculate pagination
  const totalPages = Math.ceil(aggregatedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = aggregatedData.slice(startIndex, endIndex);

  // Reset to first page when aggregation level or date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [aggregationLevel, startDate, endDate]);

  // Fetch data when aggregation level or date range changes
  useEffect(() => {
    fetchData();
  }, [aggregationLevel, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Convert string dates to Date objects
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day

      // Fetch aggregated data for the selected date range
      const aggregated = await window.api.database.sales.getAggregatedByPeriod(
        aggregationLevel,
        startDateObj,
        endDateObj,
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
          startDate,
          endDate,
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
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  };
}
