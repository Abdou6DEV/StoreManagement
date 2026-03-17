import React, { useState, useEffect } from "react";
import { Button } from "../../../lib/components/button";
import { Edit, Loader2, Trash2, CheckCircle, Wrench, XCircle, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "../../../lib/components/pagination";
import { Tooltip } from "../../../lib/components/tooltip";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";
import { Badge } from "../../../lib/components/badge";
import EditServiceModal from "./editServiceModal";
import { useCompletedServices } from "../../../lib/contexts/completedServicesContext";
import SaleDetailsModal from "../../../lib/components/saleDetailsModal";
import { Sale } from "../../../types";
import { useToast } from "../../../lib/contexts/toastContext";
import { ServicesTotalsFooter } from "./servicesTotalsFooter";

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

interface ServicesTableProps {
  services: ServiceAppointment[];
  filteredServices?: ServiceAppointment[];
  onEdit: (service: ServiceAppointment) => void;
  onDelete: (id: string) => void;
  deleteLoading: string | null;
  onViewHistory: () => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (size: number) => void;
  statusFilter?: string;
  dueSoonThresholdDays?: number;
  newlyOverdueServicesIds?: Set<string>;
  newlyDueSoonServicesIds?: Set<string>;
  onMarkOverdueAsSeen?: () => void;
  onMarkDueSoonAsSeen?: () => void;
  soldServiceIds?: Set<string>;
  hideProfit?: boolean;
}

const ServicesTable: React.FC<ServicesTableProps> = ({
  services,
  filteredServices,
  onEdit,
  onDelete,
  deleteLoading,
  onViewHistory,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  statusFilter = "all",
  dueSoonThresholdDays = 2,
  newlyOverdueServicesIds = new Set(),
  newlyDueSoonServicesIds = new Set(),
  onMarkOverdueAsSeen,
  onMarkDueSoonAsSeen,
  soldServiceIds = new Set(),
  hideProfit = true,
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceAppointment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [completeConfirmServiceId, setCompleteConfirmServiceId] = useState<string | null>(null);
  const [cancelingServiceId, setCancelingServiceId] = useState<string | null>(null);
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, boolean>>({});
  const { refreshCompletedServicesCount } = useCompletedServices();
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSaleDetailsModal, setShowSaleDetailsModal] = useState(false);
  const { showToast } = useToast();

  const formatCurrency = (amount: number) => {
    const formatted = amount % 1 === 0 ? amount.toFixed(0) : amount.toFixed(2);
    return `${parseFloat(formatted).toLocaleString('fr-FR')} ${t("services.currency", "DA")}`;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const isDueSoon = (date: string) => {
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= dueSoonThresholdDays && diffDays >= 0;
  };

  const isOverdue = (date: string) => {
    const today = new Date();
    const dueDate = new Date(date);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0;
  };

  const getServiceStatus = (isCompleted: boolean) => {
    if (isCompleted) {
      return t("services.complete", "Complete");
    }
    return t("services.incomplete", "Incomplete");
  };

  const markAsComplete = async (serviceId: string) => {
    try {
      // Mark the service as completed instead of deleting it
      // This allows us to track completed services and show them in history if not sold
      await window.api.database.serviceAppointments.markCompleted(serviceId);
      // Refresh the completed services count
      await refreshCompletedServicesCount();
      // Refresh the service data by calling the parent's refresh function
      onEdit({} as ServiceAppointment); // This will trigger a refresh
    } catch (error) {
      console.error("Error completing service:", error);
    }
  };

  const cancelCompletion = async (serviceId: string) => {
    try {
      setCancelingServiceId(serviceId);
      await window.api.database.serviceAppointments.markIncomplete(serviceId);
      // Refresh the completed services count
      await refreshCompletedServicesCount();
      // Refresh the service data by calling the parent's refresh function
      onEdit({} as ServiceAppointment); // This will trigger a refresh
    } catch (error) {
      console.error("Error canceling service completion:", error);
    } finally {
      setCancelingServiceId(null);
    }
  };


  const handleEditService = (service: ServiceAppointment) => {
    setEditingService(service);
    setShowEditModal(true);
  };

  const handleEditModalClose = () => {
    setShowEditModal(false);
    setEditingService(null);
  };

  const handleServiceUpdated = () => {
    onEdit(editingService!); // This will trigger a refresh in the parent component
  };

  const handleViewSale = async (serviceId: string) => {
    try {
      // Get the sale ID from the service appointment
      const saleId = await window.api.database.serviceAppointments.getSaleId(serviceId);
      
      if (!saleId) {
        showToast(
          t("services.saleNotFound", "Sale not found for this service"),
          "error"
        );
        return;
      }

      // Fetch the full sale details
      const sale = await window.api.database.sales.getById(saleId);
      
      if (sale) {
        setSelectedSale(sale);
        setShowSaleDetailsModal(true);
      } else {
        showToast(
          t("services.saleNotFound", "Sale not found for this service"),
          "error"
        );
      }
    } catch (error) {
      console.error("Error fetching sale details:", error);
      showToast(
        t("services.saleDetailsError", "Failed to load sale details"),
        "error"
      );
    }
  };

  const handleCloseSaleDetailsModal = () => {
    setShowSaleDetailsModal(false);
    setSelectedSale(null);
  };

  // Fetch payment statuses for all services
  useEffect(() => {
    const fetchPaymentStatuses = async () => {
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        services.map(async (service) => {
          try {
            const isPaid = await window.api.database.serviceAppointments.getPaymentStatus(service.id);
            statuses[service.id] = isPaid;
          } catch (error) {
            console.error(`Error fetching payment status for service ${service.id}:`, error);
            statuses[service.id] = false;
          }
        })
      );
      setPaymentStatuses(statuses);
    };

    if (services.length > 0) {
      fetchPaymentStatuses();
    }
  }, [services]);

  // Mark services as seen when viewing filtered tables
  useEffect(() => {
    if (statusFilter === "overdue" && newlyOverdueServicesIds.size > 0 && onMarkOverdueAsSeen) {
      onMarkOverdueAsSeen();
    } else if (statusFilter === "dueSoon" && newlyDueSoonServicesIds.size > 0 && onMarkDueSoonAsSeen) {
      onMarkDueSoonAsSeen();
    }
  }, [statusFilter, newlyOverdueServicesIds.size, newlyDueSoonServicesIds.size, onMarkOverdueAsSeen, onMarkDueSoonAsSeen]);

  const renderPageNumbers = () => {
    const items = [];
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, currentPage + 2);

    if (currentPage <= 3) {
      end = Math.min(5, totalPages);
    } else if (currentPage >= totalPages - 2) {
      start = Math.max(1, totalPages - 4);
    }

    if (start > 1) {
      items.push(
        <PaginationItem key="start-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    for (let i = start; i <= end; i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            isActive={i === currentPage}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onPageChange(i);
            }}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    if (end < totalPages) {
      items.push(
        <PaginationItem key="end-ellipsis">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    return items;
  };

  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;
  const hasNoData = services.length === 0;

  if (services.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <Wrench className="w-12 h-12 text-cyan-500 mb-1" />
        <h3 className="text-xl font-semibold text-foreground">
          {t("services.emptyTitle", "No services found")}
        </h3>
        <p className="text-base text-muted-foreground max-w-md">
          {t(
            "services.emptyDesc",
            "You have not added any services yet. Add a service to get started.",
          )}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-auto rounded-lg border border-muted">
        <table
          className={`min-w-full text-sm ${isRTL ? "text-right" : "text-left"}`}
        >
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.name", "Service Name")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.description", "Description")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.notes", "Problems/Breakdown")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.status", "Status")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.client", "Client")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.servicePrice", "Service Price")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.dueDate", "Due Date")}
              </th>
              <th className={`px-4 py-3 ${isRTL ? "text-right" : "text-left"}`}>
                {t("services.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {services.map((service) => {
              const isNewlyOverdue = newlyOverdueServicesIds.has(service.id);
              const isNewlyDueSoon = newlyDueSoonServicesIds.has(service.id);
              const shouldHighlight = isNewlyOverdue || isNewlyDueSoon;
              
              return (
                <tr
                  key={service.id}
                  className={`h-[48px] hover:bg-muted/40 transition ${
                    shouldHighlight
                      ? isNewlyOverdue
                        ? "bg-red-50 dark:bg-red-950/20 border-l-4 border-l-red-500"
                        : "bg-orange-50 dark:bg-orange-950/20 border-l-4 border-l-orange-500"
                      : ""
                  }`}
                >
                  <td
                    className={`px-4 py-2 font-medium ${isRTL ? "text-right" : "text-left"}`}
                  >
                    <div className="flex flex-col gap-1">
                      <span>{service.name}</span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {service.serviceType}
                      </span>
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="text-sm text-foreground whitespace-normal break-words max-w-xs">
                      {service.description || (
                        <span className="text-muted-foreground italic">
                          {t("services.noDescription", "No description")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="text-sm text-foreground whitespace-normal break-words max-w-xs">
                      {service.notes || (
                        <span className="text-muted-foreground italic">
                          {t("services.noNotes", "No problems")}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      service.isCompleted 
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" 
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }`}>
                      {getServiceStatus(service.isCompleted)}
                    </span>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <div>
                      {service.client ? (
                        <>
                          <div className="font-medium">{service.client.name}</div>
                          {service.client.phone && (
                            <div className="text-sm text-muted-foreground">{service.client.phone}</div>
                          )}
                        </>
                      ) : (
                        <div className="font-medium text-muted-foreground italic">
                          {t("services.noClient", "No client assigned")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[0.9375rem] text-cyan-600 dark:text-cyan-400">
                          {formatCurrency(service.servicePrice)}
                        </span>
                        {!hideProfit && (
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">
                            (+{formatCurrency(service.servicePrice - service.costPrice)})
                          </span>
                        )}
                      </div>
                      {/* Only show payment status for incomplete services or completed but not sold services */}
                      {(!service.isCompleted || (service.isCompleted && !soldServiceIds.has(service.id))) && 
                       paymentStatuses[service.id] && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs hover:bg-green-100 dark:hover:bg-green-900/30 w-fit">
                          {t("services.payed", "Payed")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <div className="flex items-center gap-2">
                      <span>{formatDate(service.dueDate)}</span>
                      {!service.isCompleted && isOverdue(service.dueDate) ? (
                        <Badge className="bg-red-100 text-red-800 text-xs hover:bg-red-100">
                          {t("services.overdue", "Overdue")}
                        </Badge>
                      ) : !service.isCompleted && isDueSoon(service.dueDate) && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs hover:bg-orange-100">
                          {t("services.dueSoon", "Due Soon")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-2 ${isRTL ? "text-right" : "text-left"}`}>
                    <div
                      className={`flex gap-2 ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      {/* View Sale button for completed & sold services */}
                      {service.isCompleted && soldServiceIds.has(service.id) && (
                        <Tooltip
                          content={t(
                            "services.viewSaleTooltip",
                            "View sale",
                          )}
                        >
                          <Button
                            onClick={() => handleViewSale(service.id)}
                            size="sm"
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </Tooltip>
                      )}

                      {!service.isCompleted && (
                        <Tooltip
                          content={t(
                            "services.markAsCompleteTooltip",
                            "Mark as complete",
                          )}
                        >
                          <Button
                            onClick={() => setCompleteConfirmServiceId(service.id)}
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                        </Tooltip>
                      )}

                      {service.isCompleted && !soldServiceIds.has(service.id) && service.servicePrice > 0 && (
                        <Tooltip
                          content={t(
                            "services.cancelCompletionTooltip",
                            "Cancel completion",
                          )}
                        >
                          <Button
                            onClick={() => cancelCompletion(service.id)}
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950/30"
                            disabled={cancelingServiceId === service.id}
                          >
                            {cancelingServiceId === service.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                          </Button>
                        </Tooltip>
                      )}

                      {!soldServiceIds.has(service.id) && (
                        <Tooltip content={t("services.editTooltip", "Edit service")}>
                          <Button
                            onClick={() => handleEditService(service)}
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950/30"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                        </Tooltip>
                      )}

                      {!soldServiceIds.has(service.id) && (
                        <Tooltip
                          content={t("services.deleteTooltip", "Delete service")}
                        >
                          <Button
                            onClick={() => setDeleteConfirmId(service.id)}
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
                            disabled={deleteLoading === service.id}
                          >
                            {deleteLoading === service.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {services.length > 0 && (
        <div className="flex justify-center mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                {isFirstPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationPrevious href="#" />
                  </span>
                ) : (
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage - 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>

              {renderPageNumbers()}

              <PaginationItem>
                {isLastPage || hasNoData ? (
                  <span className="opacity-50 pointer-events-none select-none">
                    <PaginationNext href="#" />
                  </span>
                ) : (
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage + 1);
                    }}
                    href="#"
                  />
                )}
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}


      <EditServiceModal
        isOpen={showEditModal}
        onClose={handleEditModalClose}
        service={editingService}
        onServiceUpdated={handleServiceUpdated}
      />

      <ConfirmDialog
        open={completeConfirmServiceId !== null}
        onOpenChange={(open) => !open && setCompleteConfirmServiceId(null)}
        title={t("services.markCompleteConfirmTitle", "Mark service as complete?")}
        message={t("services.markCompleteConfirmMessage", "Are you sure you want to mark this service as complete? You can cancel completion later if needed.")}
        confirmText={t("services.markCompleteConfirmButton", "Mark complete")}
        variant="success"
        onConfirm={async () => {
          if (completeConfirmServiceId) {
            await markAsComplete(completeConfirmServiceId);
            setCompleteConfirmServiceId(null);
          }
        }}
      />

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title={t("services.deleteService", "Delete Service")}
        message={t("services.deleteServiceConfirm", "Are you sure you want to delete this service? This action cannot be undone.")}
        onConfirm={() => {
          if (deleteConfirmId) {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
          }
        }}
        variant="danger"
      />

      <SaleDetailsModal
        sale={selectedSale}
        isOpen={showSaleDetailsModal}
        onClose={handleCloseSaleDetailsModal}
        onSaleUpdated={() => {
          // Refresh services after sale is updated
          onEdit({} as ServiceAppointment);
        }}
      />

      {/* Totals Footer */}
      {filteredServices && filteredServices.length > 0 && (
        <ServicesTotalsFooter filteredList={filteredServices} hideProfit={hideProfit} />
      )}
    </>
  );
};

export default ServicesTable;
