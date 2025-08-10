import React from "react";
import { X, Edit, Save } from "lucide-react";
import { Button } from "../button";
import { Input } from "../input";
import { useTranslation } from "react-i18next";
import type { Payment } from "@prisma/client";

interface PaymentActionsProps {
  payment: Payment;
  editingPayment: string | null;
  editAmount: number;
  onEditStart: (paymentId: string, amount: number) => void;
  onEditCancel: () => void;
  onEditSave: (paymentId: string) => void;
  onEditAmountChange: (amount: number) => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({
  payment,
  editingPayment,
  editAmount,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditAmountChange,
}) => {
  const { t } = useTranslation();
  const isEditing = editingPayment === payment.id;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={editAmount}
          onChange={(e) => onEditAmountChange(Number(e.target.value))}
          className="w-20 h-8 text-sm"
          autoFocus
        />
        <Button
          size="sm"
          onClick={() => onEditSave(payment.id)}
          className="h-8 px-2"
        >
          <Save className="w-3 h-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEditCancel}
          className="h-8 px-2"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">
        {payment.givenAmount.toLocaleString()} {t("cashier.currency", "DA")}
      </span>
      {!payment.paidDate && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onEditStart(payment.id, payment.givenAmount)}
          className="h-6 px-1"
        >
          <Edit className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

export default PaymentActions;
