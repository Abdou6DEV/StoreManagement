import { useState } from "react";
import { SectionCards } from "./components/sectionCards";
import { ChartBarInteractive } from "./components/chartBarInteractive";
import { BarChart2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DashboardProvider } from "../../lib/contexts/dashboardContext";

function DashboardContent() {
  const [showChart, setShowChart] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SectionCards />
      <div className="flex flex-row-reverse items-center justify-between py-2">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-md border bg-card text-foreground hover:bg-accent transition-all shadow-sm"
          onClick={() => setShowChart((prev) => !prev)}
          title={
            showChart ? t("dashboard.hideChart") : t("dashboard.showChart")
          }
        >
          <BarChart2 className="w-4 h-4" />
          <span className="text-sm font-medium">
            {showChart ? t("dashboard.hideChart") : t("dashboard.showChart")}
          </span>
        </button>
      </div>
      {showChart && (
        <div className="animate-fade-in">
          <ChartBarInteractive />
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}
