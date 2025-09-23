import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartHeader } from "./chartHeader";
import { ChartControls } from "./chartControls";
import { ChartContainer } from "./chartContainer";
import { useChartData, useChartConfigs } from "./chartUtils";
import { TimePeriodConfig } from "./types";
import { Skeleton } from "../../../../lib/components/skeleton";

export function ChartBarInteractive() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [timePeriod, setTimePeriod] = React.useState<"1m" | "12m" | "years">(
    "12m",
  );
  const [chartType, setChartType] = React.useState<
    "profits" | "clients" | "sales"
  >("profits");
  const [isLoading, setIsLoading] = React.useState(true);

  const chartData = useChartData();
  const { chartTypes } = useChartConfigs();

  React.useEffect(() => {
    // Simulate loading time for chart data
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [chartData]);

  const timePeriods: Record<string, TimePeriodConfig> = {
    "1m": {
      data: chartData["1m"],
      label: t("dashboard.last30Days"),
      description: t("dashboard.last30Days"),
    },
    "12m": {
      data: chartData["12m"],
      label: t("dashboard.12M"),
      description: t("dashboard.currentYearMonths"),
    },
    years: {
      data: chartData.years,
      label: t("dashboard.years"),
      description: t("dashboard.yearlyPerformance"),
    },
  };

  const currentChart = chartTypes[chartType];
  const currentPeriod = timePeriods[timePeriod];

  // Theme-aware styling
  const bgClass = isDark
    ? "bg-[#18181b] border border-gray-700 text-gray-100"
    : "bg-white border border-gray-200 text-gray-900";

  if (isLoading) {
    return (
      <div className={`${bgClass} rounded-xl shadow-sm p-6`}>
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Chart Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-80 w-full rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgClass} rounded-xl shadow-sm p-6`}>
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

      {/* Chart */}
      <ChartContainer
        currentPeriod={currentPeriod}
        chartType={chartType}
        timePeriod={timePeriod}
      />
    </div>
  );
}
