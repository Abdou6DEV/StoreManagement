import { useState, useEffect, useCallback } from "react";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import type {
  SaleForHistory,
  PaymentForHistory,
  PurchaseForHistory,
  SelectedPeriod,
} from "../../../../types";

export function useDetailsHistoryData(period: SelectedPeriod) {
  const [sales, setSales] = useState<SaleForHistory[]>([]);
  const [payments, setPayments] = useState<PaymentForHistory[]>([]);
  const [purchases, setPurchases] = useState<PurchaseForHistory[]>([]);
  const [previousSalesData, setPreviousSalesData] = useState<SaleForHistory[]>([]);
  const [previousPurchasesData, setPreviousPurchasesData] = useState<PurchaseForHistory[]>([]);
  const [historicalAverages, setHistoricalAverages] = useState<{
    averageRevenue: number;
    averageProfit: number;
    totalSales: number;
  }>({ averageRevenue: 0, averageProfit: 0, totalSales: 0 });
  const [loading, setLoading] = useState(true); // Start with loading true

  // Pagination state for each section
  const [salesPage, setSalesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate pagination for each section
  const salesTotalPages = Math.ceil(sales.length / itemsPerPage);
  const paymentsTotalPages = Math.ceil(payments.length / itemsPerPage);
  const purchasesTotalPages = Math.ceil(purchases.length / itemsPerPage);

  const salesStartIndex = (salesPage - 1) * itemsPerPage;
  const salesEndIndex = salesStartIndex + itemsPerPage;
  const currentSales = sales.slice(salesStartIndex, salesEndIndex);

  const paymentsStartIndex = (paymentsPage - 1) * itemsPerPage;
  const paymentsEndIndex = paymentsStartIndex + itemsPerPage;
  const currentPayments = payments.slice(paymentsStartIndex, paymentsEndIndex);

  const purchasesStartIndex = (purchasesPage - 1) * itemsPerPage;
  const purchasesEndIndex = purchasesStartIndex + itemsPerPage;
  const currentPurchases = purchases.slice(
    purchasesStartIndex,
    purchasesEndIndex,
  );

  // Calculate totals and profit - properly calculate from sale items and purchase items
  const salesTotal = sales.reduce((sum, sale) => {
    const totalAmount = sale.saleItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0,
    );
    return sum + (totalAmount - sale.discount);
  }, 0);

  const salesProfit = sales.reduce((sum, sale) => {
    const revenue = sale.saleItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0,
    ) - sale.discount;
    
    const cost = sale.saleItems.reduce((itemSum, item) => {
      if (item.product && 'boughtPrice' in item.product) {
        // For regular products, use actual bought price
        return itemSum + (item.product as any).boughtPrice * item.quantity;
      }
      if (item.manualProduct && 'costPrice' in item.manualProduct) {
        // For manual products, use actual cost price
        return itemSum + (item.manualProduct as any).costPrice * item.quantity;
      }
      if (item.service && 'costPrice' in item.service) {
        // For services, use actual cost price
        return itemSum + (item.service as any).costPrice * item.quantity;
      }
      // Fallback: if no cost price is available, assume 70% profit margin
      return itemSum + item.price * item.quantity * 0.3;
    }, 0);
    
    return sum + (revenue - cost);
  }, 0);

  const purchasesTotal = purchases.reduce((sum, purchase) => {
    const totalAmount = purchase.PurchaseItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0,
    );
    return sum + totalAmount;
  }, 0);

  // Get previous period for comparison
  const getPreviousPeriod = (currentPeriod: SelectedPeriod): SelectedPeriod => {
    if (currentPeriod.period === "day") {
      const currentDate = new Date(currentPeriod.periodValue);
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      const year = previousDate.getFullYear();
      const month = (previousDate.getMonth() + 1).toString().padStart(2, "0");
      const day = previousDate.getDate().toString().padStart(2, "0");
      return {
        period: "day",
        periodValue: `${year}-${month}-${day}`,
      };
    } else if (currentPeriod.period === "month") {
      const [year, month] = currentPeriod.periodValue.split("-");
      const currentDate = new Date(parseInt(year), parseInt(month) - 1);
      const previousDate = new Date(currentDate);
      previousDate.setMonth(previousDate.getMonth() - 1);
      const prevYear = previousDate.getFullYear();
      const prevMonth = (previousDate.getMonth() + 1).toString().padStart(2, "0");
      return {
        period: "month",
        periodValue: `${prevYear}-${prevMonth}`,
      };
    } else {
      const year = parseInt(currentPeriod.periodValue);
      return {
        period: "year",
        periodValue: (year - 1).toString(),
      };
    }
  };

  const fetchPeriodData = useCallback(async () => {
    try {
      setLoading(true);

      const previousPeriod = getPreviousPeriod(period);
      
      // Calculate date range for historical averages (last 30 days/periods)
      const historicalEndDate = new Date();
      const historicalStartDate = new Date();
      historicalStartDate.setDate(historicalStartDate.getDate() - 30);

      // Fetch data for the selected period, previous period, and historical averages
      const [
        salesData, 
        paymentsData, 
        purchasesData,
        previousSalesData,
        previousPurchasesData,
        historicalSummary
      ] = await Promise.all([
        window.api.database.sales.getBySpecificPeriod(
          period.period,
          period.periodValue,
        ),
        window.api.database.payments.getBySpecificPeriod(
          period.period,
          period.periodValue,
        ),
        window.api.database.purchases.getBySpecificPeriod(
          period.period,
          period.periodValue,
        ),
        window.api.database.sales.getBySpecificPeriod(
          previousPeriod.period,
          previousPeriod.periodValue,
        ),
        window.api.database.purchases.getBySpecificPeriod(
          previousPeriod.period,
          previousPeriod.periodValue,
        ),
        window.api.database.sales.getSummary(historicalStartDate, historicalEndDate),
      ]);
      
      setSales(salesData);
      setPayments(paymentsData);
      setPurchases(purchasesData);
      setPreviousSalesData(previousSalesData);
      setPreviousPurchasesData(previousPurchasesData);
      setHistoricalAverages({
        averageRevenue: historicalSummary.averageRevenue || 0,
        averageProfit: historicalSummary.averageProfit || 0,
        totalSales: historicalSummary.totalSales || 0,
      });

      rendererLogger.debug(
        "Period data fetched successfully",
        "DetailsHistory",
        {
          period: period.period,
          periodValue: period.periodValue,
          salesCount: salesData.length,
          paymentsCount: paymentsData.length,
          purchasesCount: purchasesData.length,
        },
      );
    } catch (error) {
      rendererLogger.error(
        "Error fetching period data",
        "DetailsHistory",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, [period.period, period.periodValue]);

  // Reset pagination when section changes
  useEffect(() => {
    setSalesPage(1);
    setPaymentsPage(1);
    setPurchasesPage(1);
  }, []);

  // Reset pagination and fetch data when period changes
  useEffect(() => {
    setSalesPage(1);
    setPaymentsPage(1);
    setPurchasesPage(1);
    fetchPeriodData();
  }, [fetchPeriodData]);





  // Calculate previous period totals
  const previousSalesTotal = previousSalesData.reduce((sum, sale) => {
    const totalAmount = sale.saleItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0,
    );
    return sum + (totalAmount - sale.discount);
  }, 0);

  const previousPurchasesTotal = previousPurchasesData.reduce((sum, purchase) => {
    const totalAmount = purchase.PurchaseItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0,
    );
    return sum + totalAmount;
  }, 0);

  return {
    sales,
    payments,
    purchases,
    loading,
    salesPage,
    paymentsPage,
    purchasesPage,
    setSalesPage,
    setPaymentsPage,
    setPurchasesPage,
    salesTotalPages,
    paymentsTotalPages,
    purchasesTotalPages,
    currentSales,
    currentPayments,
    currentPurchases,
    salesTotal,
    salesProfit,
    purchasesTotal,
    previousSalesTotal,
    previousPurchasesTotal,
    historicalAverages,
  };
}
