import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";

export default function EmptyState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="p-4 bg-muted/20 rounded-full mb-4">
        <Calendar className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t("history.selectPeriod")}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        {t("history.selectPeriodHint")}
      </p>
    </div>
  );
}
