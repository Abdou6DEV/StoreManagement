import i18next from "i18next";

export const formatCurrency = (amount: number) => {
  const currency = i18next.t("currency");
  // Remove last two zeros to bypass the 00 issue
  const amountStr = amount.toString();
  const formattedAmount = amountStr.endsWith('00') ? amountStr.slice(0, -2) : amountStr;
  return `${formattedAmount.toLocaleString()} ${currency}`;
};

export const formatCurrencyWithStyle = (amount: number) => {
  const currency = i18next.t("currency");
  // Remove last two zeros to bypass the 00 issue
  const amountStr = amount.toString();
  const formattedAmount = amountStr.endsWith('00') ? amountStr.slice(0, -2) : amountStr;
  return {
    amount: formattedAmount.toLocaleString(),
    currency: currency,
    full: `${formattedAmount.toLocaleString()} ${currency}`
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
