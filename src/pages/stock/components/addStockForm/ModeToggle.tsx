import React from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { SegmentedToggle } from "../../../../lib/components/segmentedToggle";
import { Tooltip } from "../../../../lib/components/tooltip";

interface ModeToggleProps {
  isMultiMode: boolean;
  setIsMultiMode: (checked: boolean) => void;
  onModeChange: () => void;
  /** When true, skip outer card chrome (used inside a shared toggle group). */
  bare?: boolean;
  /** Disable switching when pending products would be lost. */
  disabled?: boolean;
}

export default function ModeToggle({
  isMultiMode,
  setIsMultiMode,
  onModeChange,
  bare = false,
  disabled = false,
}: ModeToggleProps) {
  const { t } = useTranslation();

  const selectMode = (multi: boolean) => {
    if (disabled || multi === isMultiMode) return;
    setIsMultiMode(multi);
    onModeChange();
  };

  const segment = (
    <SegmentedToggle
      aria-label={t("stock.multiProductMode", "Multiple Products Mode")}
      accent="green"
      disabled={disabled}
      value={isMultiMode ? "multi" : "single"}
      onChange={(v) => selectMode(v === "multi")}
      options={[
        { value: "single", label: t("stock.singleMode", "Single") },
        { value: "multi", label: t("stock.multiMode", "Multiple") },
      ]}
    />
  );

  return (
    <div
      className={
        bare
          ? "flex items-center justify-between gap-4 px-4 py-3"
          : "flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4"
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <h3 className="text-sm font-medium">
            {isMultiMode
              ? t("stock.multiProductMode", "Multiple Products Mode")
              : t("stock.singleProductMode", "Single Product Mode")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMultiMode
              ? t(
                  "stock.multiModeDesc",
                  "Add products to a list, then finish the purchase",
                )
              : t(
                  "stock.singleModeDesc",
                  "Add or update one product at a time",
                )}
          </p>
        </div>
      </div>

      {disabled ? (
        <Tooltip
          content={t(
            "stock.modeSwitchLockedPending",
            "Finish or clear the pending products before switching mode",
          )}
        >
          <span className="inline-flex">{segment}</span>
        </Tooltip>
      ) : (
        segment
      )}
    </div>
  );
}
