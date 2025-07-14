import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { Product } from "@prisma/client";

interface StockContextType {
  categories: string[];
  products: Product[];
  loading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
  refetchProducts: () => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      const result = await window.api.database.categories.getAll();

      setCategories(result.map((category) => category.name));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch categories",
      );
      console.error("Error fetching categories:", err);
    }
  };

  const fetchProducts = async () => {
    try {
      const result = await window.api.database.products.getAll();
      setProducts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch products");
      console.error("Error fetching products:", err);
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

  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchCategories(), fetchProducts()]);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to initialize data",
        );
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const value: StockContextType = {
    categories,
    products,
    loading,
    error,
    refetchCategories,
    refetchProducts,
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
