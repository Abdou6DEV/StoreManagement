import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChartColumnIncreasing,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
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
  MobileServiceStats,
  MobileStockStats,
} from "./MobileDashboardStats";

type Period = "today" | "month" | "year" | "365";
type ChartStyle = "bar" | "line";
type DashboardChartPoint = {
  period: string;
  profits: number;
  billPayments: number;
  future?: boolean;
};

function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
  const days = useMemo(
    () =>
      [...data.dashboard_daily]
        .filter((row) => typeof row.local_day === "string")
        .sort((a, b) => String(a.local_day).localeCompare(String(b.local_day))),
    [data.dashboard_daily],
  );
  const now = new Date();
  const today = localDay(now);
  const rollingStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  rollingStart.setDate(rollingStart.getDate() - 364);
  const rollingStartDay = localDay(rollingStart);
  const selectedDays = days.filter((row) => {
    const day = String(row.local_day);
    if (period === "today") return day === today;
    if (period === "month") return day.slice(0, 7) === today.slice(0, 7);
    if (period === "year") return day.slice(0, 4) === today.slice(0, 4);
    return day >= rollingStartDay && day <= today;
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
        : period === "year"
          ? labels.thisYear
          : labels.last365Days;
  const dailyByDay = new Map(days.map((row) => [String(row.local_day), row]));
  const chartPoints: DashboardChartPoint[] = [];
  if (period === "today") {
    if (hourlySalesAvailable) {
      const hourlyProfits = new Map<number, number>();
      for (const sale of data.sales) {
        const createdAt = new Date(String(sale.source_created_at ?? ""));
        if (!Number.isFinite(createdAt.getTime()) || localDay(createdAt) !== today) continue;
        const hour = createdAt.getHours();
        hourlyProfits.set(hour, (hourlyProfits.get(hour) ?? 0) + (Number(sale.total_profit) || 0));
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
          profits: hourlyProfits.get(hour) ?? 0,
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
        period: `${dayNumber} ${new Intl.DateTimeFormat(language, { month: "short" }).format(date)}`,
        profits: future ? 0 : Number(row?.profit) || 0,
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
        period: new Intl.DateTimeFormat(language, { month: "short" }).format(
          new Date(now.getFullYear(), month, 1, 12),
        ),
        profits: monthRows.reduce((sum, row) => sum + (Number(row.profit) || 0), 0),
        billPayments: monthRows.reduce((sum, row) => sum + (Number(row.bill_payments) || 0), 0) / 100,
        future,
      });
    }
  } else {
    const firstMonth = new Date(rollingStart.getFullYear(), rollingStart.getMonth(), 1, 12);
    for (
      let date = firstMonth;
      date <= now;
      date = new Date(date.getFullYear(), date.getMonth() + 1, 1, 12)
    ) {
      const key = monthKey(date);
      const monthRows = selectedDays.filter((row) => String(row.local_day).startsWith(key));
      chartPoints.push({
        period: new Intl.DateTimeFormat(language, { month: "short", year: "2-digit" }).format(date),
        profits: monthRows.reduce((sum, row) => sum + (Number(row.profit) || 0), 0),
        billPayments: monthRows.reduce((sum, row) => sum + (Number(row.bill_payments) || 0), 0) / 100,
      });
    }
  }
  const chartData = chartPoints.map(({ profits, billPayments, ...point }) => ({
    ...point,
    profit: profits - (netProfitActive ? billPayments : 0),
  }));

  const summaryMoney = (value: number) => days.length > 0 ? money(value) : "—";
  const summaryNumber = (value: number) => days.length > 0 ? number(value) : "—";

  return (
    <div className="space-y-6">
      <DashboardPanel className="dashboard-overview !min-h-0 !gap-6 !p-4 sm:!p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <BarChart3 className="mt-1 h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">
                {labels.dashboard}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{rangeTitle}</p>
            </div>
          </div>
          <label className="mobile-select-control">
            <span>{labels.overviewPeriod}</span>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as Period)}
            >
              <option value="today">{labels.today}</option>
              <option value="month">{labels.thisMonth}</option>
              <option value="year">{labels.thisYear}</option>
              <option value="365">{labels.last365Days}</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          <DashboardMetric label={labels.revenue} labelClassName="!text-xs">
            <strong className="text-2xl font-bold tabular-nums leading-tight text-primary sm:text-3xl">
              {summaryMoney(totals.revenue)}
            </strong>
          </DashboardMetric>
          <DashboardMetric
            label={netProfitActive ? labels.netProfit : labels.profit}
            labelClassName="!text-xs"
          >
            <strong className="text-2xl font-bold tabular-nums leading-tight text-green-600 sm:text-3xl">
              {summaryMoney(adjustedProfit)}
            </strong>
          </DashboardMetric>
          <DashboardMetric label={labels.items} labelClassName="!text-xs">
            <strong className="text-2xl font-bold tabular-nums leading-tight text-orange-600 sm:text-3xl">
              {summaryNumber(totals.items)}
            </strong>
          </DashboardMetric>
          <DashboardMetric label={labels.billPayments} labelClassName="!text-xs">
            <strong className="text-2xl font-bold tabular-nums leading-tight text-purple-600 sm:text-3xl">
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

          {canSubtractBillPayments ? (
            <button
              type="button"
              className={`dashboard-net-toggle ${subtractBillPayments ? "selected" : ""}`}
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
            <div className="mobile-chart dashboard-mobile-chart" role="img" aria-label={`${labels.recentDays}, ${rangeTitle}`}>
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
                    margin={{ top: 16, right: 12, bottom: 8, left: 8 }}
                  >
                    <defs>
                      <linearGradient id="mobile-dashboard-profit-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={DASHBOARD_CHART_COLORS.light.barStart} stopOpacity={0.85} />
                        <stop offset="100%" stopColor={DASHBOARD_CHART_COLORS.light.barEnd} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={DASHBOARD_CHART_COLORS.light.grid}
                    />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tickLine={false} axisLine={false} width={60} tickMargin={8} />
                    <Tooltip
                      formatter={(value: unknown) => money(Number(Array.isArray(value) ? value[0] : value) || 0)}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }}
                    />
                    <Bar
                      dataKey="profit"
                      fill="url(#mobile-dashboard-profit-gradient)"
                      radius={[5, 5, 0, 0]}
                      maxBarSize={30}
                    />
                  </BarChart>
                ) : (
                  <RechartsLineChart
                    data={chartData}
                    margin={{ top: 16, right: 12, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={DASHBOARD_CHART_COLORS.light.grid}
                    />
                    <XAxis dataKey="period" tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
                    <YAxis tickLine={false} axisLine={false} width={60} tickMargin={8} />
                    <Tooltip
                      formatter={(value: unknown) => money(Number(Array.isArray(value) ? value[0] : value) || 0)}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{ borderRadius: 12, borderColor: "var(--border)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke={DASHBOARD_CHART_COLORS.light.line}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </RechartsLineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </DashboardPanel>

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
