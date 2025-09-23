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
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartContainerProps } from "./types";

export function ChartContainer({
  currentPeriod,
  chartType,
  timePeriod,
}: ChartContainerProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

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

  const getDataKey = () => {
    switch (chartType) {
      case "profits":
        return "profits";
      case "clients":
        return "clients";
      case "sales":
        return "sales";
      default:
        return "profits";
    }
  };

  const formatValue = (value: number) => {
    if (chartType === "clients") return `${value}`;
    return `${value.toLocaleString()} DA`;
  };

  const formatTooltipValue = (value: number) => {
    if (chartType === "clients") {
      return `${value} ${t("dashboard.clients")}`;
    }
    return `${value.toLocaleString()} DA`;
  };

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={currentPeriod.data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
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
            angle={0}
            textAnchor="middle"
            fontSize={14}
            fill={isDark ? "#ffffff" : "#000000"}
            fontWeight={600}
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeWidth={0.3}
          />

          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={14}
            fill={isDark ? "#ffffff" : "#000000"}
            fontWeight={600}
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeWidth={0.3}
            tickFormatter={formatValue}
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
                            ? "text-sm font-semibold text-white"
                            : "text-sm font-semibold text-gray-900"
                        }
                      >
                        {label}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span
                        className={
                          isDark
                            ? "text-sm font-medium text-gray-200"
                            : "text-sm font-medium text-gray-700"
                        }
                      >
                        {t("dashboard.valueLabel")}
                      </span>
                      <span
                        className={
                          isDark
                            ? "text-sm font-semibold text-white mx-1"
                            : "text-sm font-semibold text-gray-900 mx-1"
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
              fill: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
            }}
            position={{ x: undefined, y: undefined }}
          />

          <Bar
            dataKey={getDataKey()}
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
