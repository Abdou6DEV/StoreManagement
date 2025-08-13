import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useStock } from "../../../../lib/contexts/stockContext";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import ProductBrowserHeader from "./productBrowserHeader";
import ProductBrowserGrid from "./productBrowserGrid";
import ProductBrowserActions from "./productBrowserActions";
import { filterProducts, loadMoreProducts } from "./productBrowserUtils";
import type { ProductBrowserProps } from "./productBrowserTypes";

const ProductBrowser = forwardRef<
  { handleClose: () => void },
  ProductBrowserProps
>(({ allProducts, open, onClose, cart, setCart }, ref) => {
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

  const tabsContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (open) {
      const container = tabsContainerRef.current;
      if (container) {
        container.scrollLeft = 0;
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
  }, [open, cart]);

  useEffect(() => {
    if (open) {
      const savedFavorites = localStorage.getItem("cashier-favorites");
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites));
        } catch (error) {
          rendererLogger.error(
            "Error loading favorites",
            "ProductBrowser",
            error,
          );
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
    return filterProducts(allProducts, productFilter, selectedCategory);
  }, [allProducts, productFilter, selectedCategory]);

  useEffect(() => {
    setVisibleCount(50);
  }, [productFilter]);

  const handleLoadMore = () => {
    loadMoreProducts(
      visibleCount,
      filteredProducts.length,
      setVisibleCount,
      setLoadingMore,
    );
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
    if (isNearBottom && !loadingMore) {
      handleLoadMore();
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
        <ProductBrowserHeader
          productFilter={productFilter}
          setProductFilter={setProductFilter}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          filterInputRef={filterInputRef}
          tabsContainerRef={tabsContainerRef}
          scrollTabs={scrollTabs}
        />

        <ProductBrowserGrid
          filteredProducts={filteredProducts}
          visibleCount={visibleCount}
          loadingMore={loadingMore}
          favorites={favorites}
          cart={cart}
          setCart={setCart}
          toggleFavorite={toggleFavorite}
          handleScroll={handleScroll}
        />

        <ProductBrowserActions
          onConfirm={handleClose}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
});

export default ProductBrowser;
