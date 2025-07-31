import type { Product, Payment, Client } from "@prisma/client";

export type ToastType = "success" | "error" | "info";

export type Theme = "light" | "dark";

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
  sellerId: string;
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

export interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

export interface TooltipContextType {
  showTooltips: boolean;
  toggleTooltips: () => void;
}

export type { Client };

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
  };
}

export interface Sale {
  id: string;
  createdAt: Date;
  client?: {
    name: string;
  } | null;
  saleItems: SaleItem[];
  totalAmount: number;
  totalWithDiscount: number;
  totalPaid: number;
  totalItems: number;
  discount: number;
  isPaidInCash: boolean;
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}
