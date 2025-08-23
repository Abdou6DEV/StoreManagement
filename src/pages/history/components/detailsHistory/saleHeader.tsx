import React from "react";
import { useTranslation } from "react-i18next";
import { Clock, User } from "lucide-react";
import type { SaleForHistory } from "../../../../types";

interface SaleHeaderProps {
  sale: SaleForHistory;
}

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

  // Calculate total amount with discount
  const totalAmount = sale.saleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  ) - sale.discount;

  // Show credit indicator if this is a credit sale (same logic as cashier history)
  const isCreditSale = sale.payment !== null && sale.payment !== undefined;
  
  // Calculate payment status for credit sales
  const getPaymentStatus = () => {
    if (!isCreditSale) return null;
    
    const totalAmount = sale.saleItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    ) - sale.discount;
    
    const paidAmount = sale.payment?.givenAmount || 0;
    const remainingAmount = totalAmount - paidAmount;
    
    // Always show as Credit/Versement if there's a payment record (consistent with cashier history)
    const paymentType = sale.payment?.type === "VERSEMENT" ? "Versement" : "Credit";
    
    if (remainingAmount <= 0) {
      return { type: 'paid', text: `${paymentType} (Paid)` };
    } else {
      return { type: 'partial', text: `${paymentType} (${formatCurrency(remainingAmount)} remaining)` };
    }
  };
  
  const paymentStatus = getPaymentStatus();

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
        {formatCurrency(totalAmount)}
        {paymentStatus && (
          <span className={`text-xs px-2 py-1 rounded ${
            paymentStatus.type === 'paid' 
              ? 'text-green-600 bg-green-100' 
              : 'text-orange-600 bg-orange-100'
          }`}>
            {paymentStatus.text}
          </span>
        )}
      </div>
    </div>
  );
};

export default SaleHeader;
