import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChartColumnIncreasing,
  LineChart as LineChartIcon,
  PackageIcon,
  Users,
  Wrench,
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

type Period = "today" | "month" | "year" | "365";
type ChartStyle = "bar" | "line";

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
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const selectedDays = days.filter((row) => {
    const day = String(row.local_day);
    if (period === "today") return day === today;
    if (period === "month") return day.slice(0, 7) === today.slice(0, 7);
    if (period === "year") return day.slice(0, 4) === today.slice(0, 4);
    return true;
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
  const netProfitActive = subtractBillPayments && selectedBillPayments > 0;
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
  const chartData = selectedDays.map((row) => ({
    ...row,
    profit: (Number(row.profit) || 0) -
      (netProfitActive ? (Number(row.bill_payments) || 0) / 100 : 0),
    dayLabel: new Intl.DateTimeFormat(language, {
      day: "numeric",
      month: "short",
    }).format(new Date(`${String(row.local_day)}T12:00:00`)),
  }));

  const productStatsComplete =
    permissions.can_access_stock && data.products.length < 2000;
  const clientStatsComplete =
    permissions.can_access_clients && data.clients.length < 2000;
  const serviceStatsComplete =
    permissions.can_access_services && data.service_appointments.length < 1000;
  const inventoryValue = data.products.reduce(
    (sum, row) =>
      sum +
      (Number(row.selling_price) || 0) * (Number(row.quantity) || 0),
    0,
  );
  const inventoryCost = data.products.reduce(
    (sum, row) =>
      sum + (Number(row.bought_price) || 0) * (Number(row.quantity) || 0),
    0,
  );
  const totalQuantity = data.products.reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0,
  );
  const productsOutOfStock = data.products.filter(
    (row) => Number(row.quantity) === 0,
  ).length;
  const appointments = data.service_appointments;
  const completedCount = appointments.filter(
    (row) => row.is_completed === true,
  ).length;
  const overdueCount = appointments.filter(
    (row) =>
      row.is_completed !== true &&
      typeof row.due_date === "string" &&
      Number.isFinite(Date.parse(row.due_date)) &&
      Date.parse(row.due_date) < Date.now(),
  ).length;
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

          {selectedBillPayments > 0 ? (
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
            <p className="mobile-empty">{labels.empty}</p>
          ) : (
            <div className="mobile-chart dashboard-mobile-chart" role="img" aria-label={`${labels.recentDays}, ${rangeTitle}`}>
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={220}
                initialDimension={{ width: 360, height: 250 }}
              >
                {chartStyle === "bar" ? (
                  <BarChart
                    data={chartData}
                    margin={{ top: 12, right: 4, bottom: 2, left: -18 }}
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
                    <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      formatter={(value: number | string | undefined) => money(Number(value) || 0)}
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
                    margin={{ top: 12, right: 4, bottom: 2, left: -18 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke={DASHBOARD_CHART_COLORS.light.grid}
                    />
                    <XAxis dataKey="dayLabel" tickLine={false} axisLine={false} minTickGap={18} />
                    <YAxis tickLine={false} axisLine={false} width={48} />
                    <Tooltip
                      formatter={(value: number | string | undefined) => money(Number(value) || 0)}
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

      {productStatsComplete ? (
        <DashboardPanel stats className="dashboard-overview !min-h-0 !space-y-4 !p-4 sm:!p-6">
          <div className="flex items-center gap-2">
            <PackageIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{labels.inventory}</h2>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <DashboardMetric label={labels.products} labelClassName="!text-xs">
              <strong className="text-2xl font-bold tabular-nums text-foreground">
                {number(data.products.length)}
              </strong>
            </DashboardMetric>
            <DashboardMetric label={labels.totalQuantity} labelClassName="!text-xs">
              <strong className="text-2xl font-bold tabular-nums text-foreground">
                {number(totalQuantity)}
              </strong>
            </DashboardMetric>
            <DashboardMetric label={labels.stockCost} labelClassName="!text-xs">
              <strong className="text-xl font-bold tabular-nums text-foreground">
                {money(inventoryCost)}
              </strong>
            </DashboardMetric>
            <DashboardMetric label={labels.inventory} labelClassName="!text-xs">
              <strong className="text-xl font-bold tabular-nums text-foreground">
                {money(inventoryValue)}
              </strong>
            </DashboardMetric>
            <DashboardMetric label={labels.outOfStock} labelClassName="!text-xs">
              <strong className="text-2xl font-bold tabular-nums text-foreground">
                {number(productsOutOfStock)}
              </strong>
            </DashboardMetric>
          </div>
        </DashboardPanel>
      ) : null}

      {clientStatsComplete ? (
        <DashboardPanel stats className="dashboard-overview !min-h-0 !space-y-4 !p-4 sm:!p-6">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{labels.clientsCount}</h2>
          </div>
          <DashboardMetric label={labels.clientsCount} labelClassName="!text-xs">
            <strong className="text-2xl font-bold tabular-nums text-foreground">
              {number(data.clients.length)}
            </strong>
          </DashboardMetric>
        </DashboardPanel>
      ) : null}

      {serviceStatsComplete ? (
        <DashboardPanel stats className="dashboard-overview !min-h-0 !space-y-4 !p-4 sm:!p-6">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{labels.serviceAppointments}</h2>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <DashboardMetric label={labels.serviceAppointments} labelClassName="!text-xs">
              <strong className="text-2xl font-bold tabular-nums text-foreground">
                {number(appointments.length)}
              </strong>
            </DashboardMetric>
            <DashboardMetric label={labels.completed} labelClassName="!text-xs">
              <strong className="text-2xl font-bold tabular-nums text-foreground">
                {number(completedCount)}
              </strong>
            </DashboardMetric>
            <DashboardMetric label={labels.overdue} labelClassName="!text-xs">
              <strong className="text-2xl font-bold tabular-nums text-foreground">
                {number(overdueCount)}
              </strong>
            </DashboardMetric>
          </div>
        </DashboardPanel>
      ) : null}
    </div>
  );
}
