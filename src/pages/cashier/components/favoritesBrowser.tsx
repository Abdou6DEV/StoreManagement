import React, { useState, useEffect, useMemo } from "react";
import type { ProductWithSales } from "../../../types";
import type { CartItem } from "../../../types";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Tooltip } from "../../../lib/components/tooltip";

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
    const updated = [...cart];
    const exists = updated.find((item) => item.id === product.id);
    if (exists) {
      exists.qty += 1;
    } else {
      updated.push({
        id: product.id,
        name: product.name,
        price: product.selling,
        qty: 1,
      });
    }
    setCart(updated);
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
    <div className="bg-card border border-border rounded-xl p-3 shadow-sm h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {/* Favorites Section */}
        {favoriteProducts.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              {favoriteProducts.length} {t("cashier.favorites", "favorites")}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {favoriteProducts.map((product) => (
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
                      <div className="font-medium break-words leading-tight">
                        {product.name}
                      </div>
                      <div className="text-sm text-muted-foreground leading-tight">
                        {product.selling.toLocaleString()}{" "}
                        {t("cashier.currency", "DA")}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        {t("cashier.stock", "Stock")}: {product.quantity}
                      </div>
                    </div>
                    <Tooltip
                      content={
                        favorites.includes(product.id)
                          ? t(
                              "cashier.removeFromFavorites",
                              "Remove from favorites",
                            )
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
                      <div className="flex items-center gap-2 pointer-events-auto z-20">
                        <button
                          className="w-8 h-8 rounded-full bg-muted text-primary hover:bg-primary hover:text-primary-foreground text-base font-bold shadow flex items-center justify-center border border-border"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(
                              product,
                              getCartQuantity(product.id) - 1,
                            );
                          }}
                        >
                          -
                        </button>
                        <span className="px-2 text-base font-semibold select-none cursor-pointer">
                          {getCartQuantity(product.id)}
                        </span>
                        <button
                          className="w-8 h-8 rounded-full bg-muted text-primary hover:bg-primary hover:text-primary-foreground text-base font-bold shadow flex items-center justify-center border border-border"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(
                              product,
                              getCartQuantity(product.id) + 1,
                            );
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
            <div className="grid grid-cols-2 gap-2">
              {frequentlyUsedProducts.map((product) => (
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
                      <div className="font-medium break-words leading-tight">
                        {product.name}
                      </div>
                      <div className="text-sm text-muted-foreground leading-tight">
                        {product.selling.toLocaleString()}{" "}
                        {t("cashier.currency", "DA")}
                      </div>
                      <div className="text-xs text-muted-foreground leading-tight">
                        {t("cashier.stock", "Stock")}: {product.quantity}
                      </div>
                    </div>
                    <Tooltip
                      content={
                        favorites.includes(product.id)
                          ? t(
                              "cashier.removeFromFavorites",
                              "Remove from favorites",
                            )
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
                      <div className="flex items-center gap-2 pointer-events-auto z-20">
                        <button
                          className="w-8 h-8 rounded-full bg-muted text-primary hover:bg-primary hover:text-primary-foreground text-base font-bold shadow flex items-center justify-center border border-border"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(
                              product,
                              getCartQuantity(product.id) - 1,
                            );
                          }}
                        >
                          -
                        </button>
                        <span className="px-2 text-base font-semibold select-none cursor-pointer">
                          {getCartQuantity(product.id)}
                        </span>
                        <button
                          className="w-8 h-8 rounded-full bg-muted text-primary hover:bg-primary hover:text-primary-foreground text-base font-bold shadow flex items-center justify-center border border-border"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(
                              product,
                              getCartQuantity(product.id) + 1,
                            );
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
