import { useState, useEffect } from "react";
import { SectionCards } from "./components/sectionCards";
import { ChartBarInteractive } from "./components/chartBarInteractive";
import { BarChart2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "../../lib/components/skeleton";

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    // Simulate initial loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Section Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>

        {/* Chart Toggle Skeleton */}
        <div className="flex flex-row-reverse items-center justify-between py-2">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

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
