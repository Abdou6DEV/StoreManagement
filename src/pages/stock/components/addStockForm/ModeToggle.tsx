import React from "react";
import { useTranslation } from "react-i18next";
import { Package } from "lucide-react";
import { Switch } from "../../../../lib/components/switch";

interface ModeToggleProps {
  isMultiMode: boolean;
  setIsMultiMode: (checked: boolean) => void;
  onModeChange: () => void;
}

export default function ModeToggle({
  isMultiMode,
  setIsMultiMode,
  onModeChange,
}: ModeToggleProps) {
  const { t } = useTranslation();

  const handleModeChange = (checked: boolean) => {
    setIsMultiMode(checked);
    onModeChange();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-3">
        <Package className="w-5 h-5 text-muted-foreground" />
        <div>
          <h3 className="font-medium text-sm">
            {isMultiMode
              ? t("stock.multiProductMode", "Multiple Products Mode")
              : t("stock.singleProductMode", "Single Product Mode")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMultiMode
              ? t(
                  "stock.multiModeDesc",
                  "Add products to a list, then finish the purchase"
                )
              : t(
                  "stock.singleModeDesc",
                  "Add or update one product at a time"
                )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {t("stock.singleMode", "Single")}
        </span>
        <Switch checked={isMultiMode} onCheckedChange={handleModeChange} />
        <span className="text-sm text-muted-foreground">
          {t("stock.multiMode", "Multiple")}
        </span>
      </div>
    </div>
  );
}
