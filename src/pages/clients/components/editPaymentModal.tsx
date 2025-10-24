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
  let totalSaleAmount = 0;
  
  if (payment?.sale) {
    // For payments with an associated sale - use pre-calculated total
    totalSaleAmount = payment.sale.totalAmountWithDiscount || 0;
  } else if (payment?.type === "VERSEMENT" && (payment as any).pendingSaleItems) {
    // For versements with pending sale items (not yet paid)
    try {
      const pendingItems = JSON.parse((payment as any).pendingSaleItems);
      const grossTotal = pendingItems.reduce(
        (sum: number, item: any) => sum + item.price * item.quantity,
        0
      );
      // Apply discount to get totalAmountWithDiscount
      const discount = payment.discount || 0;
      totalSaleAmount = grossTotal - discount;
    } catch (error) {
      console.error("Error parsing pending sale items:", error);
      totalSaleAmount = 0;
    }
  }

  const currentPaidAmount = payment?.givenAmount || 0;
  const currentRemainingAmount = payment?.remainingAmount || 0;
  
  // For standalone credit payments (no sale), the remaining amount is the credit amount
  // For sale-based payments, calculate based on sale total
  const isStandaloneCredit = !payment?.sale && payment?.type === "CREDIT";
  const isVersement = payment?.type === "VERSEMENT";
  
  let updatedPaidAmount, updatedRemainingAmount, isFullyPaid, isOverpaid;
  
  if (isStandaloneCredit) {
    // For standalone credit: remaining amount decreases as we pay more
    // currentPaidAmount = amount paid so far, newPaymentAmount = additional payment
    updatedPaidAmount = currentPaidAmount + newPaymentAmount;
    updatedRemainingAmount = currentRemainingAmount - newPaymentAmount;
    isFullyPaid = updatedRemainingAmount <= 0;
    isOverpaid = updatedRemainingAmount < 0;
  } else if (isVersement) {
    // For VERSEMENT payments: add new payment to givenAmount (what we owe them)
    // The total versement amount increases, and we check if it exceeds the sale total
    updatedPaidAmount = currentPaidAmount + newPaymentAmount; // This is the new givenAmount
    updatedRemainingAmount = updatedPaidAmount; // For versements, remaining = givenAmount
    isFullyPaid = updatedPaidAmount >= totalSaleAmount;
    isOverpaid = updatedPaidAmount > totalSaleAmount;
  } else {
    // For sale-based CREDIT payments: use the original logic
    updatedPaidAmount = currentPaidAmount + newPaymentAmount;
    updatedRemainingAmount = totalSaleAmount - updatedPaidAmount;
    isFullyPaid = updatedRemainingAmount <= 0;
    isOverpaid = updatedRemainingAmount < 0;
  }

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
          {isStandaloneCredit ? (
            <div>
              <span className="font-semibold text-muted-foreground">
                {t("clients.creditAmount", "Credit Amount")}:
              </span>
              <div className="text-lg font-bold text-foreground">
                {currentRemainingAmount.toLocaleString()} {t("cashier.currency", "DA")}
              </div>
            </div>
          ) : isVersement ? (
            <div>
              <span className="font-semibold text-muted-foreground">
                {t("clients.totalSaleAmount", "Total Sale Amount")}:
              </span>
              <div className="text-lg font-bold text-foreground">
                {totalSaleAmount.toLocaleString()} {t("cashier.currency", "DA")}
              </div>
            </div>
          ) : (
            <div>
              <span className="font-semibold text-muted-foreground">
                {t("clients.totalSaleAmount", "Total Sale Amount")}:
              </span>
              <div className="text-lg font-bold text-foreground">
                {totalSaleAmount.toLocaleString()} {t("cashier.currency", "DA")}
              </div>
            </div>
          )}
          
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

        {/* Current vs Updated Payment Status */}
        <div className="mt-6 pt-4 border-t border-border">
          <div className="grid grid-cols-2 gap-6">
            {/* Current Status */}
            <div>
              <h4 className="font-semibold text-muted-foreground mb-3 text-sm">
                {t("clients.currentStatus", "Current Status")}
              </h4>
              <div className="space-y-2">
                {isStandaloneCredit ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("clients.creditAmount", "Credit Amount")}:
                    </span>
                    <span className="font-semibold text-orange-600">
                      {currentRemainingAmount.toLocaleString()} {t("cashier.currency", "DA")}
                    </span>
                  </div>
                ) : isVersement ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.versementAmount", "Versement Amount")}:
                      </span>
                      <span className="font-semibold text-blue-600">
                        {currentPaidAmount.toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.remaining", "Remaining")}:
                      </span>
                      <span className="font-semibold text-orange-600">
                        {(totalSaleAmount - currentPaidAmount).toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.paid", "Paid")}:
                      </span>
                      <span className="font-semibold text-green-600">
                        {currentPaidAmount.toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.remaining", "Remaining")}:
                      </span>
                      <span className="font-semibold text-orange-600">
                        {currentRemainingAmount.toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Updated Status */}
            <div>
              <h4 className="font-semibold text-muted-foreground mb-3 text-sm">
                {t("clients.afterPayment", "After Additional Payment")}
              </h4>
              <div className="space-y-2">
                {isStandaloneCredit ? (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("clients.remaining", "Remaining")}:
                    </span>
                    <span className={`font-semibold ${
                      isOverpaid 
                        ? 'text-red-600' 
                        : updatedRemainingAmount <= 0 
                          ? 'text-green-600' 
                          : 'text-orange-600'
                    }`}>
                      {updatedRemainingAmount.toLocaleString()} {t("cashier.currency", "DA")}
                    </span>
                  </div>
                ) : isVersement ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.versementAmount", "Versement Amount")}:
                      </span>
                      <span className={`font-semibold ${
                        isOverpaid 
                          ? 'text-red-600' 
                          : updatedPaidAmount >= totalSaleAmount 
                            ? 'text-green-600' 
                            : 'text-blue-600'
                      }`}>
                        {updatedPaidAmount.toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.remaining", "Remaining")}:
                      </span>
                      <span className={`font-semibold ${
                        isOverpaid 
                          ? 'text-red-600' 
                          : (totalSaleAmount - updatedPaidAmount) <= 0 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                      }`}>
                        {(totalSaleAmount - updatedPaidAmount).toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.paid", "Paid")}:
                      </span>
                      <span className={`font-semibold ${isOverpaid ? 'text-red-600' : 'text-green-600'}`}>
                        {updatedPaidAmount.toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {t("clients.remaining", "Remaining")}:
                      </span>
                      <span className={`font-semibold ${
                        isOverpaid 
                          ? 'text-red-600' 
                          : updatedRemainingAmount <= 0 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                      }`}>
                        {updatedRemainingAmount.toLocaleString()} {t("cashier.currency", "DA")}
                      </span>
                    </div>
                  </>
                )}
                {isFullyPaid && !isOverpaid && (
                  <div className="text-xs text-green-600 font-semibold mt-1">
                    ✓ {t("clients.fullyPaid", "Fully Paid!")}
                  </div>
                )}
                {isOverpaid && (
                  <div className="text-xs text-red-600 font-semibold mt-1">
                    {t("clients.overpaid", "Overpaid!")}
                  </div>
                )}
              </div>
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
