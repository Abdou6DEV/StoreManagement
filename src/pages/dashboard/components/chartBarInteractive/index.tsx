import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { BarChart3, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import { ChartHeader } from "./chartHeader";
import { ChartControls } from "./chartControls";
import { ChartContainer } from "./chartContainer";
import { useChartData, useChartConfigs } from "./chartUtils";
import { TimePeriodConfig } from "./types";
import { useSales, useDashboardLoading } from "../../../../lib/contexts/dashboardContext";
import { Switch } from "../../../../lib/components/switch";
import { Tooltip } from "../../../../lib/components/tooltip";
import { Button } from "../../../../lib/components/button";
import { useAuth } from "../../../../lib/contexts/authContext";
import { useNavigate } from "react-router-dom";

export function ChartBarInteractive() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const canAccessHistory = canAccessPage("history");
  const sales = useSales();
  const dashboardLoading = useDashboardLoading();

  const [timePeriod, setTimePeriod] = React.useState<
    "today" | "thisMonth" | "thisYear" | "overall"
  >("today");
  const [chartType, setChartType] = React.useState<
    "profits" | "clients" | "sales"
  >("profits");
  const [chartView, setChartView] = React.useState<"bar" | "line">("bar");
  const [overviewNetProfitEnabled, setOverviewNetProfitEnabled] = React.useState(false);
  const [billPaymentsTotal, setBillPaymentsTotal] = React.useState(0);
  const [billPaymentsData, setBillPaymentsData] = React.useState<
    Array<{ amount: number; paidDate?: string | Date }>
  >([]);

  const { chartData, loading: chartLoading } = useChartData();
  const { chartTypes } = useChartConfigs();

  const timePeriods: Record<string, TimePeriodConfig> = {
    today: {
      data: chartData.today,
      label: t("dashboard.today"),
      description: t("dashboard.today"),
    },
    thisMonth: {
      data: chartData.thisMonth,
      label: t("dashboard.thisMonth"),
      description: t("dashboard.thisMonth"),
    },
    thisYear: {
      data: chartData.thisYear,
      label: t("dashboard.thisYear"),
      description: t("dashboard.thisYear"),
    },
    overall: {
      data: chartData.overall,
      label: t("dashboard.overall"),
      description: t("dashboard.yearlyPerformance"),
    },
  };

  const currentChart = chartTypes[chartType];
  // Chart request differs from KPI request:
  // - When user selects "today", chart should show "this month (daily up to now)"
  // - KPIs should still show real "today" totals
  const chartTimePeriod = timePeriod === "today" ? "thisMonth" : timePeriod;
  const kpiTimePeriod = timePeriod;
  const currentPeriod = timePeriods[chartTimePeriod];

  const periodLabel = React.useMemo(() => {
    const now = new Date();

    // Today behaves as "thisMonth" in the chart.
    if (timePeriod === "today") {
      // Show real "Today" date under the title (not month name).
      return now.toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (timePeriod === "thisMonth") {
      return now.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });
    }
    if (timePeriod === "thisYear") {
      return now.getFullYear().toString();
    }

    const years = (chartData.overall ?? [])
      .map((d: any) => Number.parseInt(String(d?.period ?? ""), 10))
      .filter((y: number) => Number.isFinite(y));

    if (years.length >= 2) {
      const minY = Math.min(...years);
      const maxY = Math.max(...years);
      return `${minY}–${maxY}`;
    }
    if (years.length === 1) {
      return `${years[0]}`;
    }
    return "";
  }, [timePeriod, chartData.overall, i18n.language]);
  // Only show the empty state when there is no meaningful value at all.
  const hasData =
    (currentPeriod?.data?.length ?? 0) > 0 &&
    (currentPeriod?.data ?? []).some((item: any) => {
      const value =
        chartType === "profits"
          ? item?.profits
          : chartType === "clients"
            ? item?.clients
            : item?.sales;
      return (value ?? 0) !== 0;
    });

  const formatCurrency = (amount: number) => `${amount.toLocaleString()} ${t("currency")}`;

  const filterSaleByPeriod = React.useCallback(
    (createdAt: string | Date) => {
      const d = new Date(createdAt);
      const now = new Date();
      if (kpiTimePeriod === "today") {
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      }
      if (kpiTimePeriod === "thisMonth") {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      if (kpiTimePeriod === "thisYear") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    },
    [kpiTimePeriod],
  );

  const overviewTotals = React.useMemo(() => {
    const filtered = (sales ?? []).filter((s: any) => filterSaleByPeriod(s.createdAt));
    const revenue = filtered.reduce((sum: number, s: any) => sum + (s.totalAmountWithDiscount || 0), 0);
    const profit = filtered.reduce((sum: number, s: any) => sum + (s.totalProfit || 0), 0);
    const itemsSold = filtered.reduce((sum: number, s: any) => sum + (s.totalItems || 0), 0);
    return { revenue, profit, itemsSold };
  }, [sales, filterSaleByPeriod]);

  // Bills payments total (used for "net profit" display only)
  React.useEffect(() => {
    if (dashboardLoading) return;
    let cancelled = false;

    (async () => {
      if (!window?.api?.database?.bills?.getAllPayments) {
        if (!cancelled) {
          setBillPaymentsTotal(0);
          setBillPaymentsData([]);
        }
        return;
      }
      try {
        const fetchedBillPaymentsData: Array<{
          amount: number;
          paidDate?: string | Date;
        }> = await window.api.database.bills.getAllPayments();

        if (!cancelled) setBillPaymentsData(fetchedBillPaymentsData);

        const convertPaymentAmount = (amount: number) => (typeof amount === "number" ? amount / 100 : 0);

        const now = new Date();
        const matches = (date: Date) => {
          if (kpiTimePeriod === "today") {
            return (
              date.getFullYear() === now.getFullYear() &&
              date.getMonth() === now.getMonth() &&
              date.getDate() === now.getDate()
            );
          }
          if (kpiTimePeriod === "thisMonth") {
            return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
          }
          if (kpiTimePeriod === "thisYear") {
            return date.getFullYear() === now.getFullYear();
          }
          return true;
        };

        const total = (fetchedBillPaymentsData ?? []).reduce((sum, p) => {
          if (!p?.paidDate) return sum;
          const pd = new Date(p.paidDate);
          if (!matches(pd)) return sum;
          return sum + convertPaymentAmount(p.amount ?? 0);
        }, 0);

        if (!cancelled) setBillPaymentsTotal(total);
      } catch (e) {
        if (!cancelled) {
          setBillPaymentsTotal(0);
          setBillPaymentsData([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dashboardLoading, kpiTimePeriod]);

  const adjustedProfit = overviewNetProfitEnabled
    ? overviewTotals.profit - (billPaymentsTotal ?? 0)
    : overviewTotals.profit;

  const profitLabel = overviewNetProfitEnabled ? t("dashboard.netProfit") : t("dashboard.profit");

  const periodToRender = React.useMemo(() => {
    if (!overviewNetProfitEnabled) return currentPeriod;
    if (chartType !== "profits") return currentPeriod;
    if (!Array.isArray(billPaymentsData) || billPaymentsData.length === 0) return currentPeriod;

    const now = new Date();
    const convertPaymentAmount = (amount: number) =>
      typeof amount === "number" ? amount / 100 : 0;

    const byPeriod = new Map<string, number>();
    (currentPeriod?.data ?? []).forEach((p: any) => {
      byPeriod.set(p.period, 0);
    });

    (billPaymentsData ?? []).forEach((payment) => {
      if (!payment?.paidDate) return;
      const pd = new Date(payment.paidDate);
      const amount = convertPaymentAmount(payment.amount ?? 0);

      if (chartTimePeriod === "thisMonth") {
        if (pd.getFullYear() !== now.getFullYear()) return;
        if (pd.getMonth() !== now.getMonth()) return;
        const label = `${pd.getDate()} ${t(`dashboard.months.${pd.getMonth()}`)}`;
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }

      if (chartTimePeriod === "thisYear") {
        if (pd.getFullYear() !== now.getFullYear()) return;
        const label = t(`dashboard.months.${pd.getMonth()}`);
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }

      if (chartTimePeriod === "overall") {
        const label = pd.getFullYear().toString();
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }
    });

    const adjustedData = (currentPeriod?.data ?? []).map((p: any) => {
      const bills = byPeriod.get(p.period) ?? 0;
      return {
        ...p,
        profits: (p.profits ?? 0) - bills,
      };
    });

    return {
      ...currentPeriod,
      data: adjustedData,
    };
  }, [
    overviewNetProfitEnabled,
    chartType,
    billPaymentsData,
    currentPeriod,
    chartTimePeriod,
    t,
    i18n.language,
  ]);

  const handleJumpToHistory = (period: "today" | "thisMonth" | "thisYear") => {
    const today = new Date();
    let selectedPeriod;
    if (period === "today") {
      // KPI is real "Today", so history should open the day.
      const dateStr = today.toISOString().split("T")[0];
      selectedPeriod = { period: "day" as const, periodValue: dateStr };
    } else if (period === "thisMonth") {
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      selectedPeriod = { period: "month" as const, periodValue: `${year}-${month}` };
    } else {
      const year = String(today.getFullYear());
      selectedPeriod = { period: "year" as const, periodValue: year };
    }
    navigate("/history", { state: { selectedPeriod, activeTab: "details" } });
  };

  // vs average (same logic as old cards, simplified to current selected period)
  const vsAverage = React.useMemo(() => {
    const now = new Date();
    const directionFromPct = (pct: number): "up" | "down" => (pct >= 0 ? "up" : "down");

    try {
      if (kpiTimePeriod === "today") {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);

        const historicalSales = (sales ?? []).filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= thirtyDaysAgo && saleDate <= yesterday;
        });

        const dailyProfits = new Map<string, number>();
        historicalSales.forEach((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          const dayKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}-${String(
            saleDate.getDate(),
          ).padStart(2, "0")}`;
          dailyProfits.set(dayKey, (dailyProfits.get(dayKey) || 0) + (sale.totalProfit || 0));
        });

        const values = Array.from(dailyProfits.values());
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const pct = avg !== 0 ? ((adjustedProfit - avg) / Math.abs(avg)) * 100 : 0;
        return { percentage: Math.abs(pct), direction: directionFromPct(pct) };
      }

      if (kpiTimePeriod === "thisMonth") {
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const historical = (sales ?? []).filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= twelveMonthsAgo && saleDate <= lastMonth;
        });

        const monthlyProfits = new Map<string, number>();
        historical.forEach((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}`;
          monthlyProfits.set(monthKey, (monthlyProfits.get(monthKey) || 0) + (sale.totalProfit || 0));
        });

        const values = Array.from(monthlyProfits.values());
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const pct = avg !== 0 ? ((adjustedProfit - avg) / Math.abs(avg)) * 100 : 0;
        return { percentage: Math.abs(pct), direction: directionFromPct(pct) };
      }

      if (kpiTimePeriod === "thisYear") {
        const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
        const lastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
        const historical = (sales ?? []).filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate >= fiveYearsAgo && saleDate <= lastYear;
        });

        const yearlyProfits = new Map<string, number>();
        historical.forEach((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          const key = saleDate.getFullYear().toString();
          yearlyProfits.set(key, (yearlyProfits.get(key) || 0) + (sale.totalProfit || 0));
        });

        const values = Array.from(yearlyProfits.values());
        const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        const pct = avg !== 0 ? ((adjustedProfit - avg) / Math.abs(avg)) * 100 : 0;
        return { percentage: Math.abs(pct), direction: directionFromPct(pct) };
      }
    } catch (e) {
      // ignore
    }

    return { percentage: 0, direction: "up" as const };
  }, [kpiTimePeriod, sales, adjustedProfit]);

  const showHistoryJump = timePeriod !== "overall";

  // Don't render until chart data is ready (keep hooks order stable)
  if (chartLoading) {
    return null;
  }

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col hover:shadow-lg transition-shadow duration-300 relative">
      {/* Header + KPIs */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <BarChart3 className="h-6 w-6 text-primary mt-1" />
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {t("dashboard.overviewSection")}
              </h2>
              {periodLabel ? (
                <div className="text-sm text-muted-foreground mt-1">{periodLabel}</div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 items-start lg:items-end">
            <div className="flex items-center gap-3 flex-wrap">
              <Tooltip content={t("dashboard.calculateNetProfitTooltip")}>
                <div className="flex items-center gap-2 text-sm rtl:flex-row-reverse">
                  <Switch
                    checked={overviewNetProfitEnabled}
                    onCheckedChange={setOverviewNetProfitEnabled}
                    id="dashboard-net-profit-toggle"
                  />
                  <label
                    htmlFor="dashboard-net-profit-toggle"
                    className="font-medium text-foreground cursor-pointer select-none"
                  >
                    {t("dashboard.calculateNetProfit")}
                  </label>
                </div>
              </Tooltip>

              {showHistoryJump && (
                <Tooltip
                  content={
                    canAccessHistory
                      ? t("dashboard.viewInHistory", "View in History")
                      : t(
                          "dashboard.noAccessToHistoryTooltip",
                          "You do not have access to the History page.",
                        )
                  }
                  position="top"
                >
                  <span className="inline-block">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/40 disabled:opacity-50 disabled:pointer-events-none"
                      onClick={() => handleJumpToHistory(timePeriod as any)}
                      disabled={!canAccessHistory}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </span>
                </Tooltip>
              )}

            </div>

        {/* Controls */}
        <ChartControls
          chartType={chartType}
          setChartType={setChartType}
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
              chartView={chartView}
              setChartView={setChartView}
          chartTypes={chartTypes}
          timePeriods={timePeriods}
        />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.revenue")}
            </span>
            <span className="text-3xl font-bold text-primary">
              {formatCurrency(overviewTotals.revenue)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {profitLabel}
            </span>
            <span className="text-3xl font-bold text-green-600 mt-1">
              {formatCurrency(adjustedProfit)}
            </span>

            {vsAverage.percentage > 0 && timePeriod !== "overall" && (
              <div
                className={`flex items-center justify-center gap-2 text-sm mt-1 ${
                  vsAverage.direction === "up"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {vsAverage.direction === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-semibold">{vsAverage.percentage.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">
                  {vsAverage.direction === "up" ? t("dashboard.above") : t("dashboard.below")}{" "}
                  {t("dashboard.average")}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.itemsSold")}
            </span>
            <span className="text-2xl font-bold text-orange-600">
              {overviewTotals.itemsSold.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Chart or Empty State */}
      {hasData ? (
        <ChartContainer
          currentPeriod={periodToRender}
          chartType={chartType}
          timePeriod={chartTimePeriod}
          chartView={chartView}
        />
      ) : (
        <div className="h-[400px] w-full flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("dashboard.noChartData", "No Data Available")}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {t("dashboard.noChartDataDesc", "No data available for the selected period and chart type. Try selecting a different period or chart type.")}
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 border-t mt-4">
        <TrendingUp className="h-4 w-4" />
        <span>
          {currentChart.description} - {currentPeriod.description}
        </span>
      </div>
    </div>
  );
}
