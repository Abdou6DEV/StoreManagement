import i18next from "i18next";

export const formatCurrency = (amount: number) => {
  const currency = i18next.t("currency");
  return `${amount.toLocaleString()} ${currency}`;
};

export const formatNumber = (num: number) => {
  return num.toLocaleString();
};

export const formatPeriod = (
  period: string,
  aggregationLevel: "day" | "month" | "year",
) => {
  if (aggregationLevel === "day") {
    return new Date(period).toLocaleDateString();
  } else if (aggregationLevel === "month") {
    const [year, month] = period.split("-");
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
      undefined,
      {
        year: "numeric",
        month: "short",
      },
    );
  } else {
    return period;
  }
};
