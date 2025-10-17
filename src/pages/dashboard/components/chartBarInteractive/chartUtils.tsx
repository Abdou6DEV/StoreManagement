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
    
    function processData() {

      // --- 1m: Last 30 days ---
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return date;
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

        const salesTotal = daySales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          period: getPeriodLabel("day", 0, idx, t),
          profits,
          clients: dayClients.length,
          sales: salesTotal,
        };
      });

      // --- 12m: Current year, by month ---
      const now = new Date();
      const months = Array.from({ length: 12 }, (_, i) => i);

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

        const salesTotal = monthSales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          period: getPeriodLabel("month", monthIdx, monthIdx, t),
          profits,
          clients: monthClients.length,
          sales: salesTotal,
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

        const salesTotal = yearSales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          period: year.toString(),
          profits,
          clients: yearClients.length,
          sales: salesTotal,
        };
      });

      setChartData({ "1m": daily, "12m": monthly, years: yearly });
      setLoading(false);
    }

    processData();
  }, [dashboardLoading, sales, clients, i18n.language]);

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
