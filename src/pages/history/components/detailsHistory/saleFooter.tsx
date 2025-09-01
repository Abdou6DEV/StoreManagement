import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBag, Eye, Trash2 } from "lucide-react";
import { Tooltip } from "../../../../lib/components/tooltip";
import type { SaleForHistory } from "../../../../types";

interface SaleFooterProps {
  sale: SaleForHistory;
  onView: (sale: SaleForHistory) => void;
  onDelete: (sale: SaleForHistory) => void;
}

const SaleFooter: React.FC<SaleFooterProps> = ({ sale, onView, onDelete }) => {
  const { t } = useTranslation();

  const totalItems = sale.saleItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-orange-600">
        <ShoppingBag className="w-4 h-4" />
        {totalItems} {t("cashier.items", "items")}
      </div>
      <div className="flex items-center gap-2">
        <Tooltip content={t("history.tooltips.deleteSale")}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(sale);
            }}
            className="px-3 py-1.5 text-red-600 border border-red-300 text-xs rounded-md bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            {t("cashier.delete", "Delete")}
          </button>
        </Tooltip>
        <Tooltip content={t("history.tooltips.viewSale")}>
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
        </Tooltip>
      </div>
    </div>
  );
};

export default SaleFooter;
