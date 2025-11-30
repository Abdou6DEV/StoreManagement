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
    "12m",
  );
  const [chartType, setChartType] = React.useState<
    "profits" | "clients" | "sales"
  >("profits");

  const { chartData, loading: chartLoading } = useChartData();
  const { chartTypes } = useChartConfigs();

  // Don't render until chart data is ready
  if (chartLoading) {
    return null;
  }

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

  // Check if there's any data in the current period
  const hasData = currentPeriod.data && currentPeriod.data.length > 0 && 
    currentPeriod.data.some((item: any) => {
      const value = item[chartType === "profits" ? "profits" : chartType === "clients" ? "clients" : "sales"];
      return value > 0;
    });

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
