import {
  TrendingDownIcon,
  TrendingUpIcon,
  PackageIcon,
  DollarSignIcon,
  CreditCardIcon,
  AlertTriangleIcon,
  BanknoteIcon,
  WalletIcon,
  ReceiptIcon,
  ShoppingCartIcon,
} from "lucide-react";

export function SectionCards() {
  const salesStats = [
    {
      label: "Today",
      revenue: "$2,450",
      profit: "$890",
      itemsSold: "47",
      profitRating: "+12.5%",
      trend: { value: "+8.2%", isPositive: true },
      description: "vs yesterday",
    },
    {
      label: "This Month",
      revenue: "$45,231",
      profit: "$18,450",
      itemsSold: "1,247",
      profitRating: "+15.3%",
      trend: { value: "+15.3%", isPositive: true },
      description: "vs last month",
    },
    {
      label: "This Year",
      revenue: "$487,650",
      profit: "$195,200",
      itemsSold: "12,890",
      profitRating: "+22.1%",
      trend: { value: "+22.1%", isPositive: true },
      description: "vs last year",
    },
    {
      label: "Overall",
      revenue: "$1,245,780",
      profit: "$456,890",
      itemsSold: "34,567",
      profitRating: "+18.7%",
      trend: { value: "+18.7%", isPositive: true },
      description: "total performance",
    },
  ];

  const stockStats = [
    {
      label: "Total Products",
      value: "1,247",
      description: "In inventory",
      trend: { value: "+12", isPositive: true },
      icon: PackageIcon,
    },
    {
      label: "Low Stock Items",
      value: "23",
      description: "Need reorder",
      trend: { value: "+5", isPositive: false },
      icon: AlertTriangleIcon,
    },
    {
      label: "Stock Value",
      value: "$127,450",
      description: "Total inventory",
      trend: { value: "+5.2%", isPositive: true },
      icon: DollarSignIcon,
    },
    {
      label: "Out of Stock",
      value: "8",
      description: "Items unavailable",
      trend: { value: "-3", isPositive: true },
      icon: PackageIcon,
    },
  ];

  const financeStats = [
    {
      label: "Store Cash",
      value: "$34,250",
      description: "Available funds",
      trend: { value: "+$2,100", isPositive: true },
      icon: WalletIcon,
    },
    {
      label: "Outstanding Bills",
      value: "$8,450",
      description: "Due this month",
      trend: { value: "-$1,200", isPositive: true },
      icon: ReceiptIcon,
    },
    {
      label: "Customer Credit",
      value: "$12,890",
      description: "Accounts receivable",
      trend: { value: "+$890", isPositive: true },
      icon: CreditCardIcon,
    },
    {
      label: "Monthly Expenses",
      value: "$15,670",
      description: "Operating costs",
      trend: { value: "+$340", isPositive: false },
      icon: BanknoteIcon,
    },
  ];

  const renderSalesCards = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Sales Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesStats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 bg-card rounded-xl shadow-md border flex flex-col items-start hover:shadow-lg transition-shadow duration-300 relative"
          >
            <div className="flex items-center justify-between w-full">
              <div className="text-muted-foreground text-xs font-medium">
                {stat.label}
              </div>
              <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-1 mt-2 w-full">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Revenue</span>
                <span className="text-sm font-semibold">{stat.revenue}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Profit</span>
                <span className="text-sm font-semibold text-green-600">
                  {stat.profit}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Items Sold
                </span>
                <span className="text-sm font-semibold">{stat.itemsSold}</span>
              </div>
            </div>
            <div className="absolute right-4 top-4">
              <div
                className={`flex gap-1 rounded-lg text-xs px-2 py-1 border ${
                  stat.trend.isPositive
                    ? "text-green-600 border-green-200 bg-green-50"
                    : "text-red-600 border-red-200 bg-red-50"
                }`}
              >
                {stat.trend.isPositive ? (
                  <TrendingUpIcon className="w-3 h-3" />
                ) : (
                  <TrendingDownIcon className="w-3 h-3" />
                )}
                {stat.profitRating}
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              {stat.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStockCards = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Inventory Status
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stockStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-6 bg-card rounded-xl shadow-md border flex flex-col items-start hover:shadow-lg transition-shadow duration-300 relative"
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-muted-foreground text-xs font-medium">
                  {stat.label}
                </div>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-card-foreground mb-2 mt-2">
                {stat.value}
              </div>
              <div className="absolute right-4 top-4">
                <div
                  className={`flex gap-1 rounded-lg text-xs px-2 py-1 border ${
                    stat.trend.isPositive
                      ? "text-green-600 border-green-200 bg-green-50"
                      : "text-red-600 border-red-200 bg-red-50"
                  }`}
                >
                  {stat.trend.isPositive ? (
                    <TrendingUpIcon className="w-3 h-3" />
                  ) : (
                    <TrendingDownIcon className="w-3 h-3" />
                  )}
                  {stat.trend.value}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFinanceCards = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Finance Status</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {financeStats.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.label}
              className="p-6 bg-card rounded-xl shadow-md border flex flex-col items-start hover:shadow-lg transition-shadow duration-300 relative"
            >
              <div className="flex items-center justify-between w-full">
                <div className="text-muted-foreground text-xs font-medium">
                  {stat.label}
                </div>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold text-card-foreground mb-2 mt-2">
                {stat.value}
              </div>
              <div className="absolute right-4 top-4">
                <div
                  className={`flex gap-1 rounded-lg text-xs px-2 py-1 border ${
                    stat.trend.isPositive
                      ? "text-green-600 border-green-200 bg-green-50"
                      : "text-red-600 border-red-200 bg-red-50"
                  }`}
                >
                  {stat.trend.isPositive ? (
                    <TrendingUpIcon className="w-3 h-3" />
                  ) : (
                    <TrendingDownIcon className="w-3 h-3" />
                  )}
                  {stat.trend.value}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {stat.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {renderSalesCards()}
      {renderStockCards()}
      {renderFinanceCards()}
    </div>
  );
}
