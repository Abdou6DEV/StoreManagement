import React from "react";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";

export default function Dashboard() {
  const { t } = useTranslation();
  const stats = [
    {
      label: t("dashboard.annualRevenue"),
      value: "$120,000",
      description: t("dashboard.annualRevenueDesc"),
    },
    {
      label: t("dashboard.monthRevenue"),
      value: "$10,500",
      description: t("dashboard.monthRevenueDesc"),
    },
    {
      label: t("dashboard.currentCash"),
      value: "$3,200",
      description: t("dashboard.currentCashDesc"),
    },
    {
      label: t("dashboard.storeCash"),
      value: "$7,800",
      description: t("dashboard.storeCashDesc"),
    },
    {
      label: t("dashboard.totalCash"),
      value: "$11,000",
      description: t("dashboard.totalCashDesc"),
    },
  ];

  return (
    <main className="py-8 px-4 md:px-12 flex-1 min-h-screen bg-background overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 bg-card rounded-xl shadow-md border flex flex-col items-start hover:shadow-lg transition-shadow duration-300"
          >
            <div className="text-muted-foreground text-sm mb-1 font-medium">
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-card-foreground mb-2">
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground">
              {stat.description}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
