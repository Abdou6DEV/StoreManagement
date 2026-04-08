import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SaleItemPreviewProps } from "./types";

const SaleItemPreview: React.FC<SaleItemPreviewProps> = ({ saleItems }) => {
  const { t } = useTranslation();
  const textRef = useRef<HTMLDivElement | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(2);

  const tokens = useMemo(() => {
    return saleItems.map((item) => {
      const name =
        item.product?.name ||
        item.manualProduct?.name ||
        item.service?.name ||
        (item.service
          ? t("cashier.service", "Service")
          : t("cashier.manualProduct", "Manual Product"));
      const base = item.service ? `🔧 ${name}` : name;
      const qty = typeof item.quantity === "number" ? item.quantity : 1;
      return qty > 1 ? `${qty}× ${base}` : base;
    });
  }, [saleItems, t]);

  const displayText = useMemo(() => {
    const safeCount = Math.max(1, Math.min(tokens.length, visibleCount));
    const prefix = tokens.slice(0, safeCount).join(", ");
    const remaining = tokens.length - safeCount;
    return remaining > 0
      ? `${prefix} +${remaining} ${t("cashier.more", "more")}`
      : prefix;
  }, [tokens, visibleCount, t]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const compute = () => {
      const width = el.clientWidth;
      if (!width || tokens.length === 0) return;

      const style = window.getComputedStyle(el);
      ctx.font = style.font || `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

      // Find the maximum number of tokens that fit (keeping the "+N more" suffix accurate).
      for (let k = tokens.length; k >= 1; k -= 1) {
        const prefix = tokens.slice(0, k).join(", ");
        const remaining = tokens.length - k;
        const text =
          remaining > 0
            ? `${prefix} +${remaining} ${t("cashier.more", "more")}`
            : prefix;
        const measured = ctx.measureText(text).width;
        if (measured <= width) {
          setVisibleCount(k);
          return;
        }
      }
      setVisibleCount(1);
    };

    compute();
    const ro = new ResizeObserver(() => compute());
    ro.observe(el);
    return () => ro.disconnect();
  }, [tokens, t]);

  return (
    <div className="mb-3">
      <div
        ref={textRef}
        className="text-sm font-medium text-foreground line-clamp-1"
      >
        {displayText}
      </div>
    </div>
  );
};

export default SaleItemPreview;
