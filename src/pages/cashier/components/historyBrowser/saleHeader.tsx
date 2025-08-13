import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, User } from "lucide-react";
import { SaleHeaderProps } from "./types";

const SaleHeader: React.FC<SaleHeaderProps> = ({ sale }) => {
  const { t } = useTranslation();

  const formatDate = (date: Date) => {
    const now = new Date();
    const saleDate = new Date(date);
    const diffInHours = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return saleDate.toLocaleDateString();
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {formatDate(sale.createdAt)}
        </div>
        {sale.client && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            {sale.client.name}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 font-semibold text-green-600">
        {formatCurrency(sale.totalAmountWithDiscount)}
      </div>
    </div>
  );
};

export default SaleHeader;
