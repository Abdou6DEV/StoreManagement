import { useTranslation } from "react-i18next";
import type { AggregationLevel } from "../../../../types";

interface GeneralHistoryControlsProps {
  aggregationLevel: AggregationLevel;
  onAggregationLevelChange: (level: AggregationLevel) => void;
}

export default function GeneralHistoryControls({
  aggregationLevel,
  onAggregationLevelChange,
}: GeneralHistoryControlsProps) {
  const { t } = useTranslation();

  const options = [
    { value: "day" as const, label: t("history.daily"), icon: "📅" },
    { value: "month" as const, label: t("history.monthly"), icon: "📊" },
    { value: "year" as const, label: t("history.yearly"), icon: "📈" },
  ];

  return (
    <div className="bg-gradient-to-r from-primary/3 to-primary/6 border border-primary/15 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-foreground/80 uppercase tracking-wide">
            {t("history.aggregationLevel")}
          </label>
          <p className="text-xs text-muted-foreground">
            Select how you want to group your data
          </p>
        </div>
        <div className="flex items-center gap-2 bg-background/80 rounded-xl p-1 border border-primary/15">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => onAggregationLevelChange(option.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                aggregationLevel === option.value
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span className="text-base">{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
