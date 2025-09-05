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
    const saleDate = new Date(date);
    const now = new Date();

    // Check if it's today
    const isToday = saleDate.toDateString() === now.toDateString();

    const hours = saleDate.getHours().toString().padStart(2, "0");
    const minutes = saleDate.getMinutes().toString().padStart(2, "0");

    if (isToday) {
      return `${t("today")} - ${hours}:${minutes}`;
    } else {
      // Format: DD/MM/YYYY - HH:MM
      const day = saleDate.getDate().toString().padStart(2, "0");
      const month = (saleDate.getMonth() + 1).toString().padStart(2, "0");
      const year = saleDate.getFullYear();

      return `${day}/${month}/${year} - ${hours}:${minutes}`;
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency")}`;
  };

  const totalAmountWithDiscount =
    sale.saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) -
    sale.discount;

  // Calculate profit using the same logic as InfoProductModal
  const saleProfit = (() => {
    const revenue =
      sale.saleItems.reduce(
        (itemSum, item) => itemSum + item.price * item.quantity,
        0
      ) - sale.discount;
    const cost = sale.saleItems.reduce((itemSum, item) => {
      if (item.product && "boughtPrice" in item.product) {
        // Use stored bought price if available, otherwise use current product bought price
        const boughtPrice =
          (item as { boughtPrice?: number }).boughtPrice ||
          (item.product as { boughtPrice: number }).boughtPrice;
        return itemSum + boughtPrice * item.quantity;
      }
      if (item.manualProduct && "costPrice" in item.manualProduct) {
        // For manual products, use actual cost price
        return (
          itemSum +
          (item.manualProduct as { costPrice: number }).costPrice *
            item.quantity
        );
      }
      if (item.service && "costPrice" in item.service) {
        // For services, use actual cost price
        return (
          itemSum +
          (item.service as { costPrice: number }).costPrice * item.quantity
        );
      }
      // Fallback: if no cost price is available, assume 70% profit margin
      return itemSum + item.price * item.quantity * 0.3;
    }, 0);
    return revenue - cost;
  })();

  // Get payment status badge
  const getPaymentStatusBadge = () => {
    if (!sale.payment) return null;

    if (sale.payment.type === "CREDIT") {
      if (sale.payment.paidDate) {
        return (
          <span className="text-xs px-2 py-1 rounded-full font-medium text-green-700 bg-green-100 border border-green-200">
            Credit (Paid)
          </span>
        );
      } else {
        return (
          <span className="text-xs px-2 py-1 rounded-full font-medium text-orange-700 bg-orange-100 border border-orange-200">
            Credit (Unpaid)
          </span>
        );
      }
    }

    if (sale.payment.type === "VERSEMENT") {
      if (sale.payment.paidDate) {
        return (
          <span className="text-xs px-2 py-1 rounded-full font-medium text-green-700 bg-green-100 border border-green-200">
            Versement (Paid)
          </span>
        );
      } else {
        return (
          <span className="text-xs px-2 py-1 rounded-full font-medium text-orange-700 bg-orange-100 border border-orange-200">
            Versement (Unpaid)
          </span>
        );
      }
    }

    return null;
  };

  const paymentStatusBadge = getPaymentStatusBadge();

  return (
    <div className="flex items-center justify-between mb-2">
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
        {paymentStatusBadge}
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="text-lg font-bold text-foreground">
          {formatCurrency(totalAmountWithDiscount)}
        </div>
        <div className="text-sm font-bold text-green-600">
          {formatCurrency(saleProfit)}
        </div>
      </div>
    </div>
  );
};

export default SaleHeader;
