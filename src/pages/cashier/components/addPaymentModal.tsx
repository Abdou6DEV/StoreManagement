import { Wallet } from "lucide-react";
import { Button } from "../../../lib/components/ui/button";
import type { CartItem } from "../index";
import type { TFunction } from "i18next";
import React from "react";

interface AddPaymentModalProps {
  open: boolean;
  onClose: () => void;
  paymentType: 'credit' | 'versement';
  setPaymentType: (type: 'credit' | 'versement') => void;
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
  paymentType,
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6 text-blue-500" />
          <h2 className="text-xl font-bold text-foreground">
            {paymentType === 'credit'
              ? t("cashier.addCredit", "Add Credit")
              : t("cashier.addVersement", "Add Versement")}
          </h2>
        </div>
        {/* Payment type selector */}
        <div className="flex gap-2 mb-2">
          <Button
            variant={paymentType === 'credit' ? 'default' : 'outline'}
            onClick={() => setPaymentType('credit')}
            className="flex-1"
          >
            {t("cashier.credit", "Credit")}
          </Button>
          <Button
            variant={paymentType === 'versement' ? 'default' : 'outline'}
            onClick={() => setPaymentType('versement')}
            className="flex-1"
          >
            {t("cashier.versement", "Versement")}
          </Button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">{t("cashier.paymentAmount", "Payment Amount")}</label>
              <input
                type="number"
                value={paymentAmount === 0 ? "" : paymentAmount}
                onChange={e => setPaymentAmount(Number(e.target.value) || 0)}
                min={0}
                placeholder={t("cashier.paymentAmount", "Payment Amount")}
                className="w-full rounded-md border border-border px-3 py-2 h-11 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                {t("cashier.dueDate", "Due Date")}
              </label>
              <input
                type="date"
                value={paymentDate ? paymentDate.toISOString().substring(0, 10) : ""}
                onChange={e => {
                  setPaymentDate(e.target.value ? new Date(e.target.value) : undefined);
                }}
                className="w-full rounded-md border border-border px-3 py-2 h-11 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
        </div>
        <hr />
        {/* Info summary */}
        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">{t("cashier.itemsCount", "Number of items")}:</span> {cart.length}
          </div>
          <div>
            <span className="font-medium text-foreground">{t("cashier.totalQty", "Total quantity")}:</span> {cart.reduce((sum: number, item) => sum + (item.qty || 0), 0)}
          </div>
          <div>
            <span className="font-medium text-foreground">{t("cashier.given", "Given")}:</span> {paymentAmount ? Number(paymentAmount).toLocaleString() : 0} DA
          </div>
          <div>
            <span className="font-medium text-foreground">{t("cashier.rest", "Rest")}:</span> {paymentAmount ? (cartTotal - Number(paymentAmount)).toLocaleString() : cartTotal.toLocaleString()} DA
          </div>
          <div className="col-span-2">
            <span className="font-medium text-foreground">{t("cashier.total", "Total")}:</span> {cartTotal.toLocaleString()} DA
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
          >
            {t("cashier.cancel", "Cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={paymentAmount <= 0 || !paymentDate}
          >
            {t("cashier.confirm", "Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddPaymentModal; 