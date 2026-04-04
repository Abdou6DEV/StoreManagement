import { useCallback, useMemo } from "react";
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
  type TooltipContentProps,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartContainerProps } from "./types";

/**
 * Step multipliers so `top = 4 × step` stays readable (3.75 → 37 500 when top = 150 000).
 */
const QUARTER_TOP_FACTORS = [1, 2, 2.5, 3.75, 5, 7.5, 10] as const;

/** Smallest nice `step` with `4 * step >= minTop` (tight ceiling → bars use more height). */
function minimalNiceStepForQuarterTop(minTop: number): number {
  const floor = Math.max(minTop, 1e-12);
  let exp = Math.floor(Math.log10(floor / 4));
  for (let guard = 0; guard < 48; guard++) {
    const steps = QUARTER_TOP_FACTORS.map((nf) => nf * 10 ** exp).sort((a, b) => a - b);
    for (const step of steps) {
      if (4 * step >= floor - 1e-9) return step;
    }
    exp += 1;
  }
  return floor / 4;
}

/**
 * **5** Y labels = **4** equal steps from 0 to `top`, with `top` as small as possible but ≥ data ceiling.
 * Same array for YAxis + dashed grid (e.g. 0, 37 500, 75 000, 112 500, 150 000 for ~116k peak).
 */
function buildNiceYTicksQuarterMax(scaleMin: number, rawTop: number): number[] {
  if (!Number.isFinite(scaleMin) || !Number.isFinite(rawTop)) return [0];
  if (rawTop < scaleMin) return [0];
  if (Math.abs(rawTop - scaleMin) < 1e-12) {
    return scaleMin === 0 ? [0] : [scaleMin];
  }

  if (scaleMin >= 0) {
    const step = minimalNiceStepForQuarterTop(rawTop);
    const hi = 4 * step;
    return [0, step, 2 * step, 3 * step, hi];
  }

  const spanNeed = rawTop - scaleMin;
  let exp = Math.floor(Math.log10(Math.max(spanNeed / 4, 1e-12)));
  for (let guard = 0; guard < 48; guard++) {
    for (const nf of QUARTER_TOP_FACTORS) {
      const step = nf * 10 ** exp;
      const t0 = Math.floor(scaleMin / step) * step;
      const hi = t0 + 4 * step;
      if (hi >= rawTop - 1e-9) {
        return [t0, t0 + step, t0 + 2 * step, t0 + 3 * step, hi];
      }
    }
    exp += 1;
  }

  return [scaleMin, rawTop];
}

export function ChartContainer({
  currentPeriod,
  chartType,
  timePeriod,
  chartView,
  kpiTimePeriod,
  kpiVsAverage,
  billsPaymentsData = [],
  purchasesData = [],
  grossProfitYAxis = false,
  tooltipContentOverride,
}: ChartContainerProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();

  const isDailyView = timePeriod === "today" || timePeriod === "thisMonth";
  const dailyXAxisHeight = timePeriod === "today" ? 52 : 76;
  const periodAnimationKey = `period-${timePeriod}`;

  const currentPeriodIndicatorX = useMemo(() => {
    const now = new Date();

    if (timePeriod === "today") {
      return `${String(now.getHours()).padStart(2, "0")}:00`;
    }
    if (timePeriod === "thisMonth") {
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
    const n = Math.round(Number(value));
    if (chartType === "clients" || chartType === "sales") return `${n}`;
    // Integers only on axis (no ,00); no space before currency to limit wrapping
    return `${n.toLocaleString(i18n.language, {
      maximumFractionDigits: 0,
      useGrouping: true,
    })}${t("currency")}`;
  };

  const formatTooltipValue = (value: number) => {
    if (chartType === "clients") {
      return `${value} ${t("dashboard.clients")}`;
    }
    return `${value.toLocaleString()} ${t("currency")}`;
  };

  const currencyLabel = t("currency");
  const dataKey = getDataKey();

  /** Values that define Y-axis ticks/domain (gross profit when net-profit view keeps axis stable). */
  const scaleValueForYAxis = useCallback(
    (d: any): number => {
      if (chartType === "profits" && grossProfitYAxis && typeof d?.profitsGross === "number") {
        return d.profitsGross;
      }
      const v = d?.[dataKey];
      return typeof v === "number" ? v : 0;
    },
    [chartType, grossProfitYAxis, dataKey],
  );

  // Past/current periods only — future placeholder slots must not affect averages, Y scale, or ratings.
  const dataForScale = useMemo(
    () => (currentPeriod?.data ?? []).filter((d: any) => !d?.future),
    [currentPeriod?.data],
  );

  /** Line chart: null after last real day/month so the stroke stops (connectNulls=false). Bars still use 0. */
  const lineChartData = useMemo(() => {
    if (chartView !== "line") return currentPeriod?.data ?? [];
    return (currentPeriod?.data ?? []).map((d: any) => {
      if (!d?.future) return d;
      return { ...d, [dataKey]: null };
    });
  }, [currentPeriod?.data, chartView, dataKey]);

  const avgValue = useMemo(() => {
    const values = dataForScale.map((d: any) => {
      const v = d?.[dataKey];
      return typeof v === "number" ? v : 0;
    });

    // Average should be based on "real" bars (exclude zeros), otherwise it becomes ~0
    // and all bars look like they're "above average".
    const nonZeroValues = values.filter((v) => (v ?? 0) !== 0);
    if (nonZeroValues.length === 0) return 0;
    const sum = nonZeroValues.reduce((acc, v) => acc + v, 0);
    return sum / nonZeroValues.length;
  }, [dataForScale, dataKey]);

  const lineGreen = isDark ? "#34d399" : "#16a34a";
  const lineRed = isDark ? "#fb7185" : "#dc2626";

  const gridTicks = useMemo(() => {
    const scaleValues = dataForScale
      .map((d: any) => scaleValueForYAxis(d))
      .filter((v: number) => !Number.isNaN(v));

    const displayValues = dataForScale.map((d: any) => {
      const v = d?.[dataKey];
      return typeof v === "number" ? v : 0;
    });

    const dataMax = scaleValues.length ? Math.max(...scaleValues) : 0;
    const displayMin = displayValues.length ? Math.min(...displayValues) : 0;

    if (dataMax <= 0 && displayMin >= 0) return [0];

    const HEADROOM = 1.1;
    const rawTop = Math.max(dataMax, 0) * HEADROOM;
    const scaleMin = displayMin < 0 ? displayMin * HEADROOM : 0;
    const scaleMax = Math.max(rawTop, 1);
    if (scaleMax <= scaleMin) return [0];

    // 5 labels, 4 equal steps; top = 4×step is minimal nice cover of ceiling (bars stay tall).
    return buildNiceYTicksQuarterMax(scaleMin, scaleMax);
  }, [dataForScale, scaleValueForYAxis, dataKey]);

  // Y-axis domain + tick list must match `gridTicks` / ReferenceLine y values. Otherwise
  // Recharts auto-nice scales the axis and dashed grid lines no longer align with labels.
  const yAxisDomain = useMemo((): [number, number] => {
    if (!gridTicks.length) return [0, 1];
    const lo = Math.min(...gridTicks);
    const hi = Math.max(...gridTicks);
    if (hi <= lo) return [0, lo === 0 && hi === 0 ? 1 : Math.max(hi, 1)];
    return [lo, hi];
  }, [gridTicks]);

  const avgFromTop = useMemo(() => {
    if (!gridTicks.length) return 0.5;
    const min = Math.min(...gridTicks);
    const max = Math.max(...gridTicks);
    if (max === min) return 0.5;
    return (max - avgValue) / (max - min);
  }, [gridTicks, avgValue]);

  const avgStopPct = Math.max(0, Math.min(1, avgFromTop)) * 100;
  const gradientTransitionPct = 6;
  const avgStopPctSmoothEnd = Math.max(0, Math.min(100, avgStopPct + gradientTransitionPct));
  const lineGradientId = `lineGradient-${periodAnimationKey}-${dataKey}-${chartType}`;

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
    const leftX = x - 7;
    const rightX = x + 7;

    if (timePeriod === "today") {
      const tipY = y + 12;
      const baseY = tipY + 9;
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
              {raw}
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
    }

    const tipY = y + 24;
    const baseY = tipY + 9;

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
    if (!gridTicks.length) return 60;
    const minTick = Math.min(...gridTicks);
    const maxTick = Math.max(...gridTicks);
    const formattedMin = formatValue(minTick);
    const formattedMax = formatValue(maxTick);
    const longest = formattedMin.length >= formattedMax.length ? formattedMin : formattedMax;
    const approxCharWidth = 7.5;
    const paddingPx = 18;
    const computed = Math.ceil(longest.length * approxCharWidth + paddingPx);
    return Math.max(56, Math.min(190, computed));
  }, [gridTicks, chartType, i18n.language, t]);

  const tooltipContent = ({ active, payload, label }: TooltipContentProps) => {
    if (active && payload && payload.length) {
      const now = new Date();
      const mapDateToPeriodLabel = (rawDate: string | Date | undefined) => {
        if (!rawDate) return null;
        const d = new Date(rawDate);
        if (Number.isNaN(d.getTime())) return null;

        if (timePeriod === "today") {
          if (
            d.getFullYear() !== now.getFullYear() ||
            d.getMonth() !== now.getMonth() ||
            d.getDate() !== now.getDate()
          ) {
            return null;
          }
          return `${String(d.getHours()).padStart(2, "0")}:00`;
        }

        if (timePeriod === "thisMonth") {
          if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) {
            return null;
          }
          return `${d.getDate()} ${t(`dashboard.months.${d.getMonth()}`)}`;
        }

        if (timePeriod === "thisYear") {
          if (d.getFullYear() !== now.getFullYear()) return null;
          return t(`dashboard.months.${d.getMonth()}`);
        }

        return d.getFullYear().toString();
      };

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
        const mappedLabel = mapDateToPeriodLabel(p.paidDate);
        if (!mappedLabel) return sum;
        if (mappedLabel !== label) return sum;
        return sum + ((p.amount || 0) / 100);
      }, 0);
      const purchasesForHoveredPeriod = (purchasesData ?? []).reduce((sum, p) => {
        if (!p?.createdAt) return sum;
        const mappedLabel = mapDateToPeriodLabel(p.createdAt);
        if (!mappedLabel) return sum;
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
            {chartType === "profits" &&
            timePeriod !== "today" &&
            ratingPercentage > 0 &&
            !point?.future ? (
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
                <span
                  className={
                    billsForHoveredPeriod === 0
                      ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                      : "text-sm font-semibold text-purple-600 dark:text-purple-400 mx-1"
                  }
                >
                  {billsForHoveredPeriod.toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("history.purchases")}:
                </span>
                <span
                  className={
                    purchasesForHoveredPeriod === 0
                      ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                      : "text-sm font-semibold text-orange-600 dark:text-orange-400 mx-1"
                  }
                >
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
                <span
                  className={
                    billsForHoveredPeriod === 0
                      ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                      : "text-sm font-semibold text-purple-600 dark:text-purple-400 mx-1"
                  }
                >
                  {billsForHoveredPeriod.toLocaleString()} {t("currency")}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className={isDark ? "text-sm font-medium text-gray-200" : "text-sm font-medium text-gray-700"}>
                  {t("history.purchases")}:
                </span>
                <span
                  className={
                    purchasesForHoveredPeriod === 0
                      ? "text-sm font-semibold text-gray-400 mx-1 opacity-60"
                      : "text-sm font-semibold text-orange-600 dark:text-orange-400 mx-1"
                  }
                >
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

  const resolvedTooltipContent = tooltipContentOverride ?? tooltipContent;

  const nonFutureSlotCount = (currentPeriod?.data ?? []).filter((d: any) => !d?.future).length;
  const shouldShowSinglePointLineMessage =
    chartView === "line" &&
    (timePeriod === "today" || timePeriod === "thisMonth" || timePeriod === "thisYear") &&
    nonFutureSlotCount <= 1;

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
            data={lineChartData}
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
              height={isDailyView ? dailyXAxisHeight : 44}
              fill={isDark ? "#ffffff" : "#000000"}
              fontWeight={600}
              stroke={isDark ? "#ffffff" : "#000000"}
              strokeWidth={0.3}
              tick={isDailyView ? DailyTick : NonDailyTick}
            />

            <YAxis
              type="number"
              domain={yAxisDomain}
              ticks={gridTicks}
              allowDecimals
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
              content={resolvedTooltipContent}
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
              connectNulls={false}
              isAnimationActive={true}
              animationDuration={1800}
              stroke={`url(#${lineGradientId})`}
              dot={(props: any) => {
                const v = props?.payload?.[dataKey];
                if (v === null || v === undefined) return null;
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
                const v = props?.payload?.[dataKey];
                if (v === null || v === undefined) return null;
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
            height={isDailyView ? dailyXAxisHeight : 44}
            fill={isDark ? "#ffffff" : "#000000"}
            fontWeight={600}
            stroke={isDark ? "#ffffff" : "#000000"}
            strokeWidth={0.3}
              tick={isDailyView ? DailyTick : NonDailyTick}
          />

          <YAxis
            type="number"
            domain={yAxisDomain}
            ticks={gridTicks}
            allowDecimals
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
            content={resolvedTooltipContent}
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
