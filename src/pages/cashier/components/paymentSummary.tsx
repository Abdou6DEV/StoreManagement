import React, { useMemo } from "react";
import type { CartItem } from "../../cashier";
import { useTranslation } from "react-i18next";

interface Props {
  cart: CartItem[];
  clientName?: string;
  paymentAmount?: number;
  discount?: number;
  paymentType?: 'none' | 'credit' | 'versement';
}

export default function PaymentSummary({
  cart,
  clientName,
  paymentAmount = 0,
  discount = 0,
  paymentType = 'none',
}: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart],
  );

  const total = subtotal; // Before discount
  const credit = subtotal - discount - paymentAmount;
  const creditDisplay = credit > 0 ? credit : 0;
  const nbrItems = cart.reduce((sum, item) => sum + item.qty, 0);

  // === Auto-scroll logic ===
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const animationRef = React.useRef<number | null>(null);
  const userScrollTimeout = React.useRef<number | null>(null);
  const transitionTimeouts = React.useRef<NodeJS.Timeout[]>([]);
  const isPaused = React.useRef(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function scroll() {
      if (!el || isPaused.current) return;
      
      // Check if content needs scrolling
      if (el.scrollHeight <= el.clientHeight) {
        // Content fits without scrolling, cancel animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        return;
      }
      
      // Smooth continuous scroll
      el.scrollTop += 0.5;

      // If we hit the bottom, wait 4 seconds then transition
      if (el.scrollTop >= el.scrollHeight - el.clientHeight) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }

        // First, wait 4 seconds at the bottom
        const timeout1 = setTimeout(() => {
          // Then start the fade transition
          setIsTransitioning(true);
          
          // After 1 second fade, reset to top
          const timeout2 = setTimeout(() => {
            if (el) {
              el.scrollTop = 0;
              setIsTransitioning(false);
              
              // Wait 6 seconds at top before resuming scroll
              const timeout3 = setTimeout(() => {
                animationRef.current = requestAnimationFrame(scroll);
              }, 6000);
              transitionTimeouts.current.push(timeout3);
            }
          }, 1000);
          transitionTimeouts.current.push(timeout2);
        }, 4000);
        transitionTimeouts.current.push(timeout1);
        return;
      }

      animationRef.current = requestAnimationFrame(scroll);
    }

    function pauseScroll() {
      isPaused.current = true;
      // Stop any ongoing transition
      setIsTransitioning(false);
      
      // Cancel animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      // Clear all transition timeouts
      transitionTimeouts.current.forEach(timeout => clearTimeout(timeout));
      transitionTimeouts.current = [];
      
      // Clear user interaction timeout
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current);
      }
      
      // Set new timeout to resume
      userScrollTimeout.current = window.setTimeout(() => {
        isPaused.current = false;
        animationRef.current = requestAnimationFrame(scroll);
      }, 5000);
    }

    // Handle user interaction through mouse/touch events
    function handleUserInteraction() {
      pauseScroll();
    }

    // Add event listeners for actual user interaction
    el.addEventListener('mousedown', handleUserInteraction);
    el.addEventListener('touchstart', handleUserInteraction);
    el.addEventListener('wheel', handleUserInteraction);

    // Only start scrolling if content is taller than container
    setTimeout(() => {
      if (el.scrollHeight > el.clientHeight) {
        animationRef.current = requestAnimationFrame(scroll);
      }
    }, 6000);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (userScrollTimeout.current) {
        clearTimeout(userScrollTimeout.current);
      }
      el.removeEventListener('mousedown', handleUserInteraction);
      el.removeEventListener('touchstart', handleUserInteraction);
      el.removeEventListener('wheel', handleUserInteraction);
    };
  }, [cart.length]);

  return (
    <div className="font-mono text-sm text-primary bg-muted rounded-xl p-4 flex flex-col h-full shadow-inner border border-border">
      {/* === Client Info === */}
      {clientName && (
        <>
          <div className="flex justify-between font-semibold text-base mb-1">
            <span>{t("cashier.client", "Client:")}</span>
            <span className="truncate">{clientName}</span>
          </div>
          <div className="border-t border-black dark:border-white my-2" />
        </>
      )}

      {/* === Header Row === */}
      <div className="flex justify-between font-semibold text-xs uppercase tracking-wider mb-1">
        <span className="w-1/2">{t("cashier.product", "Product")}</span>
        <span className="w-1/6 text-right">{t("cashier.qty", "Qty")}</span>
        <span className="w-1/6 text-right">{t("cashier.unit", "Unit")}</span>
        <span className="w-1/6 text-right">{t("cashier.total", "Total")}</span>
      </div>
      <div className="border-t border-black dark:border-white mb-2" />

      {/* === Scrollable Items === */}
      <div
        className="flex-1 overflow-y-auto space-y-[2px]"
        ref={scrollRef}
      >
        {cart.length > 0
          ? cart.map((item) => (
              <div
                key={item.id}
                className={`flex justify-between border-b border-dashed border-primary/40 py-[2px] hover:bg-accent/40 rounded transition-opacity duration-1000 ${
                  isTransitioning ? 'opacity-0' : 'opacity-100'
                }`}
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
        className="pt-3 mt-3 border-t border-black dark:border-white space-y-1"
        style={{ direction: isRTL ? "rtl" : "ltr" }}
      >
        <div className="flex justify-between">
          <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>
            {t("cashier.nbrItems", "Nbr Items")}
          </span>
          <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>{nbrItems}</span>
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
        {paymentType === 'credit' && (
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
                {t("cashier.credit", "Credit")}
              </span>
              <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>
                {creditDisplay.toLocaleString()} DA
              </span>
            </div>
          </>
        )}
        {paymentType === 'versement' && paymentAmount > 0 && (
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
          <span className={isRTL ? "w-3/4 text-right" : "w-3/4 text-left"}>{t("cashier.total", "Total")}</span>
          <span className={isRTL ? "w-1/4 text-left" : "w-1/4 text-right"}>{total.toLocaleString()} DA</span>
        </div>
      </div>
    </div>
  );
}
