import React, { useRef, useEffect, useState } from "react";
import type { CartItem } from "../../../types";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function CartTable({ cart, setCart }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart]);

  const updateQty = (index: number, newQty: number) => {
    if (newQty < 1) {
      removeItem(index);
      return;
    }
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: newQty } : item)),
    );
  };

  const removeItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const CartRow = React.memo(function CartRow({
    item,
    index,
    updateQty,
    removeItem,
  }: {
    item: CartItem;
    index: number;
    updateQty: (index: number, newQty: number) => void;
    removeItem: (index: number) => void;
  }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(item.qty.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDoubleClick = () => {
      setIsEditing(true);
      setEditValue(item.qty.toString());
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (/^\d*$/.test(value)) {
        setEditValue(value);
      }
    };

    const handleInputBlur = () => {
      const newQty = parseInt(editValue);
      if (!isNaN(newQty) && newQty > 0) {
        updateQty(index, newQty);
      } else {
        setEditValue(item.qty.toString());
      }
      setIsEditing(false);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        handleInputBlur();
      } else if (e.key === "Escape") {
        setEditValue(item.qty.toString());
        setIsEditing(false);
      }
    };

    useEffect(() => {
      if (isEditing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [isEditing]);

    return (
      <tr
        key={item.id}
        className="border-b border-muted transition-colors hover:bg-accent/40"
      >
        <td className="p-2 w-[30%]">{item.name}</td>
        <td
          className="p-2 text-right w-[10%] cursor-pointer select-none"
          onDoubleClick={handleDoubleClick}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              className="w-full text-right bg-transparent border border-primary rounded px-1 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          ) : (
            item.qty
          )}
        </td>
        <td className="p-2 text-right w-[20%]">
          {item.price.toLocaleString()} DZ
        </td>
        <td className="p-2 text-right w-[20%]">
          {(item.price * item.qty).toLocaleString()} DA
        </td>
        <td className="p-2 text-right w-[20%]">
          <div className="flex justify-end gap-1">
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
          </div>
        </td>
      </tr>
    );
  });

  return (
    <div className="rounded-md border border-border overflow-hidden h-full flex flex-col">
      <div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground font-medium text-xs uppercase sticky top-0 z-10">
            <tr className="border-b border-border">
              <th className="p-2 w-[30%]">{t("cashier.name", "Name")}</th>
              <th className="p-2 text-right w-[10%]">
                {t("cashier.qty", "Qty")}
              </th>
              <th className="p-2 text-right w-[20%]">
                {t("cashier.price", "Price")}
              </th>
              <th className="p-2 text-right w-[20%]">
                {t("cashier.total", "Total")}
              </th>
              <th className="p-2 text-right w-[20%]">
                {t("cashier.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-card text-foreground">
            {cart.length > 0 ? (
              cart.map((item, index) => (
                <CartRow
                  key={item.id}
                  item={item}
                  index={index}
                  updateQty={updateQty}
                  removeItem={removeItem}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-muted-foreground text-sm italic"
                >
                  {t("cashier.cartEmpty", "Cart is empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
