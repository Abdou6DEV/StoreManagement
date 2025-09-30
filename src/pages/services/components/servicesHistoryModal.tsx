import React from "react";
import { History, Wrench, Calendar, User, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../lib/components/modal";

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
  client?: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface ServicesHistoryModalProps {
  service: ServiceAppointment | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ServicesHistoryModal({
  service,
  isOpen,
  onClose,
}: ServicesHistoryModalProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return `${amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2)} ${t("services.currency", "DA")}`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString();
  };

  if (!service) return null;

  return (
    <Modal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      size="lg"
      title={t("services.serviceHistory", "Service History")}
      icon={<History className="w-5 h-5 text-cyan-600" />}
      showCloseButton={true}
    >
      <div className="p-6">
        <div className="space-y-6">
          {/* Service Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              {t("services.serviceInformation", "Service Information")}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.serviceName", "Service Name")}
                </div>
                <div className="text-sm font-medium">
                  {service.name}
                </div>
              </div>
              
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.serviceType", "Service Type")}
                </div>
                <div className="text-sm font-medium">
                  {service.serviceType}
                </div>
              </div>

              {service.description && (
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("services.description", "Description")}
                  </div>
                  <div className="text-sm font-medium">
                    {service.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("services.clientInformation", "Client Information")}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.clientName", "Client Name")}
                </div>
                <div className="text-sm font-medium">
                  {service.client ? service.client.name : t("services.noClient", "No client assigned")}
                </div>
              </div>
              
              {service.client?.phone && (
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("services.phone", "Phone")}
                  </div>
                  <div className="text-sm font-medium">
                    {service.client.phone}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t("services.pricingInformation", "Pricing Information")}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.costPrice", "Cost Price")}
                </div>
                <div className="text-sm font-medium">
                  {formatCurrency(service.costPrice)}
                </div>
              </div>
              
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.servicePrice", "Service Price")}
                </div>
                <div className="text-sm font-medium text-cyan-600">
                  {formatCurrency(service.servicePrice)}
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Information */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t("services.timeline", "Timeline")}
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.createdAt", "Created At")}
                </div>
                <div className="text-sm font-medium">
                  {formatDate(service.createdAt)}
                </div>
              </div>
              
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.dueDate", "Due Date")}
                </div>
                <div className="text-sm font-medium">
                  {formatDate(service.dueDate)}
                </div>
              </div>

              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  {t("services.status", "Status")}
                </div>
                <div className="text-sm font-medium">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    service.isCompleted 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}>
                    {service.isCompleted ? t("services.complete", "Complete") : t("services.incomplete", "Incomplete")}
                  </span>
                </div>
              </div>

              {service.completedAt && (
                <div className="p-3 bg-muted/20 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">
                    {t("services.completedAt", "Completed At")}
                  </div>
                  <div className="text-sm font-medium">
                    {formatDate(service.completedAt)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {service.notes && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                {t("services.notes", "Notes")}
              </h3>
              <div className="p-3 bg-muted/20 rounded-lg">
                <div className="text-sm font-medium">
                  {service.notes}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
