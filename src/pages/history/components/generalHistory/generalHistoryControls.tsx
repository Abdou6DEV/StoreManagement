import { useTranslation } from "react-i18next";
import { Switch } from "../../../../lib/components/switch";
import { DatePicker } from "../../../../lib/components/datePicker";
import { MonthPicker } from "../../../../lib/components/monthPicker";
import { YearPicker } from "../../../../lib/components/yearPicker";
import type { AggregationLevel } from "../../../../types";

interface GeneralHistoryControlsProps {
  aggregationLevel: AggregationLevel;
  onAggregationLevelChange: (level: AggregationLevel) => void;
  highlightEnabled: boolean;
  onHighlightChange: (enabled: boolean) => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

export default function GeneralHistoryControls({
  aggregationLevel,
  onAggregationLevelChange,
  highlightEnabled,
  onHighlightChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: GeneralHistoryControlsProps) {
  const { t } = useTranslation();

  const options = [
    { value: "day" as const, label: t("history.daily"), icon: "📅" },
    { value: "month" as const, label: t("history.monthly"), icon: "📊" },
    { value: "year" as const, label: t("history.yearly"), icon: "📈" },
  ];

  // Simple date validation
  const isValidDate = (dateString: string): boolean => {
    if (!dateString || typeof dateString !== 'string') return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Format date for display based on aggregation level
  const formatForDisplay = (date: string, level: AggregationLevel): string => {
    if (!date || !isValidDate(date)) return "";
    
    try {
      const dateObj = new Date(date);
      
      switch (level) {
        case "day":
          return date; // Already in YYYY-MM-DD format
        case "month":
          return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        case "year":
          return dateObj.getFullYear().toString();
        default:
          return date;
      }
    } catch (error) {
      console.error("Error formatting date for display:", error);
      return "";
    }
  };

  // Handle date change - pass the date directly to the parent
  const handleDateChange = (newDate: string, isStartDate: boolean) => {
    if (!newDate || typeof newDate !== 'string') return;
    
    // Validate the date format based on aggregation level
    let isValid = false;
    
    try {
      switch (aggregationLevel) {
        case "day":
          isValid = isValidDate(newDate);
          break;
        case "month":
          const monthMatch = newDate.match(/^(\d{4})-(\d{1,2})$/);
          if (monthMatch) {
            const year = parseInt(monthMatch[1]);
            const month = parseInt(monthMatch[2]);
            isValid = year >= 1900 && year <= 2100 && month >= 1 && month <= 12;
          }
          break;
        case "year":
          const yearMatch = newDate.match(/^(\d{4})$/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            isValid = year >= 1900 && year <= 2100;
          }
          break;
      }
      
      if (isValid) {
        if (isStartDate) {
          onStartDateChange(newDate);
        } else {
          onEndDateChange(newDate);
        }
      } else {
        console.warn("Invalid date format:", newDate, "for level:", aggregationLevel);
      }
    } catch (error) {
      console.error("Error handling date change:", error);
    }
  };

  // Render the appropriate picker based on aggregation level
  const renderDatePicker = (isStartDate: boolean) => {
    const value = isStartDate ? startDate : endDate;
    const onChange = (date: string) => handleDateChange(date, isStartDate);
    const placeholder = isStartDate ? t("history.from") : t("history.to");
    const className = "w-40 h-8 text-sm";

    // Format the value for display
    const displayValue = formatForDisplay(value, aggregationLevel);

    switch (aggregationLevel) {
      case "day":
        return (
          <DatePicker
            value={displayValue}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
          />
        );
      case "month":
        return (
          <MonthPicker
            value={displayValue}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
          />
        );
      case "year":
        return (
          <YearPicker
            value={displayValue}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Time Period Filter */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => onAggregationLevelChange(option.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  aggregationLevel === option.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <span className="text-base">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>

          {/* Date Range Selectors */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                {t("history.from")}:
              </label>
              {renderDatePicker(true)}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-foreground whitespace-nowrap">
                {t("history.to")}:
              </label>
              {renderDatePicker(false)}
            </div>
          </div>

          {/* Highlight Toggle */}
          <div className="flex items-center gap-2 text-sm rtl:flex-row-reverse">
            <Switch
              checked={highlightEnabled}
              onCheckedChange={onHighlightChange}
              id="highlight-toggle"
            />
            <label
              htmlFor="highlight-toggle"
              className="font-medium text-foreground cursor-pointer select-none"
            >
              {t("history.highlightProfits")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
