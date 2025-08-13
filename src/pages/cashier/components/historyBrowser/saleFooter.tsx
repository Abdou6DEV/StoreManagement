import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBag, Eye, Trash2 } from "lucide-react";
import { SaleFooterProps } from "./types";

const SaleFooter: React.FC<SaleFooterProps> = ({ sale, onDelete }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-orange-600">
        <ShoppingBag className="w-4 h-4" />
        {sale.totalItems} {t("cashier.items", "items")}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-red-600 border border-red-300 text-xs rounded-md bg-red-50 hover:bg-red-100 transition-colors flex items-center gap-1.5"
          title={t("cashier.deleteSale", "Delete Sale")}
        >
          <Trash2 className="w-3 h-3" />
          {t("cashier.delete", "Delete")}
        </button>
        <div className="px-3 py-1.5 text-primary border border-primary/30 text-xs rounded-md bg-primary/5 flex items-center gap-1.5">
          <Eye className="w-3 h-3" />
          {t("cashier.view", "View")}
        </div>
      </div>
    </div>
  );
};

export default SaleFooter;
