import React, { useState, useMemo } from "react";
import type { Product } from "@prisma/client";

import ProductSearch from "./components/productSearch";
import CartTable from "./components/cartTable";
import PaymentSummary from "./components/paymentSummary";
import ActionButtons from "./components/actionButtons";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export default function CashierPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  );

  const handleAddProduct = (product: Product) => {
    setCart(prev => {
      const exists = prev.find(item => item.id === product.id);
      if (exists) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.selling, qty: 1 }];
    });
  };

  const handleClear = () => {
    setCart([]);
    setPaidAmount(0);
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-background text-foreground">
      {/* === Big Glowing Total === */}
      <div className="text-center text-6xl font-extrabold tracking-tight text-primary drop-shadow-md animate-fade-in">
        {total.toLocaleString()} DZD
      </div>

      {/* === Main Grid === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Search + Cart */}
        <div className="col-span-2 space-y-4">
          <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
            <ProductSearch onAdd={handleAddProduct} />
          </div>
          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
            <CartTable cart={cart} setCart={setCart} />
          </div>
        </div>

        {/* RIGHT: Payment Summary + Buttons */}
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
            <PaymentSummary
              cart={cart}
              paidAmount={paidAmount}
              setPaidAmount={setPaidAmount}
            />
          </div>
          <div className="p-4 rounded-lg border border-border bg-card shadow-sm">
            <ActionButtons onClear={handleClear} />
          </div>
        </div>
      </div>
    </div>
  );
}
