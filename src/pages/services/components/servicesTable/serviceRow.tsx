import { useTranslation } from "react-i18next";
import { Calendar, User, Clock, DollarSign, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../../../lib/components/button";
import { cn } from "../../../../lib/utils";

interface ServiceAppointment {
  id: string;
  name: string;
  serviceType: string;
  description?: string;
  costPrice: number;
  servicePrice: number;
  clientId: string;
  dueDate: string;
  notes?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface ServiceRowProps {
  service: ServiceAppointment;
  onEdit: (service: ServiceAppointment) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  deleteLoading: boolean;
}

export const ServiceRow = ({ 
  service, 
  onEdit, 
  onDelete, 
  onToggleComplete, 
  deleteLoading 
}: ServiceRowProps) => {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency", "DA")}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const isOverdue = (dueDate: string, isCompleted: boolean) => {
    if (isCompleted) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (service: ServiceAppointment) => {
    if (service.isCompleted) {
      return "text-green-600 bg-green-50 border-green-200";
    }
    if (isOverdue(service.dueDate, service.isCompleted)) {
      return "text-red-600 bg-red-50 border-red-200";
    }
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getStatusText = (service: ServiceAppointment) => {
    if (service.isCompleted) {
      return t("services.completed", "Completed");
    }
    if (isOverdue(service.dueDate, service.isCompleted)) {
      return t("services.overdue", "Overdue");
    }
    return t("services.pending", "Pending");
  };

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      {/* Service Name */}
      <td className="px-6 py-4 col-span-3">
        <div>
          <div className="font-medium text-foreground">{service.name}</div>
          {service.description && (
            <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {service.description}
            </div>
          )}
        </div>
      </td>

      {/* Client */}
      <td className="px-6 py-4 col-span-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-foreground">{service.client.name}</div>
            {service.client.phone && (
              <div className="text-sm text-muted-foreground">{service.client.phone}</div>
            )}
          </div>
        </div>
      </td>

      {/* Service Type */}
      <td className="px-6 py-4 col-span-2">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
          {service.serviceType}
        </span>
      </td>

      {/* Due Date */}
      <td className="px-6 py-4 col-span-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium text-foreground">
              {formatDate(service.dueDate)}
            </div>
            {isOverdue(service.dueDate, service.isCompleted) && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3" />
                {t("services.overdue", "Overdue")}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* Pricing */}
      <td className="px-6 py-4 col-span-2">
        <div className="text-sm">
          <div className="font-medium text-foreground">
            {formatCurrency(service.servicePrice)}
          </div>
          {service.costPrice > 0 && (
            <div className="text-muted-foreground">
              {t("services.cost", "Cost")}: {formatCurrency(service.costPrice)}
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-6 py-4 col-span-1">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(service)}`}>
            {service.isCompleted ? (
              <CheckCircle className="w-3 h-3 mr-1" />
            ) : isOverdue(service.dueDate, service.isCompleted) ? (
              <AlertCircle className="w-3 h-3 mr-1" />
            ) : (
              <Clock className="w-3 h-3 mr-1" />
            )}
            {getStatusText(service)}
          </span>
        </div>
      </td>

      {/* Actions */}
      <td className="px-6 py-4 col-span-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleComplete(service.id, !service.isCompleted)}
            className="h-8 w-8 p-0"
            title={service.isCompleted ? t("services.markIncomplete", "Mark as incomplete") : t("services.markComplete", "Mark as complete")}
          >
            {service.isCompleted ? (
              <XCircle className="w-4 h-4 text-orange-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(service)}
            className="h-8 w-8 p-0"
            title={t("common.edit", "Edit")}
          >
            <Edit className="w-4 h-4 text-blue-600" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(service.id)}
            disabled={deleteLoading}
            className="h-8 w-8 p-0"
            title={t("common.delete", "Delete")}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

