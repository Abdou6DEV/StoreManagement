import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, User } from "lucide-react";
import { SaleHeaderProps } from "./types";

const SaleHeader: React.FC<SaleHeaderProps> = ({ sale }) => {
  const { t } = useTranslation();

  const formatDate = (date: Date) => {
    const saleDate = new Date(date);
    const now = new Date();
    
    // Check if it's today
    const isToday = saleDate.toDateString() === now.toDateString();
    
    const hours = saleDate.getHours().toString().padStart(2, '0');
    const minutes = saleDate.getMinutes().toString().padStart(2, '0');
    
    if (isToday) {
      return `${t("today")} - ${hours}:${minutes}`;
    } else {
      // Format: DD/MM/YYYY - HH:MM
      const day = saleDate.getDate().toString().padStart(2, '0');
      const month = (saleDate.getMonth() + 1).toString().padStart(2, '0');
      const year = saleDate.getFullYear();
      
      return `${day}/${month}/${year} - ${hours}:${minutes}`;
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
