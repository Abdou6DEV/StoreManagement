import { Sale } from "../../../../types";

export interface HistoryBrowserProps {
  onSaleSelect?: (sale: Sale) => void;
  salesRefreshKey?: number;
}

export interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  refreshing: boolean;
}

export interface SalesListProps {
  sales: Sale[];
  loading: boolean;
  refreshing: boolean;
  searchTerm: string;
  onSaleClick: (sale: Sale) => void;
  onDeleteSale: (sale: Sale, event: React.MouseEvent) => void;
}

export interface SaleCardProps {
  sale: Sale;
  index: number;
  refreshing: boolean;
  onClick: () => void;
  onDelete: (event: React.MouseEvent) => void;
}

export interface SaleItemPreviewProps {
  saleItems: Sale["saleItems"];
}

export interface SaleHeaderProps {
  sale: Sale;
}

export interface SaleFooterProps {
  sale: Sale;
  onDelete: (event: React.MouseEvent) => void;
}
