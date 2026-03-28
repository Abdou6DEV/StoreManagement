import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartControlsProps } from "./types";
import { BarChart3, LineChart } from "lucide-react";

export function ChartControls({
  timePeriod,
  setTimePeriod,
  chartView,
  setChartView,
  timePeriods,
}: ChartControlsProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const controlBg = isDark ? "bg-[#232326]" : "bg-white";
  const controlBorder = isDark ? "border-gray-700" : "border-gray-300";
  const controlActiveBlue = "text-blue-600 dark:text-blue-400";
  const controlInactive = isDark
    ? "text-gray-400 hover:text-gray-200"
    : "text-gray-500 hover:text-gray-700";
  const toggleBg = isDark ? "bg-[#232326]" : "bg-gray-50";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {/* Chart View Toggle (Bar / Line) */}
      <div className={`flex rounded-lg border ${controlBorder} ${toggleBg} p-1`}>
        <button
          type="button"
          onClick={() => setChartView("bar")}
          aria-pressed={chartView === "bar"}
          aria-label="Bar chart"
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            chartView === "bar" ? `${controlBg} ${controlActiveBlue} shadow-sm` : controlInactive
          }`}
        >
          <BarChart3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setChartView("line")}
          aria-pressed={chartView === "line"}
          aria-label="Line chart"
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${
            chartView === "line" ? `${controlBg} ${controlActiveBlue} shadow-sm` : controlInactive
          }`}
        >
          <LineChart className="h-4 w-4" />
        </button>
      </div>

      {/* Time Period Toggle Buttons */}
      <div
        className={`flex rounded-lg border ${controlBorder} ${toggleBg} p-1`}
      >
        {Object.entries(timePeriods).map(([key]) => (
          <button
            key={key}
            onClick={() =>
              setTimePeriod(key as "today" | "thisMonth" | "thisYear" | "overall")
            }
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              timePeriod === key
                ? `${controlBg} ${controlActiveBlue} shadow-sm`
                : controlInactive
            }`}
          >
            {key === "today"
              ? t("dashboard.today")
              : key === "thisMonth"
                ? t("dashboard.thisMonth")
                : key === "thisYear"
                  ? t("dashboard.thisYear")
                  : t("dashboard.overall")}
          </button>
        ))}
      </div>
    </div>
  );
}
