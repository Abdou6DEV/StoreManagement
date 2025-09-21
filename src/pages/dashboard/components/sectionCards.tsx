import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PackageIcon,
  DollarSignIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  WalletIcon,
  ShoppingCartIcon,
  ReceiptIcon,
  UsersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { ProfitChart } from "./profitCharts";

export function SectionCards() {
  const { t, i18n } = useTranslation();
  const [salesStats, setSalesStats] = useState<any[]>([]);
  const [stockStats, setStockStats] = useState<any[]>([]);
  const [clientStats, setClientStats] = useState<any[]>([]);
  const [todayVsAverage, setTodayVsAverage] = useState<{ percentage: number; direction: 'up' | 'down' }>({ percentage: 0, direction: 'up' });
  const [monthVsAverage, setMonthVsAverage] = useState<{ percentage: number; direction: 'up' | 'down' }>({ percentage: 0, direction: 'up' });
  const [yearVsAverage, setYearVsAverage] = useState<{ percentage: number; direction: 'up' | 'down' }>({ percentage: 0, direction: 'up' });

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString()} ${t("currency")}`;

  useEffect(() => {
    async function fetchStats() {
      const [sales, products, payments, clients, lowStockThreshold, purchases, billsPayments] =
        await Promise.all([
          window.api.database.sales.getAll(),
          window.api.database.products.getAll(),
          window.api.database.payments.getAll(),
          window.api.database.clients.getAll(),
          window.api.database.options.get("lowStockThreshold"),
          window.api.database.purchases.getAll(),
          window.api.database.bills.getAllPayments(),
        ]);

      function calcSalesStats(
        labelKey: string,
        filterFn: (date: Date) => boolean
      ) {
        const filtered = sales.filter((s: any) => filterFn(s.createdAt));
        const revenue = filtered.reduce(
          (sum: number, s: any) => sum + (s.totalAmountWithDiscount || 0),
          0
        );
        const profit = filtered.reduce((sum: number, s: any) => {
          const revenue = s.totalAmountWithDiscount || 0;

          const cost =
            s.saleItems?.reduce((itemSum: number, item: any) => {
              if (item.product && item.product.boughtPrice) {
                // Use stored bought price if available, otherwise use current product bought price
                const boughtPrice =
                  item.boughtPrice || item.product.boughtPrice;
                return itemSum + boughtPrice * item.quantity;
              }
              if (item.manualProduct && "costPrice" in item.manualProduct) {
                // For manual products, use actual cost price
                return itemSum + item.manualProduct.costPrice * item.quantity;
              }
              if (item.service && "costPrice" in item.service) {
                // For services, use actual cost price
                return itemSum + item.service.costPrice * item.quantity;
              }
              // Fallback: if no cost price is available, assume 70% profit margin
              return itemSum + item.price * item.quantity * 0.3;
            }, 0) || 0;

          return sum + (revenue - cost);
        }, 0);
        const itemsSold = filtered.reduce(
          (sum: number, s: any) => sum + (s.totalItems || 0),
          0
        );
        return {
          labelKey: `dashboard.${labelKey}`,
          revenue: formatCurrency(revenue),
          profit: formatCurrency(profit),
          itemsSold: itemsSold.toLocaleString(),
        };
      }
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

      // Calculate purchases stats
      function calcPurchasesStats(
        labelKey: string,
        filterFn: (date: Date) => boolean
      ) {
        const filtered = purchases.filter((p: any) => filterFn(p.createdAt));
        const totalAmount = filtered.reduce(
          (sum: number, p: any) => {
            const purchaseItemsTotal = p.PurchaseItems?.reduce(
              (itemSum: number, item: any) => itemSum + (item.price * item.quantity),
              0
            ) || 0;
            return sum + purchaseItemsTotal;
          },
          0
        );
        const totalItems = filtered.reduce(
          (sum: number, p: any) => {
            const purchaseItemsCount = p.PurchaseItems?.reduce(
              (itemSum: number, item: any) => itemSum + item.quantity,
              0
            ) || 0;
            return sum + purchaseItemsCount;
          },
          0
        );
        return {
          labelKey: `dashboard.${labelKey}`,
          amount: formatCurrency(totalAmount),
          itemsCount: totalItems.toLocaleString(),
        };
      }

      // Calculate bills payments stats
      function calcBillsStats(
        labelKey: string,
        filterFn: (date: Date) => boolean
      ) {
        const filtered = billsPayments.filter((p: any) => filterFn(p.paidDate));
        const totalAmount = filtered.reduce(
          (sum: number, p: any) => sum + p.amount,
          0
        );
        return {
          labelKey: `dashboard.${labelKey}`,
          amount: formatCurrency(totalAmount),
          count: filtered.length.toLocaleString(),
        };
      }

      // Calculate client credit payments stats
      function calcClientCreditStats(
        labelKey: string,
        filterFn: (date: Date) => boolean
      ) {
        const filtered = payments.filter((p: any) => 
          p.type === "CREDIT" && p.paidDate && filterFn(p.paidDate)
        );
        const totalAmount = filtered.reduce(
          (sum: number, p: any) => sum + p.givenAmount,
          0
        );
        return {
          labelKey: `dashboard.${labelKey}`,
          amount: formatCurrency(totalAmount),
          count: filtered.length.toLocaleString(),
        };
      }

      const todayStats = calcSalesStats("today", isToday);
      const monthStats = calcSalesStats("thisMonth", isThisMonth);
      const yearStats = calcSalesStats("thisYear", isThisYear);
      const overallStats = calcSalesStats("overall", () => true);

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
           thirtyDaysAgo.toISOString(),
           yesterday.toISOString()
         );

         // Calculate average daily profit from historical data (excluding today)
         const averageDailyProfit = historicalData.length > 0 
           ? historicalData.reduce((sum: number, item: any) => sum + (item.profit || 0), 0) / historicalData.length 
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
           twelveMonthsAgo.toISOString(),
           lastMonth.toISOString()
         );
         
         const monthTotalProfit = monthStats.profit ? parseFloat(monthStats.profit.replace(/[^\d.-]/g, '')) : 0;
         
         // Calculate average monthly profit from historical data
         const averageMonthlyProfit = historicalMonthData.length > 0 
           ? historicalMonthData.reduce((sum: number, item: any) => sum + (item.profit || 0), 0) / historicalMonthData.length 
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
           fiveYearsAgo.toISOString(),
           lastYear.toISOString()
         );
         
         const yearTotalProfit = yearStats.profit ? parseFloat(yearStats.profit.replace(/[^\d.-]/g, '')) : 0;
         
         // Calculate average yearly profit from historical data
         const averageYearlyProfit = historicalYearData.length > 0 
           ? historicalYearData.reduce((sum: number, item: any) => sum + (item.profit || 0), 0) / historicalYearData.length 
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


      // Calculate purchases stats for each period
      const todayPurchases = calcPurchasesStats("today", isToday);
      const monthPurchases = calcPurchasesStats("thisMonth", isThisMonth);
      const yearPurchases = calcPurchasesStats("thisYear", isThisYear);
      const overallPurchases = calcPurchasesStats("overall", () => true);

      // Calculate bills payments stats for each period
      const todayBills = calcBillsStats("today", isToday);
      const monthBills = calcBillsStats("thisMonth", isThisMonth);
      const yearBills = calcBillsStats("thisYear", isThisYear);
      const overallBills = calcBillsStats("overall", () => true);

      // Calculate client credit payments stats for each period
      const todayClientCredit = calcClientCreditStats("today", isToday);
      const monthClientCredit = calcClientCreditStats("thisMonth", isThisMonth);
      const yearClientCredit = calcClientCreditStats("thisYear", isThisYear);
      const overallClientCredit = calcClientCreditStats("overall", () => true);

      // Calculate trends and percentages
      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return { percentage: 100, trend: 'up' };
        const percentage = ((current - previous) / previous) * 100;
        return {
          percentage: Math.abs(percentage),
          trend: percentage >= 0 ? 'up' : 'down'
        };
      };

      // Calculate max values for progress bars
      const allRevenues = [todayStats, monthStats, yearStats, overallStats].map(s => parseFloat(s.revenue.replace(/[^\d.-]/g, '')));
      const allProfits = [todayStats, monthStats, yearStats, overallStats].map(s => parseFloat(s.profit.replace(/[^\d.-]/g, '')));
      const allPurchases = [todayPurchases, monthPurchases, yearPurchases, overallPurchases].map(s => parseFloat(s.amount.replace(/[^\d.-]/g, '')));
      const allBills = [todayBills, monthBills, yearBills, overallBills].map(s => parseFloat(s.amount.replace(/[^\d.-]/g, '')));
      const allCredits = [todayClientCredit, monthClientCredit, yearClientCredit, overallClientCredit].map(s => parseFloat(s.amount.replace(/[^\d.-]/g, '')));

      const maxRevenue = Math.max(...allRevenues);
      const maxProfit = Math.max(...allProfits);
      const maxPurchases = Math.max(...allPurchases);
      const maxBills = Math.max(...allBills);
      const maxCredits = Math.max(...allCredits);

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

      const totalProducts = products.length;
      const threshold = lowStockThreshold ? Number(lowStockThreshold) : 5; // Default to 5 if not set
      const lowStockItems = products.filter(
        (p: any) => p.quantity <= threshold && p.quantity > 0
      ).length;
      const outOfStock = products.filter((p: any) => p.quantity === 0).length;
      const stockValue = products.reduce(
        (sum: number, p: any) => sum + p.boughtPrice * p.quantity,
        0
      );
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

      const numberOfClients = clients.length;
      const totalCredit = payments.filter((p: any) => p.type === "CREDIT");
      const totalVersement = payments.filter(
        (p: any) => p.type === "VERSEMENT"
      );
      const unpaidCredit = totalCredit.filter((p: any) => !p.paidDate).length;
      const unpaidVersement = totalVersement.filter(
        (p: any) => !p.paidDate
      ).length;
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
    }
    fetchStats();
  }, [i18n.language]);

  const renderSection = (titleKey: string, cards: any[]) => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        {t(`dashboard.${titleKey}`)}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cards.map((stat) => {
          const IconComponent = stat.icon;
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

  return (
    <div className="space-y-8">
      {renderSection("overviewSection", salesStats)}
      {renderSection("stockStatsSection", stockStats)}
      {renderSection("clientStatsSection", clientStats)}
    </div>
  );
}
