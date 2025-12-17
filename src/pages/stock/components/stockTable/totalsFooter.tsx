import { useTranslation } from "react-i18next";
import { Package, TrendingUp, CreditCard, BarChart2 } from "lucide-react";
import type { TotalsFooterProps } from "./types";

export const TotalsFooter = ({ filteredList }: TotalsFooterProps) => {
  const { t } = useTranslation();

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-10 text-sm">
      {/* Total Products */}
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("stock.totalProducts")}:
        </span>
        <span className="font-medium text-[0.9375rem]">{filteredList.length}</span>
      </div>

      {/* Total Quantity */}
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("stock.totalQuantity")}:
        </span>
        <span className="font-medium text-[0.9375rem]">
          {filteredList.reduce((sum, p) => sum + p.quantity, 0).toLocaleString('fr-FR')}
        </span>
      </div>

      {/* Stock Cost */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("stock.stockCost")}:
        </span>
        <span className="font-medium text-[0.9375rem]">
          {filteredList
            .reduce((sum, p) => sum + p.boughtPrice * p.quantity, 0)
            .toLocaleString('fr-FR')}{" "}
          {t("cashier.currency")}
        </span>
      </div>

      {/* Stock Value */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("stock.stockValue")}:
        </span>
        <span className="font-medium text-[0.9375rem]">
          {filteredList
            .reduce((sum, p) => sum + p.sellingPrice * p.quantity, 0)
            .toLocaleString('fr-FR')}{" "}
          {t("cashier.currency")}
        </span>
      </div>

      {/* Profit Potential */}
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className="text-muted-foreground">
          {t("stock.profitPotential")}:
        </span>
        <span className="font-medium text-[0.9375rem] text-green-600 dark:text-green-400">
          {filteredList
            .reduce(
              (sum, p) => sum + (p.sellingPrice - p.boughtPrice) * p.quantity,
              0,
            )
            .toLocaleString('fr-FR')}{" "}
          {t("cashier.currency")}
        </span>
      </div>
    </div>
  );
};
