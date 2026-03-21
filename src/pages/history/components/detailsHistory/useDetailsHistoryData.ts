import { useState, useEffect, useCallback } from "react";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import type {
  SaleForHistory,
  PurchaseForHistory,
  SelectedPeriod,
} from "../../../../types";

/** Calendar previous period for day / month / year views. Returns null if the current value is invalid. */
function getPreviousPeriodForDetails(
  current: SelectedPeriod,
): SelectedPeriod | null {
  if (current.period === "day") {
    const currentDate = new Date(current.periodValue);
    if (Number.isNaN(currentDate.getTime())) {
      return null;
    }
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const year = previousDate.getFullYear();
    const month = (previousDate.getMonth() + 1).toString().padStart(2, "0");
    const day = previousDate.getDate().toString().padStart(2, "0");
    return {
      period: "day",
      periodValue: `${year}-${month}-${day}`,
    };
  }

  if (current.period === "month") {
    const parts = current.periodValue.split("-");
    if (parts.length < 2) return null;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
      return null;
    }
    const currentDate = new Date(y, m - 1, 1);
    if (Number.isNaN(currentDate.getTime())) {
      return null;
    }
    const previousDate = new Date(currentDate);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const prevYear = previousDate.getFullYear();
    const prevMonth = (previousDate.getMonth() + 1).toString().padStart(2, "0");
    return {
      period: "month",
      periodValue: `${prevYear}-${prevMonth}`,
    };
  }

  const year = parseInt(current.periodValue, 10);
  if (!Number.isFinite(year) || year <= 1) {
    return null;
  }
  return {
    period: "year",
    periodValue: String(year - 1),
  };
}

export function useDetailsHistoryData(period: SelectedPeriod) {
  const [sales, setSales] = useState<SaleForHistory[]>([]);
  const [billsPayments, setBillsPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<PurchaseForHistory[]>([]);
  const [previousPeriodRevenue, setPreviousPeriodRevenue] = useState(0);
  const [previousPeriodProfit, setPreviousPeriodProfit] = useState(0);
  const [growthBaselineAvailable, setGrowthBaselineAvailable] = useState(false);
  const [comparisonPeriod, setComparisonPeriod] = useState<SelectedPeriod | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const [salesPage, setSalesPage] = useState(1);
  const [billsPaymentsPage, setBillsPaymentsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const salesTotalPages = Math.ceil(sales.length / itemsPerPage);
  const billsPaymentsTotalPages = Math.ceil(billsPayments.length / itemsPerPage);
  const purchasesTotalPages = Math.ceil(purchases.length / itemsPerPage);

  const salesStartIndex = (salesPage - 1) * itemsPerPage;
  const salesEndIndex = salesStartIndex + itemsPerPage;
  const currentSales = sales.slice(salesStartIndex, salesEndIndex);

  const billsPaymentsStartIndex = (billsPaymentsPage - 1) * itemsPerPage;
  const billsPaymentsEndIndex = billsPaymentsStartIndex + itemsPerPage;
  const currentBillsPayments = billsPayments.slice(billsPaymentsStartIndex, billsPaymentsEndIndex);

  const purchasesStartIndex = (purchasesPage - 1) * itemsPerPage;
  const purchasesEndIndex = purchasesStartIndex + itemsPerPage;
  const currentPurchases = purchases.slice(
    purchasesStartIndex,
    purchasesEndIndex,
  );

  const salesTotal = sales.reduce((sum, sale) => {
    return sum + (sale.totalAmountWithDiscount || 0);
  }, 0);

  const salesProfit = sales.reduce((sum, sale) => {
    return sum + (sale.totalProfit || 0);
  }, 0);

  const purchasesTotal = purchases.reduce((sum, purchase) => {
    const totalAmount = purchase.PurchaseItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0,
    );
    return sum + totalAmount;
  }, 0);

  const billsPaymentsTotal = billsPayments.reduce((sum, payment) => {
    return sum + payment.amount;
  }, 0);

  const fetchPeriodData = useCallback(async () => {
    try {
      setLoading(true);

      const previousPeriod = getPreviousPeriodForDetails(period);

      const [
        salesData,
        billsPaymentsData,
        purchasesData,
        previousSalesData,
      ] = await Promise.all([
        window.api.database.sales.getBySpecificPeriod(
          period.period,
          period.periodValue,
        ),
        window.api.database.bills.getBySpecificPeriod(
          period.period,
          period.periodValue,
        ),
        window.api.database.purchases.getBySpecificPeriod(
          period.period,
          period.periodValue,
        ),
        previousPeriod
          ? window.api.database.sales.getBySpecificPeriod(
              previousPeriod.period,
              previousPeriod.periodValue,
            )
          : Promise.resolve([] as SaleForHistory[]),
      ]);

      setSales(salesData);
      setBillsPayments(billsPaymentsData);
      setPurchases(purchasesData);

      const prevList = Array.isArray(previousSalesData) ? previousSalesData : [];
      const prevRevenue = prevList.reduce(
        (sum, sale) => sum + (sale.totalAmountWithDiscount || 0),
        0,
      );
      const prevProfit = prevList.reduce(
        (sum, sale) => sum + (sale.totalProfit || 0),
        0,
      );
      const prevCount = prevList.length;

      setPreviousPeriodRevenue(prevRevenue);
      setPreviousPeriodProfit(prevProfit);
      setComparisonPeriod(previousPeriod);
      setGrowthBaselineAvailable(
        previousPeriod !== null && prevCount > 0,
      );

      rendererLogger.debug(
        "Period data fetched successfully",
        "DetailsHistory",
        {
          period: period.period,
          periodValue: period.periodValue,
          salesCount: salesData.length,
          billsPaymentsCount: billsPaymentsData.length,
          purchasesCount: purchasesData.length,
          previousPeriodSaleCount: prevCount,
        },
      );
    } catch (error) {
      rendererLogger.error(
        "Error fetching period data",
        "DetailsHistory",
        error,
      );
      setComparisonPeriod(null);
      setGrowthBaselineAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [period.period, period.periodValue]);

  useEffect(() => {
    setSalesPage(1);
    setBillsPaymentsPage(1);
    setPurchasesPage(1);
  }, []);

  useEffect(() => {
    setSalesPage(1);
    setBillsPaymentsPage(1);
    setPurchasesPage(1);
    fetchPeriodData();
  }, [fetchPeriodData]);

  return {
    sales,
    billsPayments,
    purchases,
    loading,
    salesPage,
    billsPaymentsPage,
    purchasesPage,
    setSalesPage,
    setBillsPaymentsPage,
    setPurchasesPage,
    salesTotalPages,
    billsPaymentsTotalPages,
    purchasesTotalPages,
    currentSales,
    currentBillsPayments,
    currentPurchases,
    salesTotal,
    salesProfit,
    purchasesTotal,
    billsPaymentsTotal,
    previousPeriodRevenue,
    previousPeriodProfit,
    growthBaselineAvailable,
    comparisonPeriod,
    refreshData: fetchPeriodData,
  };
}
