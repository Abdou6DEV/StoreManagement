export type OrderStatus = "pending" | "stocked" | "completed";

export type OrderInput = {
  productName: string;
  details: string;
  quantity: number;
  clientId: string | null;
  dueDate: string;
  paidAmount: number | null;
};

export type OrderRecord = OrderInput & {
  id: string;
  clientName: string;
  clientPhone: string | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
};