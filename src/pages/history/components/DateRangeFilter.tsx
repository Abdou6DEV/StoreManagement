import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { Calendar, ChevronDown, X, Loader2 } from "lucide-react";
import { DateRange } from "../../../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  isLoading?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = React.memo(({
  dateRange,
  onDateRangeChange,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const presetRanges = [
    {
      label: t("history.today", "Today"),
      getRange: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { startDate: today, endDate: tomorrow };
      },
    },
    {
      label: t("history.yesterday", "Yesterday"),
      getRange: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return { startDate: yesterday, endDate: today };
      },
    },
    {
      label: t("history.last7Days", "Last 7 Days"),
      getRange: () => {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
      },
    },
    {
      label: t("history.last30Days", "Last 30 Days"),
      getRange: () => {
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        return { startDate, endDate };
      },
    },
    {
      label: t("history.thisMonth", "This Month"),
      getRange: () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        return { startDate, endDate };
      },
    },
    {
      label: t("history.lastMonth", "Last Month"),
      getRange: () => {
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { startDate, endDate };
      },
    },
  ];

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const range = preset.getRange();
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleCustomDateChange = (field: "startDate" | "endDate", value: string) => {
    const date = value ? new Date(value) : null;
    onDateRangeChange({
      ...dateRange,
      [field]: date,
    });
  };

  const clearFilters = () => {
    onDateRangeChange({ startDate: null, endDate: null });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  const hasActiveFilters = dateRange.startDate || dateRange.endDate;

  // Check if a preset range is currently active
  const isPresetActive = (preset: typeof presetRanges[0]) => {
    const presetRange = preset.getRange();
    const startMatch = dateRange.startDate?.getTime() === presetRange.startDate?.getTime();
    const endMatch = dateRange.endDate?.getTime() === presetRange.endDate?.getTime();
    return startMatch && endMatch;
  };

  // Get current filter display text
  const getCurrentFilterText = () => {
    if (!hasActiveFilters) return t("history.selectDateRange", "Select date range");
    
    const activePreset = presetRanges.find(preset => isPresetActive(preset));
    if (activePreset) return activePreset.label;
    
    let text = "";
    if (dateRange.startDate) {
      text += dateRange.startDate.toLocaleDateString();
    }
    if (dateRange.endDate) {
      text += dateRange.startDate ? " - " : "";
      text += dateRange.endDate.toLocaleDateString();
    }
    return text || t("history.customRange", "Custom Range");
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[200px] justify-between"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="truncate">{getCurrentFilterText()}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
            {isLoading && <Loader2 className="h-4 w-4 ml-2" />}
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-80 p-4" align="start">
          <div className="space-y-4">
            {/* Preset ranges */}
            <div>
              <h4 className="font-medium text-sm mb-3">{t("history.quickSelect", "Quick Select")}</h4>
              <div className="grid grid-cols-2 gap-2">
                {presetRanges.map((preset, index) => {
                  const isActive = isPresetActive(preset);
                  return (
                    <Button
                      key={index}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePresetClick(preset)}
                      className={`text-xs ${isActive ? "bg-primary" : ""}`}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Custom range */}
            <div>
              <h4 className="font-medium text-sm mb-3">{t("history.customRange", "Custom Range")}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t("history.from", "From")}</label>
                  <Input
                    type="date"
                    value={formatDate(dateRange.startDate)}
                    onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">{t("history.to", "To")}</label>
                  <Input
                    type="date"
                    value={formatDate(dateRange.endDate)}
                    onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                {t("common.clear", "Clear")}
              </Button>
              <Button
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-xs"
              >
                {t("common.done", "Done")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
});
