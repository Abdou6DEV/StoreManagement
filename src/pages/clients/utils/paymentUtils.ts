import type { PaymentWithClient } from "../../../types";

export const isOverdue = (dueDate: Date) => {
  return new Date(dueDate) < new Date() && new Date(dueDate).getTime() !== 0;
};

export const isDueSoon = (dueDate: Date) => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 7;
};

export const getFilteredPayments = (
  payments: PaymentWithClient[],
  search: string,
  statusFilter: "all" | "paid" | "unpaid",
  typeFilter: "all" | "CREDIT" | "VERSEMENT",
  dateFilter: "all" | "overdue" | "dueSoon",
) => {
  return payments.filter((payment) => {
    // Search filter
    const matchesSearch =
      payment.client.name.toLowerCase().includes(search.toLowerCase()) ||
      (payment.client.phone && payment.client.phone.includes(search));

    // Status filter
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "paid" && payment.paidDate) ||
      (statusFilter === "unpaid" && !payment.paidDate);

    // Type filter
    const matchesType = typeFilter === "all" || payment.type === typeFilter;

    // Date filter
    let matchesDate = true;
    if (dateFilter === "overdue") {
      // Only show overdue for unpaid payments
      matchesDate = !payment.paidDate && isOverdue(payment.dueDate);
    } else if (dateFilter === "dueSoon") {
      // Only show due soon for unpaid payments
      matchesDate = !payment.paidDate && isDueSoon(payment.dueDate);
    }

    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });
};
