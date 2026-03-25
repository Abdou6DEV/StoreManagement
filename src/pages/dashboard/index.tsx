import { SectionCards } from "./components/sectionCards";
import { DashboardProvider, useDashboardLoading } from "../../lib/contexts/dashboardContext";

function DashboardContent() {
  const dashboardLoading = useDashboardLoading();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <SectionCards />
      {/* ChartBarInteractive is rendered inside SectionCards */}
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
