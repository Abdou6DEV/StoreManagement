import type { ProductWithSales, CartItem } from "../../../../types";

export interface ProductBrowserProps {
  allProducts: ProductWithSales[];
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addProductToCart: (cart: CartItem[], product: ProductWithSales, allProducts: ProductWithSales[], onOutOfStock: (product: ProductWithSales, currentQty: number) => void) => CartItem[] | null;
  onOutOfStock: (product: ProductWithSales, currentQty: number) => void;
  outOfStockConfirmed: boolean;
}

export interface ProductBrowserHeaderProps {
  productFilter: string;
  setProductFilter: (filter: string) => void;
  minPrice?: number;
  setMinPrice: (min?: number) => void;
  maxPrice?: number;
  setMaxPrice: (max?: number) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  categories: string[];
  filterInputRef: React.RefObject<HTMLInputElement>;
}

export interface ProductBrowserGridProps {
  filteredProducts: ProductWithSales[];
  visibleCount: number;
  loadingMore: boolean;
  favorites: string[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  toggleFavorite: (productId: string) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  addProductToCart: (cart: CartItem[], product: ProductWithSales, allProducts: ProductWithSales[], onOutOfStock: (product: ProductWithSales, currentQty: number) => void) => CartItem[] | null;
  onOutOfStock: (product: ProductWithSales, currentQty: number) => void;
  allProducts: ProductWithSales[];
  outOfStockConfirmed: boolean;
}

export interface ProductBrowserActionsProps {
  onConfirm: () => void;
  onCancel: () => void;
}
