import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PackageIcon,
  DollarSignIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  WalletIcon,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Users,
} from "lucide-react";
import { ProfitChart } from "./profitCharts";
import { StockStatsCard } from "./stockStatsCard";
import { ServiceStatsCard } from "./serviceStatsCard";
import { Switch } from "../../../lib/components/switch";
import { Tooltip } from "../../../lib/components/tooltip";
import { Button } from "../../../lib/components/button";
import { LoadingState } from "../../../lib/components/loadingState";
import { useSales, useProducts, useClients, usePayments, useLowStockThreshold, useDashboardLoading } from "../../../lib/contexts/dashboardContext";
import { useAuth } from "../../../lib/contexts/authContext";

type OverviewPeriod = "today" | "thisMonth" | "thisYear" | "overall";

export function SectionCards() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { canAccessPage } = useAuth();
  const canAccessHistory = canAccessPage("history");
  
  // Use shared dashboard data
  const sales = useSales();
  const products = useProducts();
  const clients = useClients();
  const payments = usePayments();
  const lowStockThreshold = useLowStockThreshold();
  const dashboardLoading = useDashboardLoading();
  
  const [loadingStates, setLoadingStates] = useState({
    salesStats: true,
    stockStats: true,
    clientStats: true,
    todayVsAverage: true,
    monthVsAverage: true,
    yearVsAverage: true,
    activeClients: true,
    newClientsThisMonth: true,
    totalCreditAmount: true,
    totalVersementAmount: true,
    unpaidCreditAmount: true,
    unpaidVersementAmount: true,
    numberOfClients: true,
  });
  const [salesStats, setSalesStats] = useState<Array<{
    labelKey: string;
    revenue?: string;
    profit?: string;
    itemsSold?: string;
    revenueProgress?: number;
    profitProgress?: number;
    rawRevenue?: number;
    rawProfit?: number;
  }>>([]);
  const [stockStats, setStockStats] = useState<Array<{
    labelKey: string;
    value: string;
    descriptionKey: string;
    icon: React.ComponentType<{ className?: string }>;
  }>>([]);
  const [clientStats, setClientStats] = useState<Array<{
    labelKey: string;
    value: string;
    descriptionKey: string;
    icon: React.ComponentType<{ className?: string }>;
  }>>([]);
  const [todayVsAverage, setTodayVsAverage] = useState<{ percentage: number; direction: 'up' | 'down' }>({ percentage: 0, direction: 'up' });
  const [monthVsAverage, setMonthVsAverage] = useState<{ percentage: number; direction: 'up' | 'down' }>({ percentage: 0, direction: 'up' });
  const [yearVsAverage, setYearVsAverage] = useState<{ percentage: number; direction: 'up' | 'down' }>({ percentage: 0, direction: 'up' });
  const [activeClients, setActiveClients] = useState(0);
  const [newClientsThisMonth, setNewClientsThisMonth] = useState(0);
  const [totalCreditAmount, setTotalCreditAmount] = useState(0);
  const [totalVersementAmount, setTotalVersementAmount] = useState(0);
  const [unpaidCreditAmount, setUnpaidCreditAmount] = useState(0);
  const [unpaidVersementAmount, setUnpaidVersementAmount] = useState(0);
  const [numberOfClients, setNumberOfClients] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overviewNetProfitEnabled, setOverviewNetProfitEnabled] = useState(false);
  const [billPaymentsTotals, setBillPaymentsTotals] = useState<Record<OverviewPeriod, number>>({
    today: 0,
    thisMonth: 0,
    thisYear: 0,
    overall: 0,
  });

  // Memoize expensive date filtering functions
  const dateFilters = useMemo(() => {
    const now = new Date();
    return {
      isToday: (date: Date) => {
        const d = new Date(date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      },
      isThisMonth: (date: Date) => {
        const d = new Date(date);
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      },
      isThisYear: (date: Date) => {
        const d = new Date(date);
        return d.getFullYear() === now.getFullYear();
      }
    };
  }, []);

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString()} ${t("currency")}`;

  const calcSalesStats = (
    sales: Array<{
      createdAt: string | Date;
      totalAmountWithDiscount?: number;
      totalProfit?: number;
      totalItems?: number;
    }>,
    labelKey: string,
    filterFn: (date: Date) => boolean
  ) => {
    const filtered = sales.filter((s: { createdAt: string | Date }) => filterFn(new Date(s.createdAt)));
    
    // Use pre-calculated totals for performance
    const revenue = filtered.reduce(
      (sum: number, s: { totalAmountWithDiscount?: number }) => sum + (s.totalAmountWithDiscount || 0),
      0
    );
    const profit = filtered.reduce(
      (sum: number, s: { totalProfit?: number }) => sum + (s.totalProfit || 0),
      0
    );
    const itemsSold = filtered.reduce(
      (sum: number, s: { totalItems?: number }) => sum + (s.totalItems || 0),
      0
    );
    
    return {
      labelKey: `dashboard.${labelKey}`,
      revenue: formatCurrency(revenue),
      profit: formatCurrency(profit),
      itemsSold: itemsSold.toLocaleString(),
      rawRevenue: revenue,
      rawProfit: profit,
    };
  };

  const getOverviewPeriodKey = (labelKey: string): OverviewPeriod | null => {
    switch (labelKey) {
      case "dashboard.today":
        return "today";
      case "dashboard.thisMonth":
        return "thisMonth";
      case "dashboard.thisYear":
        return "thisYear";
      case "dashboard.overall":
        return "overall";
      default:
        return null;
    }
  };

  useEffect(() => {
    // Only process data when dashboard data is loaded
    if (dashboardLoading) {
      setLoading(true);
      return;
    }
    
    (async function processData() {
      try {
        // Data is already loaded from context, just process it
        setLoadingStates(prev => ({ 
          ...prev, 
          salesStats: false,
          stockStats: false,
          clientStats: false,
          numberOfClients: false,
          totalCreditAmount: false, 
          totalVersementAmount: false, 
          unpaidCreditAmount: false, 
          unpaidVersementAmount: false 
        }));
      let billPaymentsData: Array<{ amount: number; paidDate?: string | Date }> = [];
      if (window?.api?.database?.bills?.getAllPayments) {
        try {
          billPaymentsData = await window.api.database.bills.getAllPayments();
        } catch (error) {
          console.error("Failed to fetch bill payments for dashboard overview:", error);
        }
      }

      const convertPaymentAmount = (amount: number) =>
        typeof amount === "number" ? amount / 100 : 0;

      const calculateBillsTotal = (filterFn: (date: Date) => boolean) => {
        if (!Array.isArray(billPaymentsData) || billPaymentsData.length === 0) {
          return 0;
        }

        return billPaymentsData.reduce((sum, payment) => {
          if (!payment?.paidDate) {
            return sum;
          }
          const paymentDate = new Date(payment.paidDate);
          if (!filterFn(paymentDate)) {
            return sum;
          }
          return sum + convertPaymentAmount(payment.amount ?? 0);
        }, 0);
      };

      const todayBillsTotal = calculateBillsTotal(dateFilters.isToday);
      const monthBillsTotal = calculateBillsTotal(dateFilters.isThisMonth);
      const yearBillsTotal = calculateBillsTotal(dateFilters.isThisYear);
      const overallBillsTotal = Array.isArray(billPaymentsData)
        ? billPaymentsData.reduce(
            (sum, payment) => sum + convertPaymentAmount(payment?.amount ?? 0),
            0,
          )
        : 0;

      setBillPaymentsTotals({
        today: todayBillsTotal,
        thisMonth: monthBillsTotal,
        thisYear: yearBillsTotal,
        overall: overallBillsTotal,
      });

      // Process sales data progressively
      const todayStats = calcSalesStats(sales, "today", dateFilters.isToday);
      const monthStats = calcSalesStats(sales, "thisMonth", dateFilters.isThisMonth);
      const yearStats = calcSalesStats(sales, "thisYear", dateFilters.isThisYear);
      const overallStats = calcSalesStats(sales, "overall", () => true);
      
      // Set sales stats immediately
      setSalesStats([todayStats, monthStats, yearStats, overallStats]);

       // Calculate today vs average for the Today card
       const todayTotalProfit = todayStats.rawProfit || 0;
       
       // Get historical data for average calculation (last 30 days excluding today)
       const now = new Date();
       const thirtyDaysAgo = new Date(now);
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       const yesterday = new Date(now);
       yesterday.setDate(yesterday.getDate() - 1);
       
       try {
         // Calculate historical data from shared sales data
         const historicalSales = sales.filter((sale) => {
           const saleDate = new Date(sale.createdAt);
           return saleDate >= thirtyDaysAgo && saleDate <= yesterday;
         });

         // Group by day and calculate daily profits
         const dailyProfits = new Map<string, number>();
         historicalSales.forEach((sale) => {
           const saleDate = new Date(sale.createdAt);
           const dayKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}-${String(saleDate.getDate()).padStart(2, '0')}`;
           const existing = dailyProfits.get(dayKey) || 0;
           dailyProfits.set(dayKey, existing + (sale.totalProfit || 0));
         });

         // Calculate average daily profit from historical data (excluding today)
         const dailyProfitValues = Array.from(dailyProfits.values());
         const averageDailyProfit = dailyProfitValues.length > 0 
           ? dailyProfitValues.reduce((sum, profit) => sum + profit, 0) / dailyProfitValues.length 
           : 0;

         const percentage = averageDailyProfit !== 0 
           ? ((todayTotalProfit - averageDailyProfit) / Math.abs(averageDailyProfit)) * 100 
           : 0;
         
         setTodayVsAverage({
           percentage: Math.abs(percentage),
           direction: percentage >= 0 ? 'up' : 'down'
         });
       } catch (error) {
         console.error('Error calculating today vs average:', error);
         setTodayVsAverage({ percentage: 0, direction: 'up' });
       }

       // Calculate month vs average
       try {
         // Get historical data from previous months (last 12 months excluding current month)
         const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);
         const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
         
         // Calculate historical data from shared sales data
         const historicalMonthSales = sales.filter((sale) => {
           const saleDate = new Date(sale.createdAt);
           return saleDate >= twelveMonthsAgo && saleDate <= lastMonth;
         });

         // Group by month and calculate monthly profits
         const monthlyProfits = new Map<string, number>();
         historicalMonthSales.forEach((sale) => {
           const saleDate = new Date(sale.createdAt);
           const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
           const existing = monthlyProfits.get(monthKey) || 0;
           monthlyProfits.set(monthKey, existing + (sale.totalProfit || 0));
         });
         
         const monthTotalProfit = monthStats.rawProfit || 0;
         
         // Calculate average monthly profit from historical data
         const monthlyProfitValues = Array.from(monthlyProfits.values());
         const averageMonthlyProfit = monthlyProfitValues.length > 0 
           ? monthlyProfitValues.reduce((sum, profit) => sum + profit, 0) / monthlyProfitValues.length 
           : 0;
         
         const monthPercentage = averageMonthlyProfit !== 0 
           ? ((monthTotalProfit - averageMonthlyProfit) / Math.abs(averageMonthlyProfit)) * 100 
           : 0;
         
         setMonthVsAverage({
           percentage: Math.abs(monthPercentage),
           direction: monthPercentage >= 0 ? 'up' : 'down'
         });
       } catch (error) {
         console.error('Error calculating month vs average:', error);
         setMonthVsAverage({ percentage: 0, direction: 'up' });
       }

       // Calculate year vs average
       try {
         // Get historical data from previous years (last 5 years excluding current year)
         const fiveYearsAgo = new Date(now.getFullYear() - 5, 0, 1);
         const lastYear = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
         
         // Calculate historical data from shared sales data
         const historicalYearSales = sales.filter((sale) => {
           const saleDate = new Date(sale.createdAt);
           return saleDate >= fiveYearsAgo && saleDate <= lastYear;
         });

         // Group by year and calculate yearly profits
         const yearlyProfits = new Map<string, number>();
         historicalYearSales.forEach((sale) => {
           const saleDate = new Date(sale.createdAt);
           const yearKey = saleDate.getFullYear().toString();
           const existing = yearlyProfits.get(yearKey) || 0;
           yearlyProfits.set(yearKey, existing + (sale.totalProfit || 0));
         });
         
         const yearTotalProfit = yearStats.rawProfit || 0;
         
         // Calculate average yearly profit from historical data
         const yearlyProfitValues = Array.from(yearlyProfits.values());
         const averageYearlyProfit = yearlyProfitValues.length > 0 
           ? yearlyProfitValues.reduce((sum, profit) => sum + profit, 0) / yearlyProfitValues.length 
           : 0;
         
         const yearPercentage = averageYearlyProfit !== 0 
           ? ((yearTotalProfit - averageYearlyProfit) / Math.abs(averageYearlyProfit)) * 100 
           : 0;
         
         setYearVsAverage({
           percentage: Math.abs(yearPercentage),
           direction: yearPercentage >= 0 ? 'up' : 'down'
         });
       } catch (error) {
         console.error('Error calculating year vs average:', error);
         setYearVsAverage({ percentage: 0, direction: 'up' });
       }


      // Purchase, bills, and client credit stats calculations removed as they were unused


      // Calculate max values for progress bars
      const allRevenues = [todayStats, monthStats, yearStats, overallStats].map((s) => s.rawRevenue ?? 0);
      const allProfits = [todayStats, monthStats, yearStats, overallStats].map((s) => s.rawProfit ?? 0);

      const maxRevenue = Math.max(...allRevenues);
      const maxProfit = Math.max(...allProfits);

      // Combine only revenue, profit, and items sold stats
      const combinedStats = [
        {
          ...todayStats,
          revenueProgress: maxRevenue > 0 ? ((todayStats.rawRevenue ?? 0) / maxRevenue) * 100 : 0,
          profitProgress: maxProfit > 0 ? ((todayStats.rawProfit ?? 0) / maxProfit) * 100 : 0,
        },
        {
          ...monthStats,
          revenueProgress: maxRevenue > 0 ? ((monthStats.rawRevenue ?? 0) / maxRevenue) * 100 : 0,
          profitProgress: maxProfit > 0 ? ((monthStats.rawProfit ?? 0) / maxProfit) * 100 : 0,
        },
        {
          ...yearStats,
          revenueProgress: maxRevenue > 0 ? ((yearStats.rawRevenue ?? 0) / maxRevenue) * 100 : 0,
          profitProgress: maxProfit > 0 ? ((yearStats.rawProfit ?? 0) / maxProfit) * 100 : 0,
        },
        {
          ...overallStats,
          revenueProgress: 100,
          profitProgress: 100,
        },
      ];

      setSalesStats(combinedStats);

      // Process stock data progressively
      const totalProducts = products.length;
      const threshold = lowStockThreshold ? Number(lowStockThreshold) : 5; // Default to 5 if not set
      const lowStockItems = products.filter(
        (p: { quantity: number }) => p.quantity <= threshold && p.quantity > 0
      ).length;
      const outOfStock = products.filter((p: { quantity: number }) => p.quantity === 0).length;
      const stockValue = products.reduce(
        (sum: number, p: { boughtPrice: number; quantity: number }) => sum + p.boughtPrice * p.quantity,
        0
      );
      
      // Set stock stats immediately
      setStockStats([
        {
          labelKey: "dashboard.totalProducts",
          value: totalProducts.toLocaleString(),
          descriptionKey: "dashboard.inInventory",
          icon: PackageIcon,
        },
        {
          labelKey: "dashboard.lowStockItems",
          value: lowStockItems.toLocaleString(),
          descriptionKey: "dashboard.needReorder",
          icon: AlertTriangleIcon,
        },
        {
          labelKey: "dashboard.stockValue",
          value: formatCurrency(stockValue),
          descriptionKey: "dashboard.totalInventory",
          icon: DollarSignIcon,
        },
        {
          labelKey: "dashboard.outOfStock",
          value: outOfStock.toLocaleString(),
          descriptionKey: "dashboard.itemsUnavailable",
          icon: PackageIcon,
        },
      ]);

      // Process client data progressively
      const numberOfClients = clients.length;
      const totalCredit = payments.filter((p: { type: string }) => p.type === "CREDIT");
      const totalVersement = payments.filter(
        (p: { type: string }) => p.type === "VERSEMENT"
      );
      const unpaidCredit = totalCredit.filter((p: { paidDate?: string | Date }) => !p.paidDate).length;
      const unpaidVersement = totalVersement.filter(
        (p: { paidDate?: string | Date }) => !p.paidDate
      ).length;
      
      // Calculate additional client stats
      const calculatedTotalCreditAmount = totalCredit.reduce((sum: number, p: { givenAmount: number; remainingAmount?: number }) => {
        // For CREDIT: use remainingAmount if available, otherwise givenAmount
        return sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.givenAmount);
      }, 0);
      const calculatedTotalVersementAmount = totalVersement.reduce((sum: number, p: { givenAmount: number }) => sum + p.givenAmount, 0);
      const calculatedUnpaidCreditAmount = totalCredit.filter((p: { paidDate?: string | Date; givenAmount: number; remainingAmount?: number }) => !p.paidDate)
        .reduce((sum: number, p: { givenAmount: number; remainingAmount?: number }) => {
          // For CREDIT: use remainingAmount if available, otherwise givenAmount
          return sum + (p.remainingAmount !== undefined ? p.remainingAmount : p.givenAmount);
        }, 0);
      const calculatedUnpaidVersementAmount = totalVersement.filter((p: { paidDate?: string | Date; givenAmount: number }) => !p.paidDate)
        .reduce((sum: number, p: { givenAmount: number }) => sum + p.givenAmount, 0);
      
      // Calculate client activity stats
      const calculatedActiveClients = clients.filter((c: { lastPurchaseDate?: string | Date }) => {
        if (!c.lastPurchaseDate) return false;
        const lastPurchase = new Date(c.lastPurchaseDate);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return lastPurchase >= thirtyDaysAgo;
      }).length;
      
      const calculatedNewClientsThisMonth = clients.filter((c: { createdAt: string | Date }) => {
        const created = new Date(c.createdAt);
        const now = new Date();
        return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth();
      }).length;

      // Set state variables immediately
      setNumberOfClients(numberOfClients);
      setTotalCreditAmount(calculatedTotalCreditAmount);
      setTotalVersementAmount(calculatedTotalVersementAmount);
      setUnpaidCreditAmount(calculatedUnpaidCreditAmount);
      setUnpaidVersementAmount(calculatedUnpaidVersementAmount);
      setActiveClients(calculatedActiveClients);
      setNewClientsThisMonth(calculatedNewClientsThisMonth);

      // Set client stats immediately
      setClientStats([
        {
          labelKey: "dashboard.numberOfClients",
          value: numberOfClients.toLocaleString(),
          descriptionKey: "dashboard.totalRegisteredClients",
          icon: CreditCardIcon,
        },
        {
          labelKey: "dashboard.totalNumberOfCredit",
          value: totalCredit.length.toLocaleString(),
          descriptionKey: "dashboard.numberOfCreditPayments",
          icon: CreditCardIcon,
        },
        {
          labelKey: "dashboard.totalNumberOfVersement",
          value: totalVersement.length.toLocaleString(),
          descriptionKey: "dashboard.numberOfVersementPayments",
          icon: WalletIcon,
        },
        {
          labelKey: "dashboard.unpaidCredit",
          value: unpaidCredit.toLocaleString(),
          descriptionKey: "dashboard.unpaidCreditPayments",
          icon: CreditCardIcon,
        },
        {
          labelKey: "dashboard.unpaidVersement",
          value: unpaidVersement.toLocaleString(),
          descriptionKey: "dashboard.unpaidVersementPayments",
          icon: WalletIcon,
        },
      ]);
      
      // Set loading to false after processing
      setLoading(false);
      } catch (error) {
        console.error('Error processing dashboard stats:', error);
        setLoading(false);
      }
    })();
  }, [dashboardLoading, sales, products, clients, payments, lowStockThreshold, i18n.language, dateFilters]);

  const renderNetProfitToggle = () => (
    <Tooltip content={t("dashboard.calculateNetProfitTooltip")}>
      <div className="flex items-center gap-2 text-sm rtl:flex-row-reverse">
        <Switch
          checked={overviewNetProfitEnabled}
          onCheckedChange={setOverviewNetProfitEnabled}
          id="dashboard-net-profit-toggle"
        />
        <label
          htmlFor="dashboard-net-profit-toggle"
          className="font-medium text-foreground cursor-pointer select-none"
        >
          {t("dashboard.calculateNetProfit")}
        </label>
      </div>
    </Tooltip>
  );

  const handleJumpToHistory = (cardType: 'today' | 'month' | 'year') => {
    const today = new Date();
    let selectedPeriod;

    if (cardType === 'today') {
      // Format: YYYY-MM-DD
      const dateStr = today.toISOString().split('T')[0];
      selectedPeriod = { period: 'day' as const, periodValue: dateStr };
    } else if (cardType === 'month') {
      // Format: YYYY-MM
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      selectedPeriod = { period: 'month' as const, periodValue: `${year}-${month}` };
    } else {
      // Format: YYYY
      const year = String(today.getFullYear());
      selectedPeriod = { period: 'year' as const, periodValue: year };
    }

    navigate('/history', { state: { selectedPeriod, activeTab: 'details' } });
  };

  const renderSection = (titleKey: string, cards: Array<{
    labelKey: string;
    value?: string;
    descriptionKey?: string;
    icon?: React.ComponentType<{ className?: string }>;
    revenue?: string;
    profit?: string;
    itemsSold?: string;
    revenueProgress?: number;
    profitProgress?: number;
    rawRevenue?: number;
    rawProfit?: number;
  }>) => {
    // Special handling for stock stats section
    if (titleKey === "stockStatsSection") {
      return (
        <div className="space-y-6">
          <StockStatsCard />
        </div>
      );
    }

    // Special handling for client stats section
    if (titleKey === "clientStatsSection") {
      return (
        <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">
              {t("dashboard.clientStatsSection")}
            </h2>
          </div>
          
          {/* Simple Client Stats Grid */}
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.numberOfClients")}
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {clientStats.find(s => s.labelKey === "dashboard.numberOfClients")?.value || "0"}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.activeClients", "Active Clients")}
                </span>
                <span className="text-3xl font-bold text-green-600">
                  {activeClients.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.newClientsThisMonth", "New This Month")}
                </span>
                <span className="text-3xl font-bold text-blue-600">
                  {newClientsThisMonth.toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.clientRetention", "Retention Rate")}
                </span>
                <span className="text-3xl font-bold text-purple-600">
                  {numberOfClients > 0 ? Math.round((activeClients / numberOfClients) * 100) : 0}%
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.totalCreditAmount", "Total Credit")}
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {formatCurrency(totalCreditAmount)}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.totalVersementAmount", "Total Versement")}
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {formatCurrency(totalVersementAmount)}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.unpaidCreditAmount", "Unpaid Credit")}
                </span>
                <span className="text-3xl font-bold text-red-600">
                  {formatCurrency(unpaidCreditAmount)}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.unpaidVersementAmount", "Unpaid Versement")}
                </span>
                <span className="text-3xl font-bold text-orange-600">
                  {formatCurrency(unpaidVersementAmount)}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.totalOutstanding", "Total Outstanding")}
                </span>
                <span className="text-3xl font-bold text-red-600">
                  {formatCurrency(unpaidCreditAmount + unpaidVersementAmount)}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.paymentRate", "Payment Rate")}
                </span>
                <span className="text-3xl font-bold text-green-600">
                  {totalCreditAmount + totalVersementAmount > 0 
                    ? Math.round(((totalCreditAmount + totalVersementAmount - unpaidCreditAmount - unpaidVersementAmount) / (totalCreditAmount + totalVersementAmount)) * 100)
                    : 0}%
                </span>
              </div>

              <div className="flex flex-col items-center gap-1">
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t("dashboard.averageClientValue", "Avg Client Value")}
                </span>
                <span className="text-3xl font-bold text-foreground">
                  {numberOfClients > 0 
                    ? formatCurrency((totalCreditAmount + totalVersementAmount) / numberOfClients)
                    : formatCurrency(0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            {t(`dashboard.${titleKey}`)}
          </h2>
          {titleKey === "overviewSection" && renderNetProfitToggle()}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.map((stat) => {
          const IconComponent = stat.icon;
          const isLoading = loadingStates.salesStats && titleKey === "overviewSection";
          const periodKey = getOverviewPeriodKey(stat.labelKey);
          const shouldUseNetProfit = overviewNetProfitEnabled && periodKey !== null;
          const fallbackProfitValue = stat.profit ? parseFloat(stat.profit.replace(/[^\d.-]/g, '')) : 0;
          const rawProfitValue = stat.rawProfit ?? fallbackProfitValue;
          const billsToSubtract = periodKey ? billPaymentsTotals[periodKey] ?? 0 : 0;
          const adjustedProfitValue = shouldUseNetProfit ? rawProfitValue - billsToSubtract : rawProfitValue;
          const displayedProfitValue = shouldUseNetProfit ? formatCurrency(adjustedProfitValue) : stat.profit;
          const profitLabel = shouldUseNetProfit ? t("dashboard.netProfit") : t("dashboard.profit");

          return (
            <div
              key={stat.labelKey}
              className={`p-8 bg-card rounded-xl shadow-md border flex flex-col items-start space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]`}
            >
              {stat.revenue && stat.profit ? (
                    // Unified layout for all sales cards
                    <div className="w-full space-y-2">
              <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {IconComponent && (
                            <IconComponent className="h-6 w-6 text-primary" />
                          )}
                          <div>
                            <h3 className="text-xl font-bold text-foreground">
                  {t(stat.labelKey)}
                            </h3>
                            {stat.labelKey === 'dashboard.today' && (
                              <div className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString('en-GB')}
                              </div>
                            )}
                            {stat.labelKey === 'dashboard.thisMonth' && (
                              <div className="text-sm text-muted-foreground">
                                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </div>
                            )}
                            {stat.labelKey === 'dashboard.thisYear' && (
                              <div className="text-sm text-muted-foreground">
                                {new Date().getFullYear().toString()}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Average percentage indicators for Today, Month, Year cards */}
                        {stat.labelKey === 'dashboard.today' && todayVsAverage.percentage > 0 && (
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 text-sm ${
                              todayVsAverage.direction === 'up' 
                                ? "text-green-600 dark:text-green-400" 
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {todayVsAverage.direction === 'up' ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">
                                {todayVsAverage.percentage.toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {todayVsAverage.direction === 'up' ? t("dashboard.above") : t("dashboard.below")} {t("dashboard.average")}
                              </span>
                            </div>
                            <Tooltip content={canAccessHistory ? t("dashboard.viewInHistory", "View in History") : t("dashboard.noAccessToHistoryTooltip", "You do not have access to the History page.")} position="top">
                              <span className="inline-block">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/40 disabled:opacity-50 disabled:pointer-events-none"
                                  onClick={() => handleJumpToHistory('today')}
                                  disabled={!canAccessHistory}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </Tooltip>
                          </div>
                        )}
                        {stat.labelKey === 'dashboard.thisMonth' && monthVsAverage.percentage > 0 && (
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 text-sm ${
                              monthVsAverage.direction === 'up' 
                                ? "text-green-600 dark:text-green-400" 
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {monthVsAverage.direction === 'up' ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">
                                {monthVsAverage.percentage.toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {monthVsAverage.direction === 'up' ? t("dashboard.above") : t("dashboard.below")} {t("dashboard.average")}
                              </span>
                            </div>
                            <Tooltip content={canAccessHistory ? t("dashboard.viewInHistory", "View in History") : t("dashboard.noAccessToHistoryTooltip", "You do not have access to the History page.")} position="top">
                              <span className="inline-block">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/40 disabled:opacity-50 disabled:pointer-events-none"
                                  onClick={() => handleJumpToHistory('month')}
                                  disabled={!canAccessHistory}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </Tooltip>
                          </div>
                        )}
                        {stat.labelKey === 'dashboard.thisYear' && yearVsAverage.percentage > 0 && (
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1 text-sm ${
                              yearVsAverage.direction === 'up' 
                                ? "text-green-600 dark:text-green-400" 
                                : "text-red-600 dark:text-red-400"
                            }`}>
                              {yearVsAverage.direction === 'up' ? (
                                <TrendingUp className="h-4 w-4" />
                              ) : (
                                <TrendingDown className="h-4 w-4" />
                              )}
                              <span className="font-semibold">
                                {yearVsAverage.percentage.toFixed(1)}%
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {yearVsAverage.direction === 'up' ? t("dashboard.above") : t("dashboard.below")} {t("dashboard.average")}
                              </span>
                            </div>
                            <Tooltip content={canAccessHistory ? t("dashboard.viewInHistory", "View in History") : t("dashboard.noAccessToHistoryTooltip", "You do not have access to the History page.")} position="top">
                              <span className="inline-block">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  className="h-7 w-7 border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-300 dark:hover:bg-blue-950/40 disabled:opacity-50 disabled:pointer-events-none"
                                  onClick={() => handleJumpToHistory('year')}
                                  disabled={!canAccessHistory}
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </span>
                            </Tooltip>
                          </div>
                        )}
              </div>
              {stat.revenue && (
                     <div className="flex flex-col items-center gap-1">
                       <span className="text-3xl font-bold text-primary">
                         {stat.revenue}
                       </span>
                       <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t("dashboard.revenue")}
                  </span>
                </div>
              )}
              {stat.profit && (
                     <div className="flex flex-col items-center gap-1">
                       <span className="text-3xl font-bold text-green-600">
                        {displayedProfitValue}
                       </span>
                       <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {profitLabel}
                  </span>
                </div>
              )}
              {stat.itemsSold && (
                     <div className="flex flex-col items-center gap-1">
                       <span className="text-2xl font-bold text-orange-600">
                         {stat.itemsSold}
                       </span>
                       <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t("dashboard.itemsSold")}
                  </span>
                     </div>
                   )}
                 </div>
              ) : (
                // Regular layout for non-sales cards
              <div className="flex items-center justify-between w-full">
                <div className="text-muted-foreground text-sm font-medium">
                  {t(stat.labelKey)}
                </div>
                {IconComponent && (
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                )}
                </div>
              )}
              {stat.value &&
                !stat.revenue &&
                !stat.profit &&
                !stat.itemsSold && (
                  <div className="text-3xl font-bold text-card-foreground mb-3 mt-3">
                    {stat.value}
                  </div>
                )}
              
              {/* Add profit chart for sales stats */}
              {stat.revenue && stat.profit && (
                <div className="w-full mt-4 text-center">
                  <div className="text-xs text-muted-foreground mb-2 text-center">
                    {stat.labelKey === 'dashboard.today' && t("dashboard.todayProfitChart")}
                    {stat.labelKey === 'dashboard.thisMonth' && t("dashboard.monthProfitChart")}
                    {stat.labelKey === 'dashboard.thisYear' && t("dashboard.yearProfitChart")}
                    {stat.labelKey === 'dashboard.overall' && t("dashboard.overallProfitChart")}
                  </div>
                  <ProfitChart 
                    period={
                      stat.labelKey === 'dashboard.today' ? 'today' :
                      stat.labelKey === 'dashboard.thisMonth' ? 'month' :
                      stat.labelKey === 'dashboard.thisYear' ? 'year' :
                      'overall'
                    }
                    className="h-40"
                  />
                  </div>
                )}
            </div>
          );
        })}
        </div>
      </div>
    );
  };


  if (loading) {
    return (
      <LoadingState 
        title={t("dashboard.loading", "Loading Dashboard")}
        description={t("dashboard.loadingDesc", "Preparing your data...")}
      />
    );
  }

  return (
    <div className="space-y-8">
      {renderSection("overviewSection", salesStats)}
      {renderSection("stockStatsSection", stockStats)}
      <ServiceStatsCard />
      {renderSection("clientStatsSection", clientStats)}
    </div>
  );
}

