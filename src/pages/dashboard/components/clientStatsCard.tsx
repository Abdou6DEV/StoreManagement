"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Users, PieChart as PieChartIcon, Gauge, TrendingUp } from "lucide-react";
import { Pie, PieChart, Tooltip, ResponsiveContainer } from "recharts";
import { Tooltip as UITooltip } from "../../../lib/components/tooltip";
import {
  useSales,
  useClients,
  usePayments,
  useDashboardLoading,
} from "../../../lib/contexts/dashboardContext";
import { ClientStatsRadialActiveInactive } from "./clientStatsRadialActiveInactive";
import { ClientStatsRadialCreditVsNormalSales } from "./clientStatsRadialCreditVsNormalSales";
import { ClientStatsRadialPaidVsUnpaidCredits } from "./clientStatsRadialPaidVsUnpaidCredits";

type ViewMode = "radials" | "topClients";

const chartColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

type TopClientSlice = {
  name: string;
  sold: number;
  category: string;
  fill: string;
};

const ClientPieTooltip = ({
  active,
  payload,
  totalRevenue,
  t,
  formatCurrency,
}: {
  active?: boolean;
  payload?: Array<{ payload: TopClientSlice }>;
  totalRevenue: number;
  t: (key: string, opts?: Record<string, string | number>) => string;
  formatCurrency: (n: number) => string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage =
      totalRevenue > 0 ? ((data.sold / totalRevenue) * 100).toFixed(1) : "0";

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.fill }} />
          <p className="font-medium text-foreground">{data.name}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.revenue")}:{" "}
          <span className="font-semibold text-foreground">{formatCurrency(data.sold)}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.percentage")}:{" "}
          <span className="font-semibold text-foreground">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function ClientStatsCard() {
  const { t } = useTranslation();
  const sales = useSales();
  const clients = useClients();
  const payments = usePayments();
  const dashboardLoading = useDashboardLoading();

  const [viewMode, setViewMode] = useState<ViewMode>("radials");
  const [loading, setLoading] = useState(true);

  const [numberOfClients, setNumberOfClients] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [newClientsThisMonth, setNewClientsThisMonth] = useState(0);
  const [totalCreditAmount, setTotalCreditAmount] = useState(0);
  const [totalVersementAmount, setTotalVersementAmount] = useState(0);
  const [unpaidCreditAmount, setUnpaidCreditAmount] = useState(0);
  const [unpaidVersementAmount, setUnpaidVersementAmount] = useState(0);
  const [creditSalesCount, setCreditSalesCount] = useState(0);
  const [normalSalesCount, setNormalSalesCount] = useState(0);
  const [paidCreditsCount, setPaidCreditsCount] = useState(0);
  const [unpaidCreditsCount, setUnpaidCreditsCount] = useState(0);
  const [topClients, setTopClients] = useState<TopClientSlice[]>([]);

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString()} ${t("currency")}`;

  useEffect(() => {
    if (dashboardLoading) {
      setLoading(true);
      return;
    }

    try {
      const numberOfClientsVal = clients.length;
      const totalCredit = payments.filter((p: { type: string }) => p.type === "CREDIT");
      const totalVersement = payments.filter((p: { type: string }) => p.type === "VERSEMENT");

      const calculatedTotalCreditAmount = totalCredit.reduce(
        (sum: number, p: { givenAmount: number; remainingAmount?: number }) =>
          sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.givenAmount),
        0,
      );
      const calculatedTotalVersementAmount = totalVersement.reduce(
        (sum: number, p: { givenAmount: number }) => sum + p.givenAmount,
        0,
      );
      const calculatedUnpaidCreditAmount = totalCredit
        .filter((p: { paidDate?: string | Date }) => !p.paidDate)
        .reduce(
          (sum: number, p: { givenAmount: number; remainingAmount?: number }) =>
            sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.givenAmount),
          0,
        );
      const calculatedUnpaidVersementAmount = totalVersement
        .filter((p: { paidDate?: string | Date }) => !p.paidDate)
        .reduce((sum: number, p: { givenAmount: number }) => sum + p.givenAmount, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const activeClientIds = new Set<string>();
      (sales ?? []).forEach((s: any) => {
        if (!s?.clientId) return;
        const saleDate = new Date(s.createdAt);
        if (Number.isNaN(saleDate.getTime())) return;
        if (saleDate >= thirtyDaysAgo) {
          activeClientIds.add(String(s.clientId));
        }
      });

      let creditSales = 0;
      let normalSales = 0;
      (sales ?? []).forEach((s: any) => {
        if (s?.payment?.type === "CREDIT") {
          creditSales += 1;
        } else {
          normalSales += 1;
        }
      });

      let paidCredits = 0;
      let unpaidCredits = 0;
      (payments ?? []).forEach((p: any) => {
        if (p?.type !== "CREDIT") return;
        if (p?.paidDate) {
          paidCredits += 1;
        } else {
          unpaidCredits += 1;
        }
      });

      const newThisMonth = clients.filter((c: { createdAt: string | Date }) => {
        const created = new Date(c.createdAt);
        const now = new Date();
        return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
      }).length;

      const spendByClient: Record<
        string,
        { name: string; revenue: number; saleCount: number }
      > = {};
      (sales ?? []).forEach((s: any) => {
        if (!s?.clientId) return;
        const id = String(s.clientId);
        const name =
          (s.client && typeof s.client === "object" && (s.client as { name?: string }).name) ||
          clients.find((c: { id: string }) => String(c.id) === id)?.name ||
          t("dashboard.unknownClient", "Unknown");
        const amt = s.totalAmountWithDiscount || 0;
        if (!spendByClient[id]) {
          spendByClient[id] = { name, revenue: 0, saleCount: 0 };
        }
        spendByClient[id].revenue += amt;
        spendByClient[id].saleCount += 1;
      });

      const allRanked = Object.values(spendByClient).sort((a, b) => b.revenue - a.revenue);
      const top10 = allRanked.slice(0, 10);
      const rest = allRanked.slice(10);
      const othersRevenue = rest.reduce((sum, x) => sum + x.revenue, 0);

      const topSlices: TopClientSlice[] = top10.map((row, index) => ({
        name: row.name,
        sold: row.revenue,
        category: `${row.saleCount.toLocaleString()} ${t("dashboard.sales")}`,
        fill: chartColors[index % chartColors.length],
      }));

      if (othersRevenue > 0) {
        topSlices.push({
          name: t("dashboard.othersCategory", "Others"),
          sold: othersRevenue,
          category: t("dashboard.variousClients", "Various"),
          fill: "#6b7280",
        });
      }

      setNumberOfClients(numberOfClientsVal);
      setActiveClients(activeClientIds.size);
      setNewClientsThisMonth(newThisMonth);
      setTotalCreditAmount(calculatedTotalCreditAmount);
      setTotalVersementAmount(calculatedTotalVersementAmount);
      setUnpaidCreditAmount(calculatedUnpaidCreditAmount);
      setUnpaidVersementAmount(calculatedUnpaidVersementAmount);
      setCreditSalesCount(creditSales);
      setNormalSalesCount(normalSales);
      setPaidCreditsCount(paidCredits);
      setUnpaidCreditsCount(unpaidCredits);
      setTopClients(topSlices);
    } catch (e) {
      console.error("Error processing client stats:", e);
    } finally {
      setLoading(false);
    }
  }, [dashboardLoading, sales, clients, payments, t]);

  const totalTopClientsRevenue = React.useMemo(
    () => topClients.reduce((acc, c) => acc + c.sold, 0),
    [topClients],
  );

  if (loading) {
    return (
      <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t("dashboard.clientStatsSection")}
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {t("dashboard.clientStatsSection")}
        </h2>
      </div>

      <div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.numberOfClients")}
            </span>
            <span className="text-3xl font-bold text-foreground">
              {numberOfClients.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.activeClients", "Active Clients")}
            </span>
            <span className="text-3xl font-bold text-green-600">
              {activeClients.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.newClientsThisMonth", "New This Month")}
            </span>
            <span className="text-3xl font-bold text-blue-600">
              {newClientsThisMonth.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.clientRetention", "Retention Rate")}
            </span>
            <span className="text-3xl font-bold text-purple-600">
              {numberOfClients > 0 ? Math.round((activeClients / numberOfClients) * 100) : 0}%
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.unpaidCreditAmount", "Unpaid Credit")}
            </span>
            <span className="text-3xl font-bold text-red-600">
              {formatCurrency(unpaidCreditAmount)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.unpaidVersementAmount", "Unpaid Versement")}
            </span>
            <span className="text-3xl font-bold text-orange-600">
              {formatCurrency(unpaidVersementAmount)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.paymentRate", "Payment Rate")}
            </span>
            <span className="text-3xl font-bold text-green-600">
              {totalCreditAmount + totalVersementAmount > 0
                ? Math.round(
                    ((totalCreditAmount + totalVersementAmount - unpaidCreditAmount - unpaidVersementAmount) /
                      (totalCreditAmount + totalVersementAmount)) *
                      100,
                  )
                : 0}
              %
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.averageClientValue", "Avg Client Value")}
            </span>
            <span className="text-3xl font-bold text-foreground">
              {numberOfClients > 0
                ? formatCurrency(
                    Math.round((totalCreditAmount + totalVersementAmount) / numberOfClients),
                  )
                : formatCurrency(0)}
            </span>
          </div>
        </div>

        <div className="space-y-4 mt-8">
            <div className="flex items-center justify-end mb-4">
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <UITooltip
                  content={t(
                    "dashboard.clientStatsRadialsTooltip",
                    "View active clients, sales types, and credits as radial charts",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("radials")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "radials"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Gauge className="h-4 w-4" />
                    {t("dashboard.clientStatsRadialsLabel", "Radial charts")}
                  </button>
                </UITooltip>
                <UITooltip
                  content={t(
                    "dashboard.topClientsTooltip",
                    "View revenue share by top clients",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("topClients")}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === "topClients"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <PieChartIcon className="h-4 w-4" />
                    {t("dashboard.topClientsLabel", "Top 10 clients")}
                  </button>
                </UITooltip>
              </div>
            </div>

            {viewMode === "radials" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <ClientStatsRadialActiveInactive
                  activeClients={activeClients}
                  totalClients={numberOfClients}
                />
                <ClientStatsRadialCreditVsNormalSales
                  creditSales={creditSalesCount}
                  normalSales={normalSalesCount}
                />
                <ClientStatsRadialPaidVsUnpaidCredits
                  paidCredits={paidCreditsCount}
                  unpaidCredits={unpaidCreditsCount}
                />
              </div>
            ) : topClients.length > 0 ? (
              <>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <div className="flex-1 max-w-md">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t("dashboard.topClientsSold", "Top Clients by Revenue")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t(
                          "dashboard.topClientsChartDesc",
                          "Top 10 clients by lifetime sales revenue",
                        )}
                      </p>
                    </div>
                    <div className="w-full min-h-[300px] h-[300px] overflow-hidden rounded-lg bg-card">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart style={{ background: "transparent" }}>
                          <Tooltip
                            content={
                              <ClientPieTooltip
                                totalRevenue={totalTopClientsRevenue}
                                t={t}
                                formatCurrency={formatCurrency}
                              />
                            }
                          />
                          <Pie
                            data={topClients}
                            dataKey="sold"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            labelLine={false}
                            label={({ payload, ...props }) => {
                              const pct =
                                totalTopClientsRevenue > 0 && payload
                                  ? ((payload.sold / totalTopClientsRevenue) * 100).toFixed(1)
                                  : "0";
                              return (
                                <text
                                  key={`top-client-label-${String(payload?.name ?? "")}`}
                                  cx={props.cx}
                                  cy={props.cy}
                                  x={props.x}
                                  y={props.y}
                                  textAnchor={props.textAnchor}
                                  dominantBaseline={props.dominantBaseline}
                                  fill="currentColor"
                                  className="text-sm font-bold pointer-events-none drop-shadow-sm text-primary"
                                >
                                  {pct}%
                                </text>
                              );
                            }}
                            className="cursor-default"
                            stroke="none"
                            onClick={(e: unknown) => (e as { preventDefault?: () => void })?.preventDefault?.()}
                            onMouseDown={(e: unknown) => (e as { preventDefault?: () => void })?.preventDefault?.()}
                            onMouseUp={(e: unknown) => (e as { preventDefault?: () => void })?.preventDefault?.()}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="flex-1 w-full">
                    <h4 className="font-medium text-foreground mb-3">
                      {t("dashboard.topClientsBreakdown", "Clients breakdown")}
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {topClients.map((client, idx) => {
                        const percentage =
                          totalTopClientsRevenue > 0
                            ? ((client.sold / totalTopClientsRevenue) * 100).toFixed(1)
                            : "0";
                        return (
                          <div
                            key={`top-client-row-${idx}-${client.name}`}
                            className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: client.fill }}
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {client.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {client.category}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold text-foreground">
                                {formatCurrency(client.sold)}
                              </div>
                              <div className="text-xs text-muted-foreground">{percentage}%</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[300px] w-full flex flex-col items-center justify-center py-12 text-center rounded-lg bg-muted/20 border border-border/40">
                <PieChartIcon className="w-12 h-12 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold text-foreground">
                  {t("dashboard.noTopClients", "No client sales yet")}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t(
                    "dashboard.noTopClientsDesc",
                    "Sales linked to registered clients will appear in this chart.",
                  )}
                </p>
              </div>
            )}
          </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 border-t">
        <TrendingUp className="h-4 w-4" />
        <span>
          {t(
            "dashboard.clientStatsFooter",
            "Real-time client metrics, credits activity, and top client revenue overview",
          )}
        </span>
      </div>
    </div>
  );
}
