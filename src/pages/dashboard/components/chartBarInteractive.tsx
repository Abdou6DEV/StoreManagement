import * as React from "react";
import { useTranslation } from "react-i18next";
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

function getPeriodLabel(
  type: "day" | "month" | "year",
  value: number,
  idx: number,
  t: (key: string) => string,
) {
  if (type === "day") {
    return (idx + 1).toString();
  }
  if (type === "month") {
    return t(`dashboard.months.${value}`);
  }
  return value.toString();
}

export function ChartBarInteractive() {
  const { t, i18n } = useTranslation();
  const [timePeriod, setTimePeriod] = React.useState<"1m" | "12m" | "years">(
    "12m",
  );
  const [chartType, setChartType] = React.useState<
    "profits" | "clients" | "sales"
  >("profits");
  const [chartData, setChartData] = React.useState({
    "1m": [],
    "12m": [],
    years: [],
  });
  const { isDark } = useTheme();

  React.useEffect(() => {
    async function fetchData() {
      const [sales, clients] = await Promise.all([
        window.api.database.sales.getAll(),
        window.api.database.clients.getAll(),
      ]);
      // --- 1m: Last 30 days ---
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date;
      });
      const daily = days.map((date, idx) => {
        const daySales = sales.filter((s: any) => {
          const d = new Date(s.createdAt);
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
          );
        });
        const dayClients = clients.filter((c: any) => {
          const d = new Date(c.createdAt);
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
          );
        });
        const profits = daySales.reduce(
          (sum: number, s: any) =>
            sum +
            (s.saleItems?.reduce(
              (itemSum: number, item: any) =>
                itemSum +
                (item.price - (item.product?.boughtPrice || 0)) * item.quantity,
              0,
            ) || 0),
          0,
        );
        const salesTotal = daySales.reduce(
          (sum: number, s: any) => sum + (s.totalWithDiscount || 0),
          0,
        );
        return {
          period: getPeriodLabel("day", 0, idx, t),
          profits,
          clients: dayClients.length,
          sales: salesTotal,
        };
      });
      // --- 12m: Current year, by month ---
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => i);
      const monthly = months.map((monthIdx) => {
        const monthSales = sales.filter((s: any) => {
          const d = new Date(s.createdAt);
          return (
            d.getFullYear() === now.getFullYear() && d.getMonth() === monthIdx
          );
        });
        const monthClients = clients.filter((c: any) => {
          const d = new Date(c.createdAt);
          return (
            d.getFullYear() === now.getFullYear() && d.getMonth() === monthIdx
          );
        });
        const profits = monthSales.reduce(
          (sum: number, s: any) =>
            sum +
            (s.saleItems?.reduce(
              (itemSum: number, item: any) =>
                itemSum +
                (item.price - (item.product?.boughtPrice || 0)) * item.quantity,
              0,
            ) || 0),
          0,
        );
        const salesTotal = monthSales.reduce(
          (sum: number, s: any) => sum + (s.totalWithDiscount || 0),
          0,
        );
        return {
          period: getPeriodLabel("month", monthIdx, monthIdx, t),
          profits,
          clients: monthClients.length,
          sales: salesTotal,
        };
      });
      // --- years: Last 6 years ---
      const startYear = now.getFullYear() - 5;
      const years = Array.from({ length: 6 }, (_, i) => startYear + i);
      const yearly = years.map((year) => {
        const yearSales = sales.filter((s: any) => {
          const d = new Date(s.createdAt);
          return d.getFullYear() === year;
        });
        const yearClients = clients.filter((c: any) => {
          const d = new Date(c.createdAt);
          return d.getFullYear() === year;
        });
        const profits = yearSales.reduce(
          (sum: number, s: any) =>
            sum +
            (s.saleItems?.reduce(
              (itemSum: number, item: any) =>
                itemSum +
                (item.price - (item.product?.boughtPrice || 0)) * item.quantity,
              0,
            ) || 0),
          0,
        );
        const salesTotal = yearSales.reduce(
          (sum: number, s: any) => sum + (s.totalWithDiscount || 0),
          0,
        );
        return {
          period: year.toString(),
          profits,
          clients: yearClients.length,
          sales: salesTotal,
        };
      });
      setChartData({ "1m": daily, "12m": monthly, years: yearly });
    }
    fetchData();
  }, [i18n.language]);

  const chartTypes = {
    profits: {
      title: t("dashboard.chartProfitsTitle"),
      description: t("dashboard.chartProfitsDesc"),
      format: (value: number) => `${value.toLocaleString()} ${t("currency")}`,
      dataKey: "profits" as const,
      label: t("dashboard.profits"),
    },
    clients: {
      title: t("dashboard.chartClientsTitle"),
      description: t("dashboard.chartClientsDesc"),
      format: (value: number) => `${value} ${t("dashboard.clients")}`,
      dataKey: "clients" as const,
      label: t("dashboard.clients"),
    },
    sales: {
      title: t("dashboard.chartSalesTitle"),
      description: t("dashboard.chartSalesDesc"),
      format: (value: number) => `${value.toLocaleString()} ${t("currency")}`,
      dataKey: "sales" as const,
      label: t("dashboard.sales"),
    },
  };

  const timePeriods = {
    "1m": {
      data: chartData["1m"],
      label: t("dashboard.1M"),
      description: t("dashboard.last30Days"),
    },
    "12m": {
      data: chartData["12m"],
      label: t("dashboard.12M"),
      description: t("dashboard.currentYearMonths"),
    },
    years: {
      data: chartData["years"],
      label: t("dashboard.years"),
      description: t("dashboard.yearlyPerformance"),
    },
  };

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
            <option value="profits">{chartTypes.profits.label}</option>
            <option value="clients">{chartTypes.clients.label}</option>
            <option value="sales">{chartTypes.sales.label}</option>
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
                {key === "1m"
                  ? t("dashboard.1M")
                  : key === "12m"
                    ? t("dashboard.12M")
                    : t("dashboard.years")}
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
                return `${(value / 1000).toFixed(0)} ${t("dashboard.thousand")}`;
              }}
              textAnchor={i18n.language === "ar" ? "start" : "end"}
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
                          {label}
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
                          {t("dashboard.valueLabel")}
                        </span>
                        <span
                          className={
                            isDark
                              ? "text-sm text-gray-100 mx-1"
                              : "text-sm text-gray-900 mx-1"
                          }
                        >
                          {currentChart.format(value)}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
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
