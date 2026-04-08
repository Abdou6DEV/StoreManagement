import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import type { ProductWithSales, StockContextType } from "../../types";
import rendererLogger from "../logger/rendererLogger";
import { getWarmupSnapshot, subscribeWarmup } from "../warmup/appWarmup";

const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<ProductWithSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const result = await window.api.database.categories.getAll();

      setCategories(result.map((category: { name: string }) => category.name));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch categories"
      );
      rendererLogger.error("Error fetching categories", "StockContext", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const [result, salesCounts] = await Promise.all([
        window.api.database.products.getAll(),
        window.api.database.products.getSalesCounts(),
      ]);

      // Merge salesCounts into products
      const salesMap = new Map(
        salesCounts.map((s: { productId: string; totalSold: number }) => [
          s.productId,
          s.totalSold,
        ])
      );

      const merged = result.map((p: ProductWithSales) => ({
        ...p,
        totalSold: salesMap.get(p.id) || 0,
      }));
      setProducts(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
      rendererLogger.error("Error fetching products", "StockContext", err);
    }
  };

  const refetchCategories = async () => {
    setError(null);
    await fetchCategories();
  };

  const refetchProducts = async () => {
    setError(null);
    await fetchProducts();
  };

  // Lightweight update: only update specific products without refetching all
  const updateProductQuantities = (updates: Array<{ productId: string; quantityChange: number }>) => {
    setProducts(prevProducts =>
      prevProducts.map(product => {
        const update = updates.find(u => u.productId === product.id);
        if (update) {
          return {
            ...product,
            quantity: Math.max(0, product.quantity + update.quantityChange)
          };
        }
        return product;
      })
    );
  };

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        // Prefer warmup snapshot to avoid heavy fetch during initial UI animations.
        const snap = getWarmupSnapshot();
        if (snap.categories && snap.products && snap.salesCounts) {
          setCategories(snap.categories.map((c: { name: string }) => c.name));
          const salesMap = new Map(
            (snap.salesCounts as Array<{ productId: string; totalSold: number }>).map((s) => [
              s.productId,
              s.totalSold,
            ]),
          );
          setProducts(
            (snap.products as ProductWithSales[]).map((p: ProductWithSales) => ({
              ...p,
              totalSold: salesMap.get(p.id) || 0,
            })),
          );
        } else {
          await Promise.all([fetchCategories(), fetchProducts()]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize data"
        );
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Keep context in sync with warmup polling.
  useEffect(() => {
    return subscribeWarmup((detail) => {
      if (detail.key !== "stock") return;
      const snap = detail.snapshot;
      if (snap.categories) {
        setCategories(snap.categories.map((c: { name: string }) => c.name));
      }
      if (snap.products && snap.salesCounts) {
        const salesMap = new Map(
          (snap.salesCounts as Array<{ productId: string; totalSold: number }>).map((s) => [
            s.productId,
            s.totalSold,
          ]),
        );
        setProducts(
          (snap.products as ProductWithSales[]).map((p: ProductWithSales) => ({
            ...p,
            totalSold: salesMap.get(p.id) || 0,
          })),
        );
      }
    });
  }, []);

  const value: StockContextType = {
    categories,
    products,
    loading,
    error,
    refetchCategories,
    refetchProducts,
    updateProductQuantities,
  };

  return (
    <StockContext.Provider value={value}>{children}</StockContext.Provider>
  );
}

export const useStock = () => {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error("useStock must be used within a StockProvider");
  }
  return context;
};
