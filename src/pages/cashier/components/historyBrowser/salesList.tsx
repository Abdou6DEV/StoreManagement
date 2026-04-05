import React, { type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { SalesListProps } from "./types";
import SaleCard from "./saleCard";

/** Match cashier favorites / frequently-used stagger (see favoritesBrowser + index.css). */
const STAGGER_STEP_MS = 52;

const staggerStyle = (index: number): CSSProperties =>
  ({ "--stagger-delay": `${index * STAGGER_STEP_MS}ms` }) as CSSProperties;

const SalesList: React.FC<SalesListProps> = ({
  sales,
  loading,
  refreshing,
  searchTerm,
  onSaleClick,
  onDeleteSale,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-3 text-center px-3 py-8"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="mb-1 size-12 shrink-0 rounded-full border-[3px] border-yellow-500/20 border-t-yellow-500 animate-spin motion-reduce:animate-none"
          aria-hidden
        />
        <h3 className="text-xl font-semibold text-foreground">
          {t("cashier.historyLoadingTitle", "Loading sales history...")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "cashier.historyLoadingDesc",
            "Please wait while recent sales are loaded.",
          )}
        </p>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div
        className="cashier-browser-stagger-in text-center py-4 text-muted-foreground"
        style={staggerStyle(0)}
      >
        <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
        <div className="text-sm">
          {searchTerm
            ? t("cashier.noMatchingSales", "No matching sales found")
            : t("cashier.noSalesHistory", "No sales history")}
        </div>
        <div className="text-xs">
          {t("cashier.salesWillAppearHere", "Recent sales will appear here")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sales.map((sale, index) => (
        <div
          key={sale.id}
          className="cashier-browser-stagger-in min-h-0"
          style={staggerStyle(index)}
        >
          <SaleCard
            sale={sale}
            index={index}
            refreshing={refreshing}
            onClick={() => onSaleClick(sale)}
            onDelete={(e) => onDeleteSale(sale, e)}
          />
        </div>
      ))}
    </div>
  );
};

export default SalesList;
