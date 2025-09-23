import { useTranslation } from "react-i18next";
import { useTheme } from "../../../../lib/hooks/useTheme";
import { ChartControlsProps } from "./types";
import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../../../lib/components/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../../lib/components/command";

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
    { value: "clients", label: chartTypes.clients.label },
    { value: "sales", label: chartTypes.sales.label },
  ];

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      {/* Chart Type Selector - Popover Command */}
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
            <CommandInput placeholder="Search chart type..." />
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
              ? t("dashboard.last30Days")
              : key === "12m"
                ? t("dashboard.12M")
                : t("dashboard.years")}
          </button>
        ))}
      </div>
    </div>
  );
}
