import { Wallet } from "lucide-react";
import { Button } from "../../../lib/components/ui/button";
import type { CartItem } from "../index";
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
  if (!open) return null;
  const rest = cartTotal - Number(paymentAmount);
  
  const amountInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open && amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, [open]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-lg mx-auto animate-in fade-in zoom-in-90 duration-300">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-7 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Wallet className="w-7 h-7 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {paymentType === "credit"
                ? t("cashier.addCredit", "Add Credit")
                : t("cashier.addVersement", "Add Versement")}
            </h2>
          </div>

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
                className="w-full rounded-lg border border-border px-4 py-3 h-12 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition shadow-sm"
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
              {paymentAmount ? Number(paymentAmount).toLocaleString() : 0} DA
            </div>
            <div>
              <span className="font-semibold text-foreground">
                {t("cashier.rest", "Rest")}:
              </span>{" "}
              {paymentAmount
                ? (cartTotal - Number(paymentAmount)).toLocaleString()
                : cartTotal.toLocaleString()}{" "}
              DA
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-foreground">
                {t("cashier.total", "Total")}:
              </span>{" "}
              {cartTotal.toLocaleString()} DA
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-lg px-6 py-3 font-semibold text-base border border-border shadow-sm hover:bg-muted/80 transition-all"
            >
              {t("cashier.cancel", "Cancel")}
            </Button>
            <Button
              onClick={onConfirm}
              disabled={paymentAmount <= 0 || !paymentDate || rest <= 0}
              className="rounded-lg px-6 py-3 font-bold text-base shadow-md bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {t("cashier.confirm", "Confirm")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentModal;
