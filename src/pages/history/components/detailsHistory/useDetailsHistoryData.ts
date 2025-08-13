import { useState, useEffect } from "react";
import rendererLogger from "../../../../lib/logger/rendererLogger";
import type {
  SaleForHistory,
  PaymentForHistory,
  PurchaseForHistory,
  SelectedPeriod,
} from "../../../../types";

export function useDetailsHistoryData(selectedPeriod: SelectedPeriod | null) {
  const [sales, setSales] = useState<SaleForHistory[]>([]);
  const [payments, setPayments] = useState<PaymentForHistory[]>([]);
  const [purchases, setPurchases] = useState<PurchaseForHistory[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Reset pagination when section changes
  useEffect(() => {
    setSalesPage(1);
    setPaymentsPage(1);
    setPurchasesPage(1);
  }, []);

  // Reset pagination when period changes
  useEffect(() => {
    setSalesPage(1);
    setPaymentsPage(1);
    setPurchasesPage(1);
  }, [selectedPeriod]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPeriodData();
    }
  }, [selectedPeriod]);

  const fetchPeriodData = async () => {
    if (!selectedPeriod) return;

    try {
      setLoading(true);

      // Fetch data for the selected period
      const [salesData, paymentsData, purchasesData] = await Promise.all([
        window.api.database.sales.getBySpecificPeriod(
          selectedPeriod.period,
          selectedPeriod.periodValue,
        ),
        window.api.database.payments.getBySpecificPeriod(
          selectedPeriod.period,
          selectedPeriod.periodValue,
        ),
        window.api.database.purchases.getBySpecificPeriod(
          selectedPeriod.period,
          selectedPeriod.periodValue,
        ),
      ]);

      setSales(salesData);
      setPayments(paymentsData);
      setPurchases(purchasesData);

      rendererLogger.debug(
        "Period data fetched successfully",
        "DetailsHistory",
        {
          period: selectedPeriod.period,
          periodValue: selectedPeriod.periodValue,
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
  };

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
  };
}
