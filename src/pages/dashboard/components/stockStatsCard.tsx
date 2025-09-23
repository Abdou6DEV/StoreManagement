"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { TrendingUp, PackageIcon, AlertTriangleIcon, DollarSignIcon, ShoppingCartIcon, BarChart3, PieChart as PieChartIcon } from "lucide-react"
import { Pie, PieChart, Tooltip, ResponsiveContainer } from "recharts"
import { Tooltip as UITooltip } from "../../../lib/components/tooltip"

// Using div elements with card styling like other components in the project

interface StockStats {
  totalProducts: number
  lowStockItems: number
  outOfStock: number
  stockValue: number
  averageMargin: number
  averageMarginPercentage: number
  averageROI: number
  productsWithoutCodebar: number
  worstSellingProducts: Array<{
    name: string
    sold: number
    category: string
    fill: string
  }>
  categoriesData: Array<{
    category: string
    sold: number
    fill: string
  }>
  topProducts: Array<{
    name: string
    sold: number
    category: string
    fill: string
  }>
}

type ViewMode = 'categories' | 'products'


// Using CSS variables for chart colors defined in chartConfig

// Define vibrant chart colors
const chartColors = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#84cc16", // Lime
  "#f97316", // Orange
]

// Custom tooltip component
const CustomTooltip = ({ active, payload, totalItemsSold, t }: {
  active?: boolean;
  payload?: Array<{ payload: { sold: number; fill: string; category: string } }>;
  totalItemsSold: number;
  t: (key: string) => string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = totalItemsSold > 0 
      ? ((data.sold / totalItemsSold) * 100).toFixed(1)
      : "0";
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          <p className="font-medium text-foreground">
            {data.category}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.itemsSold")}: <span className="font-semibold text-foreground">{data.sold.toLocaleString()}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.percentage")}: <span className="font-semibold text-foreground">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function StockStatsCard() {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<ViewMode>('categories')
  const [stockStats, setStockStats] = useState<StockStats>({
    totalProducts: 0,
    lowStockItems: 0,
    outOfStock: 0,
    stockValue: 0,
    averageMargin: 0,
    averageMarginPercentage: 0,
    averageROI: 0,
    productsWithoutCodebar: 0,
    worstSellingProducts: [],
    categoriesData: [],
    topProducts: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStockStats() {
      try {
        const [products, sales, lowStockThreshold] = await Promise.all([
          window.api.database.products.getAll(),
          window.api.database.sales.getAll(),
          window.api.database.options.get("lowStockThreshold")
        ])

        const threshold = lowStockThreshold ? Number(lowStockThreshold) : 5
        const lowStockItems = products.filter(
          (p: { quantity: number }) => p.quantity <= threshold && p.quantity > 0
        ).length
        const outOfStock = products.filter((p: { quantity: number }) => p.quantity === 0).length
         const stockValue = products.reduce(
           (sum: number, p: { boughtPrice: number; quantity: number }) => sum + p.boughtPrice * p.quantity,
           0
         )

         // Calculate average margin and ROI
         const margins = products.map((p: { sellingPrice: number; boughtPrice: number }) => p.sellingPrice - p.boughtPrice)
         
         
         const averageMargin = margins.length > 0 ? margins.reduce((sum: number, margin: number) => sum + margin, 0) / margins.length : 0
         
         // Calculate average margin percentage
         const marginPercentages = products.map((p: { sellingPrice: number; boughtPrice: number }) => {
           if (p.sellingPrice === 0) return 0
           return ((p.sellingPrice - p.boughtPrice) / p.sellingPrice) * 100
         })
         const averageMarginPercentage = marginPercentages.length > 0 ? marginPercentages.reduce((sum: number, percentage: number) => sum + percentage, 0) / marginPercentages.length : 0
         
         const rois = products.map((p: { sellingPrice: number; boughtPrice: number }) => {
           if (p.boughtPrice === 0) return 0
           return ((p.sellingPrice - p.boughtPrice) / p.boughtPrice) * 100
         })
         const averageROI = rois.length > 0 ? rois.reduce((sum: number, roi: number) => sum + roi, 0) / rois.length : 0

         // Calculate products without codebar
         const productsWithoutCodebar = products.filter((p: { codebar?: string }) => !p.codebar || p.codebar.trim() === '').length

        // Calculate top 5 categories by items sold
        const categorySales: { [key: string]: number } = {}
        
        sales.forEach((sale: { saleItems?: Array<{ product?: { categoryName?: string }; quantity: number }> }) => {
          if (sale.saleItems) {
            sale.saleItems.forEach((item: { product?: { categoryName?: string }; quantity: number }) => {
              if (item.product && item.product.categoryName) {
                const category = item.product.categoryName
                categorySales[category] = (categorySales[category] || 0) + item.quantity
              }
            })
          }
        })

        // Sort categories by items sold and take top 5
        const sortedCategories = Object.entries(categorySales)
          .sort(([,a], [,b]) => b - a)
          
        const top5Categories = sortedCategories.slice(0, 5)
        const otherCategories = sortedCategories.slice(5)
        
        // Calculate total for "Others" category
        const othersTotal = otherCategories.reduce((sum, [, sold]) => sum + sold, 0)

        const categoriesData = top5Categories.map(([category, sold], index) => ({
          category,
          sold,
          fill: chartColors[index % chartColors.length]
        }))

        // Add "Others" category if there are more than 5 categories
        if (othersTotal > 0) {
          categoriesData.push({
            category: "Others",
            sold: othersTotal,
            fill: "#6b7280" // Gray for "Others"
          })
        }

        // Calculate top 10 products sold
        const productSales: { [key: string]: { name: string; sold: number; category: string } } = {}
        
        sales.forEach((sale: { saleItems: Array<{ product?: { id: string; name: string; categoryName?: string }; quantity: number }> }) => {
          sale.saleItems.forEach((item: { product?: { id: string; name: string; categoryName?: string }; quantity: number }) => {
            if (item.product) {
              const productId = item.product.id
              if (!productSales[productId]) {
                productSales[productId] = {
                  name: item.product.name,
                  sold: 0,
                  category: item.product.categoryName || 'Unknown'
                }
              }
              productSales[productId].sold += item.quantity
            }
          })
        })

        const allProducts = Object.values(productSales)
          .sort((a, b) => b.sold - a.sold)
        
        const top10Products = allProducts.slice(0, 10)
        const otherProducts = allProducts.slice(10)
        
        // Calculate total for "Others" products
        const othersProductsTotal = otherProducts.reduce((sum, product) => sum + product.sold, 0)
        
        const topProducts = top10Products.map((product, index) => ({
          name: product.name,
          sold: product.sold,
          category: product.category,
          fill: chartColors[index % chartColors.length]
        }))
        
         // Add "Others" category if there are more than 10 products
         if (othersProductsTotal > 0) {
           topProducts.push({
             name: "Others",
             sold: othersProductsTotal,
             category: "Various",
             fill: "#6b7280" // Gray color for "Others"
           })
         }

         // Calculate worst selling products (bottom 5)
         const worstProducts = allProducts
           .filter(product => product.sold > 0) // Only products that have been sold
           .sort((a, b) => a.sold - b.sold) // Sort by lowest sales first
           .slice(0, 5)
           .map((product, index) => ({
             name: product.name,
             sold: product.sold,
             category: product.category,
             fill: chartColors[index % chartColors.length]
           }))

        setStockStats({
          totalProducts: products.length,
          lowStockItems,
          outOfStock,
          stockValue,
          averageMargin,
          averageMarginPercentage,
          averageROI,
          productsWithoutCodebar,
          worstSellingProducts: worstProducts,
          categoriesData,
          topProducts
        })
      } catch (error) {
        console.error("Error fetching stock stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockStats()
  }, [])

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString()} ${t("currency")}`

  const totalItemsSold = React.useMemo(() => {
    return stockStats.categoriesData.reduce((acc, curr) => acc + curr.sold, 0)
  }, [stockStats.categoriesData])

  if (loading) {
    return (
      <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <PackageIcon className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t("dashboard.stockStatsSection")}
          </h2>
        </div>
        <p className="text-muted-foreground mb-4">
          {t("dashboard.stockStatsDesc", "Comprehensive stock overview and category performance")}
        </p>
        
        {/* Skeleton for stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 w-20 bg-muted-foreground/20 rounded animate-pulse" />
                <div className="h-5 w-5 bg-muted-foreground/20 rounded animate-pulse" />
              </div>
              <div className="h-6 w-16 bg-muted-foreground/20 rounded animate-pulse mb-1" />
              <div className="h-3 w-12 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Skeleton for charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-5 w-32 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-48 w-full bg-muted-foreground/20 rounded animate-pulse" />
          </div>
          <div className="space-y-3">
            <div className="h-5 w-32 bg-muted-foreground/20 rounded animate-pulse" />
            <div className="h-48 w-full bg-muted-foreground/20 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <PackageIcon className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {t("dashboard.stockStatsSection")}
        </h2>
      </div>
      <p className="text-muted-foreground mb-6">
        {t("dashboard.stockStatsDesc", "Comprehensive stock overview and category performance")}
      </p>
      <div className="space-y-6">
         {/* Stock Overview Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.totalProducts")}
             </span>
             <span className="text-3xl font-bold text-foreground">
               {stockStats.totalProducts.toLocaleString()}
             </span>
           </div>

           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.lowStockItems")}
             </span>
             <span className="text-3xl font-bold text-orange-600">
               {stockStats.lowStockItems.toLocaleString()}
             </span>
           </div>

           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.outOfStock")}
             </span>
             <span className="text-3xl font-bold text-red-600">
               {stockStats.outOfStock.toLocaleString()}
             </span>
           </div>

           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.stockValue")}
             </span>
             <span className="text-3xl font-bold text-foreground">
               {formatCurrency(stockStats.stockValue)}
             </span>
           </div>
         </div>

         {/* Additional Stats */}
         <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.averageMargin", "Avg Margin")}
             </span>
             <span className="text-3xl font-bold text-foreground">
               {Math.round(stockStats.averageMargin).toLocaleString()} {t("currency")}
             </span>
             <span className="text-sm text-muted-foreground">
               {stockStats.averageMarginPercentage.toFixed(1)}%
             </span>
           </div>

           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.averageROI", "Avg ROI")}
             </span>
             <span className="text-3xl font-bold text-foreground">
               {stockStats.averageROI.toFixed(1)}%
             </span>
           </div>

           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.noCodebar", "No Barcode")}
             </span>
             <span className="text-3xl font-bold text-foreground">
               {stockStats.productsWithoutCodebar.toLocaleString()}
             </span>
           </div>

           <div className="flex flex-col items-center gap-1">
             <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
               {t("dashboard.worstSelling", "Worst Selling")}
             </span>
             <span className="text-3xl font-bold text-foreground">
               {stockStats.worstSellingProducts.length}
             </span>
           </div>
         </div>

         {/* Chart Section with Toggle */}
        {((viewMode === 'categories' && stockStats.categoriesData.length > 0) || 
          (viewMode === 'products' && stockStats.topProducts.length > 0)) && (
          <div className="space-y-4">
              <div className="flex items-center justify-end mb-4">
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <UITooltip content={t("dashboard.categoriesTooltip", "View sales distribution by product categories")}>
                    <button
                      onClick={() => setViewMode('categories')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'categories'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <PieChartIcon className="h-4 w-4" />
                      {t("dashboard.categories", "Categories")}
                    </button>
                  </UITooltip>
                  <UITooltip content={t("dashboard.productsTooltip", "View sales distribution by individual products")}>
                    <button
                      onClick={() => setViewMode('products')}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'products'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <BarChart3 className="h-4 w-4" />
                      {t("dashboard.products", "Products")}
                    </button>
                  </UITooltip>
                </div>
              </div>

            <div className="flex flex-col lg:flex-row items-center gap-6">
               {viewMode === 'categories' ? (
                 <>
                   {/* Pie Chart */}
                   <div className="flex-1 max-w-md">
                     <div className="text-center mb-4">
                       <h3 className="text-lg font-semibold text-foreground mb-2">
                         {t("dashboard.topCategoriesSold", "Top Categories Sold")}
                       </h3>
                       <p className="text-sm text-muted-foreground">
                         {t("dashboard.categoriesChartDesc", "Distribution of items sold by category (Top 5 + Others)")}
                       </p>
                     </div>
                     <div className="w-full h-[300px] overflow-hidden rounded-lg bg-card">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart
                          style={{
                            background: 'transparent'
                          }}
                        >
                          <Tooltip
                            content={<CustomTooltip totalItemsSold={totalItemsSold} t={t} />}
                          />
                          <Pie
                            data={stockStats.categoriesData}
                            dataKey="sold"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            labelLine={false}
                            label={({ payload, ...props }) => {
                              const percentage = totalItemsSold > 0 
                                ? ((payload.sold / totalItemsSold) * 100).toFixed(1)
                                : "0"
                              return (
                                <text
                                  cx={props.cx}
                                  cy={props.cy}
                                  x={props.x}
                                  y={props.y}
                                  textAnchor={props.textAnchor}
                                  dominantBaseline={props.dominantBaseline}
                                  fill="currentColor"
                                  className="text-sm font-bold pointer-events-none drop-shadow-sm text-primary"
                                >
                                  {percentage}%
                                </text>
                              )
                            }}
                            className="cursor-default"
                            stroke="none"
                            onClick={(e) => e.preventDefault()}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseUp={(e) => e.preventDefault()}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 space-y-2">
                    <h4 className="font-medium text-foreground mb-3">
                      {t("dashboard.categoryBreakdown", "Category Breakdown")}
                    </h4>
                    {stockStats.categoriesData.map((item) => {
                      const percentage = totalItemsSold > 0 
                        ? ((item.sold / totalItemsSold) * 100).toFixed(1)
                        : "0"
                      
                      return (
                        <div key={item.category} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <span className="text-sm font-medium text-foreground">
                              {item.category}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">
                              {item.sold.toLocaleString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {percentage}%
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
               ) : (
                 <>
                   {/* Products Pie Chart */}
                   <div className="flex-1 max-w-md">
                     <div className="text-center mb-4">
                       <h3 className="text-lg font-semibold text-foreground mb-2">
                         {t("dashboard.topProductsSold", "Top Products Sold")}
                       </h3>
                       <p className="text-sm text-muted-foreground">
                         {t("dashboard.productsChartDesc", "Top 10 best-selling products")}
                       </p>
                     </div>
                     <div className="w-full h-[300px] overflow-hidden rounded-lg bg-card">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart
                          style={{
                            background: 'transparent'
                          }}
                        >
                          <Tooltip
                            content={<CustomTooltip totalItemsSold={totalItemsSold} t={t} />}
                          />
                          <Pie
                            data={stockStats.topProducts}
                            dataKey="sold"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            labelLine={false}
                            label={({ payload, ...props }) => {
                              const percentage = totalItemsSold > 0 
                                ? ((payload.sold / totalItemsSold) * 100).toFixed(1)
                                : "0"
                              return (
                                <text
                                  cx={props.cx}
                                  cy={props.cy}
                                  x={props.x}
                                  y={props.y}
                                  textAnchor={props.textAnchor}
                                  dominantBaseline={props.dominantBaseline}
                                  fill="currentColor"
                                  className="text-sm font-bold pointer-events-none drop-shadow-sm text-primary"
                                >
                                  {percentage}%
                                </text>
                              )
                            }}
                            className="cursor-default"
                            stroke="none"
                            onClick={(e) => e.preventDefault()}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseUp={(e) => e.preventDefault()}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Products Legend */}
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground mb-3">
                      {t("dashboard.productsBreakdown", "Products Breakdown")}
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {stockStats.topProducts.map((product) => {
                        const percentage = totalItemsSold > 0 
                          ? ((product.sold / totalItemsSold) * 100).toFixed(1)
                          : "0"
                        
                        return (
                          <div key={product.name} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: product.fill }}
                              />
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                  {product.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {product.category}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-foreground">
                                {product.sold.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {percentage}%
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer with trend info */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 border-t">
          <TrendingUp className="h-4 w-4" />
          <span>
            {t("dashboard.stockStatsFooter", "Real-time stock monitoring and category performance analysis")}
          </span>
        </div>
      </div>
    </div>
  )
}
