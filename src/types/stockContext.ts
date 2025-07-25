import type { ProductWithSales } from "./product";

export interface StockContextType {
  categories: string[];
  products: ProductWithSales[];
  loading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
  refetchProducts: () => Promise<void>;
}
