import React from "react";
import { useTranslation } from "react-i18next";
import { 
  Calendar, 
  User, 
  Clock, 
  DollarSign, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

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
  client?: {
    id: string;
    name: string;
    phone?: string;
  };
}

interface ServiceAppointmentsTableProps {
  appointments: ServiceAppointment[];
  loading: boolean;
  onEdit: (appointment: ServiceAppointment) => void;
  onToggleComplete: (id: string, isCompleted: boolean) => void;
  onDelete: (id: string) => void;
}

export default function ServiceAppointmentsTable({
  appointments,
  loading,
  onEdit,
  onToggleComplete,
  onDelete,
}: ServiceAppointmentsTableProps) {
  const { t } = useTranslation();

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${t("currency", "DA")}`;
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };

  const formatDateTime = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  };

  const isOverdue = (dueDate: string, isCompleted: boolean) => {
    if (isCompleted) return false;
    return new Date(dueDate) < new Date();
  };

  const getStatusColor = (appointment: ServiceAppointment) => {
    if (appointment.isCompleted) {
      return "text-green-600 bg-green-50 border-green-200";
    }
    if (isOverdue(appointment.dueDate, appointment.isCompleted)) {
      return "text-red-600 bg-red-50 border-red-200";
    }
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getStatusText = (appointment: ServiceAppointment) => {
    if (appointment.isCompleted) {
      return t("services.completed", "Completed");
    }
    if (isOverdue(appointment.dueDate, appointment.isCompleted)) {
      return t("services.overdue", "Overdue");
    }
    return t("services.pending", "Pending");
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-2">{t("common.loading", "Loading...")}</p>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="p-8 text-center">
        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          {t("services.noAppointments", "No service appointments found")}
        </h3>
        <p className="text-muted-foreground">
          {t("services.noAppointmentsDesc", "Create your first service appointment to get started")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left p-4 font-medium text-muted-foreground">
              {t("services.service", "Service")}
            </th>
            <th className="text-left p-4 font-medium text-muted-foreground">
              {t("services.client", "Client")}
            </th>
            <th className="text-left p-4 font-medium text-muted-foreground">
              {t("services.type", "Type")}
            </th>
            <th className="text-left p-4 font-medium text-muted-foreground">
              {t("services.dueDate", "Due Date")}
            </th>
            <th className="text-left p-4 font-medium text-muted-foreground">
              {t("services.pricing", "Pricing")}
            </th>
            <th className="text-left p-4 font-medium text-muted-foreground">
              {t("services.status", "Status")}
            </th>
            <th className="text-right p-4 font-medium text-muted-foreground">
              {t("common.actions", "Actions")}
            </th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr
              key={appointment.id}
              className="border-b border-border hover:bg-muted/30 transition-colors"
            >
              {/* Service Name */}
              <td className="p-4">
                <div>
                  <div className="font-medium text-foreground">{appointment.name}</div>
                  {appointment.description && (
                    <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {appointment.description}
                    </div>
                  )}
                </div>
              </td>

              {/* Client */}
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    {appointment.client ? (
                      <>
                        <div className="font-medium text-foreground">{appointment.client.name}</div>
                        {appointment.client.phone && (
                          <div className="text-sm text-muted-foreground">{appointment.client.phone}</div>
                        )}
                      </>
                    ) : (
                      <div className="font-medium text-muted-foreground italic">
                        {t("services.noClient", "No client assigned")}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Service Type */}
              <td className="p-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {appointment.serviceType}
                </span>
              </td>

              {/* Due Date */}
              <td className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-foreground">
                      {formatDate(appointment.dueDate)}
                    </div>
                    {isOverdue(appointment.dueDate, appointment.isCompleted) && (
                      <div className="flex items-center gap-1 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        {t("services.overdue", "Overdue")}
                      </div>
                    )}
                  </div>
                </div>
              </td>

              {/* Pricing */}
              <td className="p-4">
                <div className="text-sm">
                  <div className="font-medium text-foreground">
                    {formatCurrency(appointment.servicePrice)}
                  </div>
                  {appointment.costPrice > 0 && (
                    <div className="text-muted-foreground">
                      {t("services.cost", "Cost")}: {formatCurrency(appointment.costPrice)}
                    </div>
                  )}
                </div>
              </td>

              {/* Status */}
              <td className="p-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(appointment)}`}>
                  {appointment.isCompleted ? (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  ) : isOverdue(appointment.dueDate, appointment.isCompleted) ? (
                    <AlertCircle className="w-3 h-3 mr-1" />
                  ) : (
                    <Clock className="w-3 h-3 mr-1" />
                  )}
                  {getStatusText(appointment)}
                </span>
                {appointment.isCompleted && appointment.completedAt && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t("services.completedOn", "Completed on")} {formatDateTime(appointment.completedAt)}
                  </div>
                )}
              </td>

              {/* Actions */}
              <td className="p-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onToggleComplete(appointment.id, !appointment.isCompleted)}
                    className={`p-2 rounded-lg transition-colors ${
                      appointment.isCompleted
                        ? "text-orange-600 hover:bg-orange-50"
                        : "text-green-600 hover:bg-green-50"
                    }`}
                    title={appointment.isCompleted ? t("services.markIncomplete", "Mark as incomplete") : t("services.markComplete", "Mark as complete")}
                  >
                    {appointment.isCompleted ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => onEdit(appointment)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t("common.edit", "Edit")}
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => onDelete(appointment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t("common.delete", "Delete")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


