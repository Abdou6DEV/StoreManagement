import React, { useState, useEffect, useMemo } from "react";
import type { ProductWithSales, CartItem } from "../../../types";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import ProductCard from "./productCard";

interface FavoritesBrowserProps {
  allProducts: ProductWithSales[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
}

const FavoritesBrowser: React.FC<FavoritesBrowserProps> = ({
  allProducts,
  cart,
  setCart,
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
          console.error("Error loading favorites:", error);
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

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("cashier-favorites", JSON.stringify(favorites));
  }, [favorites]);

  // Get favorite products
  const favoriteProducts = useMemo(() => {
    return allProducts.filter((product) => favorites.includes(product.id));
  }, [allProducts, favorites]);

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

  const handleAddToCart = (product: ProductWithSales) => {
    const exists = cart.find((item) => item.id === product.id);
    if (exists) {
      // If product is already in cart, remove it
      setCart((prev) => prev.filter((item) => item.id !== product.id));
    } else {
      // If product is not in cart, add it
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
  };

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

  const isInCart = (productId: string) => {
    return cart.some((item) => item.id === productId);
  };

  const getCartQuantity = (productId: string) => {
    const item = cart.find((item) => item.id === productId);
    return item ? item.qty : 0;
  };

  const handleQuantityChange = (product: ProductWithSales, newQty: number) => {
    if (newQty <= 0) {
      setCart((prev) => prev.filter((item) => item.id !== product.id));
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
            price: product.selling,
            qty: newQty,
          });
        }
        return updated;
      });
    }
  };

  return (
    <div className="h-full overflow-hidden flex flex-col p-3">
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Favorites Section */}
        {favoriteProducts.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {favoriteProducts.length} {t("cashier.favorites", "favorites")}
            </div>
            <div className="grid grid-cols-3 gap-1">
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
          </div>
        )}

        {/* Frequently Used Section */}
        {frequentlyUsedProducts.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t("cashier.frequentlyUsed", "Frequently Used")}
            </div>
            <div className="grid grid-cols-3 gap-1">
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

        {/* Empty State */}
        {favoriteProducts.length === 0 &&
          frequentlyUsedProducts.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Star className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
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
    </div>
  );
};

export default FavoritesBrowser;
