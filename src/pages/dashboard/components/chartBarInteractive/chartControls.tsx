import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartControlsProps } from "./types";

export function ChartControls({
  chartType,
  setChartType,
  timePeriod,
  setTimePeriod,
  chartTypes,
  timePeriods,
}: ChartControlsProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();

  const controlBg = isDark ? "bg-[#232326]" : "bg-white";
  const controlBorder = isDark ? "border-gray-700" : "border-gray-300";
  const controlText = isDark ? "text-gray-100" : "text-gray-900";
  const controlInactive = isDark
    ? "text-gray-400 hover:text-gray-200"
    : "text-gray-500 hover:text-gray-700";
  const toggleBg = isDark ? "bg-[#232326]" : "bg-gray-50";

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {/* Chart Type Selector */}
      <select
        value={chartType}
        onChange={(e) =>
          setChartType(e.target.value as "profits" | "clients" | "sales")
        }
        className={`px-3 py-2 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border ${controlBorder} ${controlBg} ${controlText}`}
      >
        <option value="profits">{chartTypes.profits.label}</option>
        <option value="clients">{chartTypes.clients.label}</option>
        <option value="sales">{chartTypes.sales.label}</option>
      </select>

      {/* Time Period Toggle Buttons */}
      <div
        className={`flex rounded-lg border ${controlBorder} ${toggleBg} p-1`}
      >
        {Object.entries(timePeriods).map(([key]) => (
          <button
            key={key}
            onClick={() => setTimePeriod(key as "1m" | "12m" | "years")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              timePeriod === key
                ? `${controlBg} ${controlText} shadow-sm`
                : controlInactive
            }`}
          >
            {key === "1m"
              ? t("dashboard.1M")
              : key === "12m"
                ? t("dashboard.12M")
                : t("dashboard.years")}
          </button>
        ))}
      </div>
    </div>
  );
}
