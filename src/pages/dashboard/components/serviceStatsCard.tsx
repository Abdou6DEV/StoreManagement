"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Wrench,
  TrendingUp,
  Clock,
  AlertCircle,
  DollarSign,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react"
import { Pie, PieChart, Tooltip, ResponsiveContainer, Line, LineChart, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts"
import { Tooltip as UITooltip } from "../../../lib/components/tooltip"
import { useDashboardLoading } from "../../../lib/contexts/dashboardContext"
import { useTheme } from "../../../lib/hooks/useTheme"

interface ServiceStats {
  totalServices: number
  completedServices: number
  pendingServices: number
  overdueServices: number
  totalRevenue: number
  totalCost: number
  totalProfit: number
  averageTurnaroundDays: number
  completionRate: number
  serviceTypesData: Array<{
    serviceType: string
    count: number
    revenue: number
    profit: number
    fill: string
  }>
  serviceNamesData: Array<{
    serviceName: string
    serviceType: string
    count: number
    revenue: number
    profit: number
    fill: string
  }>
  monthlyTrends: Array<{
    period: string
    completed: number
    revenue: number
    profit: number
  }>
  twelveMonthTrends: Array<{
    period: string
    completed: number
    revenue: number
    profit: number
  }>
  yearlyTrends: Array<{
    period: string
    completed: number
    revenue: number
    profit: number
  }>
  topServiceTypes: Array<{
    serviceType: string
    count: number
    revenue: number
    avgPrice: number
  }>
  topServiceNames: Array<{
    serviceName: string
    serviceType: string
    count: number
    revenue: number
    avgPrice: number
    fill: string
  }>
}

type ViewMode = 'types' | 'names' | 'trends'

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

/** Recharts `Pie` sector typings omit DOM events; call preventDefault only when it exists. */
function preventPiePointerDefault(e: unknown) {
  (e as { preventDefault?: () => void })?.preventDefault?.()
}

/**
 * Same Y-axis tick system as `chartBarInteractive`:
 * 5 labels, 4 equal steps, "nice" rounded ceilings.
 */
const QUARTER_TOP_FACTORS = [1, 2, 2.5, 3.75, 5, 7.5, 10] as const;

function minimalNiceStepForQuarterTop(minTop: number): number {
  const floor = Math.max(minTop, 1e-12);
  let exp = Math.floor(Math.log10(floor / 4));
  for (let guard = 0; guard < 48; guard++) {
    const steps = QUARTER_TOP_FACTORS.map((nf) => nf * 10 ** exp).sort((a, b) => a - b);
    for (const step of steps) {
      if (4 * step >= floor - 1e-9) return step;
    }
    exp += 1;
  }
  return floor / 4;
}

function buildNiceYTicksQuarterMax(scaleMin: number, rawTop: number): number[] {
  if (!Number.isFinite(scaleMin) || !Number.isFinite(rawTop)) return [0];
  if (rawTop < scaleMin) return [0];
  if (Math.abs(rawTop - scaleMin) < 1e-12) {
    return scaleMin === 0 ? [0] : [scaleMin];
  }

  if (scaleMin >= 0) {
    const step = minimalNiceStepForQuarterTop(rawTop);
    const hi = 4 * step;
    return [0, step, 2 * step, 3 * step, hi];
  }

  const spanNeed = rawTop - scaleMin;
  let exp = Math.floor(Math.log10(Math.max(spanNeed / 4, 1e-12)));
  for (let guard = 0; guard < 48; guard++) {
    for (const nf of QUARTER_TOP_FACTORS) {
      const step = nf * 10 ** exp;
      const t0 = Math.floor(scaleMin / step) * step;
      const hi = t0 + 4 * step;
      if (hi >= rawTop - 1e-9) {
        return [t0, t0 + step, t0 + 2 * step, t0 + 3 * step, hi];
      }
    }
    exp += 1;
  }

  return [scaleMin, rawTop];
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, totalServices, t }: {
  active?: boolean;
  payload?: Array<{ payload: { count: number; fill: string; serviceType?: string; serviceName?: string; revenue: number; profit: number } }>;
  totalServices: number;
  t: (key: string) => string;
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const percentage = totalServices > 0 
      ? ((data.count / totalServices) * 100).toFixed(1)
      : "0";
    
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.fill }}
          />
          <div className="flex flex-col">
            <p className="font-medium text-foreground">
              {data.serviceName || data.serviceType}
            </p>
            {data.serviceName && data.serviceType && (
              <p className="text-xs text-muted-foreground">
                {data.serviceType}
              </p>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.services")}: <span className="font-semibold text-foreground">{data.count.toLocaleString()}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.revenue")}: <span className="font-semibold text-foreground">{data.revenue.toLocaleString()} {t("currency")}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.profit")}: <span className="font-semibold text-green-600 dark:text-green-400">{data.profit.toLocaleString()} {t("currency")}</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.percentage")}: <span className="font-semibold text-foreground">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function ServiceStatsCard() {
  const { t, i18n } = useTranslation()
  const dashboardLoading = useDashboardLoading();
  const { isDark } = useTheme();
  
  const [viewMode, setViewMode] = useState<ViewMode>('names')
  const [trendPeriod, setTrendPeriod] = useState<"sixMonths" | "twelveMonths" | "allTime">("sixMonths")
  const [serviceStats, setServiceStats] = useState<ServiceStats>({
    totalServices: 0,
    completedServices: 0,
    pendingServices: 0,
    overdueServices: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    averageTurnaroundDays: 0,
    completionRate: 0,
    serviceTypesData: [],
    serviceNamesData: [],
    monthlyTrends: [],
    twelveMonthTrends: [],
    yearlyTrends: [],
    topServiceTypes: [],
    topServiceNames: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only process data when dashboard data is loaded
    if (dashboardLoading) {
      setLoading(true);
      return;
    }
    
    async function processServiceStats() {
      try {
        // Fetch all service appointments
        const allServices = await window.api.database.serviceAppointments.getAll();
        
        // Basic counts
        const totalServices = allServices.length;
        const completedServices = allServices.filter((s: any) => s.isCompleted).length;
        const pendingServices = allServices.filter((s: any) => !s.isCompleted).length;
        
        // Calculate overdue services
        const now = new Date();
        const overdueServices = allServices.filter((s: any) => {
          const dueDate = new Date(s.dueDate);
          return !s.isCompleted && dueDate < now;
        }).length;
        
        // Calculate revenue, cost, and profit (only from completed services)
        const completedServicesData = allServices.filter((s: any) => s.isCompleted);
        const totalRevenue = completedServicesData.reduce((sum: number, s: any) => sum + (s.servicePrice || 0), 0);
        const totalCost = completedServicesData.reduce((sum: number, s: any) => sum + (s.costPrice || 0), 0);
        const totalProfit = totalRevenue - totalCost;
        
        // Calculate average turnaround time (for completed services)
        const turnaroundTimes = completedServicesData
          .filter((s: any) => s.completedAt)
          .map((s: any) => {
            const created = new Date(s.createdAt);
            const completed = new Date(s.completedAt);
            const diffTime = Math.abs(completed.getTime() - created.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
          });
        
        const averageTurnaroundDays = turnaroundTimes.length > 0
          ? Math.round(turnaroundTimes.reduce((a: number, b: number) => a + b, 0) / turnaroundTimes.length)
          : 0;
        
        // Calculate completion rate
        const completionRate = totalServices > 0 ? (completedServices / totalServices) * 100 : 0;
        
        // Group services by type
        const servicesByType: { [key: string]: any[] } = {};
        allServices.forEach((service: any) => {
          if (!servicesByType[service.serviceType]) {
            servicesByType[service.serviceType] = [];
          }
          servicesByType[service.serviceType].push(service);
        });
        
        // Calculate service types data
        const serviceTypesData = Object.entries(servicesByType)
          .map(([serviceType, services], index) => {
            const completedInType = services.filter((s: any) => s.isCompleted);
            const revenue = completedInType.reduce((sum: number, s: any) => sum + (s.servicePrice || 0), 0);
            const cost = completedInType.reduce((sum: number, s: any) => sum + (s.costPrice || 0), 0);
            const profit = revenue - cost;
            
            return {
              serviceType,
              count: services.length,
              revenue,
              profit,
              fill: chartColors[index % chartColors.length]
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 8); // Top 8 service types
        
        // Calculate top service types with details
        const topServiceTypes = Object.entries(servicesByType)
          .map(([serviceType, services]) => {
            const completedInType = services.filter((s: any) => s.isCompleted);
            const revenue = completedInType.reduce((sum: number, s: any) => sum + (s.servicePrice || 0), 0);
            const avgPrice = completedInType.length > 0 
              ? revenue / completedInType.length 
              : 0;
            
            return {
              serviceType,
              count: services.length,
              revenue,
              avgPrice
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5); // Top 5
        
        // Group services by name (specific service)
        const servicesByName: { [key: string]: any[] } = {};
        allServices.forEach((service: any) => {
          const key = `${service.name}|||${service.serviceType}`; // Use separator to keep both name and type
          if (!servicesByName[key]) {
            servicesByName[key] = [];
          }
          servicesByName[key].push(service);
        });
        
        // Calculate service names data for pie chart
        const serviceNamesDataUnsorted = Object.entries(servicesByName)
          .map(([key, services]) => {
            const [serviceName, serviceType] = key.split('|||');
            const completedInName = services.filter((s: any) => s.isCompleted);
            const revenue = completedInName.reduce((sum: number, s: any) => sum + (s.servicePrice || 0), 0);
            const cost = completedInName.reduce((sum: number, s: any) => sum + (s.costPrice || 0), 0);
            const profit = revenue - cost;
            const avgPrice = completedInName.length > 0 
              ? revenue / completedInName.length 
              : 0;
            
            return {
              serviceName,
              serviceType,
              count: services.length,
              revenue,
              profit,
              avgPrice
            };
          })
          .sort((a, b) => b.count - a.count);
        
        // Assign colors after sorting to ensure consistent color mapping
        const serviceNamesData = serviceNamesDataUnsorted
          .slice(0, 8) // Top 8 service names
          .map((item, index) => ({
            ...item,
            fill: chartColors[index % chartColors.length]
          }));
        
        // Calculate top service names with details (top 5) - use same colors from serviceNamesData
        const topServiceNames = serviceNamesDataUnsorted
          .slice(0, 5) // Top 5
          .map((item, index) => ({
            ...item,
            fill: chartColors[index % chartColors.length]
          }));
        
        const getServiceDate = (s: any) =>
          (s.completedAt ? new Date(s.completedAt) : new Date(s.createdAt));

        // Build fixed windows so X-axis stays consistent:
        // - 6m and 12m are calendar months (including zeros)
        // - All-time is yearly buckets (from earliest service year -> now)
        const buildMonthTrends = (monthsCount: number) => {
          const trends: Array<{ period: string; completed: number; revenue: number; profit: number }> = [];

          for (let i = monthsCount - 1; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);

            const monthServices = allServices.filter((s: any) => {
              const serviceDate = getServiceDate(s);
              return (
                !isNaN(serviceDate.getTime()) &&
                serviceDate.getMonth() === date.getMonth() &&
                serviceDate.getFullYear() === date.getFullYear()
              );
            });

            const completedServices = monthServices.filter((s: any) => s.isCompleted);
            const completed = completedServices.length;

            const revenue = completedServices.reduce(
              (sum: number, s: any) => sum + (s.servicePrice || 0),
              0,
            );
            const cost = completedServices.reduce(
              (sum: number, s: any) => sum + (s.costPrice || 0),
              0,
            );

            trends.push({
              period: t(`dashboard.months.${date.getMonth()}`),
              completed,
              revenue,
              profit: revenue - cost,
            });
          }

          return trends;
        };

        const monthlyTrends = buildMonthTrends(6);
        const twelveMonthTrends = buildMonthTrends(12);

        const serviceDates = allServices.map((s: any) => getServiceDate(s)).filter((d: Date) => !isNaN(d.getTime()));
        const earliestDate = serviceDates.length > 0 ? new Date(Math.min(...serviceDates.map((d: Date) => d.getTime()))) : now;
        const startYear = earliestDate.getFullYear();
        const endYear = now.getFullYear();

        const yearlyTrends = Array.from({ length: endYear - startYear + 1 }, (_, idx) => startYear + idx).map((year) => {
          const yearServices = allServices.filter((s: any) => {
            const serviceDate = getServiceDate(s);
            return !isNaN(serviceDate.getTime()) && serviceDate.getFullYear() === year;
          });

          const completedServices = yearServices.filter((s: any) => s.isCompleted);
          const completed = completedServices.length;

          const revenue = completedServices.reduce(
            (sum: number, s: any) => sum + (s.servicePrice || 0),
            0,
          );
          const cost = completedServices.reduce(
            (sum: number, s: any) => sum + (s.costPrice || 0),
            0,
          );

          return {
            period: year.toString(),
            completed,
            revenue,
            profit: revenue - cost,
          };
        });
        
        setServiceStats({
          totalServices,
          completedServices,
          pendingServices,
          overdueServices,
          totalRevenue,
          totalCost,
          totalProfit,
          averageTurnaroundDays,
          completionRate,
          serviceTypesData,
          serviceNamesData,
          monthlyTrends,
          twelveMonthTrends,
          yearlyTrends,
          topServiceTypes,
          topServiceNames
        });
      } catch (error) {
        console.error("Error processing service stats:", error)
      } finally {
        setLoading(false)
      }
    }

    processServiceStats()
  }, [dashboardLoading, t, i18n.language])

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString()} ${t("currency")}`
  
  const formatIntegerCurrency = (amount: number) =>
    `${Math.round(amount)} ${t("currency")}`

  const totalServicesForChart = React.useMemo(() => {
    if (viewMode === 'names') {
      return serviceStats.serviceNamesData.reduce((acc, curr) => acc + curr.count, 0)
    }
    return serviceStats.serviceTypesData.reduce((acc, curr) => acc + curr.count, 0)
  }, [serviceStats.serviceTypesData, serviceStats.serviceNamesData, viewMode])

  if (loading) {
    return (
      <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            {t("dashboard.serviceStatsSection", "Service Statistics")}
          </h2>
        </div>
        <p className="text-muted-foreground mb-4">
          {t("dashboard.serviceStatsDesc", "Comprehensive service overview and performance metrics")}
        </p>
        
        {/* Skeleton for stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse" />
              <div className="h-8 w-16 bg-muted-foreground/20 rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Skeleton for charts */}
        <div className="h-64 w-full bg-muted-foreground/20 rounded animate-pulse" />
      </div>
    )
  }

  const gridColor = isDark ? "#27272a" : "#e2e8f0";
  const axisColor = isDark ? "#a1a1aa" : "#64748b";
  const lineColor = isDark ? "#10b981" : "#059669";

  return (
    <div className="w-full p-8 bg-card rounded-xl shadow-md border flex flex-col space-y-3 hover:shadow-lg transition-shadow duration-300 relative min-h-[280px]">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {t("dashboard.serviceStatsSection", "Service Statistics")}
        </h2>
      </div>
      <p className="text-muted-foreground mb-6">
        {t("dashboard.serviceStatsDesc", "Comprehensive service overview and performance metrics")}
      </p>
      
      <div className="space-y-6">
        {/* Primary Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.totalServices", "Total Services")}
            </span>
            <span className="text-3xl font-bold text-foreground">
              {serviceStats.totalServices.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.completedServices", "Completed")}
            </span>
            <span className="text-3xl font-bold text-green-600">
              {serviceStats.completedServices.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.pendingServices", "Pending")}
            </span>
            <span className="text-3xl font-bold text-orange-600">
              {serviceStats.pendingServices.toLocaleString()}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.overdueServices", "Overdue")}
            </span>
            <span className="text-3xl font-bold text-red-600">
              {serviceStats.overdueServices.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.totalRevenue", "Total Revenue")}
            </span>
            <span className="text-3xl font-bold text-foreground">
              {formatCurrency(serviceStats.totalRevenue)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.totalProfit", "Total Profit")}
            </span>
            <span className="text-3xl font-bold text-green-600">
              {formatCurrency(serviceStats.totalProfit)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.avgTurnaround", "Avg Turnaround")}
            </span>
            <span className="text-3xl font-bold text-foreground">
              {serviceStats.averageTurnaroundDays} {t("dashboard.days", "days")}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("dashboard.completionRate", "Completion Rate")}
            </span>
            <span className="text-3xl font-bold text-blue-600">
              {serviceStats.completionRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Chart Section with Toggle */}
        {(serviceStats.serviceTypesData.length > 0 || serviceStats.serviceNamesData.length > 0) && (
          <div className="space-y-4">
            <div className="flex items-center justify-end mb-4">
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                <UITooltip content={t("dashboard.serviceTypesTooltip", "View distribution by service types")}>
                  <button
                    onClick={() => setViewMode('types')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'types'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <PieChartIcon className="h-4 w-4" />
                    {t("dashboard.serviceTypes", "Types")}
                  </button>
                </UITooltip>
                <UITooltip content={t("dashboard.serviceNamesTooltip", "View distribution by specific service names")}>
                  <button
                    onClick={() => setViewMode('names')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'names'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <PieChartIcon className="h-4 w-4" />
                    {t("dashboard.serviceNames", "Top 5 services")}
                  </button>
                </UITooltip>
                <UITooltip content={t("dashboard.trendTooltip", "View completion trends over time")}>
                  <button
                    onClick={() => setViewMode('trends')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'trends'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <LineChartIcon className="h-4 w-4" />
                    {t("dashboard.trends", "Trends")}
                  </button>
                </UITooltip>
              </div>
            </div>

            {viewMode === 'types' ? (
              serviceStats.serviceTypesData.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Pie Chart */}
                  <div className="flex-1 max-w-md">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t("dashboard.serviceTypeDistribution", "Service Type Distribution")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.serviceTypesChartDesc", "Distribution of services by type")}
                      </p>
                    </div>
                    <div className="w-full h-[300px] overflow-hidden rounded-lg bg-card">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={300}
                      initialDimension={{ width: 600, height: 300 }}
                    >
                      <PieChart
                        style={{
                          background: 'transparent'
                        }}
                      >
                        <Tooltip
                          content={<CustomTooltip totalServices={totalServicesForChart} t={t} />}
                        />
                        <Pie
                          data={serviceStats.serviceTypesData}
                          dataKey="count"
                          nameKey="serviceType"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          labelLine={false}
                          label={({ payload, ...props }) => {
                            const percentage = totalServicesForChart > 0 
                              ? ((payload.count / totalServicesForChart) * 100).toFixed(1)
                              : "0"
                            return (
                              <text
                                key={`service-type-label-${String(payload?.serviceType ?? "")}`}
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
                          onClick={preventPiePointerDefault}
                          onMouseDown={preventPiePointerDefault}
                          onMouseUp={preventPiePointerDefault}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend / Breakdown */}
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-3">
                    {t("dashboard.serviceTypeBreakdown", "Service Type Breakdown")}
                  </h4>
                  <div className="space-y-2">
                    {serviceStats.topServiceTypes.map((item, index) => {
                      const percentage = serviceStats.totalServices > 0 
                        ? ((item.count / serviceStats.totalServices) * 100).toFixed(1)
                        : "0"
                      
                      return (
                        <div key={item.serviceType} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chartColors[index % chartColors.length] }}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {item.serviceType}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t("dashboard.avgPrice", "Avg")}: {formatIntegerCurrency(item.avgPrice)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">
                              {item.count.toLocaleString()}
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
              </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wrench className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("dashboard.noServiceTypes", "No Service Types")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.noServiceTypesDesc", "No service types available to display")}
                  </p>
                </div>
              )
            ) : viewMode === 'names' ? (
              serviceStats.serviceNamesData.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  {/* Pie Chart for Service Names */}
                  <div className="flex-1 max-w-md">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t("dashboard.topServicesDistribution", "Top Services Distribution")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t("dashboard.serviceNamesChartDesc", "Distribution of services by specific name")}
                      </p>
                    </div>
                    <div className="w-full h-[300px] overflow-hidden rounded-lg bg-card">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                      minWidth={0}
                      minHeight={300}
                      initialDimension={{ width: 600, height: 300 }}
                    >
                      <PieChart
                        style={{
                          background: 'transparent'
                        }}
                      >
                        <Tooltip
                          content={<CustomTooltip totalServices={totalServicesForChart} t={t} />}
                        />
                        <Pie
                          data={serviceStats.serviceNamesData}
                          dataKey="count"
                          nameKey="serviceName"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          labelLine={false}
                          label={({ payload, ...props }) => {
                            const percentage = totalServicesForChart > 0 
                              ? ((payload.count / totalServicesForChart) * 100).toFixed(1)
                              : "0"
                            return (
                              <text
                                key={`service-name-label-${String(payload?.serviceName ?? "")}-${String(payload?.serviceType ?? "")}`}
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
                          onClick={preventPiePointerDefault}
                          onMouseDown={preventPiePointerDefault}
                          onMouseUp={preventPiePointerDefault}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Legend / Breakdown for Service Names */}
                <div className="flex-1">
                  <h4 className="font-medium text-foreground mb-3">
                    {t("dashboard.topServicesBreakdown", "Top Services Breakdown")}
                  </h4>
                  <div className="space-y-2">
                    {serviceStats.topServiceNames.map((item) => {
                      const percentage = serviceStats.totalServices > 0 
                        ? ((item.count / serviceStats.totalServices) * 100).toFixed(1)
                        : "0"
                      
                      return (
                        <div key={`${item.serviceName}-${item.serviceType}`} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.fill }}
                            />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {item.serviceName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.serviceType} • {t("dashboard.avgPrice", "Avg")}: {formatIntegerCurrency(item.avgPrice)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-foreground">
                              {item.count.toLocaleString()}
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
              </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wrench className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t("dashboard.noServiceNames", "No Service Names")}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.noServiceNamesDesc", "No service names available to display")}
                  </p>
                </div>
              )
            ) : (
              (() => {
                const isMeaningfulTrendValue = (item: {
                  completed: number;
                  revenue: number;
                  profit: number;
                }) => item.revenue > 0 || item.profit > 0 || item.completed > 0;

                const meaningfulMonths6Count = serviceStats.monthlyTrends.filter(isMeaningfulTrendValue).length;
                const meaningfulMonths12Count = serviceStats.twelveMonthTrends.filter(isMeaningfulTrendValue).length;

                // Disable 12 months and all-time when we don't have enough meaningful data to render them.
                const disable12AndAll = meaningfulMonths12Count <= 1;
                const isSingleMonthMessage = meaningfulMonths6Count === 1;

                const effectiveTrendPeriod = disable12AndAll ? "sixMonths" : trendPeriod;

                const filteredSingleMonthData = serviceStats.monthlyTrends.filter(isMeaningfulTrendValue);

                const chartData =
                  effectiveTrendPeriod === "sixMonths"
                    ? isSingleMonthMessage
                      ? filteredSingleMonthData
                      : serviceStats.monthlyTrends
                    : effectiveTrendPeriod === "twelveMonths"
                      ? serviceStats.twelveMonthTrends
                      : serviceStats.yearlyTrends;

                // --- ChartBarInteractive-like axis/grid styling for this trends chart (but keep same data/lines/tooltip) ---
                const axisColor = isDark ? "rgba(148, 147, 147, 0.7)" : "rgba(85, 85, 85, 0.48)";

                const maxValue = chartData.reduce((acc, d) => {
                  const r = typeof d?.revenue === "number" ? d.revenue : 0;
                  const p = typeof d?.profit === "number" ? d.profit : 0;
                  return Math.max(acc, r, p);
                }, 0);

                const HEADROOM = 1.1;
                const rawTop = Math.max(maxValue, 0) * HEADROOM;
                const gridTicks = maxValue <= 0 ? [0] : buildNiceYTicksQuarterMax(0, Math.max(rawTop, 1));

                const yAxisDomain: [number, number] = (() => {
                  if (!gridTicks.length) return [0, 1];
                  const lo = Math.min(...gridTicks);
                  const hi = Math.max(...gridTicks);
                  if (hi <= lo) return [0, lo === 0 && hi === 0 ? 1 : Math.max(hi, 1)];
                  return [lo, hi];
                })();

                const formatAxisCurrency = (value: number) => {
                  const n = Math.round(Number(value));
                  return `${n.toLocaleString(i18n.language, {
                    maximumFractionDigits: 0,
                    useGrouping: true,
                  })}${t("currency")}`;
                };

                const yAxisWidth = (() => {
                  if (!gridTicks.length) return 60;
                  const minTick = Math.min(...gridTicks);
                  const maxTick = Math.max(...gridTicks);
                  const formattedMin = formatAxisCurrency(minTick);
                  const formattedMax = formatAxisCurrency(maxTick);
                  const longest = formattedMin.length >= formattedMax.length ? formattedMin : formattedMax;
                  const approxCharWidth = 7.5;
                  const paddingPx = 18;
                  const computed = Math.ceil(longest.length * approxCharWidth + paddingPx);
                  return Math.max(56, Math.min(190, computed));
                })();

                const hasTrendData = chartData.some(isMeaningfulTrendValue);
                
                return hasTrendData ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {t("dashboard.serviceCompletionTrends", "Service Completion Trends")}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {effectiveTrendPeriod === "sixMonths" && isSingleMonthMessage
                          ? t("dashboard.currentMonthTrends", "Completed services, revenue, and profit for the current month")
                          : t("dashboard.last6MonthsTrends", "Completed services, revenue, and profit over the last 6 months")}
                      </p>
                    </div>
                    
                    {/* Period Toggle (mirrors ChartBarInteractive period UI) */}
                    <div className="flex items-center justify-end">
                      {(() => {
                        const controlBorder = isDark ? "border-gray-700" : "border-gray-300";
                        const controlBg = isDark ? "bg-[#232326]" : "bg-white";
                        const controlActiveBlue = "text-blue-600 dark:text-blue-400";
                        const controlInactive = isDark
                          ? "text-gray-400 hover:text-gray-200"
                          : "text-gray-500 hover:text-gray-700";
                        const toggleBg = isDark ? "bg-[#232326]" : "bg-gray-50";

                        const buttonClass = (active: boolean) =>
                          active
                            ? `${controlBg} ${controlActiveBlue} shadow-sm`
                            : controlInactive;

                        return (
                          <div className={`flex rounded-lg border ${controlBorder} ${toggleBg} p-1`}>
                            <button
                              type="button"
                              onClick={() => setTrendPeriod("sixMonths")}
                              aria-pressed={effectiveTrendPeriod === "sixMonths"}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${buttonClass(
                                effectiveTrendPeriod === "sixMonths",
                              )}`}
                            >
                              {t("dashboard.last6Months", "Last 6 months")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTrendPeriod("twelveMonths")}
                              aria-pressed={effectiveTrendPeriod === "twelveMonths"}
                              disabled={disable12AndAll}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${buttonClass(
                                effectiveTrendPeriod === "twelveMonths",
                              )} disabled:opacity-50 disabled:pointer-events-none`}
                            >
                              {t("dashboard.last12Months", "Last 12 months")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTrendPeriod("allTime")}
                              aria-pressed={effectiveTrendPeriod === "allTime"}
                              disabled={disable12AndAll}
                              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${buttonClass(
                                effectiveTrendPeriod === "allTime",
                              )} disabled:opacity-50 disabled:pointer-events-none`}
                            >
                              {t("dashboard.allTime", "All time")}
                            </button>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Trends Chart */}
                    <div className="w-full h-[300px]" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
                      <div>
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={300}
                    initialDimension={{ width: 900, height: 300 }}
                  >
                    <LineChart
                      key={`services-trends-${effectiveTrendPeriod}`}
                      data={chartData}
                      margin={{
                        top: 20,
                        right: 60,
                        left: 20,
                        bottom: 20,
                      }}
                    >
                      {/* Match `chartBarInteractive` grid style: custom ReferenceLines (y=0 solid, others dashed) */}
                      <CartesianGrid vertical={false} horizontal={false} />
                      {gridTicks.map((tick) =>
                        Math.abs(tick - 0) < 1e-9 ? (
                          <ReferenceLine
                            key={`grid-0`}
                            y={0}
                            stroke={axisColor}
                            strokeWidth={1}
                            strokeDasharray="0"
                          />
                        ) : (
                          <ReferenceLine
                            key={`grid-${tick}`}
                            y={tick}
                            stroke={axisColor}
                            strokeWidth={1}
                            strokeDasharray="5 4"
                          />
                        ),
                      )}
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={0}
                        textAnchor="middle"
                        fontSize={14}
                        interval={0}
                        height={44}
                        fill={isDark ? "#ffffff" : "#000000"}
                        fontWeight={600}
                        stroke={isDark ? "#ffffff" : "#000000"}
                        strokeWidth={0.3}
                      />
                      <YAxis
                        type="number"
                        domain={yAxisDomain}
                        ticks={gridTicks}
                        allowDecimals
                        tickLine={{ stroke: axisColor, strokeWidth: 1 }}
                        axisLine={{ stroke: axisColor, strokeWidth: 1 }}
                        tickMargin={8}
                        fontSize={14}
                        fontWeight={600}
                        fill={isDark ? "#ffffff" : "#000000"}
                        stroke={isDark ? "#ffffff" : "#000000"}
                        strokeWidth={0.3}
                        tickFormatter={formatAxisCurrency}
                        textAnchor={i18n.language === "ar" ? "start" : "end"}
                        style={{ whiteSpace: "nowrap" }}
                        width={yAxisWidth}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const dataPoint = chartData.find((item) => item.period === label);
                            const completedValue = dataPoint?.completed || 0;
                            
                            return (
                              <div
                                className={
                                  isDark
                                    ? "bg-[#18181b] border border-gray-700 rounded-lg shadow-lg p-3 min-w-[180px]"
                                    : "bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]"
                                }
                                dir={i18n.language === "ar" ? "rtl" : undefined}
                              >
                                <div
                                  className={
                                    isDark
                                      ? "border-b border-gray-800 pb-2 mb-2"
                                      : "border-b border-gray-100 pb-2 mb-2"
                                  }
                                >
                                  <p
                                    className={
                                      isDark
                                        ? "text-sm font-medium text-gray-100"
                                        : "text-sm font-medium text-gray-900"
                                    }
                                  >
                                    {label}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={
                                        isDark
                                          ? "text-xs text-gray-400"
                                          : "text-xs text-gray-500"
                                      }
                                    >
                                      {t("dashboard.completedServices", "Completed")}:
                                    </span>
                                    <span
                                      className={
                                        isDark
                                          ? "text-sm font-semibold text-green-400 mx-1"
                                          : "text-sm font-semibold text-green-600 mx-1"
                                      }
                                    >
                                      {completedValue}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={
                                        isDark
                                          ? "text-xs text-gray-400"
                                          : "text-xs text-gray-500"
                                      }
                                    >
                                      {t("dashboard.revenue")}:
                                    </span>
                                    <span
                                      className={
                                        isDark
                                          ? "text-sm font-semibold text-blue-400 mx-1"
                                          : "text-sm font-semibold text-blue-600 mx-1"
                                      }
                                    >
                                      {payload[0]?.value?.toLocaleString()} {t("currency")}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span
                                      className={
                                        isDark
                                          ? "text-xs text-gray-400"
                                          : "text-xs text-gray-500"
                                      }
                                    >
                                      {t("dashboard.profit")}:
                                    </span>
                                    <span
                                      className={
                                        isDark
                                          ? "text-sm font-semibold text-green-400 mx-1"
                                          : "text-sm font-semibold text-green-600 mx-1"
                                      }
                                    >
                                      {payload[1]?.value?.toLocaleString()} {t("currency")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{
                          fill: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)",
                        }}
                      />
                      <Line
                        dataKey="revenue"
                        type="natural"
                        stroke={isDark ? "#3b82f6" : "#2563eb"}
                        strokeWidth={2}
                        isAnimationActive={true}
                        animationDuration={1800}
                        animationBegin={0}
                        dot={{ fill: isDark ? "#3b82f6" : "#2563eb", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        dataKey="profit"
                        type="natural"
                        stroke={isDark ? "#10b981" : "#059669"}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        isAnimationActive={true}
                        animationDuration={1800}
                        animationBegin={0}
                        dot={{ fill: isDark ? "#10b981" : "#059669", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                      </div>
                </div>
              </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t("dashboard.noTrendData", "No Trend Data")}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t("dashboard.noTrendDataDesc", "No service data available for the last 6 months")}
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        )}

        {/* Footer with trend info */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4 border-t">
          <TrendingUp className="h-4 w-4" />
          <span>
            {t("dashboard.serviceStatsFooter", "Real-time service monitoring and performance analysis")}
          </span>
        </div>
      </div>
    </div>
  )
}

