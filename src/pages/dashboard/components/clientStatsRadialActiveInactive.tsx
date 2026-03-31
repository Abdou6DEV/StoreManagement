"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp } from "lucide-react";
import { Label, PolarRadiusAxis, RadialBar, RadialBarChart } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@/components/ui/chart";

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

  const ActiveInactiveTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const item = payload[0];
    const key = String(item?.dataKey ?? item?.name ?? "");
    const value = typeof item?.value === "number" ? item.value : 0;
    const fill = item?.fill ?? item?.color ?? "currentColor";

    const label =
      key === "active"
        ? t("dashboard.activeClients", "Active Clients")
        : key === "inactive"
          ? t("dashboard.inactiveClients", "Inactive Clients")
          : key;

    const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fill }} />
          <p className="font-medium text-foreground">{label}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.clients", "Clients")}:{" "}
          <span className="font-semibold text-foreground">{value.toLocaleString()}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.percentage", "Percentage")}:{" "}
          <span className="font-semibold text-foreground">{pct}%</span>
        </p>
      </div>
    );
  };

  return (
    <Card className="flex flex-col border-0 shadow-none">
      <CardHeader className="items-center pb-0">
        <CardTitle>{t("dashboard.radialChartStackedTitle", "Radial Chart - Stacked")}</CardTitle>
        <CardDescription>
          {t("dashboard.radialChartStackedDesc", "Active vs inactive clients (last 30 days)")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 items-center pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square w-full max-w-[250px]"
        >
          <RadialBarChart data={chartData} endAngle={180} innerRadius={80} outerRadius={110}>
            <RadialBar
              dataKey="inactive"
              fill="var(--color-inactive)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <RadialBar
              dataKey="active"
              fill="var(--color-active)"
              stackId="a"
              cornerRadius={5}
              className="stroke-transparent stroke-2"
            />
            <ChartTooltip cursor={false} content={<ActiveInactiveTooltip />} />
            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 16}
                          className="fill-foreground text-2xl font-bold"
                        >
                          {total.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 4}
                          className="fill-muted-foreground"
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
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          {t("dashboard.clientsActivityFooter", "Active clients in the last 30 days")}{" "}
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          {totalClients > 0
            ? t("dashboard.clientsActivityFootnote", "Based on registered clients")
            : t("dashboard.noClients", "No clients yet")}
        </div>
      </CardFooter>
    </Card>
  );
}

