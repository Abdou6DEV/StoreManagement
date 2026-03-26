import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartControlsProps } from "./types";
import { useState } from "react";
import { BarChart3, ChevronDownIcon, LineChart } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../lib/components/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "../../../../lib/components/command";

export function ChartControls({
  chartType,
  setChartType,
  timePeriod,
  setTimePeriod,
  chartView,
  setChartView,
  chartTypes,
  timePeriods,
}: ChartControlsProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);

  const controlBg = isDark ? "bg-[#232326]" : "bg-white";
  const controlBorder = isDark ? "border-gray-700" : "border-gray-300";
  const controlText = isDark ? "text-gray-100" : "text-gray-900";
  const controlInactive = isDark
    ? "text-gray-400 hover:text-gray-200"
    : "text-gray-500 hover:text-gray-700";
  const toggleBg = isDark ? "bg-[#232326]" : "bg-gray-50";

  const chartTypeOptions = [
    { value: "profits", label: chartTypes.profits.label },
    { value: "sales", label: chartTypes.sales.label },
  ];

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
            chartView === "bar" ? `${controlBg} ${controlText} shadow-sm` : controlInactive
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
            chartView === "line" ? `${controlBg} ${controlText} shadow-sm` : controlInactive
          }`}
        >
          <LineChart className="h-4 w-4" />
        </button>
      </div>

      {/* Chart Type Selector */}
      {chartTypeOptions.length === 1 ? (
        <div
          className={`w-[200px] flex items-center justify-between ${controlBg} ${controlBorder} ${controlText} px-3 py-2 rounded-md border`}
        >
          <span className="text-sm font-medium">
            {chartTypeOptions[0]?.label ?? ""}
          </span>
        </div>
      ) : (
        // Chart Type Selector - Popover Command
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={`w-[200px] justify-between ${controlBg} ${controlBorder} ${controlText} hover:bg-opacity-80`}
            >
              {chartTypeOptions.find((option) => option.value === chartType)?.label || "Select chart type..."}
              <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandList>
                <CommandEmpty>No chart type found.</CommandEmpty>
                <CommandGroup>
                  {chartTypeOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        setChartType(currentValue as "profits" | "clients" | "sales");
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

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
                ? `${controlBg} ${controlText} shadow-sm`
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
