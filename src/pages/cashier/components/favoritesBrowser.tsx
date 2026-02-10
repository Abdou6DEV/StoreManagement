import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { ProductWithSales, CartItem } from "../../../types";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import ProductCard from "./productCard";
import rendererLogger from "../../../lib/logger/rendererLogger";

interface FavoritesBrowserProps {
  allProducts: ProductWithSales[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addProductToCart: (cart: CartItem[], product: ProductWithSales, allProducts: ProductWithSales[], onOutOfStock: (product: ProductWithSales, currentQty: number) => void) => CartItem[] | null;
  onOutOfStock: (product: ProductWithSales, currentQty: number) => void;
  outOfStockConfirmed: boolean;
}

const FavoritesBrowser: React.FC<FavoritesBrowserProps> = ({
  allProducts,
  cart,
  setCart,
  addProductToCart,
  onOutOfStock,
  outOfStockConfirmed,
}) => {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load favorites from localStorage on mount and listen for changes
  useEffect(() => {
    const loadFavorites = () => {
      const savedFavorites = localStorage.getItem("cashier-favorites");
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites));
        } catch (error) {
          rendererLogger.error(
            "Error loading favorites",
            "FavoritesBrowser",
            error,
          );
        }
      }
    };

    // Load initially
    loadFavorites();

    // Listen for storage events (when other components update localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "cashier-favorites") {
        loadFavorites();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom events (for same-window updates)
    const handleCustomStorageChange = () => {
      loadFavorites();
    };

    window.addEventListener("favorites-updated", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "favorites-updated",
        handleCustomStorageChange,
      );
    };
  }, []);

  // Save favorites to localStorage whenever they change (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem("cashier-favorites", JSON.stringify(favorites));
    }, 100); // Small delay to batch rapid changes

    return () => clearTimeout(timeoutId);
  }, [favorites]);

  // Get favorite products in the same order as favorites (no sorting)
  const favoriteProducts = useMemo(() => {
    const byId = new Map(allProducts.map((p) => [p.id, p]));
    return favorites
      .map((id) => byId.get(id))
      .filter((p): p is ProductWithSales => p != null);
  }, [allProducts, favorites]);

  const hasAnyProducts = allProducts.length > 0;

  // Get frequently used products (top 10 by highest sold quantity)
  const frequentlyUsedProducts = useMemo(() => {
    return allProducts
      .filter((product) => !favorites.includes(product.id)) // Exclude favorites
      .sort((a, b) => {
        // Sort by sold quantity (highest first)
        const soldA = a.totalSold ?? 0;
        const soldB = b.totalSold ?? 0;
        return soldB - soldA;
      })
      .slice(0, 10); // Show top 10
  }, [allProducts, favorites]);

  const handleAddToCart = useCallback((product: ProductWithSales) => {
    const updatedCart = addProductToCart(cart, product, allProducts, onOutOfStock);
    if (updatedCart) {
      setCart(updatedCart);
    }
  }, [cart, addProductToCart, allProducts, onOutOfStock, setCart]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];

      // Dispatch custom event to notify other components (localStorage is handled by useEffect)
      window.dispatchEvent(new CustomEvent("favorites-updated"));

      return newFavorites;
    });
  }, []);

  const isInCart = useCallback((productId: string) => {
    return cart.some((item) => item.id === productId);
  }, [cart]);

  const getCartQuantity = useCallback((productId: string) => {
    const item = cart.find((item) => item.id === productId);
    return item ? item.qty : 0;
  }, [cart]);

  const handleQuantityChange = useCallback((product: ProductWithSales, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== product.id));
    } else if (product.quantity > 0 && newQty > product.quantity && !outOfStockConfirmed) {
      // Product is out of stock, show modal (only for products with stock > 0)
      onOutOfStock(product, cart.find((item) => item.id === product.id)?.qty || 0);
    } else {
      setCart((prev) => {
        const updated = [...prev];
        const exists = updated.find((item) => item.id === product.id);
        if (exists) {
          exists.qty = newQty;
        } else {
          updated.push({
            id: product.id,
            name: product.name,
            price: product.sellingPrice,
            qty: newQty,
          });
        }
        return updated;
      });
    }
  }, [setCart, outOfStockConfirmed, onOutOfStock, cart]);

  return (
    <div className="h-full overflow-hidden flex flex-col p-3">
      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Favorites Section */}
        {hasAnyProducts && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {t("cashier.favorites", "Favorites")}
            </div>
            {favoriteProducts.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {favoriteProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    favorites={favorites}
                    isInCart={isInCart}
                    getCartQuantity={getCartQuantity}
                    handleAddToCart={handleAddToCart}
                    handleQuantityChange={handleQuantityChange}
                    toggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground border border-dashed rounded-lg">
                <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <div className="text-sm">
                  {t("cashier.noFavorites", "No favorites yet")}
                </div>
                <div className="text-xs">
                  {t(
                    "cashier.addFavoritesHint",
                    "Click the star icon on products to add them to favorites",
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Frequently Used Section */}
        {frequentlyUsedProducts.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t("cashier.frequentlyUsed", "Frequently Used")}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {frequentlyUsedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  favorites={favorites}
                  isInCart={isInCart}
                  getCartQuantity={getCartQuantity}
                  handleAddToCart={handleAddToCart}
                  handleQuantityChange={handleQuantityChange}
                  toggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - Only when no products exist at all */}
        {!hasAnyProducts && (
          <div className="text-center py-6 text-muted-foreground">
            <div className="text-sm">
              {t("cashier.noProductsAvailable", "No products available yet")}
            </div>
            <div className="text-xs">
              {t(
                "cashier.addProductsHint",
                "Add products from the stock screen to see them here",
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesBrowser;
