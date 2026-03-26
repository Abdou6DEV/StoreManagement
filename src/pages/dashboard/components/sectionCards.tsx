import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PackageIcon,
  DollarSignIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  WalletIcon,
  Users,
} from "lucide-react";
import { StockStatsCard } from "./stockStatsCard";
import { ServiceStatsCard } from "./serviceStatsCard";
import { ChartBarInteractive } from "./chartBarInteractive";
import { LoadingState } from "../../../lib/components/loadingState";
import { useSales, useProducts, useClients, usePayments, useLowStockThreshold, useDashboardLoading } from "../../../lib/contexts/dashboardContext";

type OverviewPeriod = "today" | "thisMonth" | "thisYear" | "overall";

export function SectionCards() {
  const { t, i18n } = useTranslation();
  
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
  const [activeClients, setActiveClients] = useState(0);
  const [newClientsThisMonth, setNewClientsThisMonth] = useState(0);
  const [totalCreditAmount, setTotalCreditAmount] = useState(0);
  const [totalVersementAmount, setTotalVersementAmount] = useState(0);
  const [unpaidCreditAmount, setUnpaidCreditAmount] = useState(0);
  const [unpaidVersementAmount, setUnpaidVersementAmount] = useState(0);
  const [numberOfClients, setNumberOfClients] = useState(0);
  const [loading, setLoading] = useState(true);

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
      // Overview calculations were moved into the unified Overview container (`ChartBarInteractive`).

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
        <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]">
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
        </div>
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
      <ChartBarInteractive />
      {renderSection("stockStatsSection", stockStats)}
      <ServiceStatsCard />
      {renderSection("clientStatsSection", clientStats)}
    </div>
  );
}

