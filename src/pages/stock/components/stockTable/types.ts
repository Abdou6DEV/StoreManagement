import type { ProductWithSales } from "../../../../types";

export interface StockTableFilters {
  lowStock: boolean;
  bestSelling: boolean;
  worstSelling: boolean;
  noBarcode: boolean;
  search: string;
  category: string;
}

export interface ConfirmDeleteState {
  open: boolean;
  productId: string | null;
  productName: string;
}

export interface ProductInfoState {
  open: boolean;
  productId: string | null;
  data: any | null;
  loading: boolean;
}

export interface StockRowProps {
  product: ProductWithSales;
  setEditingProductID: (id: string) => void;
  handleDeleteProduct: (id: string) => void;
  handleViewProductInfo: (id: string) => void;
}

export interface FiltersProps {
  filters: StockTableFilters;
  viewMode: "product" | "category";
  categories: string[];
  itemsPerPage: number;
  onFilterChange: (
    key: keyof StockTableFilters,
    value: boolean | string,
  ) => void;
  onItemsPerPageChange: (size: number) => void;
  onToggleFilter: (
    filterKey: "lowStock" | "bestSelling" | "worstSelling" | "noBarcode",
  ) => void;
  onRemoveFilter: (filterName: string) => void;
  getActiveFilterCount: () => number;
  getActiveFiltersSummary: () => string[];
}

export interface TableHeaderProps {
  viewMode: "product" | "category";
  onViewModeChange: () => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  viewMode: "product" | "category";
  filteredCategorySummaries: any[];
  itemsPerPage: number;
}

export interface TotalsFooterProps {
  filteredList: ProductWithSales[];
}

export interface CategorySummary {
  category: string;
  totalQuantity: number;
  totalBought: number;
  totalSelling: number;
  totalProfit: number;
}
