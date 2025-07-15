import React, { useMemo } from "react";
import type { CartItem } from "../../cashier";

interface Props {
  cart: CartItem[];
  clientName?: string;
  versementAmount?: number;
  creditAmount?: number;
  discount?: number;
}

export default function PaymentSummary({
  cart,
  clientName,
  versementAmount = 0,
  creditAmount = 0,
  discount = 0,
}: Props) {
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );

  const total = subtotal - discount;

  return (
    <div className="font-mono text-xs text-primary bg-muted rounded-lg p-3 flex flex-col h-[calc(100vh-340px)]">
      {/* === Client Info === */}
      {clientName && (
        <>
          <div className="flex justify-between font-semibold">
            <span>Client:</span>
            <span>{clientName}</span>
          </div>
          <div className="border-t border-border dark:border-white my-1" />
        </>
      )}

      {/* === Header Row === */}
      <div className="flex justify-between font-semibold">
        <span className="w-1/2">Product</span>
        <span className="w-1/6 text-right">Qty</span>
        <span className="w-1/6 text-right">Unit</span>
        <span className="w-1/6 text-right">Total</span>
      </div>
      <div className="border-t border-border dark:border-white mb-1" />

      {/* === Scrollable Item List === */}
      <div className="flex-1 overflow-y-auto space-y-[2px]">
        {cart.length > 0 ? (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex justify-between border-b border-dashed border-border py-[2px]"
            >
              <span className="w-1/2 truncate">{item.name}</span>
              <span className="w-1/6 text-right">{item.qty}</span>
              <span className="w-1/6 text-right">{item.price.toLocaleString()}</span>
              <span className="w-1/6 text-right">
                {(item.qty * item.price).toLocaleString()}
              </span>
            </div>
          ))
        ) : (
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="flex justify-between py-[2px] opacity-0 pointer-events-none select-none"
            >
              <span className="w-1/2">Placeholder</span>
              <span className="w-1/6 text-right">0</span>
              <span className="w-1/6 text-right">0</span>
              <span className="w-1/6 text-right">0</span>
            </div>
          ))
        )}
      </div>

      {/* === Bottom Fixed Totals Section === */}
      <div className="pt-2 mt-2 border-t border-border dark:border-white space-y-1">
        {discount > 0 && (
          <>
            <div className="flex justify-between">
              <span className="w-3/4 text-left">Discount</span>
              <span className="w-1/4 text-right">-{discount.toLocaleString()} DA</span>
            </div>
            <div className="border-t border-border my-1" />
          </>
        )}

        <div className="flex justify-between font-bold text-sm">
          <span className="w-3/4 text-left">Total</span>
          <span className="w-1/4 text-right">{total.toLocaleString()} DA</span>
        </div>

        {versementAmount > 0 && (
          <div className="flex justify-between">
            <span className="w-3/4 text-left">Versement</span>
            <span className="w-1/4 text-right">
              {versementAmount.toLocaleString()} DA
            </span>
          </div>
        )}

        {creditAmount > 0 && (
          <div className="flex justify-between">
            <span className="w-3/4 text-left">Credit</span>
            <span className="w-1/4 text-right">
              {creditAmount.toLocaleString()} DA
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
