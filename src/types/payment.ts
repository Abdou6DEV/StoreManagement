export interface Payment {
  saleId: string;
  clientId: string;
  paidAmount: number;
  dueAt: string;
  paidAt?: string;
  createdAt: string;
  type: "CREDIT" | "VERSEMENT";
  client?: { name: string; phone?: string };
  sale?: { id: string };
}

export interface PaymentWithDetails {
  id: string;
  saleId: string;
  clientId: string;
  paidAmount: number;
  dueAt: string;
  paidAt?: string;
  createdAt: string;
  type: "CREDIT" | "VERSEMENT";
  client: { name: string; phone?: string };
  sale: { id: string };
}
