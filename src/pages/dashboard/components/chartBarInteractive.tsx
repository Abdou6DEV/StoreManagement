"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useTheme } from "../../../lib/hooks/useTheme";

// Sample data for different time periods with rates
const dailyData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const baseProfit = Math.floor(Math.random() * 2000) + 500;
  const baseClients = Math.floor(Math.random() * 50) + 10;
  const baseSales = Math.floor(Math.random() * 5000) + 1000;

  return {
    period: `Day ${day}`,
    profits: baseProfit,
    clients: baseClients,
    sales: baseSales,
    profitsRate: (Math.random() * 40 - 20).toFixed(1),
    clientsRate: (Math.random() * 30 - 10).toFixed(1),
    salesRate: (Math.random() * 25 - 12.5).toFixed(1),
  };
});

const monthlyData = [
  {
    period: "Jan",
    profits: 12500,
    clients: 145,
    sales: 45600,
    profitsRate: "+8.2",
    clientsRate: "+12.5",
    salesRate: "+5.3",
  },
  {
    period: "Feb",
    profits: 15200,
    clients: 189,
    sales: 52300,
    profitsRate: "+21.6",
    clientsRate: "+30.3",
    salesRate: "+14.7",
  },
  {
    period: "Mar",
    profits: 18900,
    clients: 234,
    sales: 48900,
    profitsRate: "+24.3",
    clientsRate: "+23.8",
    salesRate: "-6.5",
  },
  {
    period: "Apr",
    profits: 16700,
    clients: 198,
    sales: 56700,
    profitsRate: "-11.6",
    clientsRate: "-15.4",
    salesRate: "+16.0",
  },
  {
    period: "May",
    profits: 21300,
    clients: 267,
    sales: 61200,
    profitsRate: "+27.5",
    clientsRate: "+34.8",
    salesRate: "+7.9",
  },
  {
    period: "Jun",
    profits: 19800,
    clients: 245,
    sales: 58800,
    profitsRate: "-7.0",
    clientsRate: "-8.2",
    salesRate: "-3.9",
  },
  {
    period: "Jul",
    profits: 23400,
    clients: 289,
    sales: 64500,
    profitsRate: "+18.2",
    clientsRate: "+18.0",
    salesRate: "+9.7",
  },
  {
    period: "Aug",
    profits: 25100,
    clients: 312,
    sales: 67200,
    profitsRate: "+7.3",
    clientsRate: "+8.0",
    salesRate: "+4.2",
  },
  {
    period: "Sep",
    profits: 22800,
    clients: 298,
    sales: 62800,
    profitsRate: "-9.2",
    clientsRate: "-4.5",
    salesRate: "-6.5",
  },
  {
    period: "Oct",
    profits: 26500,
    clients: 334,
    sales: 71500,
    profitsRate: "+16.2",
    clientsRate: "+12.1",
    salesRate: "+13.9",
  },
  {
    period: "Nov",
    profits: 28200,
    clients: 356,
    sales: 74200,
    profitsRate: "+6.4",
    clientsRate: "+6.6",
    salesRate: "+3.8",
  },
  {
    period: "Dec",
    profits: 31000,
    clients: 389,
    sales: 78900,
    profitsRate: "+9.9",
    clientsRate: "+9.3",
    salesRate: "+6.3",
  },
];

const yearlyData = [
  {
    period: "2019",
    profits: 185000,
    clients: 2100,
    sales: 650000,
    profitsRate: "+15.2",
    clientsRate: "+18.5",
    salesRate: "+12.3",
  },
  {
    period: "2020",
    profits: 165000,
    clients: 1890,
    sales: 580000,
    profitsRate: "-10.8",
    clientsRate: "-10.0",
    salesRate: "-10.8",
  },
  {
    period: "2021",
    profits: 220000,
    clients: 2450,
    sales: 720000,
    profitsRate: "+33.3",
    clientsRate: "+29.6",
    salesRate: "+24.1",
  },
  {
    period: "2022",
    profits: 275000,
    clients: 2890,
    sales: 850000,
    profitsRate: "+25.0",
    clientsRate: "+18.0",
    salesRate: "+18.1",
  },
  {
    period: "2023",
    profits: 315000,
    clients: 3200,
    sales: 920000,
    profitsRate: "+14.5",
    clientsRate: "+10.7",
    salesRate: "+8.2",
  },
  {
    period: "2024",
    profits: 287000,
    clients: 3100,
    sales: 890000,
    profitsRate: "-8.9",
    clientsRate: "-3.1",
    salesRate: "-3.3",
  },
];

const chartTypes = {
  profits: {
    title: "Profit Analysis",
    description: "Track profit trends over time",
    format: (value: number) => `$${value.toLocaleString()}`,
    dataKey: "profits" as const,
    rateKey: "profitsRate" as const,
  },
  clients: {
    title: "Client Growth",
    description: "Monitor client acquisition",
    format: (value: number) => `${value} clients`,
    dataKey: "clients" as const,
    rateKey: "clientsRate" as const,
  },
  sales: {
    title: "Sales Performance",
    description: "Total sales revenue tracking",
    format: (value: number) => `$${value.toLocaleString()}`,
    dataKey: "sales" as const,
    rateKey: "salesRate" as const,
  },
};

const timePeriods = {
  "1m": {
    data: dailyData,
    label: "1 Month (Daily)",
    description: "Last 30 days",
    comparison: "vs previous day",
  },
  "12m": {
    data: monthlyData,
    label: "12 Months",
    description: "Current year months",
    comparison: "vs previous month",
  },
  years: {
    data: yearlyData,
    label: "Years",
    description: "Yearly performance",
    comparison: "vs previous year",
  },
};

// Custom tooltip component that follows cursor
const CustomTooltip = ({
  active,
  payload,
  label,
  chartType,
  comparison,
  isDark,
}: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const currentChart = chartTypes[chartType as keyof typeof chartTypes];
    const value = data[currentChart.dataKey];
    const rate = data[currentChart.rateKey];
    const isPositive = !rate.startsWith("-");

    return (
      <div
        className={
          isDark
            ? "bg-[#18181b] border border-gray-700 rounded-lg shadow-lg p-3 min-w-[160px]"
            : "bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]"
        }
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
            {label}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span
              className={
                isDark ? "text-xs text-gray-400" : "text-xs text-gray-500"
              }
            >
              Value:
            </span>
            <span
              className={
                isDark
                  ? "text-sm font-semibold text-gray-100"
                  : "text-sm font-semibold text-gray-900"
              }
            >
              {currentChart.format(value)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span
              className={
                isDark ? "text-xs text-gray-400" : "text-xs text-gray-500"
              }
            >
              {comparison}:
            </span>
            <span
              className={`text-sm font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}
            >
              {rate}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ChartBarInteractive() {
  const [timePeriod, setTimePeriod] =
    React.useState<keyof typeof timePeriods>("12m");
  const [chartType, setChartType] =
    React.useState<keyof typeof chartTypes>("profits");
  const { isDark } = useTheme();

  const currentChart = chartTypes[chartType];
  const currentPeriod = timePeriods[timePeriod];

  // Define theme-aware colors
  const barGradientStops = isDark
    ? [
        { offset: "0%", color: "var(--chart-1)", opacity: 0.8 },
        { offset: "100%", color: "var(--chart-2)", opacity: 1 },
      ]
    : [
        { offset: "0%", color: "#3b82f6", opacity: 0.8 },
        { offset: "100%", color: "#1d4ed8", opacity: 1 },
      ];
  const gridColor = isDark ? "#27272a" : "#f1f5f9";
  const axisColor = isDark ? "#a1a1aa" : "#64748b";
  const bgClass = isDark
    ? "bg-[#18181b] border border-gray-700 text-gray-100"
    : "bg-white border border-gray-200 text-gray-900";
  const controlBg = isDark ? "bg-[#232326]" : "bg-white";
  const controlBorder = isDark ? "border-gray-700" : "border-gray-300";
  const controlText = isDark ? "text-gray-100" : "text-gray-900";
  const controlInactive = isDark
    ? "text-gray-400 hover:text-gray-200"
    : "text-gray-500 hover:text-gray-700";
  const toggleBg = isDark ? "bg-[#232326]" : "bg-gray-50";

  return (
    <div className={`${bgClass} rounded-xl shadow-sm p-6`}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className={`text-xl font-semibold ${controlText}`}>
            {currentChart.title}
          </h3>
          <p
            className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            {currentChart.description} - {currentPeriod.description}
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Chart Type Selector */}
          <select
            value={chartType}
            onChange={(e) =>
              setChartType(e.target.value as keyof typeof chartTypes)
            }
            className={`px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border ${controlBorder} ${controlBg} ${controlText}`}
          >
            <option value="profits">Profits</option>
            <option value="clients">Client Growth</option>
            <option value="sales">Sales</option>
          </select>

          {/* Time Period Toggle Buttons */}
          <div
            className={`flex rounded-lg border ${controlBorder} ${toggleBg} p-1`}
          >
            {Object.entries(timePeriods).map(([key, period]) => (
              <button
                key={key}
                onClick={() => setTimePeriod(key as keyof typeof timePeriods)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timePeriod === key
                    ? `${controlBg} ${controlText} shadow-sm`
                    : controlInactive
                }`}
              >
                {key === "1m" ? "1M" : key === "12m" ? "12M" : "Years"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={currentPeriod.data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: timePeriod === "1m" ? 60 : 20,
            }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                {barGradientStops.map((stop) => (
                  <stop
                    key={stop.offset}
                    offset={stop.offset}
                    stopColor={stop.color}
                    stopOpacity={stop.opacity}
                  />
                ))}
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={gridColor}
            />

            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={timePeriod === "1m" ? -45 : 0}
              textAnchor={timePeriod === "1m" ? "end" : "middle"}
              fontSize={12}
              fill={axisColor}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              fill={axisColor}
              tickFormatter={(value) => {
                if (chartType === "clients") return `${value}`;
                return `$${(value / 1000).toFixed(0)}k`;
              }}
            />

            <Tooltip
              content={
                <CustomTooltip
                  chartType={chartType}
                  comparison={currentPeriod.comparison}
                  isDark={isDark}
                />
              }
              cursor={{
                fill: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
              }}
              position={{ x: undefined, y: undefined }}
            />

            <Bar
              dataKey={currentChart.dataKey}
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
