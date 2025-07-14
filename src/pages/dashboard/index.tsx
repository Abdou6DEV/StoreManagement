import { useTranslation } from "react-i18next";
import "../../lib/i18n";
import { SectionCards } from "./components/sectionCards";
import { ChartBarInteractive } from "./components/chartBarInteractive";

export default function Dashboard() {
  const { t } = useTranslation();

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Store Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your store performance, inventory, and financial status
        </p>
      </div>
      <SectionCards />
      <ChartBarInteractive />
    </div>
  );
}
