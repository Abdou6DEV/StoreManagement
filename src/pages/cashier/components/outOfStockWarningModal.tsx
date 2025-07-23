import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { CartItem } from "../index";
import type { Product } from "@prisma/client";

interface Props {
  open: boolean;
  items: CartItem[];
  allProducts: Product[];
  onCancel: () => void;
  onProceed: () => void;
}

const OutOfStockWarningModal: React.FC<Props> = ({
  open,
  items,
  allProducts,
  onCancel,
  onProceed,
}) => {
  const { t } = useTranslation();
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open && cancelBtnRef.current) {
      cancelBtnRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg shadow-lg w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
          {t("cashier.outOfStockWarning", "Some items are out of stock!")}
        </h2>
        <ul className="list-disc pl-5 text-sm text-foreground">
          {items.map((item) => {
            const product = allProducts.find((p) => p.id === item.id);
            return (
              <li key={item.id}>
                <span className="font-medium">{item.name}</span>:{" "}
                {t("cashier.requested", "Requested")}: {item.qty},{" "}
                {t("cashier.available", "Available")}: {product ? product.quantity : 0}
              </li>
            );
          })}
        </ul>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelBtnRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-muted rounded-md hover:bg-muted/60 border border-border"
          >
            {t("cashier.cancel", "Cancel")}
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/80 border border-border"
          >
            {t("cashier.proceedAnyway", "Proceed Anyway")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutOfStockWarningModal;
