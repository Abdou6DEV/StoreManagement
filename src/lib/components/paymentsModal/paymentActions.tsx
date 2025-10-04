import React from "react";
import { X, Edit, Save, Eye } from "lucide-react";
import { Button } from "../button";
import { Input } from "../input";
import { useTranslation } from "react-i18next";
import type { Payment } from "@prisma/client";
import { Tooltip } from "../tooltip";

interface PaymentActionsProps {
  payment: Payment;
  editingPayment: string | null;
  editAmount: number;
  onEditStart: (paymentId: string, amount: number) => void;
  onEditCancel: () => void;
  onEditSave: (paymentId: string) => void;
  onEditAmountChange: (amount: number) => void;
  onViewSaleDetails?: (saleId: string) => void;
}

const PaymentActions: React.FC<PaymentActionsProps> = ({
  payment,
  editingPayment,
  editAmount,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditAmountChange,
  onViewSaleDetails,
}) => {
  const { t } = useTranslation();
  const isEditing = editingPayment === payment.id;

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={editAmount}
          onChange={(e) => {
            const value = Number(e.target.value);
            const MAX_INT = 2147483647;
            if (value >= 0 && value <= MAX_INT) {
              onEditAmountChange(value);
            }
          }}
          min={0}
          max={2147483647}
          className="w-20 h-8 text-sm"
          autoFocus
        />
        <Tooltip content={t("common.save", "Save")}>
          <Button
            size="sm"
            onClick={() => onEditSave(payment.id)}
            className="h-8 w-8 p-0"
          >
            <Save className="w-3 h-3" />
          </Button>
        </Tooltip>
        <Tooltip content={t("common.cancel", "Cancel")}>
          <Button
            size="sm"
            variant="outline"
            onClick={onEditCancel}
            className="h-8 w-8 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-medium">
        {payment.type === "CREDIT" && (payment as any).remainingAmount !== undefined
          ? (payment as any).remainingAmount.toLocaleString()
          : payment.givenAmount.toLocaleString()}{" "}
        {t("cashier.currency", "DA")}
      </span>
      <div className="flex gap-1">
        {/* View Sale Details Button - only show if saleId exists */}
        {payment.saleId && onViewSaleDetails && (
          <Tooltip
            content={t(
              "clients.viewSaleDetailsTooltip",
              "View sale details for this payment",
            )}
          >
            <Button
              size="sm"
              variant="outline"
              className="text-blue-700 border-blue-500 hover:bg-blue-50 h-6 px-1"
              onClick={() => onViewSaleDetails(payment.saleId!)}
            >
              <Eye className="w-3 h-3 text-blue-500" />
            </Button>
          </Tooltip>
        )}
        {!payment.paidDate && (
          <Tooltip content={t("clients.editAmountTooltip", "Edit payment amount")}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEditStart(payment.id, payment.givenAmount)}
              className="h-6 w-6 p-0"
            >
              <Edit className="w-3 h-3" />
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default PaymentActions;
