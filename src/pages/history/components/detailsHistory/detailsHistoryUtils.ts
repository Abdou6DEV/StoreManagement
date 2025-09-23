import i18next from "i18next";

export const formatCurrency = (amount: number) => {
  const currency = i18next.t("currency");
  // Convert from centimes to main currency unit
  const mainAmount = amount / 100;
  return `${mainAmount.toLocaleString()} ${currency}`;
};

export const formatCurrencyWithStyle = (amount: number) => {
  const currency = i18next.t("currency");
  // Convert from centimes to main currency unit
  const mainAmount = amount / 100;
  return {
    amount: mainAmount.toLocaleString(),
    currency: currency,
    full: `${mainAmount.toLocaleString()} ${currency}`
  };
};

export const formatDate = (dateInput: string | Date) => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleDateString();
};

export const formatDateTime = (dateInput: string | Date) => {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return date.toLocaleString();
};
