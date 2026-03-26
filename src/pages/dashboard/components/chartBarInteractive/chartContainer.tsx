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
  LineChart,
  Line,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartContainerProps } from "./types";

export function ChartContainer({
  currentPeriod,
  chartType,
  timePeriod,
  chartView,
  kpiTimePeriod,
  kpiVsAverage,
  billsPaymentsData = [],
  purchasesData = [],
}: ChartContainerProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  const isDailyView = timePeriod === "today" || timePeriod === "thisMonth";
  const periodAnimationKey = `period-${timePeriod}`;

  const currentPeriodIndicatorX = useMemo(() => {
    const now = new Date();

    if (timePeriod === "thisMonth" || timePeriod === "today") {
      // Must match the chartUtils daily label format: `${day} ${translatedMonth}`
      return `${now.getDate()} ${t(`dashboard.months.${now.getMonth()}`)}`;
    }
    if (timePeriod === "thisYear") {
      // Month label format for yearly (monthly aggregation): translated month name
      return t(`dashboard.months.${now.getMonth()}`);
    }
    if (timePeriod === "overall") {
      // Year labels are stored as plain year strings
      return now.getFullYear().toString();
    }
    return null;
  }, [timePeriod, t, i18n.language]);

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
  const lineStroke = isDark ? "#34d399" : "#16a34a";

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

  const lineGreen = isDark ? "#34d399" : "#16a34a";
  const lineRed = isDark ? "#fb7185" : "#dc2626";

  const lineDomain = useMemo(() => {
    const values = (currentPeriod?.data ?? [])
      .map((d: any) => {
        const raw = d?.[dataKey];
        return typeof raw === "number" ? raw : 0;
      })
      .filter((v: number) => !Number.isNaN(v));

    if (!values.length) return { min: 0, max: 0 };
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    return { min, max };
  }, [currentPeriod?.data, dataKey]);

  const avgFromTop = useMemo(() => {
    const { min, max } = lineDomain;
    if (max === min) return 0.5;
    // y=0 is top, y=1 is bottom. Higher values appear towards the top.
    return (max - avgValue) / (max - min);
  }, [lineDomain, avgValue]);

  const avgStopPct = Math.max(0, Math.min(1, avgFromTop)) * 100;
  const gradientTransitionPct = 6; // smoother change between green and red
  const avgStopPctSmoothEnd = Math.max(0, Math.min(100, avgStopPct + gradientTransitionPct));
  const lineGradientId = `lineGradient-${periodAnimationKey}-${dataKey}-${chartType}`;

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

  // X-axis tick renderer that can show the indicator dot under the current period label.
  // The indicator dot is positioned as an extra line under the existing tick text.
  const DailyTick = ({ x, y, payload }: any) => {
    const raw: string = payload?.value ?? "";
    const parts = raw.split(" ");
    const day = parts[0] ?? "";
    const month = parts.slice(1).join(" ");

    const point = (currentPeriod?.data ?? []).find((d: any) => d?.period === raw);
    const value = point?.[dataKey] ?? 0;
    const isZero = (value ?? 0) === 0;
    const isIndicator = !!currentPeriodIndicatorX && currentPeriodIndicatorX === raw;

    const arrowFill = isDark ? "#60a5fa" : "#3b82f6";
    // month line is at dy=14 from the base `y`, and the indicator was placed at dy=10.
    // So triangle tip ~= y + 14 + 10.
    const tipY = y + 24;
    const baseY = tipY + 9;
    const leftX = x - 7;
    const rightX = x + 7;

    return (
      <g>
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
        {isIndicator ? (
          <polygon
            points={`${leftX},${baseY} ${rightX},${baseY} ${x},${tipY}`}
            fill={arrowFill}
          />
        ) : null}
      </g>
    );
  };

  const NonDailyTick = ({ x, y, payload }: any) => {
    const label = payload?.value ?? "";
    const isIndicator = !!currentPeriodIndicatorX && currentPeriodIndicatorX === label;
    const point = (currentPeriod?.data ?? []).find((d: any) => d?.period === label);
    const value = point?.[dataKey] ?? 0;
    const isZero = (value ?? 0) === 0;
    const fill = isZero ? axisColor : isDark ? "#ffffff" : "#000000";

    const arrowFill = isDark ? "#60a5fa" : "#3b82f6";
    // Single label at dy=0, and indicator was previously at dy=12.
    const tipY = y + 12;
    const baseY = tipY + 9;
    const leftX = x - 7;
    const rightX = x + 7;

    return (
      <g>
        <text x={x} y={y} textAnchor="middle" fill={fill} fontSize={12} fontWeight={600}>
          <tspan x={x} dy={0}>
            {label}
          </tspan>
        </text>
        {isIndicator ? (
          <polygon
            points={`${leftX},${baseY} ${rightX},${baseY} ${x},${tipY}`}
            fill={arrowFill}
          />
        ) : null}
      </g>
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

  const tooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = (currentPeriod?.data ?? []).find((d: any) => d.period === label);
      const revenue = point?.sales ?? 0;
      const profit = point?.profits ?? 0;
      const salesCount = point?.salesCount ?? 0;
      const salesQuantity = point?.salesQuantity ?? 0;
      const isCurrentIndicator = !!currentPeriodIndicatorX && currentPeriodIndicatorX === label;
      const shouldUseKpiRating =
        chartType === "profits" &&
        kpiTimePeriod === "today" &&
        isCurrentIndicator &&
        !!kpiVsAverage;
      const pct = avgValue !== 0 ? ((profit - avgValue) / Math.abs(avgValue)) * 100 : 0;
      const ratingDirection: "up" | "down" = shouldUseKpiRating
        ? (kpiVsAverage?.direction ?? "up")
        : pct >= 0
          ? "up"
          : "down";
      const ratingPercentage = shouldUseKpiRating
        ? (kpiVsAverage?.percentage ?? 0)
        : Math.abs(pct);
      const billsForHoveredPeriod = (billsPaymentsData ?? []).reduce((sum, p) => {
        if (!p?.paidDate) return sum;
        const d = new Date(p.paidDate);
        const mappedLabel =
          timePeriod === "thisMonth"
            ? `${d.getDate()} ${t(`dashboard.months.${d.getMonth()}`)}`
            : timePeriod === "thisYear"
              ? t(`dashboard.months.${d.getMonth()}`)
              : d.getFullYear().toString();
        if (mappedLabel !== label) return sum;
        return sum + ((p.amount || 0) / 100);
      }, 0);
      const purchasesForHoveredPeriod = (purchasesData ?? []).reduce((sum, p) => {
        if (!p?.createdAt) return sum;
        const d = new Date(p.createdAt);
        const mappedLabel =
          timePeriod === "thisMonth"
            ? `${d.getDate()} ${t(`dashboard.months.${d.getMonth()}`)}`
            : timePeriod === "thisYear"
              ? t(`dashboard.months.${d.getMonth()}`)
              : d.getFullYear().toString();
        if (mappedLabel !== label) return sum;
        const purchaseTotal = (p.PurchaseItems ?? []).reduce(
          (itemSum, item) => itemSum + (item.price || 0) * (item.quantity || 0),
          0,
        );
        return sum + purchaseTotal;
      }, 0);
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
                ? "border-b border-gray-800 pb-2 flex items-center justify-between gap-2"
                : "border-b border-gray-100 pb-2 flex items-center justify-between gap-2"
            }
          >
            <p
              className={
                isDark ? "text-sm font-semibold text-white" : "text-sm font-semibold text-gray-900"
              }
            >
              {label}
            </p>
            {chartType === "profits" && ratingPercentage > 0 ? (
              <span
                className={
                  ratingDirection === "up"
                    ? "inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400"
                    : "inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"
                }
              >
                {ratingDirection === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {ratingPercentage.toFixed(1)}%
              </span>
            ) : null}
          </div>
          {chartType === "sales" ? (
            <>
              <div className="flex justify-between items-center mt-2">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
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
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
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
              <div className="flex justify-between items-center mt-1">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("dashboard.billsAndExpenses")}:
                </span>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 mx-1">
                  {billsForHoveredPeriod.toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("history.purchases")}:
                </span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 mx-1">
                  {purchasesForHoveredPeriod.toLocaleString()} {t("currency")}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mt-2">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("dashboard.revenue")}:
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
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("dashboard.profit")}:
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
              <div className="flex justify-between items-center mt-1">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("dashboard.billsAndExpenses")}:
                </span>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 mx-1">
                  {billsForHoveredPeriod.toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("history.purchases")}:
                </span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 mx-1">
                  {purchasesForHoveredPeriod.toLocaleString()} {t("currency")}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const xAxisPointCount = currentPeriod?.data?.length ?? 0;
  const shouldShowSinglePointLineMessage =
    chartView === "line" &&
    (timePeriod === "thisMonth" || timePeriod === "thisYear") &&
    xAxisPointCount === 1;

  return (
    <div className="h-[400px] w-full">
      {shouldShowSinglePointLineMessage ? (
        <div className="h-full w-full flex flex-col items-center justify-center py-12 text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("dashboard.singlePointLineChartTitle", "Not enough points for a line chart")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t(
              "dashboard.singlePointLineChartDesc",
              "Only one period is available on the X-axis. Add more days or months, or switch to bar view.",
            )}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {chartView === "line" ? (
          <LineChart
            key={`line-${periodAnimationKey}`}
            data={currentPeriod.data}
            margin={{
              top: 20,
              right: 60,
              left: 20,
              bottom: 20,
            }}
          >
            <defs>
              {/* Color change point is the avgValue (horizontal reference) */}
              <linearGradient
                id={lineGradientId}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
                gradientUnits="objectBoundingBox"
              >
                <stop offset="0%" stopColor={lineGreen} />
                <stop offset={`${avgStopPct}%`} stopColor={lineGreen} />
                <stop offset={`${avgStopPctSmoothEnd}%`} stopColor={lineRed} />
                <stop offset="100%" stopColor={lineRed} />
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
              fontSize={isDailyView ? 10 : 14}
              interval={0}
              ticks={
                isDailyView ? currentPeriod.data.map((d) => d.period) : undefined
              }
              height={isDailyView ? 76 : 44}
              fill={isDark ? "#ffffff" : "#000000"}
              fontWeight={600}
              stroke={isDark ? "#ffffff" : "#000000"}
              strokeWidth={0.3}
              tick={isDailyView ? DailyTick : NonDailyTick}
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
              style={{ whiteSpace: "nowrap" }}
              width={yAxisWidth}
            />

            <Tooltip
              content={tooltipContent}
              cursor={{
                stroke: isDark ? "rgba(59,130,246,0.35)" : "rgba(59,130,246,0.3)",
                strokeWidth: 1,
              }}
              position={{ x: undefined, y: undefined }}
            />

            <Line
              type="monotone"
              dataKey={dataKey}
              strokeWidth={3}
              isAnimationActive={true}
              animationDuration={1800}
              stroke={`url(#${lineGradientId})`}
              dot={(props: any) => {
                const v = props?.payload?.[dataKey] ?? 0;
                const fill = v >= avgValue ? lineGreen : lineRed;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={4}
                    fill={fill}
                    stroke={isDark ? "#0b1220" : "#ffffff"}
                    strokeWidth={1}
                  />
                );
              }}
              activeDot={(props: any) => {
                const v = props?.payload?.[dataKey] ?? 0;
                const fill = v >= avgValue ? lineGreen : lineRed;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={6}
                    fill={fill}
                    stroke={isDark ? "#0b1220" : "#ffffff"}
                    strokeWidth={1}
                  />
                );
              }}
            />
          </LineChart>
          ) : (
            <BarChart
            key={`bar-${periodAnimationKey}`}
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
            fontSize={isDailyView ? 10 : 14}
            interval={0}
            // Force render every tick for daily view to avoid skipped days (e.g. "2 Mars").
            ticks={
              isDailyView ? currentPeriod.data.map((d) => d.period) : undefined
            }
            height={isDailyView ? 76 : 44}
            fill={isDark ? "#ffffff" : "#000000"}
            fontWeight={600}
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeWidth={0.3}
              tick={isDailyView ? DailyTick : NonDailyTick}
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
            content={tooltipContent}
            cursor={{
              fill: isDark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.1)",
            }}
            position={{ x: undefined, y: undefined }}
          />

          <Bar
            key={`bar-series-${periodAnimationKey}`}
            dataKey={dataKey}
            fill="url(#barGradientGreen)"
            radius={[4, 4, 0, 0]}
            maxBarSize={60}
            isAnimationActive={true}
            animationDuration={650}
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
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
