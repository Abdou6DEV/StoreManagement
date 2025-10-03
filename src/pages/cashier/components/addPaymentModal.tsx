import { Wallet } from "lucide-react";
import { FormModal } from "../../../lib/components/modal";
import { DatePicker } from "../../../lib/components/datePicker";
import type { CartItem } from "../../../types";
import type { TFunction } from "i18next";
import React, { useRef, useEffect, useState } from "react";

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentType: "credit" | "versement";
  setPaymentType: (type: "credit" | "versement") => void;
  paymentAmount: number;
  setPaymentAmount: (val: number) => void;
  paymentDate: Date | undefined;
  setPaymentDate: (val: Date | undefined) => void;
  cart: CartItem[];
  cartTotal: number;
  t: TFunction;
  onConfirm: () => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  open,
  onClose,
  paymentType = "credit",
  setPaymentType,
  paymentAmount,
  setPaymentAmount,
  paymentDate,
  setPaymentDate,
  cart,
  cartTotal,
  t,
  onConfirm,
}) => {
  const [inputValue, setInputValue] = useState("");
  const rest = cartTotal - paymentAmount;

  const amountInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && amountInputRef.current) {
      setInputValue(""); // Reset input when modal opens
      amountInputRef.current.focus();
    }
  }, [open]);

  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 10);
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount >= 0 && paymentDate) {
      onConfirm();
    }
  };

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={
        paymentType === "credit"
          ? t("cashier.addCredit", "Add Credit")
          : t("cashier.addVersement", "Add Versement")
      }
      subtitle={t(
        "cashier.addPaymentDesc",
        "Configure payment details for this transaction",
      )}
      icon={<Wallet className="w-5 h-5 text-blue-500" />}
      size="lg"
      className="max-w-lg"
      onSubmit={handleSubmit}
      submitText={t("cashier.confirm", "Confirm")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={paymentAmount < 0 || !paymentDate}
    >
      {/* Payment type pill toggle */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-full bg-muted p-1 border border-border shadow-inner">
          <button
            type="button"
            onClick={() => setPaymentType("credit")}
            className={`px-6 py-2 rounded-full font-semibold text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              paymentType === "credit"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-primary/10"
            }`}
          >
            {t("cashier.credit", "Credit")}
          </button>
          <span className="w-2" />
          <button
            type="button"
            onClick={() => setPaymentType("versement")}
            className={`px-6 py-2 rounded-full font-semibold text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
              paymentType === "versement"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-primary/10"
            }`}
          >
            {t("cashier.versement", "Versement")}
          </button>
        </div>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold mb-1 text-muted-foreground tracking-wide">
            {t("cashier.paymentAmount", "Payment Amount")}
          </label>
          <input
            ref={amountInputRef}
            type="number"
            value={inputValue}
            onChange={(e) => {
              const value = e.target.value;
              const MAX_INT = 2147483647;
              const numValue = Number(value);
              
              if (value === "") {
                setInputValue("");
                setPaymentAmount(0);
              } else if (numValue >= 0 && numValue <= MAX_INT) {
                setInputValue(value);
                setPaymentAmount(numValue);
              }
            }}
            min={0}
            max={2147483647}
            placeholder={t("cashier.paymentAmount", "Payment Amount")}
            className={`w-full rounded-lg border px-4 py-3 h-12 text-base bg-background focus:outline-none transition shadow-sm ${paymentAmount > cartTotal ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-border"}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-muted-foreground tracking-wide">
            {t("cashier.dueDate", "Due Date")}
          </label>
          <DatePicker
            value={paymentDate ? paymentDate.toISOString().substring(0, 10) : ""}
            onChange={(date) => setPaymentDate(date ? new Date(date) : undefined)}
            placeholder={t("cashier.dueDate", "Due Date")}
            className="w-full h-12 text-base"
            min={tomorrow}
          />
        </div>
      </div>

      {/* Info summary */}
      <div className="rounded-xl bg-muted/60 border border-border px-5 py-4 grid grid-cols-2 gap-4 text-sm text-muted-foreground mt-2">
        <div>
          <span className="font-semibold text-foreground">
            {t("cashier.itemsCount", "Number of items")}:
          </span>{" "}
          {cart.length}
        </div>
        <div>
          <span className="font-semibold text-foreground">
            {t("cashier.totalQty", "Total quantity")}:
          </span>{" "}
          {cart.reduce((sum: number, item) => sum + (item.qty || 0), 0)}
        </div>
        <div>
          <span className="font-semibold text-foreground">
            {t("cashier.given", "Given")}:
          </span>{" "}
          {paymentAmount.toLocaleString()}{" "}
          {t("cashier.currency", "DA")}
        </div>
        <div>
          <span className="font-semibold text-foreground">
            {t("cashier.rest", "Rest")}:
          </span>{" "}
          {rest.toLocaleString()}{" "}
          {t("cashier.currency", "DA")}
        </div>
        <div className="col-span-2">
          <span className="font-semibold text-foreground">
            {t("cashier.total", "Total")}:
          </span>{" "}
          {cartTotal.toLocaleString()} {t("cashier.currency", "DA")}
        </div>
      </div>
    </FormModal>
  );
};

export default AddPaymentModal;
