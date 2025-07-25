import React, { useState } from "react";
import {
  Receipt,
  User,
  Package,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import SalesDetailsModal from "./salesDetailsModal";

type SaleWithDetails = Awaited<
  ReturnType<typeof window.api.database.sales.getAll>
>[0];

interface SalesTableProps {
  sales: SaleWithDetails[];
}

const SalesTable: React.FC<SalesTableProps> = ({ sales }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  // Remove expandedRows and toggleExpanded
  const [selectedSale, setSelectedSale] = useState<SaleWithDetails | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DA`;
  };

  const getPaymentStatusColor = (sale: SaleWithDetails) => {
    if (sale.isPaidInCash) {
      return "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30";
    } else if (sale.payments.some((p) => p.paidAt != null)) {
      return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30";
    } else {
      return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
    }
  };

  const getPaymentStatusText = (sale: SaleWithDetails) => {
    if (sale.isPaidInCash) {
      return t("history.paidCash", "Paid (Cash)");
    } else if (sale.payments.some((p) => p.paidAt != null)) {
      return t("history.paid", "Paid");
    } else {
      return t("history.unpaid", "Unpaid");
    }
  };

  const getPaymentStatusIcon = (sale: SaleWithDetails) => {
    if (sale.isPaidInCash) {
      return <DollarSign className="w-4 h-4 text-emerald-500" />;
    } else if (sale.payments.some((p) => p.paidAt != null)) {
      return <CheckCircle className="w-4 h-4" />;
    } else {
      return <AlertCircle className="w-4 h-4" />;
    }
  };

  if (sales.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Receipt className="w-12 h-12 text-cyan-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("history.emptyTitle", "No sales found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "history.emptyDesc",
            "No sales match your search criteria or there are no sales yet.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table
        className="min-w-full text-sm"
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          direction: isRTL ? "rtl" : "ltr",
          textAlign: isRTL ? "right" : "left",
        }}
      >
        <thead className="bg-muted text-muted-foreground">
          <tr>
            {/* Restore a small spacer column */}
            <th className="px-1 py-3 w-2"></th>
            <th className="px-4 py-3">{t("history.date", "Date")}</th>
            <th className="px-4 py-3">{t("history.client", "Client")}</th>
            <th className="px-4 py-3">{t("history.items", "Items")}</th>
            <th className="px-4 py-3">{t("history.total", "Total")}</th>
            {/* Replace Payment column with Profit */}
            <th className="px-4 py-3">{t("stock.profit", "Profit")}</th>
            <th className="px-4 py-3">{t("history.status", "Status")}</th>
            <th className="px-4 py-3">{t("history.details", "Details")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((sale) => (
            <React.Fragment key={sale.id}>
              {/* Compact Row */}
              <tr className="hover:bg-muted/40 transition">
                {/* Restore small spacer cell */}
                <td className="px-1 py-3 w-2"></td>
                <td className="px-4 py-3 font-medium">
                  {formatDate(sale.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {sale.client?.name || t("history.guestClient", "Guest")}
                    </span>
                  </div>
                  {sale.client?.phone && (
                    <div className="text-xs text-muted-foreground">
                      {sale.client.phone}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{sale.totalItems}</span>
                    <span className="text-muted-foreground">
                      {t("history.itemsCount", "items")}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {formatCurrency(sale.totalWithDiscount)}
                    </div>
                    {sale.discount > 0 && (
                      <div className="text-xs text-muted-foreground line-through">
                        {formatCurrency(sale.totalAmount)}
                      </div>
                    )}
                  </div>
                </td>
                {/* Profit column (green text) */}
                <td className="px-4 py-3">
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(
                      sale.saleItems.reduce((sum, item) => {
                        const bought = item.product?.bought ?? 0;
                        return sum + (item.price - bought) * item.quantity;
                      }, 0)
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`${getPaymentStatusColor(sale).split(" ")[0]}`}
                    >
                      {getPaymentStatusIcon(sale)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(sale)}`}
                    >
                      {getPaymentStatusText(sale)}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button
                    className="flex items-center gap-1 text-primary hover:underline"
                    onClick={() => {
                      setSelectedSale(sale);
                      setModalOpen(true);
                    }}
                    title={t("history.viewDetails", "View Details")}
                  >
                    <Eye className="w-4 h-4" />
                    {t("history.show", "Show")}
                  </button>
                </td>
              </tr>
              {/* Remove expanded details row */}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <SalesDetailsModal
        sale={selectedSale}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};

export default SalesTable;
