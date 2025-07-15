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
        { id: product.id, name: product.name, price: product.selling, qty: 1 },
      ];
    });
  };

  const handleClear = () => {
    setCart([]);
    setPaidAmount(0);
  };

  return (
    <main className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* === Sticky Header for Total === */}
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border px-0 pb-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-0">
          <span className="text-xs text-muted-foreground tracking-widest uppercase font-semibold leading-none">Total</span>
          <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-primary drop-shadow-lg leading-none">{total.toLocaleString()} DA</span>
        </div>
      </header>

      {/* === Main Content === */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 px-2 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto w-full">
        {/* === LEFT: Search + Cart === */}
        <section className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 flex flex-col gap-6 h-full min-h-[400px]">
            <ProductSearch onAdd={handleAddProduct} />
            <div className="flex-1 overflow-auto rounded-lg">
              <CartTable cart={cart} setCart={setCart} />
            </div>
          </div>
        </section>

        {/* === RIGHT: Summary + Actions === */}
        <section className="w-full lg:w-1/2 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 flex flex-col gap-6 h-full min-h-[400px]">
            <div className="flex-1 overflow-auto rounded-lg">
              <PaymentSummary
                cart={cart}
                clientName="Abdallah"
                creditAmount={15000}
                versementAmount={20000}
                discount={0}
              />
            </div>
            <ActionButtons onClear={handleClear} />
          </div>
        </section>
      </div>
    </main>
  );
}
