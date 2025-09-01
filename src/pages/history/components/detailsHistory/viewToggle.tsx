import React from "react";
import { useTranslation } from "react-i18next";
import { Grid3X3, List } from "lucide-react";
import { Tooltip } from "../../../../lib/components/tooltip";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 bg-muted/20 rounded-lg p-1">
      <Tooltip content={t("history.tooltips.gridView")}>
        <button
          onClick={() => onViewModeChange("grid")}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "grid"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden sm:inline">{t("history.grid", "Grid")}</span>
        </button>
      </Tooltip>
      <Tooltip content={t("history.tooltips.listView")}>
        <button
          onClick={() => onViewModeChange("list")}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === "list"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">{t("history.list", "List")}</span>
        </button>
      </Tooltip>
    </div>
  );
};

export default ViewToggle;
