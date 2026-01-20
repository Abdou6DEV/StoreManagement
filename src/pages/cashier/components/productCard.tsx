import { Star, Plus, Minus, Info } from "lucide-react";
import { Tooltip } from "../../../lib/components/tooltip";
import type { ProductWithSales } from "../../../types";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState, useMemo, memo, useCallback, Suspense, lazy } from "react";
import { ProductAvatar } from "../../../lib/components/productAvatar";
import { useLowStock } from "../../../lib/contexts/lowStockContext";

// Lazy load the ProductInfoModal to improve initial bundle size
const ProductInfoModal = lazy(() => import("../../stock/components/productInfoModal").then(module => ({ default: module.ProductInfoModal })));

const ProductCard = memo(function ProductCard({
  product,
  favorites,
  isInCart,
  getCartQuantity,
  handleAddToCart,
  handleQuantityChange,
  toggleFavorite,
}: {
  product: ProductWithSales;
  favorites: string[];
  isInCart: (id: string) => boolean;
  getCartQuantity: (id: string) => number;
  handleAddToCart: (product: ProductWithSales) => void;
  handleQuantityChange: (product: ProductWithSales, quantity: number) => void;
  toggleFavorite: (productId: string) => void;
}) {
  const { t } = useTranslation();
  const { lowStockThreshold } = useLowStock();
  const nameRef = useRef<HTMLDivElement>(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [productInfoData, setProductInfoData] = useState<ProductWithSales | null>(null);
  const [productInfoLoading, setProductInfoLoading] = useState(false);

  // Memoize text truncation check to avoid expensive DOM calculations
  const checkTextTruncation = useCallback(() => {
    if (nameRef.current) {
      const element = nameRef.current;
      // Check if text is truncated (single line with ellipsis)
      setIsTextTruncated(element.scrollWidth > element.clientWidth);
    }
  }, []);

  useEffect(() => {
    checkTextTruncation();
    // Re-check on window resize with throttling
    let timeoutId: NodeJS.Timeout;
    const throttledCheck = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkTextTruncation, 100);
    };
    
    window.addEventListener("resize", throttledCheck);
    return () => {
      window.removeEventListener("resize", throttledCheck);
      clearTimeout(timeoutId);
    };
  }, [checkTextTruncation]);

  const handleShowInfo = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfo(true);
    
    // Fetch full product data with purchase and sales history
    setProductInfoLoading(true);
    try {
      const fullProductData = await window.api.database.products.getWithPurchaseHistory(product.id);
      setProductInfoData(fullProductData);
    } catch (error) {
      console.error("Failed to fetch product info:", error);
      // Fallback to basic product data if fetch fails
      setProductInfoData(product);
    } finally {
      setProductInfoLoading(false);
    }
  }, [product.id, product]);

  // Memoize expensive calculations
  const currentQuantity = useMemo(() => {
    return isInCart(product.id)
      ? product.quantity - getCartQuantity(product.id)
      : product.quantity;
  }, [isInCart, product.id, product.quantity, getCartQuantity]);

  const isOutOfStock = useMemo(() => {
    return currentQuantity === 0;
  }, [currentQuantity]);

  // Low stock warning: only show if threshold > 0 and quantity is within threshold
  // If threshold is 0, user has disabled low stock warnings, so no orange badge
  const isLowStock = useMemo(() => {
    return lowStockThreshold > 0 && currentQuantity > 0 && currentQuantity <= lowStockThreshold;
  }, [currentQuantity, lowStockThreshold]);

  const isInCartValue = useMemo(() => {
    return isInCart(product.id);
  }, [isInCart, product.id]);

  const cartQuantity = useMemo(() => {
    return getCartQuantity(product.id);
  }, [getCartQuantity, product.id]);

  return (
    <div
      key={product.id}
      className={`p-3 border rounded-lg h-[180px] cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden w-full ${
        isInCartValue
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary hover:shadow-md"
      }`}
      onClick={() => {
        if (isInCartValue) {
          // If product is in cart, remove it
          handleQuantityChange(product, 0);
        } else {
          // If product is not in cart, add it
          handleAddToCart(product);
        }
      }}
    >
      {/* Stock Quantity Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className={`text-xs font-semibold px-2 py-1 rounded-full shadow-sm ${
            isInCartValue
              ? isOutOfStock
                ? "bg-red-600 text-white"
                : isLowStock
                ? "bg-orange-500 text-white"
                : "bg-primary text-primary-foreground"
              : isOutOfStock
              ? "bg-red-600 text-white"
              : isLowStock
              ? "bg-orange-500 text-white"
              : "bg-gray-600 text-white"
          }`}
        >
          {isOutOfStock ? t("cashier.outOfStockShort", "Out") : currentQuantity}
        </div>
      </div>

      {/* Product Image/Icon Area */}
      <div className="flex items-center justify-center w-full h-20 mb-3 bg-muted/30 rounded-md overflow-hidden flex-shrink-0">
        {product.photo ? (
          <img
            src={product.photo}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              target.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={`w-full h-full flex items-center justify-center ${product.photo ? "hidden" : ""}`}
        >
          <ProductAvatar
            name={product.name}
            size="lg"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex items-start justify-between w-full flex-1 gap-2">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Tooltip content={product.name} position="top" className="max-w-xs">
            <div
              ref={nameRef}
              className="font-medium text-sm truncate"
            >
              {product.name}
            </div>
          </Tooltip>
          {product.categoryName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50 flex-shrink-0"></div>
              <span className="truncate">{product.categoryName}</span>
            </div>
          )}
          <div className="flex gap-3 flex-shrink-0">
            <div className="text-sm font-semibold text-green-600 whitespace-nowrap">
              {product.sellingPrice.toLocaleString()}{" "}
              {t("cashier.currency", "DA")}
            </div>
            <div className="flex items-center">
              <Tooltip content={t("cashier.productInfo", "Product info")}>
                <button
                  onClick={handleShowInfo}
                  className="transition text-gray-400 hover:text-blue-500"
                >
                  <Info className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
        <Tooltip
          content={
            favorites.includes(product.id)
              ? t("cashier.removeFromFavorites", "Remove from favorites")
              : t("cashier.addToFavorites", "Add to favorites")
          }
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(product.id);
            }}
            className={`transition ${
              favorites.includes(product.id)
                ? "text-yellow-500 hover:text-yellow-600"
                : "text-gray-400 hover:text-yellow-500"
            }`}
            style={{ marginLeft: 4 }}
          >
            <Star
              className={`w-5 h-5 ${favorites.includes(product.id) ? "fill-current" : ""}`}
            />
          </button>
        </Tooltip>
      </div>

        {/* Product Info Modal - Moved outside clickable area */}
        {showInfo && (
          <Suspense fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            </div>
          }>
            <ProductInfoModal
              open={showInfo}
              onOpenChange={setShowInfo}
              productData={productInfoData}
              loading={productInfoLoading}
            />
          </Suspense>
        )}

      {isInCartValue && (
        <div className="absolute left-0 right-0 bottom-3 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto z-20 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border">
            <button
              className="w-7 h-7 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-200 flex items-center justify-center border border-border hover:border-primary hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(product, cartQuantity - 1);
              }}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 text-sm font-semibold select-none cursor-pointer text-foreground min-w-[2rem] text-center">
              {cartQuantity}
            </span>
            <button
              className="w-7 h-7 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-200 flex items-center justify-center border border-border hover:border-primary hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(product, cartQuantity + 1);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default ProductCard;
