import React, { useRef, useEffect } from "react";
import { CartItem } from "../../cashier";
import { Trash2 } from "lucide-react";

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function CartTable({ cart, setCart }: Props) {
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tableRef.current) {
      tableRef.current.scrollTop = tableRef.current.scrollHeight;
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
    <div
      className="max-h-[400px] rounded-md"
      ref={tableRef}
    >
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-muted text-muted-foreground font-medium text-xs uppercase">
          <tr className="border-b border-border">
            <th className="p-2">Name</th>
            <th className="p-2 text-right">Qty</th>
            <th className="p-2 text-right">Price</th>
            <th className="p-2 text-right">Total</th>
            <th className="p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-card text-foreground">
          {cart.map((item, index) => (
            <tr
              key={item.id}
              className="border-b border-muted transition-colors hover:bg-accent"
            >
              <td className="p-2">{item.name}</td>

              <td className="p-2 text-right">{item.qty}</td>

              <td className="p-2 text-right">
                {item.price.toLocaleString()} DZD
              </td>

              <td className="p-2 text-right">
                {(item.price * item.qty).toLocaleString()} DZD
              </td>

              <td className="p-2 text-right space-x-1">
                <button
                  onClick={() => updateQty(index, item.qty + 1)}
                  className="px-1 py-0 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition text-xl font-semibold"
                >
                  +
                </button>
                <button
                  onClick={() => updateQty(index, item.qty - 1)}
                  className="px-1 py-0 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition text-xl font-semibold"
                >
                  −
                </button>
                <button
                  onClick={() => removeItem(index)}
                  className="text-red-500 hover:text-red-700 transition align-middle"
                >
                  <Trash2 className="w-5 h-5 inline" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cart.length === 0 && (
        <div className="p-4 text-muted-foreground text-center">
          Cart is empty
        </div>
      )}
    </div>
  );
}
