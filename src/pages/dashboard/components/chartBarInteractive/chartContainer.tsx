import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
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

  // Define theme-aware bar gradients
  const barRedGradientStops = isDark
    ? [
        { offset: "0%", color: "#fb7185", opacity: 0.85 },
        { offset: "100%", color: "#ef4444", opacity: 1 },
      ]
    : [
        { offset: "0%", color: "#f87171", opacity: 0.85 },
        { offset: "100%", color: "#dc2626", opacity: 1 },
      ];

  const barGreenGradientStops = isDark
    ? [
        { offset: "0%", color: "#34d399", opacity: 0.85 },
        { offset: "100%", color: "#059669", opacity: 1 },
      ]
    : [
        { offset: "0%", color: "#22c55e", opacity: 0.85 },
        { offset: "100%", color: "#16a34a", opacity: 1 },
      ];

  const gridColor = isDark ? "#2a2a33" : "#eef2f7";
  // Slightly lighter axis/grid tone (keep text readable).
  const axisColor = isDark ? "rgba(148, 147, 147, 0.7)" : "rgba(85, 85, 85, 0.48)";

  const getDataKey = () => {
    switch (chartType) {
      case "profits":
        return "profits";
      case "clients":
        return "clients";
      case "sales":
        // "sales" chartType displays how many sales happened (count),
        // not the sales amount in currency.
        return "salesCount";
      default:
        return "profits";
    }
  };

  const formatValue = (value: number) => {
    if (chartType === "clients" || chartType === "sales") return `${value}`;
    // Show full values with no space before currency to prevent wrapping
    return `${value.toLocaleString()}${t("currency")}`;
  };

  const formatTooltipValue = (value: number) => {
    if (chartType === "clients") {
      return `${value} ${t("dashboard.clients")}`;
    }
    return `${value.toLocaleString()} ${t("currency")}`;
  };

  const currencyLabel = t("currency");
  const dataKey = getDataKey();

  const avgValue = useMemo(() => {
    const values = (currentPeriod?.data ?? []).map((d: any) => {
      const v = d?.[dataKey];
      return typeof v === "number" ? v : 0;
    });

    // Average should be based on "real" bars (exclude zeros), otherwise it becomes ~0
    // and all bars look like they're "above average".
    const nonZeroValues = values.filter((v) => (v ?? 0) !== 0);
    if (nonZeroValues.length === 0) return 0;
    const sum = nonZeroValues.reduce((acc, v) => acc + v, 0);
    return sum / nonZeroValues.length;
  }, [currentPeriod?.data, dataKey]);

  const gridTicks = useMemo(() => {
    const values = (currentPeriod?.data ?? [])
      .map((d: any) => {
        const v = d?.[dataKey];
        return typeof v === "number" ? v : 0;
      })
      .filter((v: number) => !Number.isNaN(v));

    const max = values.length ? Math.max(...values) : 0;
    if (max <= 0) return [0];

    const isCountMetric = chartType === "clients" || chartType === "sales";

    // Draw 5 horizontal levels: 0, 1/4, 2/4, 3/4, 4/4 of max.
    const steps = 4;
    const ticks = Array.from({ length: steps + 1 }, (_, i) => (max * i) / steps).map(
      (v) => (isCountMetric ? Math.round(v) : v),
    );

    // De-dupe while keeping stable ordering.
    const uniq: number[] = [];
    const eps = 1e-9;
    ticks.forEach((t) => {
      const exists = uniq.some((u) => Math.abs(u - t) < eps);
      if (!exists) uniq.push(t);
    });

    // Always include 0 and max.
    if (!uniq.includes(0)) uniq.unshift(0);
    if (!uniq.some((v) => Math.abs(v - max) < eps)) uniq.push(max);

    return uniq;
  }, [currentPeriod?.data, dataKey]);

  // Daily tick (1m): render non-rotated two-line labels:
  // first line = day number, second line = translated month ("2 Mars", "23 Mar", ...)
  const DailyTick = ({ x, y, payload }: any) => {
    const raw: string = payload?.value ?? "";
    const parts = raw.split(" ");
    const day = parts[0] ?? "";
    const month = parts.slice(1).join(" ");

    const point = (currentPeriod?.data ?? []).find((d: any) => d?.period === raw);
    const value = point?.[dataKey] ?? 0;
    const isZero = (value ?? 0) === 0;

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fill={isZero ? axisColor : isDark ? "#ffffff" : "#000000"}
        fontSize={12}
        fontWeight={600}
      >
        <tspan x={x} dy={0}>
          {day}
        </tspan>
        <tspan x={x} dy={14} fontSize={12}>
          {month}
        </tspan>
      </text>
    );
  };
  const yAxisWidth = useMemo(() => {
    // Dynamically reserve enough space for long tick labels.
    // Recharts can clip the left-side of SVG text when Y-axis width is too small.
    const dataKey = getDataKey();
    const values = (currentPeriod.data || [])
      .map((d: any) => (typeof d?.[dataKey] === "number" ? d[dataKey] : 0));

    if (values.length === 0) return 60;

    const minProfit = Math.min(...values);
    const maxProfit = Math.max(...values);
    const formattedMin = formatValue(minProfit);
    const formattedMax = formatValue(maxProfit);
    const longest = formattedMin.length >= formattedMax.length ? formattedMin : formattedMax;

    // Approx SVG text width at fontSize ~14 is around ~7.5px/char; add padding for separators.
    const approxCharWidth = 7.5;
    const paddingPx = 18;
    const computed = Math.ceil(longest.length * approxCharWidth + paddingPx);

    // Clamp so the chart remains usable.
    // Clients can be smaller, but keep a base minimum.
    return Math.max(56, Math.min(190, computed));
  }, [currentPeriod.data, chartType, currencyLabel, t, i18n.language]);

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={currentPeriod.data}
          margin={{
            top: 20,
            right: 60,
            left: 20,
            bottom: 20,
          }}
        >
          <defs>
            <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
              {barRedGradientStops.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </linearGradient>
            <linearGradient id="barGradientGreen" x1="0" y1="0" x2="0" y2="1">
              {barGreenGradientStops.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </linearGradient>
          </defs>

          {/* We draw horizontal gridlines ourselves to control: y=0 continuous only */}
          <CartesianGrid vertical={false} horizontal={false} />
          {gridTicks.map((tick) =>
            Math.abs(tick - 0) < 1e-9 ? (
              <ReferenceLine
                key={`grid-0`}
                y={0}
                stroke={axisColor}
                strokeWidth={1}
                strokeDasharray="0"
              />
            ) : (
              <ReferenceLine
                key={`grid-${tick}`}
                y={tick}
                stroke={axisColor}
                strokeWidth={1}
                strokeDasharray="5 4"
              />
            ),
          )}

          <XAxis
            dataKey="period"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            angle={0}
            textAnchor="middle"
            fontSize={timePeriod === "1m" ? 10 : 14}
            interval={0}
            // Force render every tick for daily view to avoid skipped days (e.g. "2 Mars").
            ticks={
              timePeriod === "1m"
                ? currentPeriod.data.map((d) => d.period)
                : undefined
            }
            height={timePeriod === "1m" ? 60 : 30}
            fill={isDark ? "#ffffff" : "#000000"}
            fontWeight={600}
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeWidth={0.3}
            tick={timePeriod === "1m" ? DailyTick : undefined}
          />

          <YAxis
            tickLine={{ stroke: axisColor, strokeWidth: 1 }}
            axisLine={{ stroke: axisColor, strokeWidth: 1 }}
            tickMargin={8}
            fontSize={14}
            fontWeight={600}
            fill={isDark ? "#ffffff" : "#000000"}
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeWidth={0.3}
            tickFormatter={formatValue}
            textAnchor={i18n.language === "ar" ? "start" : "end"}
            style={{ whiteSpace: 'nowrap' }}
            width={yAxisWidth}
          />

          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const point = (currentPeriod?.data ?? []).find((d) => d.period === label);
                const revenue = point?.sales ?? 0;
                const profit = point?.profits ?? 0;
                const salesCount = point?.salesCount ?? 0;
                const salesQuantity = point?.salesQuantity ?? 0;
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
                    {chartType === "sales" ? (
                      <>
                        <div className="flex justify-between items-center mt-2">
                          <span
                            className={
                              isDark
                                ? "text-sm font-medium text-gray-200"
                                : "text-sm font-medium text-gray-700"
                            }
                          >
                            {t("dashboard.sales")}:
                          </span>
                          <span
                            className={
                              salesCount === 0
                                ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                                : isDark
                                  ? "text-sm font-semibold text-white mx-1"
                                  : "text-sm font-semibold text-gray-900 mx-1"
                            }
                          >
                            {salesCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span
                            className={
                              isDark
                                ? "text-sm font-medium text-gray-200"
                                : "text-sm font-medium text-gray-700"
                            }
                          >
                            {t("dashboard.quantity")}:
                          </span>
                          <span
                            className={
                              salesQuantity === 0
                                ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                                : isDark
                                  ? "text-sm font-semibold text-green-400 mx-1"
                                  : "text-sm font-semibold text-green-600 mx-1"
                            }
                          >
                            {salesQuantity.toLocaleString()}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mt-2">
                          <span
                            className={
                              isDark
                                ? "text-sm font-medium text-gray-200"
                                : "text-sm font-medium text-gray-700"
                            }
                          >
                            {t("dashboard.revenue")}
                          </span>
                          <span
                            className={
                              revenue === 0
                                ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                                : isDark
                                  ? "text-sm font-semibold text-white mx-1"
                                  : "text-sm font-semibold text-gray-900 mx-1"
                            }
                          >
                            {revenue.toLocaleString()} {t("currency")}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span
                            className={
                              isDark
                                ? "text-sm font-medium text-gray-200"
                                : "text-sm font-medium text-gray-700"
                            }
                          >
                            {t("dashboard.profit")}
                          </span>
                          <span
                            className={
                              profit === 0
                                ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                                : isDark
                                  ? "text-sm font-semibold text-green-400 mx-1"
                                  : "text-sm font-semibold text-green-600 mx-1"
                            }
                          >
                            {profit.toLocaleString()} {t("currency")}
                          </span>
                        </div>
                      </>
                    )}
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
            dataKey={dataKey}
            fill="url(#barGradientGreen)"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
          >
            {(currentPeriod?.data ?? []).map((d: any) => {
              const v = d?.[dataKey] ?? 0;
              const isZero = (v ?? 0) === 0;
              const isAboveAvg = v >= avgValue;
              return (
                <Cell
                  key={d?.period ?? String(v)}
                  fill={isAboveAvg ? "url(#barGradientGreen)" : "url(#barGradientRed)"}
                  fillOpacity={isZero ? 0.2 : 1}
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
