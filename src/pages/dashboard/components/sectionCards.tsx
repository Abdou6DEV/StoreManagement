import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  PackageIcon,
  DollarSignIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  WalletIcon,
} from "lucide-react";

export function SectionCards() {
  const { t } = useTranslation();
  const [salesStats, setSalesStats] = useState<any[]>([]);
  const [stockStats, setStockStats] = useState<any[]>([]);
  const [clientStats, setClientStats] = useState<any[]>([]);

  useEffect(() => {
    async function fetchStats() {
      const [sales, products, payments, clients] = await Promise.all([
        window.api.database.sales.getAll(),
        window.api.database.products.getAll(),
        window.api.database.payments.getAll(),
        window.api.database.clients.getAll(),
      ]);

      function calcSalesStats(
        labelKey: string,
        filterFn: (date: Date) => boolean,
      ) {
        const filtered = sales.filter((s: any) => filterFn(s.createdAt));
        const revenue = filtered.reduce(
          (sum: number, s: any) => sum + (s.totalWithDiscount || 0),
          0,
        );
        const profit = filtered.reduce((sum: number, s: any) => {
          return (
            sum +
            (s.saleItems?.reduce(
              (itemSum: number, item: any) =>
                itemSum +
                (item.price - (item.product?.bought || 0)) * item.quantity,
              0,
            ) || 0)
          );
        }, 0);
        const itemsSold = filtered.reduce(
          (sum: number, s: any) => sum + (s.totalItems || 0),
          0,
        );
        return {
          labelKey: `dashboard.${labelKey}`,
          revenue: `${revenue.toLocaleString()} DA`,
          profit: `${profit.toLocaleString()} DA`,
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
      const todayStats = calcSalesStats("today", isToday);
      const monthStats = calcSalesStats("thisMonth", isThisMonth);
      const yearStats = calcSalesStats("thisYear", isThisYear);
      const overallStats = calcSalesStats("overall", () => true);
      setSalesStats([todayStats, monthStats, yearStats, overallStats]);

      const totalProducts = products.length;
      const lowStockItems = products.filter(
        (p: any) => p.quantity <= 5 && p.quantity > 0,
      ).length;
      const outOfStock = products.filter((p: any) => p.quantity === 0).length;
      const stockValue = products.reduce(
        (sum: number, p: any) => sum + p.bought * p.quantity,
        0,
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
          value: `${stockValue.toLocaleString()} DA`,
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
        (p: any) => p.type === "VERSEMENT",
      );
      const unpaidCredit = totalCredit.filter((p: any) => !p.paidAt).length;
      const unpaidVersement = totalVersement.filter(
        (p: any) => !p.paidAt,
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
  }, []);

  const renderSection = (titleKey: string, cards: any[]) => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-2">
        {t(`dashboard.${titleKey}`)}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.labelKey}
              className="p-6 bg-card rounded-xl shadow-md border flex flex-col items-start space-y-1 hover:shadow-lg transition-shadow duration-300 relative"
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-muted-foreground text-xs font-medium">
                  {t(stat.labelKey)}
                </div>
                {IconComponent && (
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {stat.revenue && (
                <div className="flex items-center justify-between w-full mt-2">
                  <span className="text-xs text-muted-foreground">
                    {t("dashboard.revenue")}
                  </span>
                  <span className="text-sm font-semibold">{stat.revenue}</span>
                </div>
              )}
              {stat.profit && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-muted-foreground">
                    {t("dashboard.profit")}
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    {stat.profit}
                  </span>
                </div>
              )}
              {stat.itemsSold && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs text-muted-foreground">
                    {t("dashboard.itemsSold")}
                  </span>
                  <span className="text-sm font-semibold">
                    {stat.itemsSold}
                  </span>
                </div>
              )}
              {stat.value &&
                !stat.revenue &&
                !stat.profit &&
                !stat.itemsSold && (
                  <div className="text-2xl font-bold text-card-foreground mb-2 mt-2">
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
