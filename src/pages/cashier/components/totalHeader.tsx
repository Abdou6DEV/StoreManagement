import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CartItem } from "../../../types";

interface TotalHeaderProps {
  cart: CartItem[];
  discount: string;
  isRTL: boolean;
}

export default function TotalHeader({ cart, discount, isRTL }: TotalHeaderProps) {
  const { t } = useTranslation();
  const [isTotalAnimating, setIsTotalAnimating] = useState(false);

  // Calculate total with discount applied
  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const total = Math.max(subtotal - Number(discount) || 0, 0);

  // Animate total when it changes
  useEffect(() => {
    setIsTotalAnimating(true);
    const timer = setTimeout(() => setIsTotalAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [total]);

  return (
    <header className="z-20 bg-gradient-to-r from-background via-background/95 to-background/90 backdrop-blur-md flex-shrink-0">
      <div className="max-w-6xl mx-auto px-4 pb-3">
        <div
          className={`flex items-center ${isRTL ? "flex-row-reverse" : "justify-between"}`}
        >
          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-3">
              <div
                className={`text-xs text-muted-foreground font-medium tracking-wider uppercase bg-muted/50 px-3 py-1 rounded-full border border-border/50 transition-all duration-300 ${cart.length > 0 ? "bg-primary/20 border-primary/30 text-primary animate-pulse" : ""}`}
              >
                {t("cashier.total", "Total")}
              </div>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-primary drop-shadow-sm transition-all duration-300 ${isTotalAnimating ? "scale-110 text-primary/80" : "scale-100"}`}
                >
                  {total.toLocaleString()}
                </span>
                <span className="text-lg sm:text-xl lg:text-2xl font-bold text-muted-foreground">
                  {t("cashier.currency", "DA")}
                </span>
              </div>
            </div>
          </div>

          <div
            className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? "justify-start" : "justify-end"}`}
          >
            <div className="bg-muted/50 px-2 py-1 rounded-md border border-border/50">
              {cart.length} {t("cashier.products", "Products")}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 