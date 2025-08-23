import { useTranslation } from "react-i18next";
import { FileText, ShoppingCart, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import type { SelectedPeriod } from "../../../../types";
import { formatCurrency } from "../generalHistory/generalHistoryUtils";

interface DetailsHistoryHeaderProps {
  selectedPeriod: SelectedPeriod;
  salesCount: number;
  purchasesCount: number;
  paymentsCount: number;
  salesTotal: number;
  salesProfit: number;
  purchasesTotal: number;
  previousPeriodSalesTotal?: number;
  previousPeriodPurchasesTotal?: number;
  historicalAverages: {
    averageRevenue: number;
    averageProfit: number;
    totalSales: number;
  };
}

export default function DetailsHistoryHeader({
  selectedPeriod,
  salesCount,
  purchasesCount,
  paymentsCount,
  salesTotal,
  salesProfit,
  purchasesTotal,
  previousPeriodSalesTotal = 0,
  previousPeriodPurchasesTotal = 0,
  historicalAverages,
}: DetailsHistoryHeaderProps) {
  const { t } = useTranslation();

  const getPeriodDisplayName = () => {
    if (selectedPeriod.period === "day") {
      return new Date(selectedPeriod.periodValue).toLocaleDateString();
    } else if (selectedPeriod.period === "month") {
      const [year, month] = selectedPeriod.periodValue.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString(
        undefined,
        {
          year: "numeric",
          month: "long",
        },
      );
    } else {
      return selectedPeriod.periodValue;
    }
  };

  const calculateGrowthRate = (current: number, previous: number) => {
    // Handle NaN and invalid numbers
    if (isNaN(current) || isNaN(previous) || !isFinite(current) || !isFinite(previous)) {
      return 0;
    }
    
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Calculate growth rates against historical averages for more meaningful comparison
  const avgSalesPerPeriod = historicalAverages.averageRevenue * (salesCount > 0 ? salesCount : 1);
  const avgProfitPerPeriod = historicalAverages.averageProfit * (salesCount > 0 ? salesCount : 1);
  
  const salesGrowthRate = calculateGrowthRate(salesTotal, avgSalesPerPeriod);
  const profitGrowthRate = calculateGrowthRate(salesProfit, avgProfitPerPeriod);
  const purchasesGrowthRate = calculateGrowthRate(purchasesTotal, previousPeriodPurchasesTotal);



  return (
    <div className="bg-gradient-to-r from-primary/3 to-primary/6 border border-primary/15 rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {getPeriodDisplayName()}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {/* Sales Card */}
          <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-semibold">{salesCount} Sales</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(isNaN(salesTotal) ? 0 : salesTotal)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {salesGrowthRate >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs font-medium ${
                salesGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {salesGrowthRate >= 0 ? '+' : ''}{(isNaN(salesGrowthRate) ? 0 : salesGrowthRate).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Profit Card */}
          <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <div className="font-semibold">Profit</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(isNaN(salesProfit) ? 0 : salesProfit)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {profitGrowthRate >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs font-medium ${
                profitGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {profitGrowthRate >= 0 ? '+' : ''}{(isNaN(profitGrowthRate) ? 0 : profitGrowthRate).toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Payments Card */}
          <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              <div>
                <div className="font-semibold">{paymentsCount} Payments</div>
                <div className="text-xs text-muted-foreground">
                  Credit & Versement
                </div>
              </div>
            </div>
          </div>
          
          {/* Purchases Card */}
          <div className="flex items-center gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              <div>
                <div className="font-semibold">{purchasesCount} Purchases</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(isNaN(purchasesTotal) ? 0 : purchasesTotal)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              {purchasesGrowthRate >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-xs font-medium ${
                purchasesGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {purchasesGrowthRate >= 0 ? '+' : ''}{(isNaN(purchasesGrowthRate) ? 0 : purchasesGrowthRate).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
