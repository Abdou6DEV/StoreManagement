import React, { useState, useEffect } from "react";
import { Wrench, TrendingUp, DollarSign, CheckCircle, Clock, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../lib/components/modal";
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

interface ServiceTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ServiceTypesModal({
  isOpen,
  onClose,
}: ServiceTypesModalProps) {
  const { t } = useTranslation();
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
    if (isOpen) {
      loadServiceTypesStats();
    }
  }, [isOpen]);

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

  if (loading) {
    return (
      <Modal 
        open={isOpen} 
        onOpenChange={(open) => !open && onClose()} 
        size="xl"
        title={t("services.serviceTypesStats", "Service Types Statistics")}
        icon={<Wrench className="w-5 h-5 text-cyan-600" />}
        showCloseButton={true}
      >
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600"></div>
            <span>{t("common.loading", "Loading...")}</span>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      size="xl"
      title={t("services.serviceTypesStats", "Service Types Statistics")}
      icon={<Wrench className="w-5 h-5 text-cyan-600" />}
      showCloseButton={true}
    >
      <div className="p-6 space-y-6">
        {/* Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {t("services.byServiceType", "By Service Type")}
          </h3>
          
          <div className="overflow-auto rounded-lg border border-muted">
            <table className="min-w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">
                    {t("services.serviceType", "Service Type")}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t("services.total", "Total")}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t("services.completed", "Completed")}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t("services.incomplete", "Incomplete")}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t("services.completionRate", "Completion Rate")}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t("services.revenue", "Revenue")}
                  </th>
                  <th className="px-4 py-3 text-left">
                    {t("services.profit", "Profit")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {serviceTypesStats.map((stat, index) => (
                  <tr key={stat.serviceType} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      {stat.serviceType}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">
                        {stat.totalServices}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          {stat.completedServices}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <span className="text-orange-600 font-medium">
                          {stat.incompleteServices}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
                    <td className="px-4 py-3">
                      <div className="text-cyan-600 font-medium">
                        {formatCurrency(stat.totalRevenue)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(stat.averageRevenue)} {t("services.average", "avg")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
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
        </div>
      </div>
    </Modal>
  );
}
