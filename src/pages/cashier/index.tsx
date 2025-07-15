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
    <main className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden -mt-30 p-0">

      {/* === TOP TOTAL (FIXED) === */}
      <div className="flex-shrink-0 px-6 pt-0 pb-2">
        <hr className="border-t border-border mb-2" />
        <div className="text-center text-5xl sm:text-6xl font-bold tracking-tight text-primary">
          {total.toLocaleString()} DA
        </div>
        <hr className="border-t border-border mt-2" />
      </div>

      {/* === CONTENT AREA === */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 lg:px-8 pb-4 overflow-hidden">
        {/* === LEFT SIDE: Search + Cart === */}
        <section className="w-full lg:w-1/2 flex flex-col overflow-hidden">
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-4 h-full">
            <ProductSearch onAdd={handleAddProduct} />
            <div className="flex-1 overflow-auto rounded">
              <CartTable cart={cart} setCart={setCart} />
            </div>
          </div>
        </section>

        {/* === RIGHT SIDE: Summary + Actions === */}
        <section className="w-full lg:w-1/2 flex flex-col overflow-hidden">
          <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-4 h-full">
            <div className="flex-1 overflow-auto rounded">
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
