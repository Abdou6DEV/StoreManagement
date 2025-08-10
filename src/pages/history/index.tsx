import { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";
import { HistoryTabs } from "./components/HistoryTabs";
import { DateRangeFilter } from "./components/DateRangeFilter";
import { SalesHistoryTable } from "./components/SalesHistoryTable";
import { PaymentsHistoryTable } from "./components/PaymentsHistoryTable";
import { HistoryStats } from "./components/HistoryStats";
import { Filter } from "lucide-react";
import { useToast } from "../../lib/contexts/toastContext";
import { DateRange } from "../../types";

export type HistoryTab = "sales" | "payments";

export default function History() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<HistoryTab>("sales");
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [salesLoading, setSalesLoading] = useState(false);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [paymentsData, setPaymentsData] = useState<any[]>([]);
  const [rawSalesData, setRawSalesData] = useState<any[]>([]);
  const [rawPaymentsData, setRawPaymentsData] = useState<any[]>([]);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalPayments: 0,
    totalPaymentAmount: 0,
  });

  // Load data when component mounts or date filters change
  useEffect(() => {
    loadData();
  }, [dateRange]); // Removed activeTab dependency

  // Apply date filters to existing data without triggering API calls
  useEffect(() => {
    if (salesLoaded && rawSalesData.length > 0) {
      const filteredSales = filterDataByDateRange(rawSalesData, dateRange);
      setSalesData(filteredSales);
      
      // Update stats
      const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmountWithDiscount, 0);
      setStats(prev => ({ ...prev, totalSales: filteredSales.length, totalRevenue }));
    }
    
    if (paymentsLoaded && rawPaymentsData.length > 0) {
      const filteredPayments = filterDataByDateRange(rawPaymentsData, dateRange);
      setPaymentsData(filteredPayments);
      
      // Update stats
      const totalPaymentAmount = filteredPayments.reduce((sum, payment) => sum + payment.givenAmount, 0);
      setStats(prev => ({ ...prev, totalPayments: filteredPayments.length, totalPaymentAmount }));
    }
  }, [dateRange, salesLoaded, paymentsLoaded, rawSalesData, rawPaymentsData]);

  // Load data for specific tab when it becomes active (lazy loading)
  useEffect(() => {
    if (activeTab === "sales" && !salesLoaded) {
      loadSalesData();
    } else if (activeTab === "payments" && !paymentsLoaded) {
      loadPaymentsData();
    }
  }, [activeTab, salesLoaded, paymentsLoaded]);

  const loadData = async () => {
    // Only load data if not already loaded for the current tab
    if (activeTab === "sales" && !salesLoaded) {
      await loadSalesData();
    } else if (activeTab === "payments" && !paymentsLoaded) {
      await loadPaymentsData();
    }
  };

  const loadSalesData = async () => {
    if (salesLoaded) return; // Skip if already loaded
    
    setSalesLoading(true);
    try {
      const sales = await window.api.database.sales.getAll();
      setRawSalesData(sales); // Store raw data
      const filteredSales = filterDataByDateRange(sales, dateRange);
      setSalesData(filteredSales);
      setSalesLoaded(true);
      
      // Calculate sales stats
      const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmountWithDiscount, 0);
      setStats(prev => ({ ...prev, totalSales: filteredSales.length, totalRevenue }));
    } catch (error) {
      console.error("Error loading sales data:", error);
      showToast("Error loading sales data", "error");
    } finally {
      setSalesLoading(false);
    }
  };

  const loadPaymentsData = async () => {
    if (paymentsLoaded) return; // Skip if already loaded
    
    setPaymentsLoading(true);
    try {
      const payments = await window.api.database.payments.getAllWithClientInfo();
      setRawPaymentsData(payments); // Store raw data
      const filteredPayments = filterDataByDateRange(payments, dateRange);
      setPaymentsData(filteredPayments);
      setPaymentsLoaded(true);
      
      // Calculate payment stats
      const totalPaymentAmount = filteredPayments.reduce((sum, payment) => sum + payment.givenAmount, 0);
      setStats(prev => ({ ...prev, totalPayments: filteredPayments.length, totalPaymentAmount }));
    } catch (error) {
      console.error("Error loading payments data:", error);
      showToast("Error loading payments data", "error");
    } finally {
      setPaymentsLoading(false);
    }
  };

  const filterDataByDateRange = (data: any[], range: DateRange) => {
    if (!range.startDate && !range.endDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item.createdAt);
      
      if (range.startDate && range.endDate) {
        return itemDate >= range.startDate && itemDate <= range.endDate;
      } else if (range.startDate) {
        return itemDate >= range.startDate;
      } else if (range.endDate) {
        return itemDate <= range.endDate;
      }
      
      return true;
    });
  };

  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
  }, []);

  const handleSaleUpdated = useCallback((updatedSale: any) => {
    // Update the sale in both raw and filtered data
    setRawSalesData(prev => 
      prev.map(sale => sale.id === updatedSale.id ? updatedSale : sale)
    );
    
    setSalesData(prev => 
      prev.map(sale => sale.id === updatedSale.id ? updatedSale : sale)
    );
    
    // Update stats - we'll recalculate based on the updated data
    setStats(prev => ({ ...prev }));
  }, []);

  const handleSaleDeleted = useCallback((saleId: string) => {
    // Remove the sale from both raw and filtered data
    setRawSalesData(prev => prev.filter(sale => sale.id !== saleId));
    setSalesData(prev => prev.filter(sale => sale.id !== saleId));
    
    // Update stats - we'll recalculate based on the updated data
    setStats(prev => ({ ...prev }));
  }, []);

  return (
    <div className="space-y-6 pb-6 px-6">
      {/* Stats Cards */}
      {useMemo(() => (
        <HistoryStats 
          stats={stats} 
          activeTab={activeTab} 
          isLoading={activeTab === "sales" ? salesLoading : paymentsLoading}
        />
      ), [stats, activeTab, salesLoading, paymentsLoading])}

      {/* Date Range Filter */}
      <div className="flex items-center gap-4">
        <Filter className="h-5 w-5 text-muted-foreground" />
        {useMemo(() => (
          <DateRangeFilter
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            isLoading={salesLoading || paymentsLoading}
          />
        ), [dateRange, handleDateRangeChange, salesLoading, paymentsLoading])}
      </div>

      {/* Tabs */}
      {useMemo(() => (
        <HistoryTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ), [activeTab])}

      {/* Content */}
      <div className="space-y-6">
        {useMemo(() => 
          activeTab === "sales" ? (
            <SalesHistoryTable
              key="sales-table"
              data={salesData}
              isLoading={salesLoading}
              dateRange={dateRange}
              onSaleUpdated={handleSaleUpdated}
              onSaleDeleted={handleSaleDeleted}
            />
          ) : (
            <PaymentsHistoryTable
              key="payments-table"
              data={paymentsData}
              isLoading={paymentsLoading}
              dateRange={dateRange}
            />
          ), [activeTab, salesData, paymentsData, salesLoading, paymentsLoading, dateRange, handleSaleUpdated, handleSaleDeleted]
        )}
      </div>
    </div>
  );
}
