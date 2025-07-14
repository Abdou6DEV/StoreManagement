import React, { useRef, useEffect, useState } from "react";
import { CartItem } from "../../cashier";

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function CartTable({ cart, setCart }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [selectedRow, setSelectedRow] = useState<number>(-1);
  const [editingQtyIndex, setEditingQtyIndex] = useState<number | null>(null);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
    }
  }, [cart]);

  const updateQty = (index: number, newQty: number) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: newQty } : item))
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedRow((prev) => (prev + 1) % cart.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedRow((prev) => (prev - 1 + cart.length) % cart.length);
    } else if (e.key === "Backspace" && selectedRow >= 0) {
      e.preventDefault();
      setCart((prev) => prev.filter((_, i) => i !== selectedRow));
      setSelectedRow((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && selectedRow >= 0) {
      e.preventDefault();
      setEditingQtyIndex(selectedRow);
    } else if (e.key === "Escape") {
      setSelectedRow(-1);
      setEditingQtyIndex(null);
    }
  };

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus:outline-none overflow-y-auto max-h-[400px] rounded-md"
      ref={tableRef}
    >
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted text-muted-foreground font-medium text-xs uppercase">
          <tr className="border-b border-border">
            <th className="p-2">Name</th>
            <th className="p-2 text-center">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody className="bg-card text-foreground">
          {cart.map((item, index) => (
            <tr
              key={item.id}
              className={`border-b border-muted transition-colors ${
                selectedRow === index ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
              onClick={() => setSelectedRow(index)}
            >
              <td className="p-2">{item.name}</td>

              <td className="p-2 text-center">
                {editingQtyIndex === index ? (
                  <input
                    type="number"
                    autoFocus
                    value={item.qty}
                    onChange={(e) => updateQty(index, parseInt(e.target.value || "1"))}
                    onBlur={() => setEditingQtyIndex(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") setEditingQtyIndex(null);
                    }}
                    className="w-14 text-center border border-border rounded bg-background text-foreground"
                  />
                ) : (
                  <button
                    onClick={() => setEditingQtyIndex(index)}
                    className="px-3 py-1 rounded-full bg-muted text-sm hover:bg-border transition"
                  >
                    {item.qty}
                  </button>
                )}
              </td>

              <td className="p-2 text-right">{item.price.toLocaleString()} DZD</td>
              <td className="p-2 text-right">
                {(item.price * item.qty).toLocaleString()} DZD
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cart.length === 0 && (
        <div className="p-4 text-muted-foreground text-center">Cart is empty</div>
      )}
    </div>
  );
}
