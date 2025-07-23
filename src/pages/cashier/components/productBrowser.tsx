import React, { useState, useMemo, useEffect, useRef } from "react";
import type { Product } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../../lib/components/ui/skeleton";

interface ProductBrowserProps {
  allProducts: Product[];
  onAddSelectedProducts: (selectedProductIds: string[]) => void;
  open: boolean;
  onClose: () => void;
}

const ProductBrowser: React.FC<ProductBrowserProps> = ({
  allProducts,
  onAddSelectedProducts,
  open,
  onClose,
}) => {
  const { t } = useTranslation();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productFilter, setProductFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (productFilter) {
      products = allProducts.filter((product) =>
        product.name.toLowerCase().includes(productFilter.toLowerCase()),
      );
    }

    return products.sort((a, b) => {
      const aHasBarcode = a.codebar && a.codebar.trim() !== "";
      const bHasBarcode = b.codebar && b.codebar.trim() !== "";

      if (aHasBarcode && !bHasBarcode) return 1;
      if (!aHasBarcode && bHasBarcode) return -1;
      return 0;
    });
  }, [allProducts, productFilter]);

  useEffect(() => {
    setVisibleCount(50);
  }, [productFilter]);

  const loadMoreProducts = () => {
    if (visibleCount >= filteredProducts.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 50);
      setLoadingMore(false);
    }, 2000);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
    if (isNearBottom && !loadingMore) {
      loadMoreProducts();
    }
  };

  const handleAddSelectedProducts = () => {
    if (selectedProducts.length === 0) return;
    onAddSelectedProducts(selectedProducts);
    setSelectedProducts([]);
    onClose();
  };

  // Close on backdrop click or Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && e.target === modalRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      ref={modalRef}
      onMouseDown={handleBackdropClick}
    >
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-2xl p-6 flex flex-col animate-in fade-in zoom-in-90 duration-300 max-h-[90vh] overflow-hidden">
        <input
          ref={filterInputRef}
          type="text"
          placeholder={t("cashier.filterProducts", "Filter products...")}
          className="w-full px-3 py-2 mb-3 rounded-md border border-border bg-card text-foreground"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />
        <div
          className="flex-1 overflow-y-auto grid grid-cols-3 gap-2"
          onScroll={handleScroll}
          style={{ minHeight: 200 }}
        >
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <div
              key={product.id}
              onClick={() => {
                setSelectedProducts((prev) =>
                  prev.includes(product.id)
                    ? prev.filter((id) => id !== product.id)
                    : [...prev, product.id],
                );
              }}
              className={`p-2 border rounded-md h-20 cursor-pointer transition-all flex flex-col ${
                selectedProducts.includes(product.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary"
              }`}
            >
              <div className="font-medium truncate">{product.name}</div>
              <div className="text-sm text-muted-foreground">
                {product.selling.toLocaleString()} DA
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t("cashier.stock", "Stock")}: {product.quantity}
              </div>
            </div>
          ))}

          {/* Loading skeletons */}
          {loadingMore &&
            Array.from({ length: 100 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="p-2 border rounded-md h-20 flex flex-col gap-2"
              >
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3 mt-1" />
              </div>
            ))}

          {/* Show message when all products are loaded */}
          {visibleCount >= filteredProducts.length &&
            filteredProducts.length > 0 && (
              <div className="col-span-3 text-center py-4 text-sm text-muted-foreground">
                {t("cashier.allProductsLoaded", "All products loaded")}
              </div>
            )}
        </div>
        <button
          onClick={handleAddSelectedProducts}
          disabled={selectedProducts.length === 0}
          className={`mt-3 py-2 px-4 rounded-md font-medium ${
            selectedProducts.length === 0
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {t("cashier.addToCart", { count: selectedProducts.length })}
        </button>
        <button
          onClick={onClose}
          className="mt-2 py-2 px-4 rounded-md font-medium bg-muted text-foreground hover:bg-muted/80 border border-border"
        >
          {t("cashier.cancel", "Cancel")}
        </button>
      </div>
    </div>
  );
};

export default ProductBrowser;
