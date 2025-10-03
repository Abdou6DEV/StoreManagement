import { Wallet, Calculator, AlertCircle } from "lucide-react";
import { FormModal } from "../../../lib/components/modal";
import { Input } from "../../../lib/components/input";
import type { PaymentWithClient } from "../../../types";
import type { TFunction } from "i18next";
import React, { useRef, useEffect, useState } from "react";

interface EditPaymentModalProps {
  open: boolean;
  onClose: () => void;
  payment: PaymentWithClient | null;
  onConfirm: (newAmount: number) => void;
  t: TFunction;
}

const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  open,
  onClose,
  payment,
  onConfirm,
  t,
}) => {
  const [newPaymentAmount, setNewPaymentAmount] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Calculate totals when payment changes
  const totalSaleAmount = payment?.sale?.saleItems?.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0;

  const currentPaidAmount = payment?.givenAmount || 0;
  const currentRemainingAmount = payment?.remainingAmount || 0;
  const updatedPaidAmount = currentPaidAmount + newPaymentAmount;
  const updatedRemainingAmount = totalSaleAmount - updatedPaidAmount;
  const isFullyPaid = updatedRemainingAmount <= 0;
  const isOverpaid = updatedRemainingAmount < 0;

  useEffect(() => {
    if (open && amountInputRef.current) {
      setInputValue("");
      setNewPaymentAmount(0);
      amountInputRef.current.focus();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPaymentAmount > 0) {
      onConfirm(newPaymentAmount);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const MAX_INT = 2147483647;
    const numValue = Number(value);
    
    if (value === "") {
      setInputValue("");
      setNewPaymentAmount(0);
    } else if (numValue >= 0 && numValue <= MAX_INT) {
      setInputValue(value);
      setNewPaymentAmount(numValue);
    }
  };

  if (!payment) return null;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={t("clients.editPayment", "Edit Payment")}
      subtitle={t(
        "clients.editPaymentDesc",
        "Add additional payment amount for this credit"
      )}
      icon={<Wallet className="w-5 h-5 text-blue-500" />}
      size="lg"
      className="max-w-2xl"
      onSubmit={handleSubmit}
      submitText={t("clients.updatePayment", "Update Payment")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={newPaymentAmount <= 0 || isOverpaid}
    >
      {/* Payment Information Summary */}
      <div className="bg-muted/60 border border-border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">
          {t("clients.paymentInfo", "Payment Information")}
        </h3>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-muted-foreground">
              {t("clients.totalSaleAmount", "Total Sale Amount")}:
            </span>
            <div className="text-lg font-bold text-foreground">
              {totalSaleAmount.toLocaleString()} {t("cashier.currency", "DA")}
            </div>
          </div>
          
          <div>
            <span className="font-semibold text-muted-foreground">
              {t("clients.currentlyPaid", "Currently Paid")}:
            </span>
            <div className="text-lg font-bold text-green-600">
              {currentPaidAmount.toLocaleString()} {t("cashier.currency", "DA")}
            </div>
          </div>
          
          <div>
            <span className="font-semibold text-muted-foreground">
              {t("clients.currentRemaining", "Current Remaining")}:
            </span>
            <div className="text-lg font-bold text-orange-600">
              {currentRemainingAmount.toLocaleString()} {t("cashier.currency", "DA")}
            </div>
          </div>
          
          <div>
            <span className="font-semibold text-muted-foreground">
              {t("clients.paymentType", "Payment Type")}:
            </span>
            <div className="text-lg font-bold text-blue-600">
              {payment.type === "CREDIT" 
                ? t("cashier.credit", "Credit") 
                : t("cashier.versement", "Versement")
              }
            </div>
          </div>
        </div>
      </div>

      {/* New Payment Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold mb-2 text-foreground">
          {t("clients.additionalPayment", "Additional Payment Amount")}
        </label>
        <div className="relative">
          <Input
            ref={amountInputRef}
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            min={0}
            max={2147483647}
            placeholder={t("clients.enterAmount", "Enter amount client is paying now")}
            className="w-full h-12 text-lg pr-12"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {t("cashier.currency", "DA")}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t("clients.enterAmountHelp", "Enter how much the client is paying now")}
        </p>
      </div>

      {/* Simple validation message */}
      {isOverpaid && (
        <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-semibold">
              {t("clients.overpaid", "Payment exceeds remaining amount!")}
            </span>
          </div>
        </div>
      )}

      {/* Client Information */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h4 className="font-semibold text-foreground mb-2">
          {t("clients.clientInfo", "Client Information")}
        </h4>
        <div className="text-sm text-muted-foreground">
          <div><strong>{t("clients.name", "Name")}:</strong> {payment.client.name}</div>
          {payment.client.phone && (
            <div><strong>{t("clients.phone", "Phone")}:</strong> {payment.client.phone}</div>
          )}
        </div>
      </div>
    </FormModal>
  );
};

export default EditPaymentModal;
