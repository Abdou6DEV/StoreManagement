import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ProductWithSales, CartItem } from "../../../types";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../../lib/components/skeleton";
import { useStock } from "../../../lib/contexts/stockContext";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import ProductCard from "./productCard";

interface ProductBrowserProps {
  allProducts: ProductWithSales[];
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const ProductBrowser = forwardRef<
  { handleClose: () => void },
  ProductBrowserProps
>(({ allProducts, open, onClose, cart, setCart }, ref) => {
  const { t } = useTranslation();
  const [productFilter, setProductFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const filterInputRef = useRef<HTMLInputElement>(null);
  const { categories } = useStock();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [initialCartIds, setInitialCartIds] = useState<string[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // Long-press timer refs and state

  const tabsContainerRef = useRef<HTMLDivElement>(null);
  // Remove canScrollLeft, canScrollRight, updateChevronState, and related useEffect

  const scrollTabs = (direction: "left" | "right") => {
    const container = tabsContainerRef.current;
    if (!container) return;
    // Get the first 3 visible buttons and sum their widths
    const btns = Array.from(container.querySelectorAll("button"));
    let scrollAmount = 0;
    for (let i = 0; i < 3 && i < btns.length; i++) {
      scrollAmount += (btns[i] as HTMLElement).offsetWidth;
    }
    if (scrollAmount === 0) scrollAmount = 120; // fallback
    if (direction === "left") {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
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
      setInitialCartIds(cart.map((item) => item.id));
      setIsClosing(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      const savedFavorites = localStorage.getItem("cashier-favorites");
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites));
        } catch (error) {
          console.error("Error loading favorites:", error);
        }
      } else {
        setFavorites([]);
      }
    }
  }, [open]);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];

      // Save to localStorage
      localStorage.setItem("cashier-favorites", JSON.stringify(newFavorites));

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("favorites-updated"));

      return newFavorites;
    });
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300); // Match the duration of the animation
  };

  // Expose handleClose method to parent component
  useImperativeHandle(
    ref,
    () => ({
      handleClose,
    }),
    [handleClose],
  );

  const handleCancel = () => {
    setCart((prev) => prev.filter((item) => initialCartIds.includes(item.id)));
    handleClose();
  };

  const filteredProducts = useMemo(() => {
    let products = allProducts;

    if (productFilter) {
      products = products.filter((product) =>
        product.name.toLowerCase().includes(productFilter.toLowerCase()),
      );
    }
    if (selectedCategory !== "All") {
      products = products.filter(
        (product) => product.categoryName === selectedCategory,
      );
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
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && e.target === modalRef.current) {
      handleClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 w-full flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        !open ? "hidden" : ""
      } ${isClosing ? "opacity-0" : "opacity-100"}`}
      ref={modalRef}
      onMouseDown={handleBackdropClick}
    >
      <div
        className={`w-full max-w-7xl bg-card border border-border rounded-2xl shadow-2xl p-6 flex flex-col max-h-[95vh] overflow-hidden transition-all duration-300 ${
          isClosing
            ? "animate-out fade-out zoom-out-90"
            : "animate-in fade-in zoom-in-90"
        }`}
      >
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
              onClick={() => scrollTabs("left")}
              tabIndex={-1}
              aria-label="Scroll categories left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="overflow-x-auto flex-1 max-w-[50vw]">
              <div
                ref={tabsContainerRef}
                className="flex gap-1 bg-muted rounded-md p-1 border border-border whitespace-nowrap min-w-full overflow-x-auto scrollbar-thin"
              >
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
              onClick={() => scrollTabs("right")}
              tabIndex={-1}
              aria-label="Scroll categories right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div
          className="overflow-y-auto grid grid-cols-5 gap-3 h-[600px]"
          onScroll={handleScroll}
          style={{ minHeight: 200 }}
        >
          {filteredProducts.slice(0, visibleCount).map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              favorites={favorites}
              isInCart={(id) => cart.some((item) => item.id === id)}
              getCartQuantity={(id) => {
                const item = cart.find((item) => item.id === id);
                return item ? item.qty : 0;
              }}
              handleAddToCart={(product) => {
                const exists = cart.find((item) => item.id === product.id);
                if (exists) {
                  setCart((prev) =>
                    prev.filter((item) => item.id !== product.id),
                  );
                } else {
                  setCart((prev) => [
                    ...prev,
                    {
                      id: product.id,
                      name: product.name,
                      price: product.selling,
                      qty: 1,
                    },
                  ]);
                }
              }}
              handleQuantityChange={(product, newQty) => {
                if (newQty <= 0) {
                  setCart((prev) =>
                    prev.filter((item) => item.id !== product.id),
                  );
                } else {
                  setCart((prev) => {
                    const updated = [...prev];
                    const exists = updated.find(
                      (item) => item.id === product.id,
                    );
                    if (exists) {
                      exists.qty = newQty;
                    } else {
                      updated.push({
                        id: product.id,
                        name: product.name,
                        price: product.selling,
                        qty: newQty,
                      });
                    }
                    return updated;
                  });
                }
              }}
              toggleFavorite={toggleFavorite}
            />
          ))}

          {/* Loading skeletons */}
          {loadingMore &&
            Array.from({ length: 100 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="p-4 border rounded-lg h-[200px] flex flex-col gap-2"
              >
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}

          {/* Show message when all products are loaded */}
          {visibleCount >= filteredProducts.length &&
            filteredProducts.length > 0 && (
              <div className="col-span-4 flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3 p-6 bg-muted/50 rounded-xl border border-border/50">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <div className="text-center">
                    <p className="font-medium text-foreground">
                      {t("cashier.allProductsLoaded", "All products loaded")}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t(
                        "cashier.productsCount",
                        "{{count}} products available",
                        { count: filteredProducts.length },
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
        <div className="flex justify-center gap-2 mt-2">
          <button
            onClick={handleClose}
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
});

export default ProductBrowser;
