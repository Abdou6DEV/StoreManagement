export interface Product {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  bought: number;
  selling: number;
  codebar?: string;
  createdAt: string;
  updatedAt: string;
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
