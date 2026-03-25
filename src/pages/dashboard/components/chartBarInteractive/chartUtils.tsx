import * as React from "react";
import { useTranslation } from "react-i18next";
import { ChartDataState } from "./types";
import { Client } from "@prisma/client";
import { useSales, useClients, useDashboardLoading } from "../../../../lib/contexts/dashboardContext";

export function getPeriodLabel(
  type: "day" | "month" | "year",
  value: number,
  idx: number,
  t: (key: string) => string,
) {
  if (type === "day") {
    // Use shorter labels for daily view to avoid overcrowding
    return (idx + 1).toString();
  }
  if (type === "month") {
    return t(`dashboard.months.${value}`);
  }
  return value.toString();
}

export function useChartData() {
  const { t, i18n } = useTranslation();
  const sales = useSales();
  const clients = useClients();
  const dashboardLoading = useDashboardLoading();
  
  const [chartData, setChartData] = React.useState<ChartDataState>({
    "1m": [],
    "12m": [],
    years: [],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Only process data when dashboard data is loaded
    if (dashboardLoading) {
      setLoading(true);
      return;
    }
    
    async function processData() {
      const startTime = Date.now();
      const minProcessingTime = 100; // Minimum 100ms to match other components

      const now = new Date();

      // --- 1m: Daily values for the current month (from day 1 to today) ---
      const daysCount = now.getDate();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const days = Array.from({ length: daysCount }, (_, i) => {
        const d = new Date(firstDayOfMonth);
        d.setDate(firstDayOfMonth.getDate() + i);
        return d;
      });

      const daily = days.map((date, idx) => {
        const daySales = sales.filter((s) => {
          const d = new Date(s.createdAt);
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
          );
        });

        const dayClients = clients.filter((c: Client) => {
          const d = new Date(c.createdAt);
          return (
            d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate()
          );
        });

        const profits = daySales.reduce(
          (sum: number, s) => sum + (s.totalProfit || 0),
          0,
        );

        const salesCount = daySales.length;
        const salesQuantity = daySales.reduce(
          (sum: number, s) => sum + (s.totalItems || 0),
          0,
        );

        const salesTotal = daySales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          // Show actual dates like "1 Mar", "23 Mar" (translated month name).
          period: `${date.getDate()} ${t(`dashboard.months.${date.getMonth()}`)}`,
          profits,
          clients: dayClients.length,
          sales: salesTotal,
          salesCount,
          salesQuantity,
        };
      });

      // --- 12m: Current year, by month (up to current month) ---
      const months = Array.from({ length: now.getMonth() + 1 }, (_, i) => i);

      const monthly = months.map((monthIdx) => {
        const monthSales = sales.filter((s) => {
          const d = new Date(s.createdAt);
          return (
            d.getFullYear() === now.getFullYear() && d.getMonth() === monthIdx
          );
        });

        const monthClients = clients.filter((c: Client) => {
          const d = new Date(c.createdAt);
          return (
            d.getFullYear() === now.getFullYear() && d.getMonth() === monthIdx
          );
        });

        const profits = monthSales.reduce(
          (sum: number, s) => sum + (s.totalProfit || 0),
          0,
        );

        const salesCount = monthSales.length;
        const salesQuantity = monthSales.reduce(
          (sum: number, s) => sum + (s.totalItems || 0),
          0,
        );

        const salesTotal = monthSales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          period: getPeriodLabel("month", monthIdx, monthIdx, t),
          profits,
          clients: monthClients.length,
          sales: salesTotal,
          salesCount,
          salesQuantity,
        };
      });

      // --- years: Last 6 years ---
      const startYear = now.getFullYear() - 5;
      const years = Array.from({ length: 6 }, (_, i) => startYear + i);

      const yearly = years.map((year) => {
        const yearSales = sales.filter((s) => {
          const d = new Date(s.createdAt);
          return d.getFullYear() === year;
        });

        const yearClients = clients.filter((c: Client) => {
          const d = new Date(c.createdAt);
          return d.getFullYear() === year;
        });

        const profits = yearSales.reduce(
          (sum: number, s) => sum + (s.totalProfit || 0),
          0,
        );

        const salesCount = yearSales.length;
        const salesQuantity = yearSales.reduce(
          (sum: number, s) => sum + (s.totalItems || 0),
          0,
        );

        const salesTotal = yearSales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          period: year.toString(),
          profits,
          clients: yearClients.length,
          sales: salesTotal,
          salesCount,
          salesQuantity,
        };
      });

      // Ensure minimum processing time to sync with other components
      const elapsedTime = Date.now() - startTime;
      const remainingTime = minProcessingTime - elapsedTime;
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      setChartData({ "1m": daily, "12m": monthly, years: yearly });
      setLoading(false);
    }

    processData();
  }, [dashboardLoading, sales, clients, i18n.language, t]);

  return { chartData, loading };
}


export function useChartConfigs() {
  const { t } = useTranslation();

  const chartTypes = {
    profits: {
      title: t("dashboard.chartProfitsTitle"),
      description: t("dashboard.chartProfitsDesc"),
      format: (value: number) => `${value.toLocaleString()} DA`,
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
      format: (value: number) => `${value.toLocaleString()} DA`,
      dataKey: "sales" as const,
      label: t("dashboard.sales"),
    },
  };

  return { chartTypes };
}
