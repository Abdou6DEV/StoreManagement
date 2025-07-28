import React, { useMemo } from "react";
import type { CartItem } from "../../types";
import { useTranslation } from "react-i18next";

interface Props {
  cart: CartItem[];
  clientName?: string;
  paymentAmount?: number;
  discount?: number;
  paymentType?: "none" | "credit" | "versement";
  className?: string;
}

export default function PaymentSummary({
  cart,
  clientName,
  paymentAmount = 0,
  discount = 0,
  paymentType = "none",
  className = "",
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

  // === Auto-scroll logic ===
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
            }, 1000); // Wait at top
            transitionTimeouts.current.push(waitAtTop);
          }, 600); // Fade duration
          transitionTimeouts.current.push(fadeOut);
        }, 2000); // Wait at bottom
        transitionTimeouts.current.push(waitAtBottom);
        return;
      }
      el.scrollTop += 0.5;
      animationRef.current = requestAnimationFrame(scrollStep);
    }
    animationRef.current = requestAnimationFrame(scrollStep);
  }

  // On cart change: reset scroll, clear timers, and start fresh after a short delay
  React.useEffect(() => {
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
  }, [cart]);

  // User interaction: pause scroll, resume after delay, always reset fade
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function pauseScroll() {
      isPaused.current = true;
      clearAllScrollTimers();
      setIsFading(false);
      userScrollTimeout.current = window.setTimeout(() => {
        isPaused.current = false;
        startAutoScroll();
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
  }, []);

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

      {/* === Header Row === */}
      <div className="flex justify-between font-semibold text-xs uppercase tracking-wider mb-1 flex-shrink-0">
        <span className="w-1/2">{t("cashier.product", "Product")}</span>
        <span className="w-1/6 text-right">{t("cashier.qty", "Qty")}</span>
        <span className="w-1/6 text-right">{t("cashier.unit", "Unit")}</span>
        <span className="w-1/6 text-right">{t("cashier.total", "Total")}</span>
      </div>
      <div className="border-t border-black dark:border-white mb-2 flex-shrink-0" />

      {/* === Scrollable Items === */}
      <div
        className={`flex-1 overflow-y-auto overflow-x-hidden space-y-[2px] transition-opacity duration-500 min-h-0 ${isFading ? "opacity-0" : "opacity-100"}`}
        ref={scrollRef}
      >
        {cart.length > 0
          ? cart.map((item) => (
              <div
                key={item.id}
                className={
                  "flex justify-between border-b border-dashed border-primary/40 py-[2px] hover:bg-accent/40 rounded transition-opacity duration-1000 opacity-100"
                }
              >
                <span className="w-1/2 truncate font-medium">{item.name}</span>
                <span className="w-1/6 text-right">{item.qty}</span>
                <span className="w-1/6 text-right">
                  {item.price.toLocaleString()}
                </span>
                <span className="w-1/6 text-right">
                  {(item.qty * item.price).toLocaleString()}
                </span>
              </div>
            ))
          : [...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex justify-between py-[2px] opacity-0 pointer-events-none select-none"
              >
                <span className="w-1/2">Placeholder</span>
                <span className="w-1/6 text-right">0</span>
                <span className="w-1/6 text-right">0</span>
                <span className="w-1/6 text-right">0</span>
              </div>
            ))}
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
