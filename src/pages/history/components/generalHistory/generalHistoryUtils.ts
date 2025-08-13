export const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString()} DA`;
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
