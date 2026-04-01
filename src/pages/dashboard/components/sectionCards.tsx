import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  PackageIcon,
  DollarSignIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { StockStatsCard } from "./stockStatsCard";
import { ServiceStatsCard } from "./serviceStatsCard";
import { ClientStatsCard } from "./clientStatsCard";
import { ChartBarInteractive } from "./chartBarInteractive";
import { useChartData } from "./chartBarInteractive/chartUtils";
import { DashboardStaggerItem } from "./dashboardStagger";
import { LoadingState } from "../../../lib/components/loadingState";
import { useSales, useProducts, useLowStockThreshold, useDashboardLoading } from "../../../lib/contexts/dashboardContext";


type OverviewPeriod = "today" | "thisMonth" | "thisYear" | "overall";

export function SectionCards() {
  const { t, i18n } = useTranslation();
  
  // Use shared dashboard data
  const sales = useSales();
  const products = useProducts();
  const lowStockThreshold = useLowStockThreshold();
  const dashboardLoading = useDashboardLoading();
  const { chartData, loading: chartDataLoading } = useChartData();

  const [loadingStates, setLoadingStates] = useState({
    salesStats: true,
    stockStats: true,
    clientStats: true,
    todayVsAverage: true,
    monthVsAverage: true,
    yearVsAverage: true,
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

      // Set loading to false after processing
      setLoading(false);
      } catch (error) {
        console.error('Error processing dashboard stats:', error);
        setLoading(false);
      }
    })();
  }, [dashboardLoading, sales, products, lowStockThreshold, i18n.language, dateFilters]);

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

  const overviewReady = !chartDataLoading;

  return (
    <div className="space-y-8">
      <DashboardStaggerItem step={0}>
        <ChartBarInteractive chartData={chartData} chartLoading={chartDataLoading} />
      </DashboardStaggerItem>
      {overviewReady ? (
        <>
          <DashboardStaggerItem step={1}>
            {renderSection("stockStatsSection", stockStats)}
          </DashboardStaggerItem>
          <DashboardStaggerItem step={2}>
            <ServiceStatsCard />
          </DashboardStaggerItem>
          <DashboardStaggerItem step={3}>
            <ClientStatsCard />
          </DashboardStaggerItem>
        </>
      ) : null}
    </div>
  );
}

