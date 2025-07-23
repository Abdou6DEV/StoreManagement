import React, { useState, useMemo, useEffect, useRef } from "react";
import type { Product } from "@prisma/client";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../../lib/components/ui/skeleton";
import { useStock } from "../../../lib/contexts/stockContext";
import type { CartItem } from "../index";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductBrowserProps {
  allProducts: Product[];
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const ProductBrowser: React.FC<ProductBrowserProps> = ({
  allProducts,
  open,
  onClose,
  cart,
  setCart,
}) => {
  const { t } = useTranslation();
  const [productFilter, setProductFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const { categories } = useStock();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [initialCartIds, setInitialCartIds] = useState<string[]>([]);

  // Long-press timer refs and state

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  // Remove canScrollLeft, canScrollRight, updateChevronState, and related useEffect

  const scrollTabs = (direction: 'left' | 'right') => {
    const container = tabsContainerRef.current;
    if (!container) return;
    // Get the first 3 visible buttons and sum their widths
    const btns = Array.from(container.querySelectorAll('button'));
    let scrollAmount = 0;
    for (let i = 0; i < 3 && i < btns.length; i++) {
      scrollAmount += (btns[i] as HTMLElement).offsetWidth;
    }
    if (scrollAmount === 0) scrollAmount = 120; // fallback
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Chevron state update helper
  // Remove canScrollLeft, canScrollRight, updateChevronState, and related useEffect

  useEffect(() => {
    const container = tabsContainerRef.current;
    // No chevron state logic needed
    if (open) {
      const container = tabsContainerRef.current;
      if (container) {
        container.scrollLeft = 0;
        setTimeout(() => {
          // No chevron state logic needed
        }, 0);
      }
    }
  }, [open, categories]);

  useEffect(() => {
    if (open && filterInputRef.current) {
      filterInputRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setInitialCartIds(cart.map(item => item.id));
    }
  }, [open]);

  const handleCancel = () => {
    setCart(prev => prev.filter(item => initialCartIds.includes(item.id)));
    onClose();
  };

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (productFilter) {
      products = products.filter((product) =>
        product.name.toLowerCase().includes(productFilter.toLowerCase()),
      );
    }
    if (selectedCategory !== "All") {
      products = products.filter((product) => product.categoryName === selectedCategory);
    }

    return products.sort((a, b) => {
      const aHasBarcode = a.codebar && a.codebar.trim() !== "";
      const bHasBarcode = b.codebar && b.codebar.trim() !== "";

      if (aHasBarcode && !bHasBarcode) return 1;
      if (!aHasBarcode && bHasBarcode) return -1;
      return 0;
    });
  }, [allProducts, productFilter, selectedCategory]);

  useEffect(() => {
    setVisibleCount(50);
  }, [productFilter]);

  const loadMoreProducts = () => {
    if (visibleCount >= filteredProducts.length) return;
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + 50);
      setLoadingMore(false);
    }, 500); // was 2000, now 500 for faster loading
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
    if (isNearBottom && !loadingMore) {
      loadMoreProducts();
    }
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

  const [editingQtyProductId, setEditingQtyProductId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState<string>("");
  const editingQtyInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  // Remove all refs and handlers related to long-press auto-increment/decrement
  // Only keep the onClick handlers for + and - buttons to increment/decrement by 1 per click

  return (
    <div
      className="fixed inset-0 z-50 w-full flex items-center justify-center bg-black/50"
      ref={modalRef}
      onMouseDown={handleBackdropClick}
    >
      <div className="w-full max-w-7xl bg-white dark:bg-zinc-900 border border-border rounded-2xl shadow-2xl p-6 flex flex-col animate-in fade-in zoom-in-90 duration-300 max-h-[95vh] overflow-hidden">
        <div className="flex items-center gap-4 mb-3">
          <input
            ref={filterInputRef}
            type="text"
            placeholder={t("cashier.filterProducts", "Filter products...")}
            className="w-full px-3 py-2 rounded-md border border-border bg-card text-foreground"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
          />
          <div className="w-full flex items-center gap-2">
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition"
              onClick={() => scrollTabs('left')}
              tabIndex={-1}
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="overflow-x-auto flex-1 max-w-[50vw]">
              <div ref={tabsContainerRef} className="flex gap-1 bg-muted rounded-md p-1 border border-border whitespace-nowrap min-w-full overflow-x-auto scrollbar-thin">
                <button
                  className={`px-3 py-1 rounded-md font-medium transition-colors text-sm ${selectedCategory === "All" ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
                  onClick={() => setSelectedCategory("All")}
                >
                  {t("cashier.all", "All")}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    className={`px-3 py-1 rounded-md font-medium transition-colors text-sm ${selectedCategory === cat ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-accent"}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition"
              onClick={() => scrollTabs('right')}
              tabIndex={-1}
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div
          className="overflow-y-auto grid grid-cols-5 gap-2 h-[600px]"
          onScroll={handleScroll}
          style={{ minHeight: 200 }}
        >
          {filteredProducts.slice(0, visibleCount).map((product) => {
            const cartItem = cart.find((item) => item.id === product.id);
            return (
              <div key={product.id} className="relative">
                <div
                  className={`p-2 border rounded-md h-20 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden w-full ${
                    cartItem
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary"
                  }`}
                  onClick={() => {
                    if (!cartItem) {
                      setCart((prev) => [
                        ...prev,
                        {
                          id: product.id,
                          name: product.name,
                          price: product.selling,
                          qty: 1,
                        },
                      ]);
                    } else {
                      setCart((prev) => prev.filter((item) => item.id !== product.id));
                    }
                  }}
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-h-0 justify-center h-full">
                    <div className="font-medium truncate leading-tight">{product.name}</div>
                    <div className="text-sm text-muted-foreground leading-tight">
                      {product.selling.toLocaleString()} DA
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {t("cashier.stock", "Stock")}: {product.quantity}
                    </div>
                  </div>
                  {cartItem && (
                    <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center z-10 pointer-events-none">
                      <div className="flex items-center gap-2 pointer-events-auto z-20">
                        <button
                          className="w-8 h-8 rounded-full bg-muted text-primary hover:bg-primary hover:text-primary-foreground text-base font-bold shadow flex items-center justify-center border border-border"
                          onClick={e => {
                            e.stopPropagation();
                            setCart((prev) =>
                              prev.map((item) =>
                                item.id === product.id && item.qty > 1
                                  ? { ...item, qty: item.qty - 1 }
                                  : item.id === product.id && item.qty === 1
                                  ? null
                                  : item
                              ).filter(Boolean)
                            );
                          }}
                        >
                          -
                        </button>
                        <span
                          className="px-2 text-base font-semibold select-none cursor-pointer"
                          onClick={e => e.stopPropagation()}
                          onDoubleClick={e => {
                            e.stopPropagation();
                            setEditingQtyProductId(product.id);
                            setEditingQtyValue(cartItem.qty.toString());
                          }}
                        >
                          {editingQtyProductId === product.id ? (
                            <input
                              ref={editingQtyInputRef}
                              type="text"
                              value={editingQtyValue}
                              onChange={e => {
                                if (/^\d*$/.test(e.target.value)) {
                                  setEditingQtyValue(e.target.value);
                                }
                              }}
                              onBlur={() => {
                                const newQty = parseInt(editingQtyValue);
                                if (!isNaN(newQty) && newQty > 0) {
                                  setCart(prev => prev.map(item =>
                                    item.id === product.id ? { ...item, qty: newQty } : item
                                  ));
                                }
                                setEditingQtyProductId(null);
                              }}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  const newQty = parseInt(editingQtyValue);
                                  if (!isNaN(newQty) && newQty > 0) {
                                    setCart(prev => prev.map(item =>
                                      item.id === product.id ? { ...item, qty: newQty } : item
                                    ));
                                  }
                                  setEditingQtyProductId(null);
                                } else if (e.key === "Escape") {
                                  setEditingQtyProductId(null);
                                }
                              }}
                              className="w-12 text-center bg-white dark:bg-zinc-900 border border-primary rounded px-1 py-0 text-base focus:outline-none focus:ring-1 focus:ring-primary"
                              style={{ minWidth: 32 }}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            cartItem.qty
                          )}
                        </span>
                        <button
                          className="w-8 h-8 rounded-full bg-muted text-primary hover:bg-primary hover:text-primary-foreground text-base font-bold shadow flex items-center justify-center border border-border"
                          onClick={e => {
                            e.stopPropagation();
                            setCart((prev) =>
                              prev.map((item) =>
                                item.id === product.id
                                  ? { ...item, qty: item.qty + 1 }
                                  : item
                              )
                            );
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

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
        <div className="flex justify-center gap-2 mt-2">
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-md font-medium bg-primary text-primary-foreground hover:bg-primary/90 border border-border"
          >
            {t("cashier.confirm", "Confirm")}
          </button>
          <button
            onClick={handleCancel}
            className="py-2 px-4 rounded-md font-medium bg-muted text-foreground hover:bg-muted/80 border border-border"
          >
            {t("cashier.cancel", "Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductBrowser;
