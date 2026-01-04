import { useTranslation } from "react-i18next";
import { Wrench, CreditCard, BarChart2 } from "lucide-react";

interface ServiceAppointment {
  id: string;
  name: string;
  serviceType: string;
  description?: string;
  costPrice: number;
  servicePrice: number;
  clientId?: string;
  dueDate: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ServicesTotalsFooterProps {
  filteredList: ServiceAppointment[];
  hideProfit?: boolean;
}

export const ServicesTotalsFooter = ({ filteredList, hideProfit = false }: ServicesTotalsFooterProps) => {
  const { t } = useTranslation();

  const totalServices = filteredList.length;
  const totalCost = filteredList.reduce((sum, s) => sum + s.costPrice, 0);
  const totalValue = filteredList.reduce((sum, s) => sum + s.servicePrice, 0);
  const totalProfit = totalValue - totalCost;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-10 text-sm">
      {/* Total Services */}
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("services.totalServices")}:
        </span>
        <span className="font-medium text-[0.9375rem]">{totalServices}</span>
      </div>

      {/* Total Cost */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("services.totalCost")}:
        </span>
        <span className="font-medium text-[0.9375rem]">
          {totalCost.toLocaleString('fr-FR')}{" "}
          {t("cashier.currency")}
        </span>
      </div>

      {/* Total Value */}
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          {t("services.totalValue")}:
        </span>
        <span className="font-medium text-[0.9375rem]">
          {totalValue.toLocaleString('fr-FR')}{" "}
          {t("cashier.currency")}
        </span>
      </div>

      {/* Total Profit */}
      {!hideProfit && (
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-muted-foreground">
            {t("services.totalProfit")}:
          </span>
          <span className="font-medium text-[0.9375rem] text-green-600 dark:text-green-400">
            {totalProfit.toLocaleString('fr-FR')}{" "}
            {t("cashier.currency")}
          </span>
        </div>
      )}
    </div>
  );
};

