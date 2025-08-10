import type { Product, Payment, Client } from "@prisma/client";

export type ToastType = "success" | "error" | "info";
export type Theme = "light" | "dark";
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full" | "auto";
export type ModalType = "dialog" | "overlay";
export type ClientWithTotalPurchases = Client & { totalPurchases: number };

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  isManual?: boolean;
  manualProductType?: string;
  isService?: boolean;
  description?: string;
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
  boughtPrice: number | "";
  sellingPrice: number | "";
  codebar: string;
  sellerId: string;
  photo: string | null;
}

export interface PaymentWithDetails extends Payment {
  client: { name: string; phone?: string };
  sale: { id: string };
}

export interface PaymentWithClient extends Payment {
  client: {
    id: string;
    name: string;
    phone?: string;
  };
  sale: {
    id: string;
    createdAt: Date;
  };
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

export interface SaleItem {
  id: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
  } | null;
  manualProduct?: {
    id: string;
    name: string;
    type: string;
  } | null;
  service?: {
    id: string;
    name: string;
    description?: string;
  } | null;
}

export interface Sale {
  id: string;
  createdAt: Date;
  client?: {
    name: string;
  } | null;
  saleItems: SaleItem[];
  totalAmount: number;
  totalAmountWithDiscount: number;
  paidAmount: number;
  remainingAmount: number;
  totalItems: number;
  discount: number;
  isPaidInCash: boolean;
  payment?: {
    id: string;
    givenAmount: number;
    type: "CREDIT" | "VERSEMENT";
  };
}

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export type DateRange = {
  startDate: Date | null;
  endDate: Date | null;
};