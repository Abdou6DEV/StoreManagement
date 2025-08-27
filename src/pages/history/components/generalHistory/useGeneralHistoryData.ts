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
  
  // Date range state - will be set after fetching data range
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Calculate pagination
  const totalPages = Math.ceil(aggregatedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = aggregatedData.slice(startIndex, endIndex);

  // Reset to first page when aggregation level or date range changes
  useEffect(() => {
    setCurrentPage(1);
  }, [aggregationLevel, startDate, endDate]);

  // Simple date validation
  const isValidDate = (dateString: string): boolean => {
    if (!dateString || typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Fetch the data range to set default dates
  const fetchDataRange = async () => {
    try {
      console.log("🔍 Fetching data range...");
      
      // Get all sales to find the date range
      const allSales = await window.api.database.sales.getAll();
      
      console.log("📊 All sales count:", allSales.length);
      
      if (allSales && allSales.length > 0) {
        // Find min and max dates from sales data
        const dates = allSales.map((sale: any) => new Date(sale.createdAt));
        const minDate = new Date(Math.min(...dates.map((d: Date) => d.getTime())));
        const maxDate = new Date(Math.max(...dates.map((d: Date) => d.getTime())));
        
        const range = {
          min: minDate.toISOString().split('T')[0],
          max: maxDate.toISOString().split('T')[0]
        };
        
        // Set default dates to span the full data range
        setStartDate(range.min);
        setEndDate(range.max);
        
        console.log("✅ Default dates set:", { start: range.min, end: range.max });
      } else {
        // Fallback to last month if no sales data
        const fallbackStart = new Date();
        fallbackStart.setMonth(fallbackStart.getMonth() - 1);
        const fallbackEnd = new Date();
        
        setStartDate(fallbackStart.toISOString().split('T')[0]);
        setEndDate(fallbackEnd.toISOString().split('T')[0]);
        
        console.log("⚠️ Using fallback dates:", { 
          start: fallbackStart.toISOString().split('T')[0], 
          end: fallbackEnd.toISOString().split('T')[0] 
        });
      }
    } catch (error) {
      console.error("❌ Error fetching data range:", error);
      
      // Fallback to last month on error
      const fallbackStart = new Date();
      fallbackStart.setMonth(fallbackStart.getMonth() - 1);
      const fallbackEnd = new Date();
      
      setStartDate(fallbackStart.toISOString().split('T')[0]);
      setEndDate(fallbackEnd.toISOString().split('T')[0]);
    }
  };

  // Fetch data range on component mount
  useEffect(() => {
    fetchDataRange();
  }, []);

  // Fetch data when aggregation level or date range changes (only if dates are set)
  useEffect(() => {
    if (startDate && endDate) {
      fetchData();
    }
  }, [aggregationLevel, startDate, endDate]);

  // Convert picker format to storage format (YYYY-MM-DD)
  const convertPickerToStorage = (pickerDate: string, level: AggregationLevel): string => {
    if (!pickerDate || typeof pickerDate !== 'string') return "";
    
    try {
      switch (level) {
        case "day":
          // Already in YYYY-MM-DD format
          if (isValidDate(pickerDate)) {
            return pickerDate;
          }
          return "";
          
        case "month":
          // Convert YYYY-MM to YYYY-MM-01
          const monthMatch = pickerDate.match(/^(\d{4})-(\d{1,2})$/);
          if (monthMatch) {
            const year = parseInt(monthMatch[1]);
            const month = parseInt(monthMatch[2]);
            if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
              return `${year}-${String(month).padStart(2, '0')}-01`;
            }
          }
          return "";
          
        case "year":
          // Convert YYYY to YYYY-01-01
          const yearMatch = pickerDate.match(/^(\d{4})$/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            if (year >= 1900 && year <= 2100) {
              return `${year}-01-01`;
            }
          }
          return "";
          
        default:
          return "";
      }
    } catch (error) {
      rendererLogger.error("Error converting picker to storage", "GeneralHistory", { pickerDate, level, error });
      return "";
    }
  };

  // Convert storage format (YYYY-MM-DD) to picker format
  const convertStorageToPicker = (storageDate: string, level: AggregationLevel): string => {
    if (!storageDate || !isValidDate(storageDate)) return "";
    
    try {
      const date = new Date(storageDate);
      
      switch (level) {
        case "day":
          return storageDate; // Already in YYYY-MM-DD format
          
        case "month":
          return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
        case "year":
          return date.getFullYear().toString();
          
        default:
          return storageDate;
      }
    } catch (error) {
      rendererLogger.error("Error converting storage to picker", "GeneralHistory", { storageDate, level, error });
      return "";
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      console.log("🔍 Fetching data with:", {
        aggregationLevel,
        startDate,
        endDate,
        startDateValid: isValidDate(startDate),
        endDateValid: isValidDate(endDate)
      });

      // startDate and endDate are already in YYYY-MM-DD format
      if (!startDate || !endDate || !isValidDate(startDate) || !isValidDate(endDate)) {
        console.warn("❌ Invalid date range:", { startDate, endDate });
        rendererLogger.warn("Invalid date range", "GeneralHistory", { startDate, endDate });
        setAggregatedData([]);
        return;
      }

      // Convert to Date objects for database query
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999); // Set to end of day

      console.log("📅 Date objects:", {
        startDateObj: startDateObj.toISOString(),
        endDateObj: endDateObj.toISOString()
      });

      // Fetch aggregated data
      const aggregated = await window.api.database.sales.getAggregatedByPeriod(
        aggregationLevel,
        startDateObj,
        endDateObj,
      );

      console.log("📊 Raw aggregated data:", aggregated);

      // Validate and sort data
      const validData = Array.isArray(aggregated) ? aggregated : [];
      
      console.log("✅ Valid data count:", validData.length);
      
      const sortedData = validData.sort((a: AggregatedData, b: AggregatedData) => {
        try {
          if (aggregationLevel === "day") {
            const dateA = new Date(a.period);
            const dateB = new Date(b.period);
            return dateB.getTime() - dateA.getTime();
          } else if (aggregationLevel === "month") {
            const [bYear, bMonth] = b.period.split("-").map(Number);
            const [aYear, aMonth] = a.period.split("-").map(Number);
            return new Date(bYear, bMonth - 1).getTime() - new Date(aYear, aMonth - 1).getTime();
          } else {
            return parseInt(b.period) - parseInt(a.period);
          }
        } catch (error) {
          rendererLogger.error("Error sorting data", "GeneralHistory", { error, a, b });
          return 0;
        }
      });

      console.log("📈 Sorted data:", sortedData);

      setAggregatedData(sortedData);

      rendererLogger.debug(
        "History data fetched successfully",
        "GeneralHistory",
        {
          aggregationLevel,
          startDate,
          endDate,
          dataPoints: sortedData.length,
        },
      );
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      rendererLogger.error(
        "Error fetching history data",
        "GeneralHistory",
        error,
      );
      setAggregatedData([]);
    } finally {
      setLoading(false);
    }
  };

  // Setter functions - convert picker format to storage format
  const setFormattedStartDate = (pickerDate: string) => {
    if (!pickerDate || typeof pickerDate !== 'string') return;
    
    const storageDate = convertPickerToStorage(pickerDate, aggregationLevel);
    if (storageDate && isValidDate(storageDate)) {
      setStartDate(storageDate);
    } else {
      rendererLogger.warn("Invalid start date", "GeneralHistory", { pickerDate, aggregationLevel });
    }
  };
  
  const setFormattedEndDate = (pickerDate: string) => {
    if (!pickerDate || typeof pickerDate !== 'string') return;
    
    const storageDate = convertPickerToStorage(pickerDate, aggregationLevel);
    if (storageDate && isValidDate(storageDate)) {
      setEndDate(storageDate);
    } else {
      rendererLogger.warn("Invalid end date", "GeneralHistory", { pickerDate, aggregationLevel });
    }
  };

  // Getter functions - convert storage format to picker format
  const getFormattedStartDate = (): string => {
    try {
      return convertStorageToPicker(startDate, aggregationLevel);
    } catch (error) {
      rendererLogger.error("Error formatting start date", "GeneralHistory", { startDate, aggregationLevel, error });
      return "";
    }
  };

  const getFormattedEndDate = (): string => {
    try {
      return convertStorageToPicker(endDate, aggregationLevel);
    } catch (error) {
      rendererLogger.error("Error formatting end date", "GeneralHistory", { endDate, aggregationLevel, error });
      return "";
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
    startDate: getFormattedStartDate(),
    setStartDate: setFormattedStartDate,
    endDate: getFormattedEndDate(),
    setEndDate: setFormattedEndDate,
  };
}
