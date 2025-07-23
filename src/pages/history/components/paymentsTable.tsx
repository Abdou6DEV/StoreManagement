import React from "react";
import { CreditCard, CheckCircle, Clock, User, Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentWithDetails {
  id: string;
  saleId: string;
  clientId: string;
  paidAmount: number;
  dueAt: string;
  paidAt?: string;
  createdAt: string;
  type: "CREDIT" | "VERSEMENT";
  client: { name: string; phone?: string };
  sale: { id: string };
}

interface PaymentsTableProps {
  payments: PaymentWithDetails[];
}

const PaymentsTable: React.FC<PaymentsTableProps> = ({ payments }) => {
  const { t } = useTranslation();

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "-";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} DA`;
  };

  const getStatus = (payment: PaymentWithDetails) => {
    if (payment.paidAt) {
      return {
        text: t("history.paid", "Paid"),
        color: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30",
        icon: <CheckCircle className="w-4 h-4" />,
      };
    } else {
      return {
        text: t("history.pending", "Pending"),
        color: "text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30",
        icon: <Clock className="w-4 h-4" />,
      };
    }
  };

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <CreditCard className="w-12 h-12 text-cyan-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("history.noPayments", "No payments found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "history.noPaymentsDesc",
            "No payments match your search criteria or there are no payments yet."
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("history.date", "Date")}</th>
            <th className="px-4 py-3">{t("history.amount", "Amount")}</th>
            <th className="px-4 py-3">{t("history.method", "Method")}</th>
            <th className="px-4 py-3">{t("history.status", "Status")}</th>
            <th className="px-4 py-3">{t("history.client", "Client")}</th>
            <th className="px-4 py-3">{t("history.saleId", "Sale ID")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((payment) => {
            const status = getStatus(payment);
            return (
              <tr key={payment.saleId + payment.clientId + payment.createdAt} className="hover:bg-muted/40 transition">
                <td className="px-4 py-3 font-medium">{formatDate(payment.createdAt)}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(payment.paidAmount)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${payment.type === "CREDIT"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                    : "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400"
                    }`}>
                    <CreditCard className="w-3 h-3 inline mr-1" />
                    {payment.type === "CREDIT"
                      ? t("history.credit", "Credit")
                      : t("history.installment", "Installment")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={status.color.split(" ")[0]}>{status.icon}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>{status.text}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{payment.client?.name || t("history.guestClient", "Guest")}</span>
                  </div>
                  {payment.client?.phone && (
                    <div className="text-xs text-muted-foreground">{payment.client.phone}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{payment.sale?.id || payment.saleId}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentsTable; 