import { useTranslation } from "react-i18next";
import { Switch } from "../../../../lib/components/switch";
import type { AggregationLevel } from "../../../../types";

interface GeneralHistoryControlsProps {
  aggregationLevel: AggregationLevel;
  onAggregationLevelChange: (level: AggregationLevel) => void;
  highlightEnabled: boolean;
  onHighlightChange: (enabled: boolean) => void;
}

export default function GeneralHistoryControls({
  aggregationLevel,
  onAggregationLevelChange,
  highlightEnabled,
  onHighlightChange,
}: GeneralHistoryControlsProps) {
  const { t } = useTranslation();

  const options = [
    { value: "day" as const, label: t("history.daily"), icon: "📅" },
    { value: "month" as const, label: t("history.monthly"), icon: "📊" },
    { value: "year" as const, label: t("history.yearly"), icon: "📈" },
  ];

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

          {/* Highlight Toggle */}
          <div className="flex items-center gap-2 text-sm">
            <Switch
              checked={highlightEnabled}
              onCheckedChange={onHighlightChange}
              id="highlight-toggle"
            />
            <label
              htmlFor="highlight-toggle"
              className="font-medium text-foreground cursor-pointer select-none"
            >
              {t("history.highlightProfits", "Highlight Profits")}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
