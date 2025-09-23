import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useTheme } from "../../../lib/hooks/useTheme";
import { Skeleton } from "../../../lib/components/skeleton";

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
  const [chartData, setChartData] = useState<ProfitData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfitData() {
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
          // For today, get all sales and aggregate by hour manually
          const sales = await window.api.database.sales.getAll();
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
          todaySales.forEach((sale: { createdAt: string | Date; totalAmountWithDiscount?: number; saleItems?: Array<{ product?: { boughtPrice?: number }; manualProduct?: { costPrice: number }; service?: { costPrice: number }; boughtPrice?: number; price: number; quantity: number }> }) => {
            const saleDate = new Date(sale.createdAt);
            const hour = saleDate.getHours();
            
            const revenue = sale.totalAmountWithDiscount || 0;
            const cost = sale.saleItems?.reduce((itemSum: number, item: { product?: { boughtPrice?: number }; manualProduct?: { costPrice: number }; service?: { costPrice: number }; boughtPrice?: number; price: number; quantity: number }) => {
              // All items (products, manual products, services) have their cost stored in boughtPrice
              const boughtPrice = item.boughtPrice || 0;
              return itemSum + boughtPrice * item.quantity;
            }, 0) || 0;
            
            const profit = revenue - cost;
            
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
          // Use the proper database aggregation function for other periods
          const aggregatedData = await window.api.database.sales.getAggregatedByPeriod(
            periodType,
            startDate,
            endDate
          );

          // Transform the data for the chart
          data = aggregatedData.map((item: { period: string; profit?: number; revenue?: number }) => {
            let periodLabel: string;
            
            if (period === 'month') {
              // For daily data, show just the day number
              const date = new Date(item.period);
              periodLabel = date.getDate().toString();
            } else if (period === 'year') {
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
        
        setChartData(filledData);
        
        // Trend calculation removed as it was unused
      } catch (error) {
        console.error('Error fetching profit data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProfitData();
  }, [period]);




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
              return `${value.toLocaleString()}${t("currency")}`;
            }}
            fontSize={12}
            fill={axisColor}
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
