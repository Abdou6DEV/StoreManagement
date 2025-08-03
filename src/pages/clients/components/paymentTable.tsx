import React from "react";
import { useTranslation } from "react-i18next";
import type { PaymentWithClient } from "../../../types";
import PaymentRow from "./paymentRow";

interface PaymentTableProps {
  payments: PaymentWithClient[];
  type: "CREDIT" | "VERSEMENT";
  editingPayment: string | null;
  editAmount: number;
  setEditingPayment: (paymentId: string | null) => void;
  setEditAmount: (amount: number) => void;
  handleUpdateAmount: (paymentId: string) => void;
  onMarkAsPaid: (paymentId: string) => void;
  onMarkAsUnpaidConfirm: (paymentId: string) => void;
  isOverdue: (dueDate: Date) => boolean;
  isDueSoon: (dueDate: Date) => boolean;
}

const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  type,
  editingPayment,
  editAmount,
  setEditingPayment,
  setEditAmount,
  handleUpdateAmount,
  onMarkAsPaid,
  onMarkAsUnpaidConfirm,
  isOverdue,
  isDueSoon,
}) => {
  const { t } = useTranslation();

  return (
    <div className="overflow-auto rounded-lg border border-muted">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-3">{t("clients.clientName", "Client")}</th>
            <th className="px-4 py-3">
              {t("clients.paymentAmount", "Amount")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentDueDate", "Due Date")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentPaidDate", "Paid Date")}
            </th>
            <th className="px-4 py-3">
              {t("clients.paymentCreatedAt", "Created At")}
            </th>
            <th className="px-4 py-3">{t("clients.actions", "Actions")}</th>
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
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTable;
