import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";

export default function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-muted-foreground">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-40" />
        <p className="text-lg font-medium">
          {t("history.noDataAvailable")}
        </p>
        <p className="text-sm mt-1">
          No sales data found for the selected period
        </p>
      </div>
    </div>
  );
}
