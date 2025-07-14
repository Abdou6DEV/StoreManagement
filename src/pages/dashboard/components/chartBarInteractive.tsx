"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

// Sample data for different time periods with rates
const dailyData = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1
  const baseProfit = Math.floor(Math.random() * 2000) + 500
  const baseCustomers = Math.floor(Math.random() * 50) + 10
  const baseSales = Math.floor(Math.random() * 5000) + 1000

  return {
    period: `Day ${day}`,
    profits: baseProfit,
    customers: baseCustomers,
    sales: baseSales,
    profitsRate: (Math.random() * 40 - 20).toFixed(1),
    customersRate: (Math.random() * 30 - 10).toFixed(1),
    salesRate: (Math.random() * 25 - 12.5).toFixed(1),
  }
})

const monthlyData = [
  { period: "Jan", profits: 12500, customers: 145, sales: 45600, profitsRate: "+8.2", customersRate: "+12.5", salesRate: "+5.3" },
  { period: "Feb", profits: 15200, customers: 189, sales: 52300, profitsRate: "+21.6", customersRate: "+30.3", salesRate: "+14.7" },
  { period: "Mar", profits: 18900, customers: 234, sales: 48900, profitsRate: "+24.3", customersRate: "+23.8", salesRate: "-6.5" },
  { period: "Apr", profits: 16700, customers: 198, sales: 56700, profitsRate: "-11.6", customersRate: "-15.4", salesRate: "+16.0" },
  { period: "May", profits: 21300, customers: 267, sales: 61200, profitsRate: "+27.5", customersRate: "+34.8", salesRate: "+7.9" },
  { period: "Jun", profits: 19800, customers: 245, sales: 58800, profitsRate: "-7.0", customersRate: "-8.2", salesRate: "-3.9" },
  { period: "Jul", profits: 23400, customers: 289, sales: 64500, profitsRate: "+18.2", customersRate: "+18.0", salesRate: "+9.7" },
  { period: "Aug", profits: 25100, customers: 312, sales: 67200, profitsRate: "+7.3", customersRate: "+8.0", salesRate: "+4.2" },
  { period: "Sep", profits: 22800, customers: 298, sales: 62800, profitsRate: "-9.2", customersRate: "-4.5", salesRate: "-6.5" },
  { period: "Oct", profits: 26500, customers: 334, sales: 71500, profitsRate: "+16.2", customersRate: "+12.1", salesRate: "+13.9" },
  { period: "Nov", profits: 28200, customers: 356, sales: 74200, profitsRate: "+6.4", customersRate: "+6.6", salesRate: "+3.8" },
  { period: "Dec", profits: 31000, customers: 389, sales: 78900, profitsRate: "+9.9", customersRate: "+9.3", salesRate: "+6.3" },
]

const yearlyData = [
  { period: "2019", profits: 185000, customers: 2100, sales: 650000, profitsRate: "+15.2", customersRate: "+18.5", salesRate: "+12.3" },
  { period: "2020", profits: 165000, customers: 1890, sales: 580000, profitsRate: "-10.8", customersRate: "-10.0", salesRate: "-10.8" },
  { period: "2021", profits: 220000, customers: 2450, sales: 720000, profitsRate: "+33.3", customersRate: "+29.6", salesRate: "+24.1" },
  { period: "2022", profits: 275000, customers: 2890, sales: 850000, profitsRate: "+25.0", customersRate: "+18.0", salesRate: "+18.1" },
  { period: "2023", profits: 315000, customers: 3200, sales: 920000, profitsRate: "+14.5", customersRate: "+10.7", salesRate: "+8.2" },
  { period: "2024", profits: 287000, customers: 3100, sales: 890000, profitsRate: "-8.9", customersRate: "-3.1", salesRate: "-3.3" },
]

const chartTypes = {
  profits: {
    title: "Profit Analysis",
    description: "Track profit trends over time",
    format: (value: number) => `$${value.toLocaleString()}`,
    dataKey: "profits" as const,
    rateKey: "profitsRate" as const,
  },
  customers: {
    title: "Customer Growth",
    description: "Monitor customer acquisition",
    format: (value: number) => `${value} customers`,
    dataKey: "customers" as const,
    rateKey: "customersRate" as const,
  },
  sales: {
    title: "Sales Performance",
    description: "Total sales revenue tracking",
    format: (value: number) => `$${value.toLocaleString()}`,
    dataKey: "sales" as const,
    rateKey: "salesRate" as const,
  },
}

const timePeriods = {
  "1m": { data: dailyData, label: "1 Month (Daily)", description: "Last 30 days", comparison: "vs previous day" },
  "12m": { data: monthlyData, label: "12 Months", description: "Current year months", comparison: "vs previous month" },
  years: { data: yearlyData, label: "Years", description: "Yearly performance", comparison: "vs previous year" },
}

// Custom tooltip component that follows cursor
const CustomTooltip = ({ active, payload, label, chartType, comparison }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    const currentChart = chartTypes[chartType as keyof typeof chartTypes]
    const value = data[currentChart.dataKey]
    const rate = data[currentChart.rateKey]
    const isPositive = !rate.startsWith("-")

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[160px]">
        <div className="space-y-2">
          <div className="border-b border-gray-100 pb-2">
            <p className="text-sm font-medium text-gray-900">{label}</p>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Value:</span>
              <span className="text-sm font-semibold text-gray-900">{currentChart.format(value)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{comparison}:</span>
              <span className={`text-sm font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {rate}%
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function ChartBarInteractive() {
  const [timePeriod, setTimePeriod] = React.useState<keyof typeof timePeriods>("12m")
  const [chartType, setChartType] = React.useState<keyof typeof chartTypes>("profits")

  const currentChart = chartTypes[chartType]
  const currentPeriod = timePeriods[timePeriod]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{currentChart.title}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {currentChart.description} - {currentPeriod.description}
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Chart Type Selector */}
          <select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value as keyof typeof chartTypes)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="profits">Profits</option>
            <option value="customers">Customer Growth</option>
            <option value="sales">Sales</option>
          </select>

          {/* Time Period Toggle Buttons */}
          <div className="flex rounded-lg border border-gray-300 bg-gray-50 p-1">
            {Object.entries(timePeriods).map(([key, period]) => (
              <button
                key={key}
                onClick={() => setTimePeriod(key as keyof typeof timePeriods)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  timePeriod === key
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {key === "1m" ? "1M" : key === "12m" ? "12M" : "Years"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={currentPeriod.data}
            margin={{ top: 20, right: 30, left: 20, bottom: timePeriod === "1m" ? 60 : 20 }}
          >
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity={1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid 
              strokeDasharray="3 3" 
              vertical={false} 
              stroke="#f1f5f9"
            />
            
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={timePeriod === "1m" ? -45 : 0}
              textAnchor={timePeriod === "1m" ? "end" : "middle"}
              fontSize={12}
              fill="#64748b"
            />
            
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={12}
              fill="#64748b"
              tickFormatter={(value) => {
                if (chartType === "customers") return `${value}`
                return `$${(value / 1000).toFixed(0)}k`
              }}
            />
            
            <Tooltip
              content={<CustomTooltip chartType={chartType} comparison={currentPeriod.comparison} />}
              cursor={{ fill: "rgba(59, 130, 246, 0.1)" }}
              position={{ x: undefined, y: undefined }}
            />
            
            <Bar 
              dataKey={currentChart.dataKey} 
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}