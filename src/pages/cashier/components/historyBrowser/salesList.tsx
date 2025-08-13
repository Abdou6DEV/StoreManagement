import React from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { SalesListProps } from "./types";
import SaleCard from "./saleCard";

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
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground text-sm">
          {t("cashier.loading", "Loading...")}
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
        <div className="text-sm">
          {searchTerm
            ? t("cashier.noMatchingSales", "No matching sales found")
            : t("cashier.noSalesHistory", "No sales history")}
        </div>
        <div className="text-xs">
          {t(
            "cashier.salesWillAppearHere",
            "Recent sales will appear here",
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sales.map((sale, index) => (
        <SaleCard
          key={sale.id}
          sale={sale}
          index={index}
          refreshing={refreshing}
          onClick={() => onSaleClick(sale)}
          onDelete={(e) => onDeleteSale(sale, e)}
        />
      ))}
    </div>
  );
};

export default SalesList;
