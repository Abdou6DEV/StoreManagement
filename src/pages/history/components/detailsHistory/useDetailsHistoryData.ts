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
  const [billsPayments, setBillsPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<PurchaseForHistory[]>([]);
  const [previousSalesData, setPreviousSalesData] = useState<SaleForHistory[]>(
    []
  );
  const [previousPurchasesData, setPreviousPurchasesData] = useState<
    PurchaseForHistory[]
  >([]);
  const [historicalAverages, setHistoricalAverages] = useState<{
    averageRevenue: number;
    averageProfit: number;
    totalSales: number;
  }>({ averageRevenue: 0, averageProfit: 0, totalSales: 0 });
  const [loading, setLoading] = useState(true); // Start with loading true

  // Pagination state for each section
  const [salesPage, setSalesPage] = useState(1);
  const [billsPaymentsPage, setBillsPaymentsPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Calculate pagination for each section
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
    purchasesEndIndex
  );

  // Calculate totals and profit - properly calculate from sale items and purchase items
  const salesTotal = sales.reduce((sum, sale) => {
    const totalAmount = sale.saleItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0
    );
    return sum + (totalAmount - sale.discount);
  }, 0);

  const salesProfit = sales.reduce((sum, sale) => {
    const revenue =
      sale.saleItems.reduce(
        (itemSum, item) => itemSum + item.price * item.quantity,
        0
      ) - sale.discount;

    const cost = sale.saleItems.reduce((itemSum, item) => {
      // All items (products, manual products, services) have their cost stored in boughtPrice
      const boughtPrice = (item as { boughtPrice?: number }).boughtPrice || 0;
      
      // Debug logging
      console.log('🔍 Sale Item Debug:', {
        itemName: item.product?.name || item.manualProduct?.name || item.service?.name || 'Unknown',
        price: item.price,
        quantity: item.quantity,
        boughtPrice: boughtPrice,
        itemCost: boughtPrice * item.quantity
      });
      
      return itemSum + boughtPrice * item.quantity;
    }, 0);

    const profit = revenue - cost;
    console.log('🔍 Sale Profit Debug:', {
      saleId: sale.id,
      revenue: revenue,
      cost: cost,
      profit: profit
    });

    return sum + profit;
  }, 0);
  
  // DEBUG: Log the total profit calculation
  console.log('🔍 TOTAL PROFIT DEBUG:', {
    totalProfit: salesProfit,
    salesCount: sales.length,
    individualProfits: sales.map(sale => {
      const revenue = sale.saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0) - sale.discount;
      const cost = sale.saleItems.reduce((sum, item) => {
        const boughtPrice = (item as { boughtPrice?: number }).boughtPrice || 0;
        return sum + boughtPrice * item.quantity;
      }, 0);
      return revenue - cost;
    })
  });

  const purchasesTotal = purchases.reduce((sum, purchase) => {
    const totalAmount = purchase.PurchaseItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0
    );
    return sum + totalAmount;
  }, 0);

  const billsPaymentsTotal = billsPayments.reduce((sum, payment) => {
    return sum + payment.amount;
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
      const prevMonth = (previousDate.getMonth() + 1)
        .toString()
        .padStart(2, "0");
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
        billsPaymentsData,
        purchasesData,
        previousSalesData,
        previousPurchasesData,
        historicalSummary,
      ] = await Promise.all([
        window.api.database.sales.getBySpecificPeriod(
          period.period,
          period.periodValue
        ),
        window.api.database.bills.getBySpecificPeriod(
          period.period,
          period.periodValue
        ),
        window.api.database.purchases.getBySpecificPeriod(
          period.period,
          period.periodValue
        ),
        window.api.database.sales.getBySpecificPeriod(
          previousPeriod.period,
          previousPeriod.periodValue
        ),
        window.api.database.purchases.getBySpecificPeriod(
          previousPeriod.period,
          previousPeriod.periodValue
        ),
        window.api.database.sales.getSummary(
          historicalStartDate,
          historicalEndDate
        ),
      ]);

      setSales(salesData);
      setBillsPayments(billsPaymentsData);
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
          billsPaymentsCount: billsPaymentsData.length,
          purchasesCount: purchasesData.length,
        }
      );
    } catch (error) {
      rendererLogger.error(
        "Error fetching period data",
        "DetailsHistory",
        error
      );
    } finally {
      setLoading(false);
    }
  }, [period.period, period.periodValue]);

  // Reset pagination when section changes
  useEffect(() => {
    setSalesPage(1);
    setBillsPaymentsPage(1);
    setPurchasesPage(1);
  }, []);

  // Reset pagination and fetch data when period changes
  useEffect(() => {
    setSalesPage(1);
    setBillsPaymentsPage(1);
    setPurchasesPage(1);
    fetchPeriodData();
  }, [fetchPeriodData]);

  // Calculate previous period totals
  const previousSalesTotal = previousSalesData.reduce((sum, sale) => {
    const totalAmount = sale.saleItems.reduce(
      (itemSum, item) => itemSum + item.price * item.quantity,
      0
    );
    return sum + (totalAmount - sale.discount);
  }, 0);

  const previousPurchasesTotal = previousPurchasesData.reduce(
    (sum, purchase) => {
      const totalAmount = purchase.PurchaseItems.reduce(
        (itemSum, item) => itemSum + item.price * item.quantity,
        0
      );
      return sum + totalAmount;
    },
    0
  );

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
    previousSalesTotal,
    previousPurchasesTotal,
    historicalAverages,
    refreshData: fetchPeriodData,
  };
}
