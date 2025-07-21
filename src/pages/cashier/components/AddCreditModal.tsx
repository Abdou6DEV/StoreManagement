import React from "react";
import { Users } from "lucide-react";
import { Button } from "../../../lib/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "../../../lib/components/ui/popover";
import { Calendar } from "../../../lib/components/ui/calendar";
import type { CartItem } from "../index";
import type { Locale } from "date-fns/locale";
import type { TFunction } from "i18next";

export default function AddCreditModal({
  open,
  onClose,
  clientName,
  setClientName,
  clientPhone,
  setClientPhone,
  paymentAmount,
  setPaymentAmount,
  creditDate,
  setCreditDate,
  calendarOpen,
  setCalendarOpen,
  cart,
  cartTotal,
  t,
  calendarLocale,
  onConfirm
}: {
  open: boolean;
  onClose: () => void;
  clientName: string;
  setClientName: (val: string) => void;
  clientPhone: string;
  setClientPhone: (val: string) => void;
  paymentAmount: number;
  setPaymentAmount: (val: number) => void;
  creditDate: Date | undefined;
  setCreditDate: (val: Date | undefined) => void;
  calendarOpen: boolean;
  setCalendarOpen: (val: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  t: TFunction;
  calendarLocale: Locale;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-md p-6 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold text-foreground">
            {t("cashier.addCredit", "Add Credit")}
          </h2>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">{t("cashier.clientName", "Client Name")}</label>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder={t("cashier.clientName", "Client Name")}
                className="w-full rounded-md border border-border px-3 py-2 h-11 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">{t("cashier.phoneOptional", "Phone Number (optional)")}</label>
              <input
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder={t("cashier.phoneOptional", "Phone Number (optional)")}
                className="w-full rounded-md border border-border px-3 py-2 h-11 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
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
              <label className="block text-sm font-medium mb-1 text-muted-foreground">{t("cashier.dueDate", "Due Date")}</label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={"w-full justify-start text-left font-normal h-11 px-3 " + (!creditDate ? "text-muted-foreground" : "")}
                  >
                    {creditDate ? creditDate.toLocaleDateString() : t("cashier.pickDate", "Pick a date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-auto" align="start">
                  <Calendar
                    mode="single"
                    selected={creditDate}
                    onSelect={setCreditDate}
                    initialFocus
                    locale={calendarLocale}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
        <hr />
        {/* Improved Info summary */}
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
            disabled={paymentAmount <= 0 || !creditDate}
          >
            {t("cashier.confirm", "Confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
} 