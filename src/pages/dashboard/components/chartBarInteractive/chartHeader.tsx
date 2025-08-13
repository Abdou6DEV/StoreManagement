import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartHeaderProps } from "./types";

export function ChartHeader({ currentChart, currentPeriod }: ChartHeaderProps) {
  const { isDark } = useTheme();
  const controlText = isDark ? "text-gray-100" : "text-gray-900";

  return (
    <div>
      <h3 className={`text-xl font-semibold ${controlText}`}>
        {currentChart.title}
      </h3>
      <p
        className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
      >
        {currentChart.description} - {currentPeriod.description}
      </p>
    </div>
  );
}
