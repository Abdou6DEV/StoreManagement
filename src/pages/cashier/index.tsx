import React, { useState, useMemo, useEffect } from "react";
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

const MAX_SESSIONS = 5;

export default function CashierPage() {
  const [sessions, setSessions] = useState<CartItem[][]>(
    Array.from({ length: MAX_SESSIONS }, () => [])
  );
  const [activeSession, setActiveSession] = useState(0);

  const cart = sessions[activeSession];
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  );

  const updateSession = (newCart: CartItem[]) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === activeSession ? newCart : s))
    );
  };

  const handleAddProduct = (product: Product) => {
    const updated = [...cart];
    const exists = updated.find((item) => item.id === product.id);
    if (exists) {
      exists.qty += 1;
    } else {
      updated.push({
        id: product.id,
        name: product.name,
        price: product.selling,
        qty: 1,
      });
    }
    updateSession(updated);
  };

  const handleClear = () => updateSession([]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActiveSession((prev) => (prev - 1 + MAX_SESSIONS) % MAX_SESSIONS);
      } else if (e.key === "ArrowRight") {
        setActiveSession((prev) => (prev + 1) % MAX_SESSIONS);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <main className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden -mt-13">
      {/* === Sticky Total Header === */}
      <header className="shrink-0 sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border pb-2">
        <div className="max-w-5xl mx-auto text-center leading-none py-1">
          <div className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
            Total
          </div>
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-primary drop-shadow-sm">
            {total.toLocaleString()} DA
          </div>
        </div>
      </header>

      {/* === Main Content === */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 px-2 sm:px-4 lg:px-6 py-3 overflow-hidden">
        {/* LEFT: Product + Cart */}
        <section className="w-full lg:w-1/2 flex flex-col gap-3 overflow-hidden">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm h-full flex flex-col gap-3 overflow-hidden">
            <ProductSearch onAdd={handleAddProduct} />
            <div className="flex-1 overflow-auto">
              <CartTable cart={cart} setCart={updateSession} />
            </div>
          </div>
        </section>

        {/* RIGHT: Summary + Actions */}
        <section className="w-full lg:w-1/2 flex flex-col gap-3 overflow-hidden">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm h-full flex flex-col gap-3 overflow-hidden">
            <div className="flex-1 overflow-auto">
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

      {/* === Session Selector === */}
      <div className="h-[40px] gap-3 bg-background flex justify-center items-center px-4">
        {Array.from({ length: MAX_SESSIONS }).map((_, i) => {
          const isActive = activeSession === i;
          const hasItems = sessions[i].length > 0;

          const baseClasses = "px-3 py-1 text-xs font-semibold rounded-md transition border";
          const active = "bg-primary text-secondary border-transparent";
          const green = "bg-green-600 text-white hover:bg-green-700";
          const inactive = "bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground";

          return (
            <button
              key={i}
              onClick={() => setActiveSession(i)}
              className={`-mt-6 ${baseClasses} ${
                isActive ? active : hasItems ? green : inactive
              }`}
            >
              Page {i + 1}
            </button>
          );
        })}
      </div>
    </main>
  );
}
