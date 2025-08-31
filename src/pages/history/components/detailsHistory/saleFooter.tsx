import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBag, Eye } from "lucide-react";
import type { SaleForHistory } from "../../../../types";

interface SaleFooterProps {
  sale: SaleForHistory;
  onView: (sale: SaleForHistory) => void;
}

const SaleFooter: React.FC<SaleFooterProps> = ({ sale, onView }) => {
  const { t } = useTranslation();

  const totalItems = sale.saleItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-orange-600">
        <ShoppingBag className="w-4 h-4" />
        {totalItems} {t("cashier.items", "items")}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onView(sale);
          }}
          className="px-3 py-1.5 text-primary border border-primary/30 text-xs rounded-md bg-primary/5 hover:bg-primary/10 transition-colors flex items-center gap-1.5"
        >
          <Eye className="w-3 h-3" />
          {t("cashier.view", "View")}
        </button>
      </div>
    </div>
  );
};

export default SaleFooter;
