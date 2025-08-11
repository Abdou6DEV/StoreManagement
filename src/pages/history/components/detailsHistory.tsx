import { useTranslation } from "react-i18next";
import { FileText, Clock } from "lucide-react";

export default function DetailsHistory() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="p-4 bg-muted/20 rounded-full mb-4">
        <FileText className="w-12 h-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {t("history.detailsHistory")}
      </h3>
      <p className="text-muted-foreground mb-4 max-w-md">
        This feature will be implemented in the next phase. It will provide
        detailed transaction history with advanced filtering and search
        capabilities.
      </p>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Coming Soon</span>
      </div>
    </div>
  );
}
