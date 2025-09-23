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

export const calculateGrowthRate = (current: number, previous: number): number => {
  // Handle NaN and invalid numbers
  if (isNaN(current) || isNaN(previous) || !isFinite(current) || !isFinite(previous)) {
    return 0;
  }
  
  // Handle division by zero
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  
  return ((current - previous) / previous) * 100;
};

export const formatGrowthRate = (growthRate: number): string => {
  if (isNaN(growthRate) || !isFinite(growthRate)) {
    return "0.0%";
  }
  
  const sign = growthRate >= 0 ? "+" : "";
  return `${sign}${growthRate.toFixed(1)}%`;
};