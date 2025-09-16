import React from "react";
import ProductCard from "../productCard";
import { Skeleton } from "../../../../lib/components/skeleton";
import type { ProductBrowserGridProps } from "./productBrowserTypes";

const ProductBrowserGrid: React.FC<ProductBrowserGridProps> = ({
  filteredProducts,
  visibleCount,
  loadingMore,
  favorites,
  cart,
  setCart,
  toggleFavorite,
  handleScroll,
  addProductToCart,
  onOutOfStock,
  allProducts,
  outOfStockConfirmed,
}) => {
  return (
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
            const updatedCart = addProductToCart(cart, product, allProducts, onOutOfStock);
            if (updatedCart) {
              setCart(updatedCart);
            }
          }}
          handleQuantityChange={(product, newQty) => {
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
          }}
          toggleFavorite={toggleFavorite}
        />
      ))}

      {/* Loading skeletons - Reduced from 100 to 20 for better performance */}
      {loadingMore &&
        Array.from({ length: 20 }).map((_, index) => (
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
    </div>
  );
};

export default ProductBrowserGrid;
