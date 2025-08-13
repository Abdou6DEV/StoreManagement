import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartHeader } from "./chartHeader";
import { ChartControls } from "./chartControls";
import { ChartContainer } from "./chartContainer";
import { useChartData, useChartConfigs } from "./chartUtils";
import { TimePeriodConfig } from "./types";

export function ChartBarInteractive() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [timePeriod, setTimePeriod] = React.useState<"1m" | "12m" | "years">(
    "12m",
  );
  const [chartType, setChartType] = React.useState<
    "profits" | "clients" | "sales"
  >("profits");

  const chartData = useChartData();
  const { chartTypes } = useChartConfigs();

  const timePeriods: Record<string, TimePeriodConfig> = {
    "1m": {
      data: chartData["1m"],
      label: t("dashboard.1M"),
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
