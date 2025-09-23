import i18next from "i18next";

export const formatCurrency = (amount: number | undefined | null) => {
  const currency = i18next.t("currency");
  const safeAmount = amount || 0;
  return `${safeAmount.toLocaleString()} ${currency}`;
};

export const formatNumber = (num: number | undefined | null) => {
  const safeNum = num || 0;
  return safeNum.toLocaleString();
};

export const formatPeriod = (
  period: string,
  aggregationLevel: "day" | "month" | "year",
) => {
  if (aggregationLevel === "day") {
    return new Date(period).toLocaleDateString();
  } else if (aggregationLevel === "month") {
    const [year, month] = period.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    if (isNaN(date.getTime())) {
      console.warn("Invalid month period:", period);
      return period; // Return the raw period if date is invalid
    }
    return date.toLocaleDateString(
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
