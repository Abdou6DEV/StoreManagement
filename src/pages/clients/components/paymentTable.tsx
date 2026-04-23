import React from "react";
import { useTranslation } from "react-i18next";
import type { PaymentWithClient } from "../../../types";
import PaymentRow from "./paymentRow";

interface PaymentTableProps {
  payments: PaymentWithClient[];
  allPayments: PaymentWithClient[]; // Complete dataset for totals
  type: "CREDIT" | "VERSEMENT";
  editingPayment: string | null;
  editAmount: number;
  setEditingPayment: (paymentId: string | null) => void;
  setEditAmount: (amount: number) => void;
  handleUpdateAmount: (paymentId: string) => void;
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaidConfirm: (paymentId: string) => void;
  onViewSaleDetails?: (saleId: string) => void;
  onViewVersementDetails?: (paymentId: string) => void;
  onRefreshPayments?: () => void;
  onClientsRefresh?: () => void;
  onCancelVersement?: (paymentId: string) => void;
  isOverdue: (dueDate: Date) => boolean;
  isDueSoon: (dueDate: Date) => boolean;
  newlyOverdueIds?: Set<string>; // IDs of newly overdue payments to highlight
  newlyDueSoonIds?: Set<string>; // IDs of newly due soon payments to highlight
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  allPayments,
  editingPayment,
  editAmount,
  setEditingPayment,
  setEditAmount,
  handleUpdateAmount,
  onMarkAsPaid,
  onMarkAsUnpaidConfirm,
  onViewSaleDetails,
  onViewVersementDetails,
  onRefreshPayments,
  onClientsRefresh,
  onCancelVersement,
  isOverdue,
  isDueSoon,
  newlyOverdueIds = new Set(),
  newlyDueSoonIds = new Set(),
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.clientName", "Client")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.creditReason", "Reason")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.paymentAmount", "Amount")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.paymentDueDate", "Due Date")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.paymentPaidDate", "Paid Date")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.paymentCreatedAt", "Created At")}
            </th>
            <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
              {t("clients.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {payments.map((payment) => (
            <PaymentRow
              key={payment.id}
              payment={payment}
              editingPayment={editingPayment}
              editAmount={editAmount}
              setEditingPayment={setEditingPayment}
              setEditAmount={setEditAmount}
              handleUpdateAmount={handleUpdateAmount}
              onMarkAsPaid={onMarkAsPaid}
              onMarkAsUnpaidConfirm={onMarkAsUnpaidConfirm}
              onViewSaleDetails={onViewSaleDetails}
              onViewVersementDetails={onViewVersementDetails}
              onRefreshPayments={onRefreshPayments}
              onClientsRefresh={onClientsRefresh}
              onCancelVersement={onCancelVersement}
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
              isNewlyOverdue={newlyOverdueIds.has(payment.id)}
              isNewlyDueSoon={newlyDueSoonIds.has(payment.id)}
            />
          ))}
        </tbody>
      </table>
      
      {/* Totals Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-10 text-sm border-t border-muted pt-4">
        {/* Total Payments */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("clients.totalPayments", "Total Payments")}:
          </span>
          <span className="font-medium text-[0.9375rem]">{allPayments.length}</span>
        </div>

        {/* Total Amount */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("clients.totalAmount", "Total Amount")}:
          </span>
          <span className="font-medium text-[0.9375rem]">
            {allPayments
              .reduce((sum, p) => {
                if (p.type === "CREDIT" && p.remainingAmount !== undefined) {
                  return sum + p.remainingAmount;
                }
                return sum + p.givenAmount;
              }, 0)
              .toLocaleString('fr-FR')}{" "}
            {t("cashier.currency", "DA")}
          </span>
        </div>

        {/* Paid Amount */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("clients.paidAmount", "Paid Amount")}:
          </span>
          <span className="font-medium text-[0.9375rem] text-green-600 dark:text-green-400">
            {allPayments
              .filter(p => p.paidDate)
              .reduce((sum, p) => {
                if (p.type === "CREDIT" && p.remainingAmount !== undefined) {
                  return sum + p.remainingAmount;
                }
                return sum + p.givenAmount;
              }, 0)
              .toLocaleString('fr-FR')}{" "}
            {t("cashier.currency", "DA")}
          </span>
        </div>

        {/* Outstanding Amount */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("clients.outstandingAmount", "Outstanding")}:
          </span>
          <span className="font-medium text-[0.9375rem] text-orange-600 dark:text-orange-400">
            {allPayments
              .filter(p => !p.paidDate)
              .reduce((sum, p) => {
                if (p.type === "CREDIT" && p.remainingAmount !== undefined) {
                  return sum + p.remainingAmount;
                }
                return sum + p.givenAmount;
              }, 0)
              .toLocaleString('fr-FR')}{" "}
            {t("cashier.currency", "DA")}
          </span>
        </div>

        {/* Overdue Amount */}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {t("clients.overdueAmount", "Overdue")}:
          </span>
          <span className="font-medium text-[0.9375rem] text-red-600 dark:text-red-400">
            {allPayments
              .filter(p => !p.paidDate && isOverdue(new Date(p.dueDate)))
              .reduce((sum, p) => {
                if (p.type === "CREDIT" && p.remainingAmount !== undefined) {
                  return sum + p.remainingAmount;
                }
                return sum + p.givenAmount;
              }, 0)
              .toLocaleString('fr-FR')}{" "}
            {t("cashier.currency", "DA")}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentTable;
