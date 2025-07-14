import React, { useMemo } from "react";
import type { CartItem } from "../../cashier";

interface Props {
  cart: CartItem[];
  paidAmount: number;
  setPaidAmount: (value: number) => void;
}

export default function PaymentSummary({
  cart,
  paidAmount,
  setPaidAmount,
}: Props) {
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const change = paidAmount - total;

  return (
    <div className="space-y-4">
      {/* Receipt Items */}
      <div className="bg-muted rounded-lg px-4 py-3 font-mono text-sm text-muted-foreground">
        {cart.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>
              {item.qty} x {item.name}
            </span>
            <span>
              {(item.qty * item.price).toLocaleString()} DZD
            </span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between font-semibold text-foreground">
          <span>Total:</span>
          <span>{total.toLocaleString()} DZD</span>
        </div>
      </div>

      {/* Paid Input */}
      <div className="flex items-center justify-between gap-4">
        <label className="text-sm text-muted-foreground">Paid</label>
        <input
          type="number"
          value={paidAmount}
          onChange={(e) => setPaidAmount(parseInt(e.target.value || "0"))}
          className="w-32 px-3 py-2 text-lg text-right bg-background border border-border rounded-md focus:ring-2 focus:ring-primary focus:outline-none transition"
        />
      </div>

      {/* Change Due */}
      <div className={`text-center text-2xl font-bold py-2 rounded-md transition
        ${change >= 0 ? "text-green-500" : "text-destructive"}
      `}>
        {change >= 0
          ? `Change: ${change.toLocaleString()} DZD`
          : `Remaining: ${Math.abs(change).toLocaleString()} DZD`}
      </div>
    </div>
  );
}
