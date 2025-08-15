import React from "react";
import { useTranslation } from "react-i18next";
import { TabType } from "../../../types";

interface PaymentTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  creditsCount: number;
  versementsCount: number;
}

const PaymentTabs: React.FC<PaymentTabsProps> = ({
  activeTab,
  onTabChange,
  creditsCount,
  versementsCount,
}) => {
  const { t } = useTranslation();

  const tabs = [
    { id: "summary" as TabType, label: t("clients.summary", "Summary") },
    {
      id: "credits" as TabType,
      label: `${t("clients.credits", "Credits")} (${creditsCount})`,
    },
    {
      id: "versements" as TabType,
      label: `${t("clients.versements", "Versements")} (${versementsCount})`,
    },
  ];

  return (
    <div className="border-b">
      <nav className="flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default PaymentTabs;
