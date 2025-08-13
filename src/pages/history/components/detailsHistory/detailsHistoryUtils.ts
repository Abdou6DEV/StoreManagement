export const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString()} DA`;
};

export const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString();
};

export const formatDateTime = (dateInput: string | Date) => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleString();
};
