import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";

interface ServiceAppointmentsStatsProps {
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
}

export default function ServiceAppointmentsStats({ stats }: ServiceAppointmentsStatsProps) {
  const { t } = useTranslation();

  const statCards = [
    {
      title: t("services.totalAppointments", "Total Appointments"),
      value: stats.total,
      icon: Calendar,
      color: "text-blue-600 bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
    },
    {
      title: t("services.completed", "Completed"),
      value: stats.completed,
      icon: CheckCircle,
      color: "text-green-600 bg-green-50 border-green-200",
      iconColor: "text-green-600",
    },
    {
      title: t("services.pending", "Pending"),
      value: stats.pending,
      icon: Clock,
      color: "text-orange-600 bg-orange-50 border-orange-200",
      iconColor: "text-orange-600",
    },
    {
      title: t("services.overdue", "Overdue"),
      value: stats.overdue,
      icon: AlertCircle,
      color: "text-red-600 bg-red-50 border-red-200",
      iconColor: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className={`p-6 rounded-xl border ${stat.color} transition-all hover:shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {stat.value.toLocaleString()}
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-white/50 ${stat.iconColor}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


