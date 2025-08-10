import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { Calendar, X } from "lucide-react";
import { DateRange } from "../../../types";

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = React.memo(({
  dateRange,
  onDateRangeChange,
}) => {
  const { t } = useTranslation();
  const [showCustomRange, setShowCustomRange] = useState(false);

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
    setShowCustomRange(false);
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
    setShowCustomRange(false);
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

  // Check if custom range is active (when dates don't match any preset)
  const isCustomRangeActive = () => {
    if (!hasActiveFilters) return false;
    return !presetRanges.some(preset => isPresetActive(preset));
  };

  return (
    <div className="flex items-center gap-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presetRanges.map((preset, index) => {
          const isActive = isPresetActive(preset);
          return (
            <Button
              key={index}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className={`text-xs transition-all duration-200 relative ${
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-105" 
                  : "hover:bg-accent hover:text-accent-foreground hover:scale-102"
              }`}
            >
              {preset.label}
              {isActive && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Custom date range toggle */}
      <Button
        variant={isCustomRangeActive() ? "default" : (showCustomRange ? "default" : "outline")}
        size="sm"
        onClick={() => setShowCustomRange(!showCustomRange)}
        className={`flex items-center gap-2 transition-all duration-200 relative ${
          isCustomRangeActive() 
            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 scale-105" 
            : showCustomRange 
              ? "bg-secondary text-secondary-foreground" 
              : "hover:bg-accent hover:text-foreground"
        }`}
      >
        <Calendar className="h-4 w-4" />
        {t("history.customRange", "Custom Range")}
        {isCustomRangeActive() && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
        )}
      </Button>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          {t("common.clear", "Clear")}
        </Button>
      )}

      {/* Custom date inputs */}
      {showCustomRange && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("history.from", "From")}:
            </span>
            <Input
              type="date"
              value={formatDate(dateRange.startDate)}
              onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("history.to", "To")}:
            </span>
            <Input
              type="date"
              value={formatDate(dateRange.endDate)}
              onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
              className="w-40"
            />
          </div>
        </div>
      )}

      {/* Active filter display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-md text-sm text-primary">
          <span className="font-medium">{t("history.activeFilter", "Active filter")}:</span>
          {dateRange.startDate && (
            <span>
              {t("history.from", "From")} {dateRange.startDate.toLocaleDateString()}
            </span>
          )}
          {dateRange.endDate && (
            <span>
              {dateRange.startDate ? " - " : ""}
              {t("history.to", "To")} {dateRange.endDate.toLocaleDateString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
});
