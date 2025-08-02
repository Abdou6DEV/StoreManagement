import { Star, Plus, Minus, Image } from "lucide-react";
import { Tooltip } from "../../../lib/components/tooltip";
import type { ProductWithSales } from "../../../types";
import { useTranslation } from "react-i18next";
import { useRef, useEffect, useState } from "react";

export default function ProductCard({
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
  const nameRef = useRef<HTMLDivElement>(null);
  const [isTextTruncated, setIsTextTruncated] = useState(false);

  useEffect(() => {
    const checkTextTruncation = () => {
      if (nameRef.current) {
        const element = nameRef.current;
        // Check if text exceeds 2 lines (approximately 2.5rem height)
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
        const maxHeight = lineHeight * 2; // Exactly 2 lines
        setIsTextTruncated(element.scrollHeight > maxHeight);
      }
    };

    checkTextTruncation();
    // Re-check on window resize
    window.addEventListener("resize", checkTextTruncation);
    return () => window.removeEventListener("resize", checkTextTruncation);
  }, [product.name]);

  return (
    <div
      key={product.id}
      className={`p-5 border rounded-lg h-[220px] cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden w-full ${
        isInCart(product.id)
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary hover:shadow-md"
      }`}
      onClick={() => handleAddToCart(product)}
    >
      {/* Stock Quantity Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="bg-gray-600 text-white text-xs font-semibold px-2.5 py-1.5 rounded-full shadow-sm">
          {product.quantity}
        </div>
      </div>

      {/* Product Image/Icon Area */}
      <div className="flex items-center justify-center w-full h-24 mb-4 bg-muted/30 rounded-md overflow-hidden flex-shrink-0">
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
        <div className={`w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-400 ${product.photo ? "hidden" : ""}`}>
          <Image
            className="w-12 h-12 text-gray-600 dark:text-gray-300"
          />
        </div>
      </div>

      {/* Product Info */}
      <div className="flex items-start justify-between w-full flex-1 gap-3">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          {isTextTruncated ? (
            <Tooltip content={product.name} position="top" className="max-w-xs">
              <div
                ref={nameRef}
                className="font-medium text-sm break-words leading-tight min-h-[2.5rem] max-h-[2.5rem] flex-1 overflow-hidden cursor-pointer"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: "1.25rem",
                }}
              >
                {product.name}
              </div>
            </Tooltip>
          ) : (
            <div
              ref={nameRef}
              className="font-medium text-sm break-words leading-tight min-h-[2.5rem] max-h-[2.5rem] flex-1 overflow-hidden"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                lineHeight: "1.25rem",
              }}
            >
              {product.name}
            </div>
          )}
          <div className="flex items-center justify-between flex-shrink-0 mt-auto">
            <div className="text-sm font-semibold text-green-600 leading-tight">
              {product.selling.toLocaleString()} {t("cashier.currency", "DA")}
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
          >
            <Star
              className={`w-4 h-4 ${favorites.includes(product.id) ? "fill-current" : ""}`}
            />
          </button>
        </Tooltip>
      </div>

      {isInCart(product.id) && (
        <div className="absolute left-0 right-0 bottom-3 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto z-20 bg-background/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-border">
            <button
              className="w-7 h-7 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-200 flex items-center justify-center border border-border hover:border-primary hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(product, getCartQuantity(product.id) - 1);
              }}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 text-sm font-semibold select-none cursor-pointer text-foreground min-w-[2rem] text-center">
              {getCartQuantity(product.id)}
            </span>
            <button
              className="w-7 h-7 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground text-muted-foreground transition-all duration-200 flex items-center justify-center border border-border hover:border-primary hover:scale-105 active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                handleQuantityChange(product, getCartQuantity(product.id) + 1);
              }}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
