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
} from "@/components/ui/card";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";

type Props = {
  creditSales: number;
  normalSales: number;
};

export function ClientStatsRadialCreditVsNormalSales({ creditSales, normalSales }: Props) {
  const { t } = useTranslation();

  const safeCredit = creditSales ?? 0;
  const safeNormal = normalSales ?? 0;

  const chartData = useMemo(
    () => [{ key: "sales", credit: safeCredit, normal: safeNormal }],
    [safeCredit, safeNormal],
  );

  const chartConfig = {
    credit: {
      label: t("dashboard.creditSales", "Credit Sales"),
      color: "var(--chart-1)",
    },
    normal: {
      label: t("dashboard.normalSales", "Normal Sales"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const total = safeCredit + safeNormal;
  const hasNoSalesData = total === 0;

  const breakdownRows = useMemo(() => {
    return [
      {
        key: "credit",
        label: t("dashboard.creditSales", "Credit Sales"),
        count: safeCredit,
        color: "var(--chart-1)" as const,
        pct: total > 0 ? ((safeCredit / total) * 100).toFixed(1) : "0",
      },
      {
        key: "normal",
        label: t("dashboard.normalSales", "Normal Sales"),
        count: safeNormal,
        color: "var(--chart-2)" as const,
        pct: total > 0 ? ((safeNormal / total) * 100).toFixed(1) : "0",
      },
    ];
  }, [safeCredit, safeNormal, t, total]);

  const TooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const byKey = new Map<string, any>();
    payload.forEach((p: any) => {
      const k = String(p?.dataKey ?? p?.name ?? "");
      if (!k) return;
      byKey.set(k, p);
    });

    const rows = (["credit", "normal"] as const).map((k) => {
      const item = byKey.get(k);
      const value = typeof item?.value === "number" ? item.value : 0;
      const fill =
        item?.fill ??
        item?.color ??
        (k === "credit" ? "var(--color-credit)" : "var(--color-normal)");
      const label =
        k === "credit"
          ? t("dashboard.creditSales", "Credit Sales")
          : t("dashboard.normalSales", "Normal Sales");
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
      return { key: k, value, fill, label, pct };
    });

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        {rows.map((row) => (
          <div key={row.key} className={row.key === "credit" ? "mb-3" : ""}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.fill }} />
              <p className="font-medium text-foreground">{row.label}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.sales", "Sales")}:{" "}
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
          {t("dashboard.creditVsNormalSalesTitle", "Credit vs normal sales")}
        </CardTitle>
        <CardDescription>
          {t("dashboard.creditVsNormalSalesDesc", "Sales type split (all-time)")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center pb-4">
        {hasNoSalesData ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] w-full max-w-[280px] mx-auto text-center px-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-sm font-medium text-foreground">
              {t("dashboard.radialChartEmptySalesTitle", "No sales recorded")}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {t(
                "dashboard.radialChartEmptySalesDesc",
                "Record sales to compare credit and normal sales.",
              )}
            </p>
          </div>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[250px]">
              <RadialBarChart
                data={chartData}
                startAngle={90}
                endAngle={-270}
                innerRadius={65}
                outerRadius={100}
              >
                <RadialBar
                  dataKey="credit"
                  fill="var(--color-credit)"
                  stackId="a"
                  cornerRadius={5}
                  className="stroke-background stroke-2"
                />
                <RadialBar
                  dataKey="normal"
                  fill="var(--color-normal)"
                  stackId="a"
                  cornerRadius={5}
                  className="stroke-background stroke-2"
                />
                <ChartTooltip cursor={false} content={<TooltipContent />} />
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
                              {t("dashboard.sales", "Sales")}
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

