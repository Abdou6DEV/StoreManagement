import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronDown, Check, Package, TrendingUp } from "lucide-react";
import { useToast } from "../../../../lib/contexts/toastContext";
import { ConfirmModal } from "../../../../lib/components/modal";
import { ServiceRow } from "./serviceRow";
import { TableHeader } from "./tableHeader";
import { Filters } from "./filters";
import { ServicePagination } from "./pagination";
import { TotalsFooter } from "./totalsFooter";
import type {
  ServiceTableFilters,
  ConfirmDeleteState,
} from "./types";

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

export const ServicesTable = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [filters, setFilters] = useState<ServiceTableFilters>({
    completed: false,
    pending: false,
    overdue: false,
    search: "",
    serviceType: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [services, setServices] = useState<ServiceAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    open: false,
    serviceId: null,
    serviceName: "",
  });
  const [editingService, setEditingService] = useState<ServiceAppointment | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Load services
  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await window.api.database.serviceAppointments.getAll();
      setServices(data);
    } catch (error) {
      console.error("Error loading services:", error);
      showToast(t("services.errorLoading", "Error loading service requests"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleChange = (
    key: keyof ServiceTableFilters,
    value: boolean | string,
  ) => {
    setFilters((prev: ServiceTableFilters) => ({ ...prev, [key]: value }));
    
    // Reset pagination to page 1 when search or serviceType filters change
    if (key === "search" || key === "serviceType") {
      setCurrentPage(1);
    }
  };

  // Helper function to get active filters summary
  const getActiveFiltersSummary = () => {
    const activeFilters = [];

    if (filters.completed) {
      activeFilters.push(t("services.completed", "Completed"));
    }
    if (filters.pending) {
      activeFilters.push(t("services.pending", "Pending"));
    }
    if (filters.overdue) {
      activeFilters.push(t("services.overdue", "Overdue"));
    }

    if (filters.serviceType) {
      activeFilters.push(filters.serviceType);
    }
    if (filters.search) {
      activeFilters.push(`${t("services.search", "Search")}: "${filters.search}"`);
    }

    return activeFilters;
  };

  // Filter services based on current filters
  const filteredServices = services.filter((service) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        service.name.toLowerCase().includes(searchLower) ||
        service.serviceType.toLowerCase().includes(searchLower) ||
        service.client.name.toLowerCase().includes(searchLower) ||
        (service.description && service.description.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Service type filter
    if (filters.serviceType && service.serviceType !== filters.serviceType) {
      return false;
    }

    // Status filters
    const now = new Date();
    const dueDate = new Date(service.dueDate);
    
    if (filters.completed && !service.isCompleted) return false;
    if (filters.pending && service.isCompleted) return false;
    if (filters.overdue && (service.isCompleted || dueDate >= now)) return false;

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedServices = filteredServices.slice(startIndex, endIndex);

  // Handle delete
  const handleDelete = async (serviceId: string) => {
    try {
      setDeleteLoading(serviceId);
      await window.api.database.serviceAppointments.delete(serviceId);
      showToast(t("services.appointmentDeleted", "Service request deleted successfully"), "success");
      loadServices();
    } catch (error) {
      console.error("Error deleting service:", error);
      showToast(t("services.errorDeleting", "Error deleting service request"), "error");
    } finally {
      setDeleteLoading(null);
    }
  };

  // Handle toggle completion
  const handleToggleComplete = async (serviceId: string, isCompleted: boolean) => {
    try {
      if (isCompleted) {
        await window.api.database.serviceAppointments.markCompleted(serviceId);
        showToast(t("services.appointmentCompleted", "Service request marked as completed"), "success");
      } else {
        await window.api.database.serviceAppointments.markIncomplete(serviceId);
        showToast(t("services.appointmentIncomplete", "Service request marked as incomplete"), "success");
      }
      loadServices();
    } catch (error) {
      console.error("Error toggling completion:", error);
      showToast(t("services.errorToggling", "Error updating service status"), "error");
    }
  };

  // Handle edit
  const handleEdit = async (serviceId: string, data: any) => {
    try {
      setEditLoading(true);
      await window.api.database.serviceAppointments.update(serviceId, data);
      showToast(t("services.appointmentUpdated", "Service request updated successfully"), "success");
      setEditingService(null);
      loadServices();
    } catch (error) {
      console.error("Error updating service:", error);
      showToast(t("services.errorUpdating", "Error updating service request"), "error");
    } finally {
      setEditLoading(false);
    }
  };

  // Get unique service types for filter
  const serviceTypes = Array.from(new Set(services.map(s => s.serviceType))).sort();

  // Calculate totals
  const totalRevenue = filteredServices.reduce((sum, service) => sum + service.servicePrice, 0);
  const totalCost = filteredServices.reduce((sum, service) => sum + service.costPrice, 0);
  const totalProfit = totalRevenue - totalCost;
  const completedCount = filteredServices.filter(s => s.isCompleted).length;
  const pendingCount = filteredServices.filter(s => !s.isCompleted).length;
  const overdueCount = filteredServices.filter(s => !s.isCompleted && new Date(s.dueDate) < new Date()).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Filters
        filters={filters}
        onFilterChange={handleChange}
        serviceTypes={serviceTypes}
        activeFiltersSummary={getActiveFiltersSummary()}
      />

      {/* Table */}
      <div className="border border-border rounded-xl shadow-sm">
        <TableHeader />
        
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">{t("common.loading", "Loading...")}</p>
          </div>
        ) : paginatedServices.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {t("services.noServices", "No service requests found")}
            </h3>
            <p className="text-muted-foreground">
              {t("services.noServicesDesc", "Create your first service request to get started")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                {paginatedServices.map((service) => (
                  <ServiceRow
                    key={service.id}
                    service={service}
                    onEdit={setEditingService}
                    onDelete={(id: string) => setConfirmDelete({ open: true, serviceId: id, serviceName: service.name })}
                    onToggleComplete={handleToggleComplete}
                    deleteLoading={deleteLoading === service.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Totals Footer */}
        {paginatedServices.length > 0 && (
          <TotalsFooter
            totalRevenue={totalRevenue}
            totalCost={totalCost}
            totalProfit={totalProfit}
            completedCount={completedCount}
            pendingCount={pendingCount}
            overdueCount={overdueCount}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <ServicePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={setItemsPerPage}
          totalItems={filteredServices.length}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, serviceId: null, serviceName: "" })}
        onConfirm={() => {
          if (confirmDelete.serviceId) {
            handleDelete(confirmDelete.serviceId);
            setConfirmDelete({ open: false, serviceId: null, serviceName: "" });
          }
        }}
        title={t("services.deleteService", "Delete Service Request")}
        message={t("services.deleteConfirm", "Are you sure you want to delete this service request? This action cannot be undone.")}
        confirmText={t("common.delete", "Delete")}
        cancelText={t("common.cancel", "Cancel")}
        variant="danger"
      />

      {/* Edit Modal */}
      {editingService && (
        <EditServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSave={handleEdit}
          loading={editLoading}
        />
      )}
    </div>
  );
};

// Edit Service Modal Component
interface EditServiceModalProps {
  service: ServiceAppointment;
  onClose: () => void;
  onSave: (id: string, data: any) => void;
  loading: boolean;
}

function EditServiceModal({ service, onClose, onSave, loading }: EditServiceModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: service.name,
    serviceType: service.serviceType,
    description: service.description || "",
    costPrice: service.costPrice,
    servicePrice: service.servicePrice,
    dueDate: service.dueDate.split('T')[0],
    notes: service.notes || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(service.id, {
      ...formData,
      dueDate: new Date(formData.dueDate),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{t("services.editService", "Edit Service Request")}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("services.serviceName", "Service Name")} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("services.serviceType", "Service Type")} *
              </label>
              <input
                type="text"
                value={formData.serviceType}
                onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("services.costPrice", "Cost Price")}
              </label>
              <input
                type="number"
                value={formData.costPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="0"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("services.servicePrice", "Service Price")} *
              </label>
              <input
                type="number"
                value={formData.servicePrice}
                onChange={(e) => setFormData(prev => ({ ...prev, servicePrice: Number(e.target.value) }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                min="0"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                {t("services.dueDate", "Due Date")} *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("services.description", "Description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={3}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              {t("services.notes", "Notes")}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={2}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("common.cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? t("common.updating", "Updating...") : t("common.update", "Update")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
