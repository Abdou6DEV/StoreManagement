import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, FileText, TrendingUp } from "lucide-react";
import GeneralHistory from "./components/generalHistory";
import DetailsHistory from "./components/detailsHistory";
import type { AggregationLevel, SelectedPeriod } from "../../types";

export default function History() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"general" | "details">("general");
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod | null>(null);

  const handlePeriodSelect = (period: AggregationLevel, periodValue: string) => {
    setSelectedPeriod({ period, periodValue });
    setActiveTab("details");
  };

  const tabs = [
    {
      id: "general" as const,
      label: t("history.generalHistory"),
      icon: TrendingUp,
      description: t("history.description"),
    },
    {
      id: "details" as const,
      label: t("history.detailsHistory"),
      icon: FileText,
      description: t("history.description"),
    },
  ];

  return (
    <div className="space-y-6 ml-6">
      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === "general" && (
          <GeneralHistory onPeriodSelect={handlePeriodSelect} />
        )}
        {activeTab === "details" && (
          <DetailsHistory selectedPeriod={selectedPeriod} />
        )}
      </div>
    </div>
  );
}
