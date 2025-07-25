export interface Client {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  totalPurchases?: number;
}

export interface ClientSuggestion {
  id: string;
  name: string;
  phone?: string;
}
