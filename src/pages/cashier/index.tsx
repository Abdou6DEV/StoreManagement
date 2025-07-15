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
    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [
        ...prev,
        { id: product.id, name: product.name, price: product.selling, qty: 1 }
      ];
    });
  };

  const handleClear = () => {
    setCart([]);
    setPaidAmount(0);
  };

  return (
    <main className="min-h-screen -mt-19 px-4 sm:px-6 lg:px-8 py-6 bg-background text-foreground">
      {/* === BIG TOTAL DISPLAY === */}
      <div className="my-6 select-none">
        <hr className="border-t border-border mb-4" />
        <div className="text-center text-5xl sm:text-6xl font-bold tracking-tight text-primary">
          {total.toLocaleString()} DA
        </div>
        <hr className="border-t border-border mt-4" />
      </div>

      {/* === FLEX LAYOUT: 50/50 Cart vs Summary+Actions === */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        {/* === LEFT SIDE: Product Search + Cart === */}
        <section className="w-full lg:w-1/2">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <ProductSearch onAdd={handleAddProduct} />
            <CartTable cart={cart} setCart={setCart} />
          </div>
        </section>

        {/* === RIGHT SIDE: Summary + Action Buttons in one box === */}
        <section className="w-full lg:w-1/2">
          <div className="rounded-lg border border-border bg-card p-4 space-y-6">
          <PaymentSummary
            cart={cart}
            clientName="Abdallah"
            creditAmount={15000}
            versementAmount={20000}
            discount={0}
          />
            <ActionButtons onClear={handleClear} />
          </div>
        </section>
      </div>
    </main>
  );
}
