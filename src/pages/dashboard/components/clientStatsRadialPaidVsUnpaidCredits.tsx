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
import { ChartContainer, ChartTooltip, type ChartConfig } from "../../../components/ui/chart";

type Props = {
  paidCredits: number;
  unpaidCredits: number;
};

export function ClientStatsRadialPaidVsUnpaidCredits({ paidCredits, unpaidCredits }: Props) {
  const { t } = useTranslation();

  const safePaid = paidCredits ?? 0;
  const safeUnpaid = unpaidCredits ?? 0;

  const chartData = useMemo(
    () => [{ key: "credits", paid: safePaid, unpaid: safeUnpaid }],
    [safePaid, safeUnpaid],
  );

  const chartConfig = {
    paid: {
      label: t("dashboard.paidCredits", "Paid credits"),
      color: "var(--chart-1)",
    },
    unpaid: {
      label: t("dashboard.unpaidCreditsLabel", "Unpaid credits"),
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  const total = safePaid + safeUnpaid;
  const hasNoCreditsData = total === 0;

  const breakdownRows = useMemo(() => {
    return [
      {
        key: "paid",
        label: t("dashboard.paidCredits", "Paid credits"),
        count: safePaid,
        color: "var(--chart-1)" as const,
        pct: total > 0 ? ((safePaid / total) * 100).toFixed(1) : "0",
      },
      {
        key: "unpaid",
        label: t("dashboard.unpaidCreditsLabel", "Unpaid credits"),
        count: safeUnpaid,
        color: "var(--chart-2)" as const,
        pct: total > 0 ? ((safeUnpaid / total) * 100).toFixed(1) : "0",
      },
    ];
  }, [safePaid, safeUnpaid, t, total]);

  const TooltipContent = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const byKey = new Map<string, any>();
    payload.forEach((p: any) => {
      const k = String(p?.dataKey ?? p?.name ?? "");
      if (!k) return;
      byKey.set(k, p);
    });

    const rows = (["paid", "unpaid"] as const).map((k) => {
      const item = byKey.get(k);
      const value = typeof item?.value === "number" ? item.value : 0;
      const fill =
        item?.fill ??
        item?.color ??
        (k === "paid" ? "var(--color-paid)" : "var(--color-unpaid)");
      const label =
        k === "paid"
          ? t("dashboard.paidCredits", "Paid credits")
          : t("dashboard.unpaidCreditsLabel", "Unpaid credits");
      const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
      return { key: k, value, fill, label, pct };
    });

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        {rows.map((row) => (
          <div key={row.key} className={row.key === "paid" ? "mb-3" : ""}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.fill }} />
              <p className="font-medium text-foreground">{row.label}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.credits", "Credits")}:{" "}
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
          {t("dashboard.paidVsUnpaidCreditsTitle", "Paid vs unpaid credits")}
        </CardTitle>
        <CardDescription>
          {t("dashboard.paidVsUnpaidCreditsDesc", "Credits status split (all-time)")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center pb-4">
        {hasNoCreditsData ? (
          <div className="flex flex-col items-center justify-center min-h-[280px] w-full max-w-[280px] mx-auto text-center px-4 rounded-lg bg-muted/20 border border-border/40">
            <p className="text-sm font-medium text-foreground">
              {t("dashboard.radialChartEmptyCreditsTitle", "No credit payments")}
            </p>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {t(
                "dashboard.radialChartEmptyCreditsDesc",
                "Paid and unpaid credits appear here once you create credit payments.",
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
                  dataKey="unpaid"
                  fill="var(--color-unpaid)"
                  stackId="a"
                  cornerRadius={5}
                  className="stroke-background stroke-2"
                />
                <RadialBar
                  dataKey="paid"
                  fill="var(--color-paid)"
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
                              {t("dashboard.credits", "Credits")}
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

