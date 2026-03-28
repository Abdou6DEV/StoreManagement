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
    today: [],
    thisMonth: [],
    thisYear: [],
    overall: [],
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

      // --- today: Hourly values for today (from 00:00 to current hour) ---
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentHour = now.getHours();
      const hours = Array.from({ length: currentHour + 1 }, (_, i) => i);

      const todayHourly = hours.map((hour) => {
        const hourSales = sales.filter((s) => {
          const d = new Date(s.createdAt);
          return (
            d.getFullYear() === startOfToday.getFullYear() &&
            d.getMonth() === startOfToday.getMonth() &&
            d.getDate() === startOfToday.getDate() &&
            d.getHours() === hour
          );
        });

        const hourClients = clients.filter((c: Client) => {
          const d = new Date(c.createdAt);
          return (
            d.getFullYear() === startOfToday.getFullYear() &&
            d.getMonth() === startOfToday.getMonth() &&
            d.getDate() === startOfToday.getDate() &&
            d.getHours() === hour
          );
        });

        const profits = hourSales.reduce((sum: number, s) => sum + (s.totalProfit || 0), 0);
        const salesCount = hourSales.length;
        const salesQuantity = hourSales.reduce((sum: number, s) => sum + (s.totalItems || 0), 0);
        const salesTotal = hourSales.reduce(
          (sum: number, s) => sum + (s.totalAmountWithDiscount || 0),
          0,
        );

        return {
          period: `${String(hour).padStart(2, "0")}:00`,
          profits,
          clients: hourClients.length,
          sales: salesTotal,
          salesCount,
          salesQuantity,
          future: false,
        };
      });

      // --- 1m: Daily values for full current month; days after today are placeholders (future: true) ---
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const days = Array.from({ length: daysInMonth }, (_, i) => {
        const d = new Date(firstDayOfMonth);
        d.setDate(firstDayOfMonth.getDate() + i);
        return d;
      });

      const daily = days.map((date) => {
        const isFuture = date.getTime() > todayStart.getTime();
        const period = `${date.getDate()} ${t(`dashboard.months.${date.getMonth()}`)}`;

        if (isFuture) {
          return {
            period,
            profits: 0,
            clients: 0,
            sales: 0,
            salesCount: 0,
            salesQuantity: 0,
            future: true,
          };
        }

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
          period,
          profits,
          clients: dayClients.length,
          sales: salesTotal,
          salesCount,
          salesQuantity,
          future: false,
        };
      });

      // --- 12m: Full calendar year by month; months after current month are placeholders (future: true) ---
      const monthly = Array.from({ length: 12 }, (_, monthIdx) => {
        const isFuture = monthIdx > now.getMonth();
        const period = getPeriodLabel("month", monthIdx, monthIdx, t);

        if (isFuture) {
          return {
            period,
            profits: 0,
            clients: 0,
            sales: 0,
            salesCount: 0,
            salesQuantity: 0,
            future: true,
          };
        }

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
          period,
          profits,
          clients: monthClients.length,
          sales: salesTotal,
          salesCount,
          salesQuantity,
          future: false,
        };
      });

      // --- overall: min(nowYear - 1, first data year) … nowYear + 3; years > nowYear are placeholders (future) ---
      const nowYear = now.getFullYear();
      let minDataYear = nowYear;
      const considerYear = (createdAt: Date | string | null | undefined) => {
        const d = new Date(createdAt as string);
        if (Number.isNaN(d.getTime())) return;
        minDataYear = Math.min(minDataYear, d.getFullYear());
      };
      sales.forEach((s) => considerYear(s.createdAt));
      clients.forEach((c: Client) => considerYear(c.createdAt));
      const startYear = Math.min(nowYear - 1, minDataYear);
      const endYear = nowYear + 3;
      const years = Array.from(
        { length: endYear - startYear + 1 },
        (_, i) => startYear + i,
      );

      const yearly = years.map((year) => {
        const isFuture = year > nowYear;
        if (isFuture) {
          return {
            period: year.toString(),
            profits: 0,
            clients: 0,
            sales: 0,
            salesCount: 0,
            salesQuantity: 0,
            future: true,
          };
        }

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
          future: false,
        };
      });

      // Ensure minimum processing time to sync with other components
      const elapsedTime = Date.now() - startTime;
      const remainingTime = minProcessingTime - elapsedTime;
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }

      setChartData({
        today: todayHourly,
        thisMonth: daily,
        thisYear: monthly,
        overall: yearly,
      });
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
