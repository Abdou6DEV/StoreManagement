import { useTranslation } from "react-i18next";
import { Package, ListTree } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { Tooltip } from "../../../../lib/components/tooltip";
import type { TableHeaderProps } from "./types";

export const TableHeader = ({
  viewMode,
  onViewModeChange,
}: TableHeaderProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between border-b border-border pb-3">
      <div className="flex items-center gap-3">
        <Package className="w-7 h-7 text-green-600" />
        <h1 className="text-2xl font-bold">
          {viewMode === "product"
            ? t("stock.tableTitle", "Stock Management")
            : t("stock.categoryTableTitle", "Stock by Category")}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Tooltip
          content={
            viewMode === "product"
              ? t("stock.viewByCategoryTooltip", "View stock by categories")
              : t(
                  "stock.viewByProductTooltip",
                  "View stock by individual products",
                )
          }
        >
          <Button
            variant="outline"
            onClick={onViewModeChange}
            className="gap-2"
          >
            {viewMode === "product" ? (
              <>
                <Package className="w-4 h-4" />
                {t("stock.viewByCategory", "Categories")}
              </>
            ) : (
              <>
                <ListTree className="w-4 h-4" />
                {t("stock.viewByProduct", "Products")}
              </>
            )}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
