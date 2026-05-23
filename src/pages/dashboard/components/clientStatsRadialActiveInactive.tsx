"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "../../../components/ui/chart";

type Props = {
  activeClients: number;
  totalClients: number;
};

export function ClientStatsRadialActiveInactive({ activeClients, totalClients }: Props) {
  const { t } = useTranslation();

  const inactiveClients = Math.max(0, (totalClients ?? 0) - (activeClients ?? 0));

  const chartData = useMemo(
    () => [{ key: "clients", active: activeClients ?? 0, inactive: inactiveClients }],
    [activeClients, inactiveClients],
  );

  const chartConfig = {
    active: {
      label: t("dashboard.activeClients", "Active Clients"),
      color: "var(--chart-1)",
    },
    inactive: {
      label: t("dashboard.inactiveClients", "Inactive Clients"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const total = (activeClients ?? 0) + inactiveClients;
  const registeredClients = totalClients ?? 0;
  const hasNoClientData = registeredClients === 0;

  const breakdownRows = useMemo(() => {
    const a = activeClients ?? 0;
    const i = inactiveClients;
    return [
      {
        key: "active",
        label: t("dashboard.activeClients", "Active Clients"),
        count: a,
        color: "var(--chart-1)" as const,
        pct: total > 0 ? ((a / total) * 100).toFixed(1) : "0",
      },
      {
        key: "inactive",
        label: t("dashboard.inactiveClients", "Inactive Clients"),
        count: i,
        color: "var(--chart-2)" as const,
        pct: total > 0 ? ((i / total) * 100).toFixed(1) : "0",
      },
    ];
  }, [activeClients, inactiveClients, t, total]);

  const ActiveInactiveTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const byKey = new Map<string, any>();
    payload.forEach((p: any) => {
      const k = String(p?.dataKey ?? p?.name ?? "");
      if (!k) return;
      byKey.set(k, p);
    });

    const rows = (["active", "inactive"] as const).map((k) => {
      const item = byKey.get(k);
      const value = typeof item?.value === "number" ? item.value : 0;
      const fill = item?.fill ?? item?.color ?? (k === "active" ? "var(--color-active)" : "var(--color-inactive)");
      const label =
        k === "active"
          ? t("dashboard.activeClients", "Active Clients")
          : t("dashboard.inactiveClients", "Inactive Clients");
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
      return { key: k, value, fill, label, pct };
    });

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        {rows.map((row) => (
          <div key={row.key} className={row.key === "active" ? "mb-3" : ""}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.fill }} />
              <p className="font-medium text-foreground">{row.label}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.clients", "Clients")}:{" "}
              <span className="font-semibold text-foreground">
                {row.value.toLocaleString()} - {row.pct}%
              </span>
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="flex flex-col border-0 shadow-none">
      <CardHeader className="items-center pb-0">
        <CardTitle>
          {t("dashboard.activeVsInactiveClientsTitle", "Active vs inactive clients")}
        </CardTitle>
        <CardDescription>
          {t("dashboard.activeVsInactiveClientsDesc", "Activity split (last 30 days)")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center pb-4">
        {hasNoClientData ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] w-full max-w-[280px] mx-auto text-center px-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-sm font-medium text-foreground">
              {t("dashboard.radialChartEmptyClientsTitle", "No clients yet")}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {t(
                "dashboard.radialChartEmptyClientsDesc",
                "Register clients to see active vs inactive breakdown.",
              )}
            </p>
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square w-full max-w-[250px]"
            >
              <RadialBarChart
                data={chartData}
                startAngle={90}
                endAngle={-270}
                innerRadius={65}
                outerRadius={100}
              >
                <RadialBar
                  dataKey="active"
                  fill="var(--color-active)"
                  stackId="a"
                  cornerRadius={5}
                  className="stroke-background stroke-2"
                />
                <RadialBar
                  dataKey="inactive"
                  fill="var(--color-inactive)"
                  stackId="a"
                  cornerRadius={5}
                  className="stroke-background stroke-2"
                />
                <ChartTooltip cursor={false} content={<ActiveInactiveTooltip />} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) - 6}
                              className="fill-foreground text-4xl font-bold"
                            >
                              {total.toLocaleString()}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 22}
                              className="fill-muted-foreground text-sm"
                            >
                              {t("dashboard.clients", "Clients")}
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>

            <div className="w-full max-w-[250px] mx-auto mt-4 space-y-2">
              {breakdownRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                    <span className="text-sm font-medium text-foreground">{row.label}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-foreground">{row.count.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">{row.pct}%</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

