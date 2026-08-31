import * as React from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, ExternalLink, TrendingDown, TrendingUp } from "lucide-react";
import { ChartControls } from "./chartControls";
import { ChartContainer } from "./chartContainer";
import { useChartConfigs } from "./chartUtils";
import { ChartDataState, TimePeriodConfig } from "./types";
import { useSales, useDashboardLoading } from "../../../../lib/contexts/dashboardContext";
import { Switch } from "../../../../lib/components/switch";
import { Tooltip } from "../../../../lib/components/tooltip";
import { Button } from "../../../../lib/components/button";
import { useAuth } from "../../../../lib/contexts/authContext";
import { useNavigate } from "react-router-dom";
import { DashboardStaggerItem } from "../dashboardStagger";
import { AnimatedNumber } from "../../../../lib/components/animatedNumber";

function dateMatchesOverviewPeriod(
  period: "today" | "thisMonth" | "thisYear" | "overall",
  d: Date,
  now: Date,
): boolean {
  if (period === "today") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (period === "thisMonth") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === "thisYear") {
    return d.getFullYear() === now.getFullYear();
  }
  return true;
}

function purchaseOrderTotal(p: {
  PurchaseItems?: Array<{ quantity?: number; price?: number }>;
}): number {
  return (p.PurchaseItems ?? []).reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 0),
    0,
  );
}

/** Day has sales or profit (closed days are omitted when "open days only" is on). */
function periodHasActivity(point: { future?: boolean; profits?: number; sales?: number; salesCount?: number }): boolean {
  if (point.future) return false;
  return (
    (point.profits ?? 0) !== 0 ||
    (point.sales ?? 0) !== 0 ||
    (point.salesCount ?? 0) > 0
  );
}

export type ChartBarInteractiveProps = {
  chartData: ChartDataState;
  chartLoading: boolean;
};

export function ChartBarInteractive({ chartData, chartLoading }: ChartBarInteractiveProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const canAccessHistory = canAccessPage("history");
  const sales = useSales();
  const dashboardLoading = useDashboardLoading();

  const [timePeriod, setTimePeriod] = React.useState<
    "today" | "thisMonth" | "thisYear" | "overall"
  >("today");
  const chartType = "profits" as const;
  const [chartView, setChartView] = React.useState<"bar" | "line">("bar");
  const [overviewNetProfitEnabled, setOverviewNetProfitEnabled] = React.useState(false);
  const [hideEmptyDays, setHideEmptyDays] = React.useState(false);
  const [billPaymentsTotal, setBillPaymentsTotal] = React.useState(0);
  const [billPaymentsData, setBillPaymentsData] = React.useState<
    Array<{ amount: number; paidDate?: string | Date }>
  >([]);
  const [purchasesData, setPurchasesData] = React.useState<
    Array<{ createdAt?: string | Date; PurchaseItems?: Array<{ quantity?: number; price?: number }> }>
  >([]);

  const { chartTypes } = useChartConfigs();

  const timePeriods: Record<string, TimePeriodConfig> = {
    today: {
      data: chartData.today,
      label: t("dashboard.today"),
      description: t("dashboard.hourlyProfitTrend"),
    },
    thisMonth: {
      data: chartData.thisMonth,
      label: t("dashboard.thisMonth"),
      description: t("dashboard.dailyProfitTrend"),
    },
    thisYear: {
      data: chartData.thisYear,
      label: t("dashboard.thisYear"),
      description: t("dashboard.monthlyProfitTrend"),
    },
    overall: {
      data: chartData.overall,
      label: t("dashboard.overall"),
      description: t("dashboard.yearlyProfitTrend"),
    },
  };

  const currentChart = chartTypes.profits;
  const kpiTimePeriod = timePeriod;
  const currentPeriod = timePeriods[timePeriod];

  const periodHasMeaningfulData = React.useCallback(
    (period: "today" | "thisMonth" | "thisYear" | "overall") => {
      const now = new Date();
      const data = timePeriods?.[period]?.data ?? [];

      if (Array.isArray(data) && data.length > 0) {
        const chartHasSalesOrProfit = data.some((item: any) => {
          if (item?.future) return false;
          const profits = item?.profits ?? 0;
          const salesAmount = item?.sales ?? 0;
          return profits !== 0 || salesAmount !== 0;
        });
        if (chartHasSalesOrProfit) return true;
      }

      const convertPaymentAmount = (amount: number) => (typeof amount === "number" ? amount / 100 : 0);
      const hasBills = (billPaymentsData ?? []).some((p) => {
        if (!p?.paidDate) return false;
        const pd = new Date(p.paidDate);
        if (Number.isNaN(pd.getTime())) return false;
        if (!dateMatchesOverviewPeriod(period, pd, now)) return false;
        return convertPaymentAmount(p.amount ?? 0) > 0;
      });
      if (hasBills) return true;

      const hasPurchases = (purchasesData ?? []).some((p) => {
        if (!p?.createdAt) return false;
        const cd = new Date(p.createdAt);
        if (Number.isNaN(cd.getTime())) return false;
        if (!dateMatchesOverviewPeriod(period, cd, now)) return false;
        return purchaseOrderTotal(p) > 0;
      });
      return hasPurchases;
    },
    [timePeriods, billPaymentsData, purchasesData],
  );

  const hasUserSelectedPeriodRef = React.useRef(false);
  const setTimePeriodFromUser = React.useCallback(
    (period: "today" | "thisMonth" | "thisYear" | "overall") => {
      hasUserSelectedPeriodRef.current = true;
      setTimePeriod(period);
    },
    [],
  );

  // Auto-advance default selection when a period is empty:
  // today -> thisMonth -> thisYear (-> overall as last fallback)
  React.useEffect(() => {
    if (chartLoading || dashboardLoading) return;
    if (hasUserSelectedPeriodRef.current) return;

    const order: Array<"today" | "thisMonth" | "thisYear" | "overall"> = [
      "today",
      "thisMonth",
      "thisYear",
      "overall",
    ];

    if (periodHasMeaningfulData(timePeriod)) return;

    const currentIdx = order.indexOf(timePeriod);
    const startIdx = currentIdx >= 0 ? currentIdx : 0;
    for (let i = startIdx + 1; i < order.length; i++) {
      const next = order[i];
      if (periodHasMeaningfulData(next)) {
        setTimePeriod(next);
        return;
      }
    }
  }, [chartLoading, dashboardLoading, timePeriod, periodHasMeaningfulData]);

  const periodLabel = React.useMemo(() => {
    const now = new Date();

    if (timePeriod === "today") {
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

  const formatCurrency = (amount: number) => `${amount.toLocaleString()} ${t("currency")}`;
  const overviewNumbersReady = !dashboardLoading;

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
    const purchases = (purchasesData ?? [])
      .filter((p) => (p?.createdAt ? filterSaleByPeriod(p.createdAt) : false))
      .reduce((sum, p) => {
        const total = (p.PurchaseItems ?? []).reduce(
          (itemSum, item) => itemSum + (item.price || 0) * (item.quantity || 0),
          0,
        );
        return sum + total;
      }, 0);
    return { revenue, profit, itemsSold, purchases };
  }, [sales, purchasesData, filterSaleByPeriod]);

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

  React.useEffect(() => {
    if (dashboardLoading) return;
    let cancelled = false;

    (async () => {
      if (!window?.api?.database?.purchases?.getAll) {
        if (!cancelled) setPurchasesData([]);
        return;
      }
      try {
        const fetchedPurchases = await window.api.database.purchases.getAll();
        if (!cancelled) setPurchasesData(Array.isArray(fetchedPurchases) ? fetchedPurchases : []);
      } catch (e) {
        if (!cancelled) setPurchasesData([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dashboardLoading]);

  /** Bill total is already filtered to the selected period in the fetch effect. */
  const canSubtractBillsForPeriod = (billPaymentsTotal ?? 0) > 0;

  React.useEffect(() => {
    if (!canSubtractBillsForPeriod) {
      setOverviewNetProfitEnabled(false);
    }
  }, [canSubtractBillsForPeriod]);

  const netProfitActive = overviewNetProfitEnabled && canSubtractBillsForPeriod;

  const adjustedProfit = netProfitActive
    ? overviewTotals.profit - (billPaymentsTotal ?? 0)
    : overviewTotals.profit;

  const profitLabel = netProfitActive ? t("dashboard.netProfit") : t("dashboard.profit");

  const periodWithBills = React.useMemo(() => {
    if (!netProfitActive) return currentPeriod;
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

      if (timePeriod === "today") {
        if (
          pd.getFullYear() !== now.getFullYear() ||
          pd.getMonth() !== now.getMonth() ||
          pd.getDate() !== now.getDate()
        ) {
          return;
        }
        const label = `${String(pd.getHours()).padStart(2, "0")}:00`;
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }

      if (timePeriod === "thisMonth") {
        if (pd.getFullYear() !== now.getFullYear()) return;
        if (pd.getMonth() !== now.getMonth()) return;
        const label = `${pd.getDate()} ${t(`dashboard.months.${pd.getMonth()}`)}`;
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }

      if (timePeriod === "thisYear") {
        if (pd.getFullYear() !== now.getFullYear()) return;
        const label = t(`dashboard.months.${pd.getMonth()}`);
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }

      if (timePeriod === "overall") {
        const label = pd.getFullYear().toString();
        if (byPeriod.has(label)) {
          byPeriod.set(label, (byPeriod.get(label) ?? 0) + amount);
        }
        return;
      }
    });

    const adjustedData = (currentPeriod?.data ?? []).map((p: any) => {
      const gross = p.profits ?? 0;
      const bills = byPeriod.get(p.period) ?? 0;
      return {
        ...p,
        profitsGross: gross,
        profits: gross - bills,
      };
    });

    return {
      ...currentPeriod,
      data: adjustedData,
    };
  }, [netProfitActive, billPaymentsData, currentPeriod, timePeriod, t, i18n.language]);

  const hideEmptyDaysStats = React.useMemo(() => {
    if (timePeriod !== "thisMonth") {
      return { canUse: false, reason: "notMonth" as const };
    }
    const pastDays = (periodWithBills?.data ?? []).filter((p: { future?: boolean }) => !p?.future);
    const activeCount = pastDays.filter(periodHasActivity).length;
    const emptyCount = pastDays.length - activeCount;
    if (emptyCount === 0) {
      return { canUse: false, reason: "noEmpty" as const };
    }
    if (activeCount < 2) {
      return { canUse: false, reason: "tooFew" as const };
    }
    return { canUse: true, reason: null };
  }, [periodWithBills, timePeriod]);

  const canHideEmptyDays = hideEmptyDaysStats.canUse;
  const hideEmptyDaysActive = hideEmptyDays && canHideEmptyDays;

  const hideEmptyDaysTooltip = React.useMemo(() => {
    if (!canHideEmptyDays) {
      switch (hideEmptyDaysStats.reason) {
        case "noEmpty":
          return t("dashboard.hideEmptyDaysDisabledNoEmpty");
        case "tooFew":
          return t("dashboard.hideEmptyDaysDisabledTooFew");
        default:
          return t("dashboard.hideEmptyDaysDisabledNotMonth");
      }
    }
    return t("dashboard.hideEmptyDaysTooltip");
  }, [canHideEmptyDays, hideEmptyDaysStats.reason, t]);

  const periodToRender = React.useMemo(() => {
    const base = periodWithBills;
    if (!hideEmptyDaysActive) return base;
    const openDays = (base.data ?? []).filter(periodHasActivity);
    if (openDays.length === 0) return base;
    return { ...base, data: openDays };
  }, [periodWithBills, hideEmptyDaysActive]);

  const chartSeriesAnimationKey = React.useMemo(
    () =>
      `${timePeriod}-${netProfitActive ? "net" : "gross"}-${hideEmptyDaysActive ? "hideEmpty" : "allDays"}`,
    [timePeriod, netProfitActive, hideEmptyDaysActive],
  );

  // Chart visibility: only non-zero profit in the rendered series (includes net-profit / bill adjustments).
  const hasData = React.useMemo(() => {
    const data = periodToRender?.data ?? [];
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.some((item: any) => !item?.future && (item?.profits ?? 0) !== 0);
  }, [periodToRender]);

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

  if (chartLoading) {
    return null;
  }

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col hover:shadow-lg transition-shadow duration-300 relative">
      <DashboardStaggerItem step={0} className="mb-6">
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
              <Tooltip content={hideEmptyDaysTooltip}>
                <div className="flex items-center gap-2 text-sm rtl:flex-row-reverse">
                  <Switch
                    checked={hideEmptyDaysActive}
                    onCheckedChange={setHideEmptyDays}
                    disabled={!canHideEmptyDays}
                    id="dashboard-hide-empty-days-toggle"
                  />
                  <label
                    htmlFor="dashboard-hide-empty-days-toggle"
                    className={
                      canHideEmptyDays
                        ? "font-medium text-foreground cursor-pointer select-none"
                        : "font-medium text-muted-foreground cursor-not-allowed select-none"
                    }
                  >
                    {t("dashboard.hideEmptyDays")}
                  </label>
                </div>
              </Tooltip>

              <Tooltip
                content={
                  canSubtractBillsForPeriod
                    ? t("dashboard.calculateNetProfitTooltip")
                    : t("dashboard.calculateNetProfitDisabledNoBills")
                }
              >
                <div className="flex items-center gap-2 text-sm rtl:flex-row-reverse">
                  <Switch
                    checked={netProfitActive}
                    onCheckedChange={setOverviewNetProfitEnabled}
                    disabled={!canSubtractBillsForPeriod}
                    id="dashboard-net-profit-toggle"
                  />
                  <label
                    htmlFor="dashboard-net-profit-toggle"
                    className={
                      canSubtractBillsForPeriod
                        ? "font-medium text-foreground cursor-pointer select-none"
                        : "font-medium text-muted-foreground cursor-not-allowed select-none"
                    }
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

            <ChartControls
              timePeriod={timePeriod}
              setTimePeriod={setTimePeriodFromUser}
              chartView={chartView}
              setChartView={setChartView}
              timePeriods={timePeriods}
            />
          </div>
        </div>
      </DashboardStaggerItem>

      <DashboardStaggerItem step={1} className="mb-6">
        <div className="flex flex-col">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wide leading-none">
              {t("dashboard.revenue")}
            </span>
            <AnimatedNumber
              value={overviewNumbersReady ? overviewTotals.revenue : 0}
              enabled={overviewNumbersReady}
              className="text-3xl md:text-4xl font-bold tabular-nums text-primary leading-none"
              format={(amount) => formatCurrency(amount)}
            />
          </div>

          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wide leading-none">
              {profitLabel}
            </span>
            <AnimatedNumber
              value={overviewNumbersReady ? adjustedProfit : 0}
              enabled={overviewNumbersReady}
              className="text-3xl md:text-4xl font-bold tabular-nums text-green-600 leading-none"
              format={(amount) => formatCurrency(amount)}
            />

            {vsAverage.percentage > 0 && timePeriod !== "overall" && (
              <div
                className={`flex items-center justify-center gap-2 text-sm mt-1 ${
                  vsAverage.direction === "up"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {vsAverage.direction === "up" ? (
                  <TrendingUp className="h-4 w-4 shrink-0" />
                ) : (
                  <TrendingDown className="h-4 w-4 shrink-0" />
                )}
                <span className="font-semibold">{vsAverage.percentage.toFixed(1)}%</span>
                <span className="text-xs text-muted-foreground">
                  {vsAverage.direction === "up" ? t("dashboard.above") : t("dashboard.below")}{" "}
                  {t("dashboard.average")}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wide leading-none">
              {t("dashboard.itemsSold")}
            </span>
            <AnimatedNumber
              value={overviewNumbersReady ? overviewTotals.itemsSold : 0}
              enabled={overviewNumbersReady}
              locale={i18n.language}
              className="text-3xl md:text-4xl font-bold tabular-nums text-orange-600 leading-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wide leading-none">
              {t("dashboard.billsAndExpenses")}
            </span>
            <AnimatedNumber
              value={overviewNumbersReady ? billPaymentsTotal : 0}
              enabled={overviewNumbersReady}
              className="text-3xl md:text-4xl font-bold tabular-nums text-purple-600 dark:text-purple-400 leading-none"
              format={(amount) => formatCurrency(amount)}
            />
          </div>
          <div className="flex flex-col items-center gap-0.5 text-center">
            <span className="text-sm md:text-base font-medium text-muted-foreground uppercase tracking-wide leading-none">
              {t("history.purchases")}
            </span>
            <AnimatedNumber
              value={overviewNumbersReady ? overviewTotals.purchases : 0}
              enabled={overviewNumbersReady}
              className="text-3xl md:text-4xl font-bold tabular-nums text-orange-600 dark:text-orange-400 leading-none"
              format={(amount) => formatCurrency(amount)}
            />
          </div>
        </div>
        </div>
      </DashboardStaggerItem>

      <DashboardStaggerItem step={2}>
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t("dashboard.chartProfitsTitle")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("dashboard.chartProfitsDesc")}
          </p>
        </div>
        {hasData ? (
          <ChartContainer
            currentPeriod={periodToRender}
            chartType={chartType}
            timePeriod={timePeriod}
            chartView={chartView}
            kpiTimePeriod={kpiTimePeriod}
            kpiVsAverage={vsAverage}
            billsPaymentsData={billPaymentsData}
            purchasesData={purchasesData}
            grossProfitYAxis={
              netProfitActive &&
              Array.isArray(billPaymentsData) &&
              billPaymentsData.length > 0
            }
            seriesAnimationKey={chartSeriesAnimationKey}
          />
        ) : (
          <div className="h-[400px] w-full flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              {t("dashboard.noChartData", "No Data Available")}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {t("dashboard.noChartDataDesc", "No data available for the selected period and chart type. Try selecting a different period or chart type.")}
            </p>
          </div>
        )}
      </DashboardStaggerItem>

      <DashboardStaggerItem step={3} className="pt-4 border-t">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>
            {currentChart.description} - {currentPeriod.description}
          </span>
        </div>
      </DashboardStaggerItem>
    </div>
  );
}
