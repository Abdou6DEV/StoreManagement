import { Star, Plus, Minus, Info } from "lucide-react";
import { Tooltip } from "../../../lib/components/tooltip";
import type { ProductWithSales } from "../../../types";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState, useMemo, memo, useCallback, Suspense, lazy } from "react";
import { ProductAvatar } from "../../../lib/components/productAvatar";
import { ProductPhotoImage } from "../../../lib/components/productPhotoImage";
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
  const [photoBroken, setPhotoBroken] = useState(false);
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

  useEffect(() => {
    setPhotoBroken(false);
  }, [product.photo]);

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

  const hasPhoto = Boolean(product.photo && !photoBroken);
  const showInfoPanel = !hasPhoto || isInCartValue;
  const showPriceOverlay = hasPhoto && !isInCartValue;

  const priceLine = (
    <span className="whitespace-nowrap text-sm font-semibold text-green-600">
      {product.sellingPrice.toLocaleString()} {t("cashier.currency", "DA")}
    </span>
  );

  const productDetails = (
    <div className="flex w-full flex-1 items-start justify-between gap-2 min-h-0">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Tooltip content={product.name} position="top" className="max-w-xs">
          <div ref={nameRef} className="truncate text-sm font-medium">
            {product.name}
          </div>
        </Tooltip>
        {product.categoryName ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-muted-foreground/50" />
            <span className="truncate">{product.categoryName}</span>
          </div>
        ) : null}
        <div className="flex flex-shrink-0 gap-3">
          {priceLine}
          <div className="flex items-center">
            <Tooltip content={t("cashier.productInfo", "Product info")}>
              <button
                onClick={handleShowInfo}
                className="text-gray-400 transition hover:text-blue-500"
              >
                <Info className="h-4 w-4" />
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
            className={`h-5 w-5 ${favorites.includes(product.id) ? "fill-current" : ""}`}
          />
        </button>
      </Tooltip>
    </div>
  );

  const stockBadge = (
    <div
      className={`rounded-full px-2 py-1 text-xs font-semibold shadow-sm ${
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
  );

  return (
    <div
      key={product.id}
      className={`group relative flex h-[180px] w-full cursor-pointer flex-col overflow-hidden rounded-lg border p-3 transition-[border-color,box-shadow,background-color] duration-200 ${
        showInfoPanel ? "justify-between" : "group-hover:justify-between"
      } ${
        isInCartValue
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary hover:shadow-md"
      }`}
      onClick={() => {
        if (isInCartValue) {
          handleQuantityChange(product, 0);
        } else {
          handleAddToCart(product);
        }
      }}
    >
      <div className="absolute right-3 top-3 z-20">{stockBadge}</div>

      <div
        className={`relative w-full shrink-0 overflow-hidden rounded-md bg-muted/30 transition-[height,margin-bottom] duration-300 ease-in-out ${
          showInfoPanel
            ? "mb-3 h-20"
            : "mb-0 h-[9.75rem] group-hover:mb-3 group-hover:h-20"
        }`}
      >
        {hasPhoto ? (
          <ProductPhotoImage
            src={product.photo!}
            alt={product.name}
            variant="card"
            className="absolute inset-0 h-full w-full"
            onError={() => setPhotoBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ProductAvatar name={product.name} size="lg" className="h-full w-full" />
          </div>
        )}

        {showPriceOverlay ? (
          <div className="pointer-events-none absolute bottom-0 left-0 z-10 transition-opacity duration-300 group-hover:opacity-0">
            <div className="rounded-md bg-background/80 px-1 py-0 backdrop-blur-sm">
              {priceLine}
            </div>
          </div>
        ) : null}
      </div>

      <div className="w-full shrink-0 overflow-hidden">
        <div
          className={`transition-transform duration-300 ease-in-out ${
            showInfoPanel
              ? "translate-y-0"
              : "pointer-events-none translate-y-full group-hover:pointer-events-auto group-hover:translate-y-0"
          }`}
        >
          {productDetails}
        </div>
      </div>

      {showInfo ? (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            </div>
          }
        >
          <ProductInfoModal
            open={showInfo}
            onOpenChange={setShowInfo}
            productData={productInfoData}
            loading={productInfoLoading}
          />
        </Suspense>
      ) : null}

      {isInCartValue ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex items-center justify-center">
          <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all duration-200 hover:scale-105 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(product, cartQuantity - 1);
              }}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[2rem] cursor-pointer select-none px-2.5 text-center text-sm font-semibold text-foreground">
              {cartQuantity}
            </span>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition-all duration-200 hover:scale-105 hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(product, cartQuantity + 1);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
});

export default ProductCard;