import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { BarChart3 } from "lucide-react";
import { ChartHeader } from "./chartHeader";
import { ChartControls } from "./chartControls";
import { ChartContainer } from "./chartContainer";
import { useChartData, useChartConfigs } from "./chartUtils";
import { TimePeriodConfig } from "./types";

export function ChartBarInteractive() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [timePeriod, setTimePeriod] = React.useState<"1m" | "12m" | "years">(
    "1m",
  );
  const [chartType, setChartType] = React.useState<
    "profits" | "clients" | "sales"
  >("profits");

  const { chartData, loading: chartLoading } = useChartData();
  const { chartTypes } = useChartConfigs();

  const timePeriods: Record<string, TimePeriodConfig> = {
    "1m": {
      data: chartData["1m"],
      label: t("history.daily"),
      description: t("history.daily"),
    },
    "12m": {
      data: chartData["12m"],
      label: t("history.monthly"),
      description: t("history.monthly"),
    },
    years: {
      data: chartData.years,
      label: t("dashboard.years"),
      description: t("dashboard.yearlyPerformance"),
    },
  };

  const currentChart = chartTypes[chartType];
  const currentPeriod = timePeriods[timePeriod];
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

  // Don't render until chart data is ready (hooks must run before this return)
  if (chartLoading) {
    return null;
  }

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <ChartHeader
          currentChart={currentChart}
          currentPeriod={currentPeriod}
        />

        {/* Controls */}
        <ChartControls
          chartType={chartType}
          setChartType={setChartType}
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          chartTypes={chartTypes}
          timePeriods={timePeriods}
        />
      </div>

      {/* Chart or Empty State */}
      {hasData ? (
        <ChartContainer
          currentPeriod={currentPeriod}
          chartType={chartType}
          timePeriod={timePeriod}
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
    </div>
  );
}
