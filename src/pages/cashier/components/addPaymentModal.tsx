import { Wallet } from "lucide-react";
import { FormModal } from "../../../lib/components/Modal";
import type { CartItem } from "../../../types";
import type { TFunction } from "i18next";
import React, { useRef, useEffect } from "react";

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
  const rest = cartTotal - Number(paymentAmount);

  const amountInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && amountInputRef.current) {
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
    if (paymentAmount > 0 && paymentDate && rest > 0) {
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
      submitDisabled={paymentAmount <= 0 || !paymentDate || rest <= 0}
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
            value={paymentAmount === 0 ? "" : paymentAmount}
            onChange={(e) => setPaymentAmount(Number(e.target.value) || 0)}
            min={0}
            placeholder={t("cashier.paymentAmount", "Payment Amount")}
            className={`w-full rounded-lg border px-4 py-3 h-12 text-base bg-background focus:outline-none transition shadow-sm ${rest < 0 ? "border-red-500 focus:ring-1 focus:ring-red-500" : "border-border"}`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1 text-muted-foreground tracking-wide">
            {t("cashier.dueDate", "Due Date")}
          </label>
          <input
            type="date"
            value={
              paymentDate ? paymentDate.toISOString().substring(0, 10) : ""
            }
            min={tomorrow}
            onChange={(e) => {
              setPaymentDate(
                e.target.value ? new Date(e.target.value) : undefined,
              );
            }}
            className="w-full rounded-lg border border-border px-4 py-3 h-12 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition shadow-sm"
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
          {paymentAmount ? Number(paymentAmount).toLocaleString() : 0}{" "}
          {t("cashier.currency", "DA")}
        </div>
        <div>
          <span className="font-semibold text-foreground">
            {t("cashier.rest", "Rest")}:
          </span>{" "}
          {paymentAmount
            ? (cartTotal - Number(paymentAmount)).toLocaleString()
            : cartTotal.toLocaleString()}{" "}
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
