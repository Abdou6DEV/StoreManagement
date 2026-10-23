import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ChartColumnIncreasing,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DashboardMetric,
  DashboardPanel,
  DASHBOARD_CHART_COLORS,
} from "../../../src/lib/components/dashboardPresentation";
import type {
  MobileBundle,
  MobileLanguage,
  MobilePermissions,
} from "../mobileApi";
import {
  MobileClientStats,
  MobilePurchaseStats,
  MobileServiceStats,
  MobileStockStats,
} from "./MobileDashboardStats";

type Period = "today" | "month" | "year";
type ChartStyle = "bar" | "line";
type DashboardChartPoint = {
  period: string;
  revenue: number;
  profits: number;
  items: number;
  billPayments: number;
  future?: boolean;
};

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type MobileDashboardLabels = {
  dashboard: string;
  overviewPeriod: string;
  today: string;
  thisMonth: string;
  thisYear: string;
  last365Days: string;
  revenue: string;
  profit: string;
  items: string;
  products: string;
  inventory: string;
  totalQuantity: string;
  stockCost: string;
  outOfStock: string;
  clientsCount: string;
  serviceAppointments: string;
  completed: string;
  overdue: string;
  chartStyle: string;
  barChart: string;
  lineChart: string;
  recentDays: string;
  empty: string;
  billPayments: string;
  netProfit: string;
};

export function MobileDashboard({
  data,
  permissions,
  language,
  labels,
}: {
  data: MobileBundle;
  permissions: MobilePermissions;
  language: MobileLanguage;
  labels: MobileDashboardLabels;
}) {
  const [period, setPeriod] = useState<Period>("today");
  const [chartStyle, setChartStyle] = useState<ChartStyle>("bar");
  const [subtractBillPayments, setSubtractBillPayments] = useState(false);
  const [chartTooltipActive, setChartTooltipActive] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissTooltipOutsideChart = (event: PointerEvent) => {
      if (!chartContainerRef.current?.contains(event.target as Node)) {
        setChartTooltipActive(false);
      }
    };

    document.addEventListener("pointerdown", dismissTooltipOutsideChart, true);
    return () => {
      document.removeEventListener("pointerdown", dismissTooltipOutsideChart, true);
    };
  }, []);
  const days = useMemo(
    () =>
      [...data.dashboard_daily]
        .filter((row) => typeof row.local_day === "string")
        .sort((a, b) => String(a.local_day).localeCompare(String(b.local_day))),
    [data.dashboard_daily],
  );
  const now = new Date();
  const today = localDay(now);
  const selectedDays = days.filter((row) => {
    const day = String(row.local_day);
    if (period === "today") return day === today;
    if (period === "month") return day.slice(0, 7) === today.slice(0, 7);
    return day.slice(0, 4) === today.slice(0, 4);
  });
  const totals = selectedDays.reduce<{ revenue: number; profit: number; items: number }>(
    (result, row) => ({
      revenue: result.revenue + (Number(row.revenue) || 0),
      profit: result.profit + (Number(row.profit) || 0),
      items: result.items + (Number(row.total_items) || 0),
    }),
    { revenue: 0, profit: 0, items: 0 },
  );
  const selectedBillPayments =
    selectedDays.reduce<number>(
      (sum, row) => sum + (Number(row.bill_payments) || 0),
      0,
    ) / 100;
  const todaySummary = selectedDays[0];
  const todayHasSalesWithoutHourlyRows =
    period === "today" &&
    (Number(todaySummary?.sales_count) || 0) > 0 &&
    data.sales.length === 0;
  const hourlySalesAvailable =
    permissions.can_access_history &&
    data.sales_history_available &&
    data.sales.length < 5000 &&
    !todayHasSalesWithoutHourlyRows;
  const hourlyBillsAvailable =
    permissions.can_access_bills && data.bill_payments.length < 3000;
  const canSubtractBillPayments =
    selectedBillPayments > 0 && (period !== "today" || hourlyBillsAvailable);
  const netProfitActive = subtractBillPayments && canSubtractBillPayments;
  const adjustedProfit = netProfitActive
    ? totals.profit - selectedBillPayments
    : totals.profit;
  useEffect(() => {
    if (selectedBillPayments <= 0) setSubtractBillPayments(false);
  }, [selectedBillPayments]);

  const number = (value: number) =>
    new Intl.NumberFormat(language, { maximumFractionDigits: 2 }).format(value);
  const money = (value: number) => `${number(value)} DA`;
  const rangeTitle =
    period === "today"
      ? labels.today
      : period === "month"
        ? labels.thisMonth
        : labels.thisYear;
  const dailyByDay = new Map(days.map((row) => [String(row.local_day), row]));
  const chartPoints: DashboardChartPoint[] = [];
  if (period === "today") {
    if (hourlySalesAvailable) {
      const hourlyRevenue = new Map<number, number>();
      const hourlyProfits = new Map<number, number>();
      const hourlyItems = new Map<number, number>();
      for (const sale of data.sales) {
        const createdAt = new Date(String(sale.source_created_at ?? ""));
        if (!Number.isFinite(createdAt.getTime()) || localDay(createdAt) !== today) continue;
        const hour = createdAt.getHours();
        hourlyRevenue.set(hour, (hourlyRevenue.get(hour) ?? 0) + (Number(sale.total_amount ?? sale.revenue) || 0));
        hourlyProfits.set(hour, (hourlyProfits.get(hour) ?? 0) + (Number(sale.total_profit) || 0));
        hourlyItems.set(hour, (hourlyItems.get(hour) ?? 0) + (Number(sale.total_items ?? sale.items_sold ?? sale.quantity) || 0));
      }
      const hourlyBills = new Map<number, number>();
      if (hourlyBillsAvailable) {
        for (const payment of data.bill_payments) {
          const paidAt = new Date(String(payment.paid_date ?? ""));
          if (!Number.isFinite(paidAt.getTime()) || localDay(paidAt) !== today) continue;
          const hour = paidAt.getHours();
          hourlyBills.set(hour, (hourlyBills.get(hour) ?? 0) + (Number(payment.amount) || 0) / 100);
        }
      }
      for (let hour = 0; hour <= now.getHours(); hour += 1) {
        chartPoints.push({
          period: `${String(hour).padStart(2, "0")}:00`,
          revenue: hourlyRevenue.get(hour) ?? 0,
          profits: hourlyProfits.get(hour) ?? 0,
          items: hourlyItems.get(hour) ?? 0,
          billPayments: hourlyBills.get(hour) ?? 0,
        });
      }
    }
  } else if (period === "month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), dayNumber, 12);
      const day = localDay(date);
      const row = dailyByDay.get(day);
      const future = date > new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
      chartPoints.push({
        period: String(dayNumber).padStart(2, "0"),
        revenue: future ? 0 : Number(row?.revenue) || 0,
        profits: future ? 0 : Number(row?.profit) || 0,
        items: future ? 0 : Number(row?.total_items) || 0,
        billPayments: future ? 0 : (Number(row?.bill_payments) || 0) / 100,
        future,
      });
    }
  } else if (period === "year") {
    for (let month = 0; month < 12; month += 1) {
      const future = month > now.getMonth();
      const key = `${now.getFullYear()}-${String(month + 1).padStart(2, "0")}`;
      const monthRows = future ? [] : days.filter((row) => String(row.local_day).startsWith(key));
      chartPoints.push({
        period: new Date(now.getFullYear(), month, 1, 12).toLocaleString(language, { month: "short" }).replace(/\.$/, ""),
        revenue: monthRows.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0),
        profits: monthRows.reduce((sum, row) => sum + (Number(row.profit) || 0), 0),
        items: monthRows.reduce((sum, row) => sum + (Number(row.total_items) || 0), 0),
        billPayments: monthRows.reduce((sum, row) => sum + (Number(row.bill_payments) || 0), 0) / 100,
        future,
      });
    }
  }
  const chartData = chartPoints.map(({ profits, billPayments, ...point }) => ({
    ...point,
    billPayments,
    profit: profits - (netProfitActive ? billPayments : 0),
  }));
  const actualProfits = chartData
    .filter((point) => !point.future)
    .map((point) => point.profit);
  const nonzeroProfits = actualProfits.filter((profit) => profit !== 0);
  const averageProfit = nonzeroProfits.length
    ? nonzeroProfits.reduce((sum, profit) => sum + profit, 0) / nonzeroProfits.length
    : 0;
  const profitMinimum = Math.min(0, ...actualProfits);
  const profitMaximum = Math.max(0, ...actualProfits);
  const profitPadding = Math.max((profitMaximum - profitMinimum) * 0.1, 1);
  const profitDomain: [number, number] = [
    profitMinimum < 0 ? profitMinimum - profitPadding : 0,
    profitMaximum > 0 ? profitMaximum + profitPadding : 1,
  ];
  const profitAxisStep = (() => {
    const roughStep = (profitDomain[1] - profitDomain[0]) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1e-9)));
    const normalized = roughStep / magnitude;
    return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
  })();
  const profitAxisTicks = Array.from(
    { length: Math.round((Math.ceil(profitDomain[1] / profitAxisStep) - Math.floor(profitDomain[0] / profitAxisStep))) + 1 },
    (_, index) => (Math.floor(profitDomain[0] / profitAxisStep) + index) * profitAxisStep,
  );
  const averageOffset = Math.max(
    0,
    Math.min(
      100,
      ((profitDomain[1] - averageProfit) / (profitDomain[1] - profitDomain[0])) * 100,
    ),
  );
  const profitLineData = chartData.map((point) =>
    point.future ? { ...point, profit: null } : point,
  );
  const isAboveAverage = (profit: number) => profit >= averageProfit;
  const redProfit = "#dc2626";
  const greenProfit = DASHBOARD_CHART_COLORS.light.barEnd;

  const summaryMoney = (value: number) => days.length > 0 ? money(value) : "—";
  const summaryNumber = (value: number) => days.length > 0 ? number(value) : "—";
  const dailyMonthLabel = new Date(now.getFullYear(), now.getMonth(), 1, 12)
    .toLocaleDateString(language, { month: "short" })
    .replace(/\.$/, "")
    .toLocaleLowerCase();
  const axisTickColor = (value: unknown) => {
    const point = chartData.find((entry) => entry.period === String(value));
    return point && !point.future && point.profit !== 0 ? "var(--foreground)" : "var(--muted-foreground)";
  };
  const dailyDateTick = (props: { x?: number; y?: number; payload?: { value?: string } }) => {
    const rawDay = String(props.payload?.value ?? "");
    const day = rawDay.padStart(2, "0");
    const color = axisTickColor(rawDay);
    const active = color === "var(--foreground)";
    const isCurrentDay = Number(rawDay) === now.getDate();
    return (
      <g transform={`translate(${props.x ?? 0},${props.y ?? 0})`}>
        <text x={0} y={0} textAnchor="middle" fill={color} fontSize={9} fontWeight={active ? 700 : 400}>
          {day}
        </text>
        <text x={0} y={12} textAnchor="middle" fill={color} fontSize={8} fontWeight={active ? 700 : 400}>
          {dailyMonthLabel}
        </text>
        {isCurrentDay ? <path d="M -4 3 L 0 -1 L 4 3" transform="translate(0, 18)" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </g>
    );
  };
  const chartPeriodTick = (props: { x?: number; y?: number; payload?: { value?: string } }) => {
    const value = String(props.payload?.value ?? "");
    const color = axisTickColor(value);
    const active = color === "var(--foreground)";
    const todayTick = period === "today";
    const isCurrentMonth = period === "year" && value.toLocaleLowerCase() === dailyMonthLabel;
    return (
      <g transform={`translate(${props.x ?? 0},${props.y ?? 0})`}>
        <text
          x={0}
          y={0}
          textAnchor={todayTick ? "end" : "middle"}
          fill={color}
          fontSize={period === "year" || todayTick ? 8 : 10}
          fontWeight={active ? 700 : 400}
          transform={todayTick ? "rotate(-45)" : undefined}
        >
          {value}
        </text>
        {isCurrentMonth ? <path d="M -4 3 L 0 -1 L 4 3" transform="translate(0, 7)" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" /> : null}
      </g>
    );
  };
  const tooltipDateLabel = (point: { period?: string }, fallback: unknown) => {
    if (period === "month") {
      const day = Number(point.period);
      if (Number.isInteger(day) && day >= 1 && day <= 31) {
        return new Date(now.getFullYear(), now.getMonth(), day, 12).toLocaleDateString(language, {
          day: "2-digit",
          month: "long",
        });
      }
    }
    if (period === "year") {
      const monthIndex = chartData.findIndex((entry) => entry.period === point.period);
      if (monthIndex >= 0) {
        return new Date(now.getFullYear(), monthIndex, 1, 12).toLocaleDateString(language, {
          month: "long",
          year: "numeric",
        });
      }
    }
    return String(fallback ?? "");
  };

  return (
    <div className="space-y-0">
      <DashboardPanel className="dashboard-overview !min-h-0 !gap-4 !p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">
                {labels.dashboard}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{rangeTitle}</p>
            </div>
          </div>
          <div className="flex items-end justify-between gap-3">
            <label className="mobile-select-control min-w-0 flex-1">
              <span>{labels.overviewPeriod}</span>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
              >
                <option value="today">{labels.today}</option>
                <option value="month">{labels.thisMonth}</option>
                <option value="year">{labels.thisYear}</option>
              </select>
            </label>
            {canSubtractBillPayments ? (
              <button
                type="button"
                className={`dashboard-net-toggle !mb-0 shrink-0 whitespace-nowrap ${subtractBillPayments ? "selected" : ""}`}
                aria-pressed={subtractBillPayments}
                onClick={() => setSubtractBillPayments((current) => !current)}
              >
                <span
                  className={`dashboard-switch ${subtractBillPayments ? "on" : ""}`}
                  aria-hidden="true"
                />
                {labels.netProfit}
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <DashboardMetric label={labels.revenue} labelClassName="!text-xs">
            <strong className="text-xl font-bold tabular-nums leading-tight text-primary sm:text-2xl">
              {summaryMoney(totals.revenue)}
            </strong>
          </DashboardMetric>
          <DashboardMetric
            label={netProfitActive ? labels.netProfit : labels.profit}
            labelClassName="!text-xs"
          >
            <strong className="text-xl font-bold tabular-nums leading-tight text-green-600 sm:text-2xl">
              {summaryMoney(adjustedProfit)}
            </strong>
          </DashboardMetric>
          <DashboardMetric label={labels.items} labelClassName="!text-xs">
            <strong className="text-xl font-bold tabular-nums leading-tight text-orange-600 sm:text-2xl">
              {summaryNumber(totals.items)}
            </strong>
          </DashboardMetric>
          <DashboardMetric label={labels.billPayments} labelClassName="!text-xs">
            <strong className="text-xl font-bold tabular-nums leading-tight text-purple-600 sm:text-2xl">
              {summaryMoney(selectedBillPayments)}
            </strong>
          </DashboardMetric>
        </div>

        <section className="border-t border-border pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {labels.recentDays}
              </h3>
              <p className="text-sm text-muted-foreground">{rangeTitle}</p>
            </div>
            <div
              className="mobile-view-toggle"
              role="group"
              aria-label={labels.chartStyle}
            >
              <button
                type="button"
                className={chartStyle === "bar" ? "selected" : ""}
                aria-label={labels.barChart}
                aria-pressed={chartStyle === "bar"}
                onClick={() => setChartStyle("bar")}
              >
                <ChartColumnIncreasing size={17} />
              </button>
              <button
                type="button"
                className={chartStyle === "line" ? "selected" : ""}
                aria-label={labels.lineChart}
                aria-pressed={chartStyle === "line"}
                onClick={() => setChartStyle("line")}
              >
                <LineChartIcon size={17} />
              </button>
            </div>
          </div>

          {chartData.length === 0 ? (
            <p className="mobile-empty">
              {period === "today" && !hourlySalesAvailable
                ? language === "fr"
                  ? "Le détail horaire nécessite l’accès à l’historique des ventes."
                  : language === "ar"
                    ? "يتطلب العرض بالساعة صلاحية سجل المبيعات."
                    : "Hourly breakdown requires sales-history access."
                : labels.empty}
            </p>
          ) : (
            <div ref={chartContainerRef} className={`mobile-chart dashboard-mobile-chart dashboard-period-${period}`} role="img" aria-label={`${labels.recentDays}, ${rangeTitle}`} onTouchStart={() => setChartTooltipActive(true)} onTouchMove={() => setChartTooltipActive(true)}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={240}
                initialDimension={{ width: 390, height: 330 }}
              >
                {chartStyle === "bar" ? (
                    <BarChart
                    data={chartData}
                    onMouseMove={() => setChartTooltipActive(true)}
                    margin={{ top: 16, right: 14, bottom: 1, left: 1 }}
                  >
                    <defs>
                      <linearGradient id="mobile-dashboard-profit-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f87171" stopOpacity={0.85} />
                        <stop offset="100%" stopColor={redProfit} />
                      </linearGradient>
                      <linearGradient id="mobile-dashboard-profit-green-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={DASHBOARD_CHART_COLORS.light.barStart} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={greenProfit} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={DASHBOARD_CHART_COLORS.light.grid}
                    />
                    <XAxis
                      dataKey="period"
                      tickLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      axisLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      ticks={period === "month" ? chartData.filter((_, index) => index % 2 === 0 || index === chartData.length - 1).map((point) => point.period) : undefined}
                      interval={period === "month" || period === "year" ? 0 : "preserveStartEnd"}
                      angle={period === "month" ? 0 : period === "today" ? -45 : 0}
                      textAnchor={period === "month" ? "middle" : period === "today" ? "end" : "middle"}
                      height={period === "month" ? 36 : period === "today" ? 54 : 34}
                      tickMargin={8}
                      tick={period === "month" ? dailyDateTick : chartPeriodTick}
                    />
                    <YAxis
                      tickLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      axisLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      width={58}
                      tickMargin={6}
                      tick={{ fontSize: 9, fill: "var(--foreground)", fontWeight: 700 }}
                      tickFormatter={(value: number) => new Intl.NumberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))}
                      domain={profitDomain}
                      ticks={netProfitActive ? profitAxisTicks : undefined}
                    />
                    {netProfitActive ? <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} /> : null}
                    {nonzeroProfits.length > 0 ? <ReferenceLine y={averageProfit} stroke="#64748b" strokeDasharray="4 4" /> : null}
                    <Tooltip
                      active={chartTooltipActive}
                      content={(props) => {
                        const point = props.payload?.[0]?.payload;
                        if (!props.active || !point) return null;
                        const isZeroPeriod = point.future || Number(point.profit) === 0;
                        const tooltipTextColor = isZeroPeriod ? "var(--muted-foreground)" : "var(--foreground)";
                        const rows = [
                          { label: labels.revenue, value: money(Number(point.revenue) || 0), color: "var(--primary)" },
                          { label: netProfitActive ? labels.netProfit : labels.profit, value: money(Number(point.profit) || 0), color: "#16a34a" },
                          { label: labels.items, value: number(Number(point.items) || 0), color: "#ea580c" },
                          { label: labels.billPayments, value: money(Number(point.billPayments) || 0), color: "#9333ea" },
                        ];
                        return (
                          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", padding: "10px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                            <p style={{ marginBottom: 6, color: tooltipTextColor, fontWeight: 600 }}>{tooltipDateLabel(point, props.label)}</p>
                            {rows.map((row) => (
                              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontSize: 12, lineHeight: 1.8 }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: tooltipTextColor }}>
                                  <span style={{ width: 7, height: 7, borderRadius: 999, background: row.color, flexShrink: 0 }} />
                                  {row.label}
                                </span>
                                <strong style={{ color: isZeroPeriod ? "var(--muted-foreground)" : row.color, fontWeight: 600, whiteSpace: "nowrap" }}>{row.value}</strong>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                      contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }}
                      cursor={{ fill: "var(--muted-foreground)", opacity: 0.12 }}
                    />
                    <Bar
                      dataKey="profit"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={34}
                    >
                      {chartData.map((point) => (
                        <Cell
                          key={point.period}
                          fill={isAboveAverage(point.profit)
                            ? "url(#mobile-dashboard-profit-green-gradient)"
                            : "url(#mobile-dashboard-profit-gradient)"}
                          fillOpacity={point.future || point.profit === 0 ? 0.2 : 1}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <RechartsLineChart
                    data={chartData}
                    onMouseMove={() => setChartTooltipActive(true)}
                    margin={{ top: 16, right: 14, bottom: 1, left: 1 }}
                  >
                    <defs>
                      <linearGradient id="mobile-dashboard-line-average-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={greenProfit} />
                        <stop offset={`${averageOffset}%`} stopColor={greenProfit} />
                        <stop offset={`${Math.min(100, averageOffset + 4)}%`} stopColor={redProfit} />
                        <stop offset="100%" stopColor={redProfit} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={DASHBOARD_CHART_COLORS.light.grid}
                    />
                    <XAxis
                      dataKey="period"
                      tickLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      axisLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      ticks={period === "month" ? chartData.filter((_, index) => index % 2 === 0 || index === chartData.length - 1).map((point) => point.period) : undefined}
                      interval={period === "month" || period === "year" ? 0 : "preserveStartEnd"}
                      angle={period === "month" ? 0 : period === "today" ? -45 : 0}
                      textAnchor={period === "month" ? "middle" : period === "today" ? "end" : "middle"}
                      height={period === "month" ? 36 : period === "today" ? 54 : 34}
                      tickMargin={8}
                      tick={period === "month" ? dailyDateTick : chartPeriodTick}
                    />
                    <YAxis
                      tickLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      axisLine={{ stroke: "var(--line)", strokeWidth: 1 }}
                      width={58}
                      tickMargin={6}
                      tick={{ fontSize: 9, fill: "var(--foreground)", fontWeight: 700 }}
                      tickFormatter={(value: number) => new Intl.NumberFormat(language, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value))}
                      domain={profitDomain}
                      ticks={netProfitActive ? profitAxisTicks : undefined}
                    />
                    {netProfitActive ? <ReferenceLine y={0} stroke="var(--foreground)" strokeWidth={1.5} /> : null}
                    {nonzeroProfits.length > 0 ? <ReferenceLine y={averageProfit} stroke="#64748b" strokeDasharray="4 4" /> : null}
                    <Tooltip
                      active={chartTooltipActive}
                      filterNull={false}
                      content={(props) => {
                        const point = props.payload?.[0]?.payload;
                        if (!props.active || !point) return null;
                        const isZeroPeriod = point.future || Number(point.profit) === 0;
                        const tooltipTextColor = isZeroPeriod ? "var(--muted-foreground)" : "var(--foreground)";
                        const rows = [
                          { label: labels.revenue, value: money(Number(point.revenue) || 0), color: "var(--primary)" },
                          { label: netProfitActive ? labels.netProfit : labels.profit, value: money(Number(point.profit) || 0), color: "#16a34a" },
                          { label: labels.items, value: number(Number(point.items) || 0), color: "#ea580c" },
                          { label: labels.billPayments, value: money(Number(point.billPayments) || 0), color: "#9333ea" },
                        ];
                        return (
                          <div style={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", padding: "10px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
                            <p style={{ marginBottom: 6, color: tooltipTextColor, fontWeight: 600 }}>{tooltipDateLabel(point, props.label)}</p>
                            {rows.map((row) => (
                              <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontSize: 12, lineHeight: 1.8 }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: tooltipTextColor }}>
                                  <span style={{ width: 7, height: 7, borderRadius: 999, background: row.color, flexShrink: 0 }} />
                                  {row.label}
                                </span>
                                <strong style={{ color: isZeroPeriod ? "var(--muted-foreground)" : row.color, fontWeight: 600, whiteSpace: "nowrap" }}>{row.value}</strong>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                      contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }}
                      cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "4 4", strokeWidth: 1 }}
                    />
                    <Line
                      type="monotone"
                      data={profitLineData}
                      dataKey="profit"
                      stroke="url(#mobile-dashboard-line-average-gradient)"
                      strokeWidth={2.5}
                      dot={({ cx, cy, payload }) => {
                        if (payload?.future || typeof payload?.profit !== "number") return null;
                        return <circle cx={cx} cy={cy} r={3} fill={isAboveAverage(payload.profit) ? greenProfit : redProfit} stroke="var(--card)" strokeWidth={1} />;
                      }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  </RechartsLineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </DashboardPanel>

      {permissions.can_access_history ? (
        <MobilePurchaseStats data={data} language={language} />
      ) : null}
      {permissions.can_access_stock ? (
        <MobileStockStats data={data} permissions={permissions} language={language} />
      ) : null}
      {permissions.can_access_clients ? (
        <MobileClientStats data={data} permissions={permissions} language={language} />
      ) : null}
      {permissions.can_access_services ? (
        <MobileServiceStats data={data} language={language} />
      ) : null}
    </div>
  );
}
