import type {
  Product,
  Payment,
  Client,
  Purchase,
  PurchaseItem,
} from "@prisma/client";

export type ToastType = "success" | "error" | "info";
export type Theme = "light" | "dark";
export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full" | "auto";
export type ModalType = "dialog" | "overlay";
export type ClientWithTotalPurchases = Client & { 
  totalPurchases: number;
  totalCredit: number;
  totalVersement: number;
};
export type TabType = "summary" | "credits" | "versements";
export type AggregationLevel = "day" | "month" | "year";

export type SaleForHistory = Sale & {
  client?: {
    name: string;
    phone?: string;
  } | null;
  saleItems: Array<
    SaleItem & {
      product?: { name: string } | null;
      manualProduct?: { name: string } | null;
      service?: { name: string } | null;
    }
  >;
  // Pre-calculated totals for performance
  totalAmount?: number;
  totalAmountWithDiscount?: number;
  totalItems?: number;
  totalCost?: number;
  totalProfit?: number;
};

export type PaymentForHistory = Payment & {
  client: {
    name: string;
    phone?: string;
  };
  sale?: {
    id: string;
    createdAt: Date;
  } | null;
};

export type PurchaseForHistory = Purchase & {
  seller?: {
    name: string;
    phone?: string;
  } | null;
  PurchaseItems: Array<
    PurchaseItem & {
      product: {
        name: string;
        categoryName: string;
      };
    }
  >;
};

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  boughtPrice?: number; // Store the bought price for products
  isManual?: boolean;
  manualProductType?: string;
  manualProductCostPrice?: number;
  isService?: boolean;
  serviceId?: string; // Add serviceId for proper ID-based tracking
  description?: string;
  serviceCostPrice?: number;
  serviceAppointmentId?: string; // Link to ServiceAppointment when service is from a completed appointment
  categoryInfo?: CategoryInfo[]; // Array of category info, one per unit (for receipt display only)
}

export interface CategoryInfo {
  imeiSerialNumber?: string;
  warranty?: string;
  usedNew?: "used" | "new";
  problemsReplacedParts?: string;
  specifications?: string;
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
  sellerName: string;
  photo: string | null;
}

export interface MultiProductItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number | "";
  price: number | "";
}

export interface MultiStockFormState {
  sellerId: string;
  items: MultiProductItem[];
}

export interface PaymentWithDetails extends Payment {
  client: { name: string; phone?: string };
  sale: { id: string };
}

export interface PaymentWithClient extends Omit<Payment, 'pendingSaleItems' | 'discount'> {
  client: {
    id: string;
    name: string;
    phone?: string;
  };
  sale: {
    id: string;
    createdAt: Date;
    totalAmount: number;
    totalAmountWithDiscount: number;
  } | null;
  remainingAmount?: number;
  pendingSaleItems?: string | null;
  discount?: number | null;
  reason?: string | null;
}

export interface StockContextType {
  categories: string[];
  products: ProductWithSales[];
  loading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
  refetchProducts: () => Promise<void>;
  updateProductQuantities: (updates: Array<{ productId: string; quantityChange: number }>) => void;
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
  boughtPrice?: number | null;
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
    serviceAppointmentId?: string | null;
    costPrice?: number;
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
    paidDate?: Date | null;
    dueDate?: Date | null;
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
  className?: string;
  loading?: boolean;
  icon?: React.ReactNode;
}

export interface SummaryStats {
  totalCredits: number;
  totalVersements: number;
  paidCredits: number;
  paidVersements: number;
  creditsCount: number;
  versementsCount: number;
  paidCreditsCount: number;
  paidVersementsCount: number;
}

export interface SelectedPeriod {
  period: AggregationLevel;
  periodValue: string;
}

export interface AggregatedData {
  period: string;
  revenue: number;
  profit: number;
  purchases: number;
  count: number;
  billsPayments: number;
}
