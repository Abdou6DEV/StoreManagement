import React, { useRef, useEffect } from "react";
import { CartItem } from "../../cashier";
import { Trash2, Plus, Minus } from "lucide-react";

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function CartTable({ cart, setCart }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart]);

  const updateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, qty: newQty } : item
      )
    );
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-border bg-background shadow-sm overflow-hidden h-[calc(100vh-320px)] flex flex-col">
      {/* Table Header */}
      <table className="w-full text-sm text-left">
        <thead className="bg-muted text-muted-foreground font-semibold text-xs uppercase sticky top-0 z-10">
          <tr className="border-b border-border">
            <th className="p-3">Name</th>
            <th className="p-3 text-right">Qty</th>
            <th className="p-3 text-right">Price</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
      </table>

      {/* Scrollable body */}
      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <table className="w-full text-sm text-left">
          <tbody className="bg-card text-foreground">
            {cart.map((item, index) => (
              <tr
                key={item.id}
                className="border-b border-muted transition-colors hover:bg-accent/60 group"
              >
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-right">{item.qty}</td>
                <td className="p-3 text-right">{item.price.toLocaleString()} DZD</td>
                <td className="p-3 text-right">{(item.price * item.qty).toLocaleString()} DZD</td>
                <td className="p-3 text-right flex gap-1 justify-end items-center">
                  <button
                    onClick={() => updateQty(index, item.qty + 1)}
                    className="p-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => updateQty(index, item.qty - 1)}
                    className="p-1 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="p-1 rounded bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition focus:outline-none focus:ring-2 focus:ring-destructive/50"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {cart.length === 0 && (
          <div className="p-6 text-muted-foreground text-center text-base select-none">
            Cart is empty
          </div>
        )}
      </div>
    </div>
  );
}
