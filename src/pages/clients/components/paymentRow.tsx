import React from "react";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { User, Calendar, Edit, Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentWithClient } from "../../../types";
import PaymentStatus from "./paymentStatus";
import PaymentActions from "./paymentActions";
import { Tooltip } from "../../../lib/components/tooltip";

interface PaymentRowProps {
  payment: PaymentWithClient;
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

const PaymentRow: React.FC<PaymentRowProps> = ({
  payment,
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
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  return (
    <tr className="hover:bg-muted/40 transition">
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{payment.client.name}</div>
            {payment.client.phone && (
              <div className="text-xs text-muted-foreground">
                {payment.client.phone}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-2">
        {editingPayment === payment.id ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={editAmount}
              onChange={(e) => setEditAmount(Number(e.target.value))}
              className="w-20 h-8 text-sm"
              autoFocus
            />
            <Button
              size="sm"
              onClick={() => handleUpdateAmount(payment.id)}
              className="h-8 px-2"
            >
              <Save className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditingPayment(null)}
              className="h-8 px-2"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {payment.givenAmount.toLocaleString()}{" "}
              {t("cashier.currency", "DA")}
            </span>
            {!payment.paidDate && (
              <Tooltip content={t("clients.editAmountTooltip", "Edit payment amount")}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingPayment(payment.id);
                  setEditAmount(payment.givenAmount);
                }}
                className="h-6 px-1"
              >
                <Edit className="w-3 h-3" />
              </Button>
              </Tooltip>
            )}
          </div>
        )}
      </td>
      <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {payment.dueDate
            ? new Date(payment.dueDate).toLocaleDateString()
            : "-"}
          {isOverdue(payment.dueDate) && (
            <span className="text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded-full">
              {t("clients.overdue", "Overdue")}
            </span>
          )}
          {isDueSoon(payment.dueDate) && !isOverdue(payment.dueDate) && (
            <span className="text-orange-600 text-xs font-medium bg-orange-100 px-2 py-1 rounded-full">
              {t("clients.dueSoon", "Due Soon")}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2">
        <PaymentStatus
          paidDate={payment.paidDate}
          dueDate={payment.dueDate}
          isOverdue={isOverdue(payment.dueDate)}
          isDueSoon={isDueSoon(payment.dueDate)}
        />
      </td>
      <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
        {payment.createdAt
          ? new Date(payment.createdAt).toLocaleDateString()
          : "-"}
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-2">
          <PaymentActions
            paymentId={payment.id}
            isPaid={!!payment.paidDate}
            onMarkAsPaid={onMarkAsPaid}
            onMarkAsUnpaidConfirm={onMarkAsUnpaidConfirm}
          />
        </div>
      </td>
    </tr>
  );
};

export default PaymentRow;
