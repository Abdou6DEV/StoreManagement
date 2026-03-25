import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../../../lib/hooks/useTheme";
import { Skeleton } from "../../../lib/components/skeleton";
import { useSales, useDashboardLoading } from "../../../lib/contexts/dashboardContext";
import { ChartLine } from "lucide-react";

interface ProfitChartProps {
  period: 'today' | 'month' | 'year' | 'overall';
  className?: string;
}

interface ProfitData {
  period: string;
  profit: number;
  revenue: number;
  cost: number;
}

export function ProfitChart({ period, className = "" }: ProfitChartProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const sales = useSales();
  const dashboardLoading = useDashboardLoading();
  const [chartData, setChartData] = useState<ProfitData[]>([]);
  const [loading, setLoading] = useState(true);

  const currencyLabel = t("currency");
  const yAxisWidth = useMemo(() => {
    // Recharts will clip tick labels if there's not enough space.
    // Instead of guessing via `margin`, reserve a dynamic width on the Y-axis
    // based on the longest formatted profit value we might render.
    const profits = chartData.map((d) => d.profit ?? 0);
    if (profits.length === 0) return 60;

    const minProfit = Math.min(...profits);
    const maxProfit = Math.max(...profits);

    const formatTickValue = (value: number) => `${value.toLocaleString()} ${currencyLabel}`;

    const formattedMin = formatTickValue(minProfit);
    const formattedMax = formatTickValue(maxProfit);
    const longest = formattedMin.length >= formattedMax.length ? formattedMin : formattedMax;

    // Approx: SVG text width is roughly ~7.2px/char at fontSize=12 (with separators/minus).
    // Add padding to account for glyph variety.
    const approxCharWidth = 7.2;
    const paddingPx = 16;
    const computed = Math.ceil(longest.length * approxCharWidth + paddingPx);

    // Clamp to keep the chart usable across small/large screens.
    return Math.max(56, Math.min(170, computed));
  }, [chartData, currencyLabel]);

  useEffect(() => {
    // Only process data when dashboard data is loaded
    if (dashboardLoading) {
      setLoading(true);
      return;
    }
    
    function processProfitData() {
      setLoading(true);
      try {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        let periodType: "day" | "month" | "year";
        
        if (period === 'today') {
          // Get data for today (custom hourly aggregation)
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
          periodType = "day"; // We'll handle hourly aggregation manually
        } else if (period === 'month') {
          // Get data for current month (daily aggregation)
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          periodType = "day";
        } else if (period === 'year') {
          // Get data for current year (monthly aggregation)
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          periodType = "month";
        } else {
          // Get data for all years (yearly aggregation)
          startDate = new Date(2020, 0, 1); // Start from 2020
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
          periodType = "year";
        }

        let data: ProfitData[] = [];

        if (period === 'today') {
          // For today, use shared sales data and aggregate by hour manually
          const todaySales = sales.filter((sale: { createdAt: string | Date }) => {
            const saleDate = new Date(sale.createdAt);
            return saleDate.getFullYear() === now.getFullYear() &&
                   saleDate.getMonth() === now.getMonth() &&
                   saleDate.getDate() === now.getDate();
          });



          // Group by hour
          const hourlyData = new Map<number, { profit: number; revenue: number; cost: number }>();
          
          // Initialize all 24 hours with zero values
          for (let hour = 0; hour < 24; hour++) {
            hourlyData.set(hour, { profit: 0, revenue: 0, cost: 0 });
          }

          // Process each sale
          todaySales.forEach((sale) => {
            const saleDate = new Date(sale.createdAt);
            const hour = saleDate.getHours();
            
            // Use pre-calculated totals for performance
            const revenue = sale.totalAmountWithDiscount || 0;
            const cost = sale.totalCost || 0;
            const profit = sale.totalProfit || 0;
            
            const existing = hourlyData.get(hour);
            if (existing) {
              existing.profit += profit;
              existing.revenue += revenue;
              existing.cost += cost;
            }
          });

          // Convert to array format
          data = Array.from(hourlyData.entries()).map(([hour, values]) => ({
            period: `${hour}:00`,
            profit: values.profit,
            revenue: values.revenue,
            cost: values.cost,
          }));
        } else {
          // Process shared sales data for other periods
          const filteredSales = sales.filter((sale: { createdAt: string | Date }) => {
            const saleDate = new Date(sale.createdAt);
            return saleDate >= startDate && saleDate <= endDate;
          });
          
          // Group by period
          const groupedData = new Map<string, { profit: number; revenue: number; cost: number }>();
          
          filteredSales.forEach((sale: { createdAt: string | Date; totalProfit?: number; totalAmountWithDiscount?: number; totalCost?: number }) => {
            const saleDate = new Date(sale.createdAt);
            let periodKey: string;
            
            if (periodType === "day") {
              const year = saleDate.getFullYear();
              const month = String(saleDate.getMonth() + 1).padStart(2, "0");
              const day = String(saleDate.getDate()).padStart(2, "0");
              periodKey = `${year}-${month}-${day}`;
            } else if (periodType === "month") {
              periodKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
            } else {
              periodKey = saleDate.getFullYear().toString();
            }
            
            const existing = groupedData.get(periodKey);
            if (existing) {
              existing.profit += sale.totalProfit || 0;
              existing.revenue += sale.totalAmountWithDiscount || 0;
              existing.cost += sale.totalCost || 0;
            } else {
              groupedData.set(periodKey, {
                profit: sale.totalProfit || 0,
                revenue: sale.totalAmountWithDiscount || 0,
                cost: sale.totalCost || 0,
              });
            }
          });
          
          const aggregatedData = Array.from(groupedData.entries())
            .map(([period, values]) => ({
              period,
              profit: values.profit,
              revenue: values.revenue,
            }))
            .sort((a, b) => {
              // Sort by period (year) in ascending order
              if (periodType === "year") {
                return parseInt(a.period) - parseInt(b.period);
              }
              // For other periods, maintain original order
              return 0;
            });

          // Transform the data for the chart
          data = aggregatedData.map((item: { period: string; profit?: number; revenue?: number }) => {
            let periodLabel: string;
            
            if (periodType === 'day') {
              // For daily data, show just the day number
              const date = new Date(item.period);
              periodLabel = date.getDate().toString();
            } else if (periodType === 'month') {
              // For monthly data, show month abbreviation
              const [year, month] = item.period.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, 1);
              periodLabel = date.toLocaleDateString('en-US', { month: 'short' });
            } else {
              // For yearly data, show the year
              periodLabel = item.period;
            }

            return {
              period: periodLabel,
              profit: item.profit || 0,
              revenue: item.revenue || 0,
              cost: (item.revenue || 0) - (item.profit || 0),
            };
          });
        }

        // Fill in missing periods with zero values
        let filledData: ProfitData[] = [];
        
        if (period === 'today') {
          // For today, only show hours up to current hour
          const currentHour = now.getHours();
          filledData = data.filter((item, index) => index <= currentHour);
        } else if (period === 'month') {
          // Fill missing days with zero profit, but only up to current day
          const currentDay = now.getDate();
          filledData = Array.from({ length: currentDay }, (_, i) => {
            const day = i + 1;
            const existingData = data.find(d => d.period === day.toString());
            return existingData || {
              period: day.toString(),
              profit: 0,
              revenue: 0,
              cost: 0,
            };
          });
        } else if (period === 'year') {
          // Fill missing months with zero profit, but only up to current month
          const currentMonth = now.getMonth();
          filledData = Array.from({ length: currentMonth + 1 }, (_, i) => {
            const month = i;
            const date = new Date(now.getFullYear(), month, 1);
            const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
            const existingData = data.find(d => d.period === monthLabel);
            return existingData || {
              period: monthLabel,
              profit: 0,
              revenue: 0,
              cost: 0,
            };
          });
        } else {
          // For overall, just use the data as is
          filledData = data;
        }
        
        // Check if there's any actual data (not all zeros)
        const dataPointsWithValue = filledData.filter(item => item.profit !== 0 || item.revenue !== 0);
        const hasData = dataPointsWithValue.length > 0;
        
        // Only set data if there's actual meaningful data
        // For "today" period, allow single data point (it's okay to show)
        // For other periods, require at least 2 data points (1 point would show as a dot)
        if (hasData && (period === 'today' || dataPointsWithValue.length > 1)) {
          setChartData(filledData);
        } else {
          setChartData([]);
        }
        
        // Trend calculation removed as it was unused
      } catch (error) {
        console.error('Error processing profit data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }
    
    processProfitData();
  }, [dashboardLoading, sales, period, i18n.language]);




  const formatTooltipValue = (value: number) => {
    return `${value.toLocaleString()} ${t("currency")}`;
  };

  const gridColor = isDark ? "#27272a" : "#e2e8f0";
  const axisColor = isDark ? "#a1a1aa" : "#64748b";
  const lineColor = isDark ? "#10b981" : "#059669";

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-32 w-full rounded" />
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (chartData.length === 0) {
    return (
      <div className={`${className} flex flex-col items-center justify-center py-8`}>
        <ChartLine className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground text-center">
          {t("dashboard.noProfitData", "No profit data available for this period")}
        </p>
      </div>
    );
  }

  return (
    <div className={`${className}`} dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            left: 12,
            right: 12,
            top: 12,
            bottom: 12,
          }}
        >
          <CartesianGrid 
            vertical={false} 
            strokeDasharray="4 4"
            stroke={gridColor}
            strokeWidth={1}
          />
          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              if (period === 'month') return value;
              if (period === 'year') return value.slice(0, 3);
              return value;
            }}
            fontSize={12}
            fill={axisColor}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => {
              return `${value.toLocaleString()} ${t("currency")}`;
            }}
            fontSize={12}
            fill={axisColor}
            width={yAxisWidth}
            // For left Y-axis: LTR labels should align to the inner edge (`end`)
            // while RTL should mirror to the inner edge (`start`).
            textAnchor={i18n.language === "ar" ? "start" : "end"}
            style={{ whiteSpace: 'nowrap' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const value = payload[0].value;
                return (
                  <div
                    className={
                      isDark
                        ? "bg-[#18181b] border border-gray-700 rounded-lg shadow-lg p-3 min-w-[120px]"
                        : "bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[120px]"
                    }
                    dir={i18n.language === "ar" ? "rtl" : undefined}
                  >
                    <div
                      className={
                        isDark
                          ? "border-b border-gray-800 pb-2"
                          : "border-b border-gray-100 pb-2"
                      }
                    >
                      <p
                        className={
                          isDark
                            ? "text-sm font-medium text-gray-100"
                            : "text-sm font-medium text-gray-900"
                        }
                      >
                        {period === 'month' ? `${t("dashboard.day")} ${label}` : label}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span
                        className={
                          isDark
                            ? "text-xs text-gray-400"
                            : "text-xs text-gray-500"
                        }
                      >
                        {t("dashboard.profit")}
                      </span>
                      <span
                        className={
                          isDark
                            ? "text-sm text-gray-100 mx-1"
                            : "text-sm text-gray-900 mx-1"
                        }
                      >
                        {formatTooltipValue(value)}
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{
              fill: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
            }}
            position={{ x: undefined, y: undefined }}
          />
          <Line
            dataKey="profit"
            type="natural"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      
    </div>
  );
}
