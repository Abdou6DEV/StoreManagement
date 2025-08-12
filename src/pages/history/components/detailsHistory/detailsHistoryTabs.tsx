import { useTranslation } from "react-i18next";
import { ShoppingCart, CreditCard, FileText } from "lucide-react";

interface DetailsHistoryTabsProps {
  activeSection: "sales" | "payments" | "purchases";
  onSectionChange: (section: "sales" | "payments" | "purchases") => void;
  salesCount: number;
  paymentsCount: number;
  purchasesCount: number;
}

export default function DetailsHistoryTabs({
  activeSection,
  onSectionChange,
  salesCount,
  paymentsCount,
  purchasesCount,
}: DetailsHistoryTabsProps) {
  const { t } = useTranslation();

  const tabs = [
    { id: "sales" as const, label: t("history.sales"), icon: ShoppingCart, count: salesCount },
    { id: "payments" as const, label: t("history.payments"), icon: CreditCard, count: paymentsCount },
    { id: "purchases" as const, label: t("history.purchases"), icon: FileText, count: purchasesCount },
  ];

  return (
    <div className="border-b border-border">
      <nav className="flex space-x-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className="bg-muted px-2 py-1 rounded-full text-xs">
                {tab.count}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
