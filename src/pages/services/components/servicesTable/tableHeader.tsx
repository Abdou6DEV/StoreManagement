import { useTranslation } from "react-i18next";
import { Calendar, User, Clock, DollarSign, CheckCircle, AlertCircle } from "lucide-react";

export const TableHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-muted/50 border-b border-border px-6 py-3">
      <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
        <div className="col-span-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t("services.service", "Service")}
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          {t("services.client", "Client")}
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t("services.type", "Type")}
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          {t("services.dueDate", "Due Date")}
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          {t("services.pricing", "Pricing")}
        </div>
        <div className="col-span-1 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {t("services.status", "Status")}
        </div>
      </div>
    </div>
  );
};

