export type OrderDueState = "overdue" | "dueSoon" | null;

export function getOrderDueState(dueDate: string, status: string, thresholdDays: number, now = new Date()): OrderDueState {
  if (status === "completed") return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastDueSoonDate = new Date(today);
  lastDueSoonDate.setDate(lastDueSoonDate.getDate() + Math.max(0, thresholdDays));
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  if (dueDate < format(today)) return "overdue";
  return dueDate <= format(lastDueSoonDate) ? "dueSoon" : null;
}