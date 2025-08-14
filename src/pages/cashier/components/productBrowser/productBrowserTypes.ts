import type { ProductWithSales, CartItem } from "../../../../types";

export interface ProductBrowserProps {
  allProducts: ProductWithSales[];
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
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
  tabsContainerRef: React.RefObject<HTMLDivElement>;
  scrollTabs: (direction: "left" | "right") => void;
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
}

export interface ProductBrowserActionsProps {
  onConfirm: () => void;
  onCancel: () => void;
}
