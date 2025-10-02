import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PackageIcon,
  DollarSignIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  WalletIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { ProfitChart } from "./profitCharts";
import { StockStatsCard } from "./stockStatsCard";
import { Skeleton } from "../../../lib/components/skeleton";

export function SectionCards() {
  const { t, i18n } = useTranslation();
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

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString()} ${t("currency")}`;

  const calcSalesStats = (
    sales: Array<{
      createdAt: string | Date;
      totalAmountWithDiscount?: number;
      saleItems?: Array<{
        product?: { boughtPrice?: number };
        manualProduct?: { costPrice: number };
        service?: { costPrice: number };
        boughtPrice?: number;
        price: number;
        quantity: number;
      }>;
      totalItems?: number;
    }>,
    labelKey: string,
    filterFn: (date: Date) => boolean
  ) => {
    const filtered = sales.filter((s: { createdAt: string | Date }) => filterFn(new Date(s.createdAt)));
    const revenue = filtered.reduce(
      (sum: number, s: { totalAmountWithDiscount?: number }) => sum + (s.totalAmountWithDiscount || 0),
      0
    );
    const profit = filtered.reduce((sum: number, s: { totalAmountWithDiscount?: number; saleItems?: Array<{ product?: { boughtPrice?: number }; manualProduct?: { costPrice: number }; service?: { costPrice: number }; boughtPrice?: number; price: number; quantity: number }> }) => {
      const revenue = s.totalAmountWithDiscount || 0;

      const cost =
        s.saleItems?.reduce((itemSum: number, item: { product?: { boughtPrice?: number }; manualProduct?: { costPrice: number }; service?: { costPrice: number }; boughtPrice?: number; price: number; quantity: number }) => {
          // All items (products, manual products, services) have their cost stored in boughtPrice
          const boughtPrice = item.boughtPrice || 0;
          return itemSum + boughtPrice * item.quantity;
        }, 0) || 0;

      return sum + (revenue - cost);
    }, 0);
    const itemsSold = filtered.reduce(
      (sum: number, s: { totalItems?: number }) => sum + (s.totalItems || 0),
      0
    );
    return {
      labelKey: `dashboard.${labelKey}`,
      revenue: formatCurrency(revenue),
      profit: formatCurrency(profit),
      itemsSold: itemsSold.toLocaleString(),
    };
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        // Load sales data first (most important)
        const sales = await window.api.database.sales.getAll();
        setLoadingStates(prev => ({ ...prev, salesStats: false }));
        
        // Load products data
        const products = await window.api.database.products.getAll();
        setLoadingStates(prev => ({ ...prev, stockStats: false }));
        
        // Load clients data
        const clients = await window.api.database.clients.getAll();
        setLoadingStates(prev => ({ ...prev, clientStats: false, numberOfClients: false }));
        
        // Load payments data
        const payments = await window.api.database.payments.getAll();
        setLoadingStates(prev => ({ 
          ...prev, 
          totalCreditAmount: false, 
          totalVersementAmount: false, 
          unpaidCreditAmount: false, 
          unpaidVersementAmount: false 
        }));
        
        // Load options
        const lowStockThreshold = await window.api.database.options.get("lowStockThreshold");
      const isToday = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      };
      const isThisMonth = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        return (
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth()
        );
      };
      const isThisYear = (date: Date) => {
        const d = new Date(date);
        const now = new Date();
        return d.getFullYear() === now.getFullYear();
      };




      // Process sales data progressively
      const todayStats = calcSalesStats(sales, "today", isToday);
      const monthStats = calcSalesStats(sales, "thisMonth", isThisMonth);
      const yearStats = calcSalesStats(sales, "thisYear", isThisYear);
      const overallStats = calcSalesStats(sales, "overall", () => true);
      
      // Set sales stats immediately
      setSalesStats([todayStats, monthStats, yearStats, overallStats]);

       // Calculate today vs average for the Today card
       const todayTotalProfit = todayStats.profit ? parseFloat(todayStats.profit.replace(/[^\d.-]/g, '')) : 0;
       
       // Get historical data for average calculation (last 30 days excluding today)
       const now = new Date();
       const thirtyDaysAgo = new Date(now);
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
       const yesterday = new Date(now);
       yesterday.setDate(yesterday.getDate() - 1);
       
       try {
         const historicalData = await window.api.database.sales.getAggregatedByPeriod(
           "day",
           thirtyDaysAgo,
           yesterday
         );

         // Calculate average daily profit from historical data (excluding today)
         const averageDailyProfit = historicalData.length > 0 
           ? historicalData.reduce((sum: number, item: { profit?: number }) => sum + (item.profit || 0), 0) / historicalData.length 
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
         
         const historicalMonthData = await window.api.database.sales.getAggregatedByPeriod(
           "month",
           twelveMonthsAgo,
           lastMonth
         );
         
         const monthTotalProfit = monthStats.profit ? parseFloat(monthStats.profit.replace(/[^\d.-]/g, '')) : 0;
         
         // Calculate average monthly profit from historical data
         const averageMonthlyProfit = historicalMonthData.length > 0 
           ? historicalMonthData.reduce((sum: number, item: { profit?: number }) => sum + (item.profit || 0), 0) / historicalMonthData.length 
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
         
         const historicalYearData = await window.api.database.sales.getAggregatedByPeriod(
           "year",
           fiveYearsAgo,
           lastYear
         );
         
         const yearTotalProfit = yearStats.profit ? parseFloat(yearStats.profit.replace(/[^\d.-]/g, '')) : 0;
         
         // Calculate average yearly profit from historical data
         const averageYearlyProfit = historicalYearData.length > 0 
           ? historicalYearData.reduce((sum: number, item: { profit?: number }) => sum + (item.profit || 0), 0) / historicalYearData.length 
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
      const allRevenues = [todayStats, monthStats, yearStats, overallStats].map(s => parseFloat(s.revenue.replace(/[^\d.-]/g, '')));
      const allProfits = [todayStats, monthStats, yearStats, overallStats].map(s => parseFloat(s.profit.replace(/[^\d.-]/g, '')));

      const maxRevenue = Math.max(...allRevenues);
      const maxProfit = Math.max(...allProfits);

      // Combine only revenue, profit, and items sold stats
      const combinedStats = [
        {
          ...todayStats,
          revenueProgress: maxRevenue > 0 ? (parseFloat(todayStats.revenue.replace(/[^\d.-]/g, '')) / maxRevenue) * 100 : 0,
          profitProgress: maxProfit > 0 ? (parseFloat(todayStats.profit.replace(/[^\d.-]/g, '')) / maxProfit) * 100 : 0,
        },
        {
          ...monthStats,
          revenueProgress: maxRevenue > 0 ? (parseFloat(monthStats.revenue.replace(/[^\d.-]/g, '')) / maxRevenue) * 100 : 0,
          profitProgress: maxProfit > 0 ? (parseFloat(monthStats.profit.replace(/[^\d.-]/g, '')) / maxProfit) * 100 : 0,
        },
        {
          ...yearStats,
          revenueProgress: maxRevenue > 0 ? (parseFloat(yearStats.revenue.replace(/[^\d.-]/g, '')) / maxRevenue) * 100 : 0,
          profitProgress: maxProfit > 0 ? (parseFloat(yearStats.profit.replace(/[^\d.-]/g, '')) / maxProfit) * 100 : 0,
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
      const calculatedTotalCreditAmount = totalCredit.reduce((sum: number, p: { givenAmount: number }) => sum + p.givenAmount, 0);
      const calculatedTotalVersementAmount = totalVersement.reduce((sum: number, p: { givenAmount: number }) => sum + p.givenAmount, 0);
      const calculatedUnpaidCreditAmount = totalCredit.filter((p: { paidDate?: string | Date; givenAmount: number }) => !p.paidDate)
        .reduce((sum: number, p: { givenAmount: number }) => sum + p.givenAmount, 0);
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
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [i18n.language]);

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
  }>) => {
    // Special handling for stock stats section
    if (titleKey === "stockStatsSection") {
      return (
        <div className="space-y-6">
          {loadingStates.stockStats ? (
            <div className="p-8 bg-card rounded-xl shadow-md border flex items-center justify-center min-h-[200px]">
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            <StockStatsCard />
          )}
        </div>
      );
    }

    // Special handling for client stats section
    if (titleKey === "clientStatsSection") {
      return (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            {t("dashboard.clientStatsSection")}
          </h2>
          
          {loadingStates.clientStats ? (
            <div className="p-6 bg-card rounded-xl shadow-md border flex items-center justify-center min-h-[200px]">
              <Skeleton className="h-8 w-32" />
            </div>
          ) : (
            /* Simple Client Stats Grid */
            <div className="p-6 bg-card rounded-xl shadow-md border">
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
          )}
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">
          {t(`dashboard.${titleKey}`)}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {cards.map((stat) => {
          const IconComponent = stat.icon;
          const isLoading = loadingStates.salesStats && titleKey === "overviewSection";
          return (
            <div
              key={stat.labelKey}
              className={`p-8 bg-card rounded-xl shadow-md border flex flex-col items-start space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]`}
            >
              {isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Skeleton className="h-8 w-32" />
                </div>
              )}
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
                        )}
                        {stat.labelKey === 'dashboard.thisMonth' && monthVsAverage.percentage > 0 && (
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
                        )}
                        {stat.labelKey === 'dashboard.thisYear' && yearVsAverage.percentage > 0 && (
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
                         {stat.profit}
                       </span>
                       <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {t("dashboard.profit")}
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


  return (
    <div className="space-y-8">
      {renderSection("overviewSection", salesStats)}
      {renderSection("stockStatsSection", stockStats)}
      {renderSection("clientStatsSection", clientStats)}
    </div>
  );
}
