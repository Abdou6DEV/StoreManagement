import { SectionCards } from "./components/sectionCards";
import { ChartBarInteractive } from "./components/chartBarInteractive";
import { DashboardProvider, useDashboardLoading } from "../../lib/contexts/dashboardContext";

function DashboardContent() {
  const dashboardLoading = useDashboardLoading();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SectionCards />
      {!dashboardLoading && <ChartBarInteractive />}
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
