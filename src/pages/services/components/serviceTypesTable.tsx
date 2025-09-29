import React, { useState, useEffect } from "react";
import { Wrench, TrendingUp, DollarSign, CheckCircle, Clock, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../lib/components/pagination";
import { Badge } from "../../../lib/components/badge";

interface ServiceTypeStats {
  serviceType: string;
  totalServices: number;
  completedServices: number;
  incompleteServices: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  averageRevenue: number;
  averageCost: number;
  averageProfit: number;
  completionRate: number;
}

interface ServiceTypesTableProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
}

const ServiceTypesTable: React.FC<ServiceTypesTableProps> = ({
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [serviceTypesStats, setServiceTypesStats] = useState<ServiceTypeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStats, setOverallStats] = useState({
    totalServices: 0,
    completedServices: 0,
    incompleteServices: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    averageRevenue: 0,
    averageCost: 0,
    averageProfit: 0,
    overallCompletionRate: 0,
  });

  useEffect(() => {
    loadServiceTypesStats();
  }, []);

  const loadServiceTypesStats = async () => {
    try {
      setLoading(true);
      const allServices = await window.api.database.serviceAppointments.getAll();
      
      // Group services by type
      const servicesByType = allServices.reduce((acc, service) => {
        if (!acc[service.serviceType]) {
          acc[service.serviceType] = [];
        }
        acc[service.serviceType].push(service);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate stats for each service type
      const stats: ServiceTypeStats[] = Object.entries(servicesByType).map(([serviceType, services]) => {
        const completedServices = services.filter(s => s.isCompleted).length;
        const incompleteServices = services.length - completedServices;
        const totalRevenue = services.reduce((sum, s) => sum + s.servicePrice, 0);
        const totalCost = services.reduce((sum, s) => sum + s.costPrice, 0);
        const totalProfit = totalRevenue - totalCost;
        const completionRate = services.length > 0 ? (completedServices / services.length) * 100 : 0;

        return {
          serviceType,
          totalServices: services.length,
          completedServices,
          incompleteServices,
          totalRevenue,
          totalCost,
          totalProfit,
          averageRevenue: services.length > 0 ? totalRevenue / services.length : 0,
          averageCost: services.length > 0 ? totalCost / services.length : 0,
          averageProfit: services.length > 0 ? totalProfit / services.length : 0,
          completionRate,
        };
      });

      // Sort by total revenue (highest first)
      stats.sort((a, b) => b.totalRevenue - a.totalRevenue);
      setServiceTypesStats(stats);

      // Calculate overall stats
      const overall = {
        totalServices: allServices.length,
        completedServices: allServices.filter(s => s.isCompleted).length,
        incompleteServices: allServices.filter(s => !s.isCompleted).length,
        totalRevenue: allServices.reduce((sum, s) => sum + s.servicePrice, 0),
        totalCost: allServices.reduce((sum, s) => sum + s.costPrice, 0),
        totalProfit: 0,
        averageRevenue: 0,
        averageCost: 0,
        averageProfit: 0,
        overallCompletionRate: 0,
      };

      overall.totalProfit = overall.totalRevenue - overall.totalCost;
      overall.averageRevenue = overall.totalServices > 0 ? overall.totalRevenue / overall.totalServices : 0;
      overall.averageCost = overall.totalServices > 0 ? overall.totalCost / overall.totalServices : 0;
      overall.averageProfit = overall.totalServices > 0 ? overall.totalProfit / overall.totalServices : 0;
      overall.overallCompletionRate = overall.totalServices > 0 ? (overall.completedServices / overall.totalServices) * 100 : 0;

      setOverallStats(overall);
    } catch (error) {
      console.error("Error loading service types stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)} ${t("common.currency", "DA")}`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const renderPageNumbers = () => {
    const items = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      end = Math.min(5, totalPages);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(1, totalPages - 4);
    }

    if (start > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === currentPage}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (end < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    return items;
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoData = serviceTypesStats.length === 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
          <span>{t("common.loading", "Loading...")}</span>
        </div>
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <BarChart3 className="w-12 h-12 text-cyan-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("services.noServiceTypes", "No service types found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t("services.noServiceTypesDesc", "No service types have been created yet.")}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Overall Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("services.totalServices", "Total Services")}
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground">
            {overallStats.totalServices}
          </div>
        </div>

        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("services.completedServices", "Completed")}
            </span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {overallStats.completedServices}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatPercentage(overallStats.overallCompletionRate)} {t("services.completionRate", "completion rate")}
          </div>
        </div>

        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-cyan-600" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("services.totalRevenue", "Total Revenue")}
            </span>
          </div>
          <div className="text-2xl font-bold text-cyan-600">
            {formatCurrency(overallStats.totalRevenue)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(overallStats.averageRevenue)} {t("services.average", "avg")}
          </div>
        </div>

        <div className="bg-muted/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("services.totalProfit", "Total Profit")}
            </span>
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(overallStats.totalProfit)}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatCurrency(overallStats.averageProfit)} {t("services.average", "avg")}
          </div>
        </div>
      </div>

      {/* Service Types Table */}
      <div className="overflow-auto rounded-lg border border-muted">
        <table
          className={`min-w-full text-sm ${isRTL ? "text-right" : "text-left"}`}
        >
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.serviceType", "Service Type")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.total", "Total")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.completed", "Completed")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.incomplete", "Incomplete")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.completionRate", "Completion Rate")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.revenue", "Revenue")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.profit", "Profit")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {serviceTypesStats.map((stat, index) => (
              <tr key={stat.serviceType} className="h-[48px] hover:bg-muted/40">
                <td className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}>
                  {stat.serviceType}
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <Badge variant="outline">
                    {stat.totalServices}
                  </Badge>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">
                      {stat.completedServices}
                    </span>
                  </div>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="text-orange-600 font-medium">
                      {stat.incompleteServices}
                    </span>
                  </div>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-muted rounded-full h-2">
                      <div 
                        className="bg-cyan-600 h-2 rounded-full transition-all"
                        style={{ width: `${stat.completionRate}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPercentage(stat.completionRate)}
                    </span>
                  </div>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className="text-cyan-600 font-medium">
                    {formatCurrency(stat.totalRevenue)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(stat.averageRevenue)} {t("services.average", "avg")}
                  </div>
                </td>
                <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                  <div className={`font-medium ${stat.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(stat.totalProfit)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(stat.averageProfit)} {t("services.average", "avg")}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {serviceTypesStats.length > 0 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {isFirstPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationPrevious href="#" />
                  </span>
                ) : (
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage - 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>

              {renderPageNumbers()}

              <PaginationItem>
                {isLastPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationNext href="#" />
                  </span>
                ) : (
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage + 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
};

export default ServiceTypesTable;
