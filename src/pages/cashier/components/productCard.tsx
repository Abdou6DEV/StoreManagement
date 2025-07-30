import { Star, Plus, Minus } from "lucide-react";
import { Tooltip } from "../../../lib/components/tooltip";
import type { ProductWithSales } from "../../../types";
import { useTranslation } from "react-i18next";

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
  return (
    <div
      key={product.id}
      className={`p-2 border rounded-md min-h-[80px] cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden w-full ${
        isInCart(product.id)
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary"
      }`}
      onClick={() => handleAddToCart(product)}
    >
      <div className="flex items-start justify-between w-full">
        <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center h-full">
          <div className="font-semibold text-sm break-words leading-tight">
            {product.name}
          </div>
          <div className="text-sm text-muted-foreground leading-tight">
            {product.selling.toLocaleString()} {t("cashier.currency", "DA")}
          </div>
          <div className="text-xs text-muted-foreground leading-tight">
            {t("cashier.stock", "Stock")}: {product.quantity}
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
            className={`ml-1 transition ${
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
        <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center z-10 pointer-events-none">
          <div className="flex items-center gap-1.5 pointer-events-auto z-20 bg-background/95 backdrop-blur-sm rounded-lg px-2 py-1.5 shadow-lg border border-border">
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
