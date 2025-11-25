import React, { useState, useEffect } from "react";
import { Button } from "../../../lib/components/button";
import { Input } from "../../../lib/components/input";
import { User, Calendar, Edit, Save, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentWithClient } from "../../../types";
import PaymentStatus from "./paymentStatus";
import PaymentActions from "./paymentActions";
import { Tooltip } from "../../../lib/components/tooltip";
import EditPaymentModal from "./editPaymentModal";

interface PaymentRowProps {
  payment: PaymentWithClient;
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
  onCancelVersement?: (paymentId: string) => void;
  isOverdue: (dueDate: Date) => boolean;
  isDueSoon: (dueDate: Date) => boolean;
  isNewlyOverdue?: boolean; // Whether this payment is newly overdue and should be highlighted
  isNewlyDueSoon?: boolean; // Whether this payment is newly due soon and should be highlighted
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
  onViewSaleDetails,
  onViewVersementDetails,
  onRefreshPayments,
  onCancelVersement,
  isOverdue,
  isDueSoon,
  isNewlyOverdue = false,
  isNewlyDueSoon = false,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [showEditModal, setShowEditModal] = useState(false);
  const [isCreditPaymentSale, setIsCreditPaymentSale] = useState(false);

  const canCancelVersement = payment.type === "VERSEMENT" && !!payment.pendingSaleItems && !payment.paidDate;

  // Check if this is a standalone credit payment (no sale associated)
  useEffect(() => {
    const checkIfStandaloneCreditPayment = () => {
      if (!payment.saleId && payment.type === "CREDIT") {
        setIsCreditPaymentSale(true);
      } else {
        setIsCreditPaymentSale(false);
      }
    };

    checkIfStandaloneCreditPayment();
  }, [payment.saleId, payment.type]);

  const handleEditPayment = async (newAmount: number) => {
    try {
      // Update the payment amount by adding the new amount to the existing amount
      const updatedAmount = payment.givenAmount + newAmount;
      await window.api.database.payments.updateAmount(payment.id, updatedAmount);
      setShowEditModal(false);
      // Refresh the payments table
      if (onRefreshPayments) {
        onRefreshPayments();
      }
    } catch (error) {
      console.error("Failed to update payment:", error);
    }
  };

  return (
    <tr className={`hover:bg-muted/40 transition ${
      isNewlyOverdue
        ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500"
        : isNewlyDueSoon
        ? "bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500"
        : ""
    }`}>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-[0.9375rem]">{payment.client.name}</div>
            {payment.client.phone && (
              <div className="text-[0.8125rem] text-muted-foreground">
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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = Number(e.target.value);
                const MAX_INT = 2147483647;
                if (value >= 0 && value <= MAX_INT) {
                  setEditAmount(value);
                }
              }}
              min={0}
              max={2147483647}
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
            <span className="font-medium text-[0.9375rem]">
              {payment.type === "CREDIT" && payment.remainingAmount !== undefined
                ? payment.remainingAmount.toLocaleString('fr-FR')
                : payment.givenAmount.toLocaleString('fr-FR')}{" "}
              {t("cashier.currency", "DA")}
            </span>
            {!payment.paidDate && (
              <Tooltip
                content={t("clients.editAmountTooltip", "Edit payment amount")}
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditModal(true)}
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
          {!payment.paidDate && isOverdue(payment.dueDate) && (
            <span className="text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded-full">
              {t("clients.overdue", "Overdue")}
            </span>
          )}
          {!payment.paidDate && isDueSoon(payment.dueDate) && !isOverdue(payment.dueDate) && (
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
            saleId={payment.saleId}
            isPaid={!!payment.paidDate}
            onMarkAsPaid={onMarkAsPaid}
            onMarkAsUnpaidConfirm={onMarkAsUnpaidConfirm}
            onViewSaleDetails={onViewSaleDetails}
            onViewVersementDetails={onViewVersementDetails}
            isCreditPaymentSale={isCreditPaymentSale}
            hasPendingSaleItems={!!payment.pendingSaleItems}
            canCancelVersement={canCancelVersement}
            onCancelVersement={onCancelVersement}
          />
        </div>
      </td>
      
      {/* Edit Payment Modal */}
      <EditPaymentModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        payment={payment}
        onConfirm={handleEditPayment}
        t={t}
      />
    </tr>
  );
};

export default PaymentRow;
