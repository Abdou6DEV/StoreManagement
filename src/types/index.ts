import type { Product, Payment } from "@prisma/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface ClientSuggestion {
  id: string;
  name: string;
  phone?: string;
}

export interface ProductWithSales extends Product {
  totalSold?: number;
}

export interface AddStockFormState {
  name: string;
  categoryName: string;
  quantity: number | "";
  bought: number | "";
  selling: number | "";
  codebar: string;
}

export interface PaymentWithDetails extends Payment {
  client: { name: string; phone?: string };
  sale: { id: string };
}

export interface StockContextType {
  categories: string[];
  products: ProductWithSales[];
  loading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
  refetchProducts: () => Promise<void>;
}

export type Theme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
