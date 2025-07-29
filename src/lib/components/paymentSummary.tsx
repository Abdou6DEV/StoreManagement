import React, { useMemo, useRef, useEffect, useState } from "react";
import type { CartItem } from "../../types";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";

interface Props {
  cart: CartItem[];
  clientName?: string;
  paymentAmount?: number;
  discount?: number;
  paymentType?: "none" | "credit" | "versement";
  className?: string;
  interactive?: boolean;
  setCart?: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

export default function PaymentSummary({
  cart,
  clientName,
  paymentAmount = 0,
  discount = 0,
  paymentType = "none",
  className = "",
  interactive = false,
  setCart,
}: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  const total = Math.max(subtotal - discount, 0); // After discount
  const credit = subtotal - discount - paymentAmount;
  const creditDisplay = credit > 0 ? credit : 0;
  const nbrItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // === Auto-scroll logic (only for non-interactive mode) ===
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const animationRef = React.useRef<number | null>(null);
  const userScrollTimeout = React.useRef<number | null>(null);
  const transitionTimeouts = React.useRef<NodeJS.Timeout[]>([]);
  const isPaused = React.useRef(false);
  const [isFading, setIsFading] = React.useState(false);

  // Helper to clear all timers/animations and reset fade
  function clearAllScrollTimers() {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    transitionTimeouts.current.forEach((timeout) => clearTimeout(timeout));
    transitionTimeouts.current = [];
    if (userScrollTimeout.current) {
      clearTimeout(userScrollTimeout.current);
      userScrollTimeout.current = null;
    }
    setIsFading(false); // Always reset fade
  }

  // The main auto-scroll function with fade, bottom wait, and top wait
  function startAutoScroll() {
    const el = scrollRef.current;
    if (!el) return;
    if (isPaused.current) return;

    function scrollStep() {
      if (!el || isPaused.current) return;
      // If at bottom, wait, then fade out, reset to top, fade in, wait at top, and continue
      if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
        // Wait at bottom so user can see all items
        const waitAtBottom = setTimeout(() => {
          setIsFading(true);
          // Fade out, then reset to top and fade in
          const fadeOut = setTimeout(() => {
            el.scrollTop = 0;
            setIsFading(false);
            // Wait at top before resuming scrolling
            const waitAtTop = setTimeout(() => {
              animationRef.current = requestAnimationFrame(scrollStep);
            }, 6000); // Wait at top
            transitionTimeouts.current.push(waitAtTop);
          }, 500); // Fade duration
          transitionTimeouts.current.push(fadeOut);
        }, 6000); // Wait at bottom
        transitionTimeouts.current.push(waitAtBottom);
        return;
      }
      el.scrollTop += 0.5;
      animationRef.current = requestAnimationFrame(scrollStep);
    }
    animationRef.current = requestAnimationFrame(scrollStep);
  }

  // On cart change: reset scroll, clear timers, and start fresh after a short delay (non-interactive only)
  React.useEffect(() => {
    if (interactive) return; // Skip auto-scroll for interactive mode

    const el = scrollRef.current;
    clearAllScrollTimers();
    if (!el) return;
    el.scrollTop = 0;
    isPaused.current = false;
    // Only start auto-scroll if content is taller than container
    if (el.scrollHeight > el.clientHeight) {
      const timeout = setTimeout(() => {
        startAutoScroll();
      }, 1000);
      transitionTimeouts.current.push(timeout);
    }
    // eslint-disable-next-line
  }, [cart, interactive]);

  // User interaction: pause scroll, resume after delay, always reset fade (non-interactive only)
  React.useEffect(() => {
    if (interactive) return; // Skip auto-scroll for interactive mode

    const el = scrollRef.current;
    if (!el) return;
    function pauseScroll() {
      isPaused.current = true;
      clearAllScrollTimers();
      setIsFading(false);
      userScrollTimeout.current = window.setTimeout(() => {
        isPaused.current = false;
        // Only resume auto-scroll if content is actually scrollable
        if (el.scrollHeight > el.clientHeight) {
          startAutoScroll();
        }
      }, 4000); // Resume after 4s
    }
    el.addEventListener("mousedown", pauseScroll);
    el.addEventListener("touchstart", pauseScroll);
    el.addEventListener("wheel", pauseScroll);
    return () => {
      el.removeEventListener("mousedown", pauseScroll);
      el.removeEventListener("touchstart", pauseScroll);
      el.removeEventListener("wheel", pauseScroll);
    };
  }, [interactive]);

  // Interactive mode functions
  const updateQty = (index: number, newQty: number) => {
    if (!interactive || !setCart) return;

    if (newQty < 1) {
      removeItem(index);
      return;
    }
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: newQty } : item)),
    );
  };

  const removeItem = (index: number) => {
    if (!interactive || !setCart) return;

    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Interactive Row Component
  const InteractiveRow = React.memo(function InteractiveRow({
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
      <tr className="border-b border-dashed border-primary/40 hover:bg-accent/40 transition-colors group">
        <td className="py-2 px-2 font-medium truncate">{item.name}</td>
        <td
          className="py-2 px-2 text-right cursor-pointer select-none hover:bg-primary/20 rounded"
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
        <td className="py-2 px-2 text-right">{item.price.toLocaleString()}</td>
        <td className="py-2 px-2 text-right">
          {(item.qty * item.price).toLocaleString()}
        </td>
        <td className="py-2 px-2 text-right">
          <div className="flex gap-0.5 justify-end">
            <button
              onClick={() => updateQty(index, item.qty + 1)}
              className="w-4 h-4 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition text-xs font-bold flex items-center justify-center"
            >
              +
            </button>
            <button
              onClick={() => updateQty(index, item.qty - 1)}
              className="w-4 h-4 rounded bg-muted hover:bg-primary hover:text-primary-foreground transition text-xs font-bold flex items-center justify-center"
            >
              −
            </button>
            <button
              onClick={() => removeItem(index)}
              className="w-4 h-4 rounded text-red-500 hover:text-red-700 hover:bg-red-100 transition flex items-center justify-center"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </td>
      </tr>
    );
  });

  // Auto-scroll to bottom when new items are added in interactive mode
  useEffect(() => {
    if (interactive && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cart, interactive]);

  return (
    <div
      className={`font-mono text-sm text-primary bg-muted rounded-xl p-4 flex flex-col shadow-inner border border-border max-w-full w-full h-full ${className}`}
    >
      {/* === Client Info === */}
      {clientName && (
        <>
          <div className="flex justify-between font-semibold text-base mb-1 flex-shrink-0">
            <span>{t("cashier.client", "Client:")}</span>
            <span className="truncate">{clientName}</span>
          </div>
          <div className="border-t border-black dark:border-white my-2 flex-shrink-0" />
        </>
      )}

      {/* === Table Container === */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden min-h-0 ${
          interactive
            ? "opacity-100"
            : `transition-opacity duration-500 ${isFading ? "opacity-0" : "opacity-100"}`
        }`}
        ref={scrollRef}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="font-semibold text-xs uppercase tracking-wider border-b border-black dark:border-white">
              <th
                className={`text-left py-2 px-2 ${interactive ? "w-[35%]" : "w-1/2"}`}
              >
                {t("cashier.product", "Product")}
              </th>
              <th
                className={`text-right py-2 px-2 ${interactive ? "w-[15%]" : "w-1/6"}`}
              >
                {t("cashier.qty", "Qty")}
              </th>
              <th
                className={`text-right py-2 px-2 ${interactive ? "w-[15%]" : "w-1/6"}`}
              >
                {t("cashier.unit", "Unit")}
              </th>
              <th
                className={`text-right py-2 px-2 ${interactive ? "w-[15%]" : "w-1/6"}`}
              >
                {t("cashier.total", "Total")}
              </th>
              {interactive && (
                <th className="text-right py-2 px-2 w-[20%]">
                  {t("cashier.actions", "Actions")}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {cart.length > 0
              ? cart.map((item, index) =>
                  interactive ? (
                    <InteractiveRow
                      key={item.id}
                      item={item}
                      index={index}
                      updateQty={updateQty}
                      removeItem={removeItem}
                    />
                  ) : (
                    <tr
                      key={item.id}
                      className="border-b border-dashed border-primary/40 hover:bg-accent/40 transition-colors"
                    >
                      <td className="py-2 px-2 font-medium truncate">
                        {item.name}
                      </td>
                      <td className="py-2 px-2 text-right">{item.qty}</td>
                      <td className="py-2 px-2 text-right">
                        {item.price.toLocaleString()}
                      </td>
                      <td className="py-2 px-2 text-right">
                        {(item.qty * item.price).toLocaleString()}
                      </td>
                    </tr>
                  ),
                )
              : [...Array(6)].map((_, i) => (
                  <tr
                    key={i}
                    className="opacity-0 pointer-events-none select-none"
                  >
                    <td className="py-2 px-2">Placeholder</td>
                    <td className="py-2 px-2 text-right">0</td>
                    <td className="py-2 px-2 text-right">0</td>
                    <td className="py-2 px-2 text-right">0</td>
                    {interactive && <td className="py-2 px-2 text-right"></td>}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* === Bottom Summary Section === */}
      <div
        className="pt-3 mt-3 border-t border-black dark:border-white space-y-1 flex-shrink-0"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        <div className="flex justify-between">
          <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
            {t("cashier.nbrItems", "Nbr Items")}
          </span>
          <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
            {nbrItems}
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between">
            <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
              {t("cashier.discount", "Discount")}
            </span>
            <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
              -{discount.toLocaleString()} DA
            </span>
          </div>
        )}
        {/* Update logic: if paymentType === 'none', do not show credit/versement/paid rows */}
        {paymentType === "credit" && (
          <>
            <div className="flex justify-between">
              <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
                {t("cashier.paid", "Paid")}
              </span>
              <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
                {paymentAmount.toLocaleString()} DA
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
                {t("cashier.rest", "Remaining")}
              </span>
              <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
                {creditDisplay.toLocaleString()} DA
              </span>
            </div>
          </>
        )}
        {paymentType === "versement" && paymentAmount > 0 && (
          <>
            <div className="flex justify-between">
              <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
                {t("cashier.versement", "Versement")}
              </span>
              <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
                {paymentAmount.toLocaleString()} DA
              </span>
            </div>
            <div className="flex justify-between">
              <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
                {t("cashier.rest", "Rest")}
              </span>
              <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
                {creditDisplay.toLocaleString()} DA
              </span>
            </div>
          </>
        )}
        {/* Always show total at the end */}
        <div className="flex justify-between font-bold">
          <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
            {t("cashier.total", "Total")}
          </span>
          <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
            {total.toLocaleString()} DA
          </span>
        </div>
      </div>
    </div>
  );
}
