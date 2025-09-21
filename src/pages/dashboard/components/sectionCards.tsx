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
} from "lucide-react";

export function SectionCards() {
  const { t, i18n } = useTranslation();
  const [salesStats, setSalesStats] = useState<any[]>([]);
  const [stockStats, setStockStats] = useState<any[]>([]);
  const [clientStats, setClientStats] = useState<any[]>([]);

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
              className="p-8 bg-card rounded-xl shadow-md border flex flex-col items-start space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[140px]"
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-muted-foreground text-sm font-medium">
                  {t(stat.labelKey)}
                </div>
                {IconComponent && (
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              {stat.revenue && (
                <div className="flex items-center justify-between w-full mt-3">
                  <span className="text-sm text-muted-foreground">
                    {t("dashboard.revenue")}
                  </span>
                  <span className="text-lg font-semibold">{stat.revenue}</span>
                </div>
              )}
              {stat.revenue && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{width: `${stat.revenueProgress}%`}}></div>
                </div>
              )}
              {stat.profit && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-muted-foreground">
                    {t("dashboard.profit")}
                  </span>
                  <span className="text-lg font-semibold text-green-600">
                    {stat.profit}
                  </span>
                </div>
              )}
              {stat.profit && (
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{width: `${stat.profitProgress}%`}}></div>
                </div>
              )}
              {stat.itemsSold && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-muted-foreground">
                    {t("dashboard.itemsSold")}
                  </span>
                  <span className="text-lg font-semibold">
                    {stat.itemsSold}
                  </span>
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
