import React, { useState, useEffect } from "react";
import { Wrench, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Modal } from "../../../lib/components/modal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../lib/components/select";
import { useToast } from "../../../lib/contexts/toastContext";

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

interface EditServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceAppointment | null;
  onServiceUpdated: () => void;
}

export default function EditServiceModal({
  isOpen,
  onClose,
  service,
  onServiceUpdated,
}: EditServiceModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    name: "",
    serviceType: "",
    description: "",
    costPrice: "",
    servicePrice: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || "",
        serviceType: service.serviceType || "",
        description: service.description || "",
        costPrice: service.costPrice.toString() || "",
        servicePrice: service.servicePrice.toString() || "",
        notes: service.notes || "",
      });
    }
  }, [service]);

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!service) return;

    setLoading(true);
    try {
      const serviceData = {
        name: form.name.trim(),
        serviceType: form.serviceType.trim(),
        description: form.description.trim() || undefined,
        costPrice: parseFloat(form.costPrice) || 0,
        servicePrice: parseFloat(form.servicePrice) || 0,
        notes: form.notes.trim() || undefined,
      };

      await window.api.database.serviceAppointments.update(service.id, serviceData);
      onServiceUpdated();
      showToast(t("services.serviceUpdatedSuccessfully", "Service updated successfully"), "success");
      onClose();
    } catch (err) {
      showToast(t("services.failedToSaveService", "Failed to save service"), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!service) return null;

  return (
    <Modal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()} 
      size="lg"
      title={t("services.editService", "Edit Service")}
      icon={<Wrench className="w-5 h-5 text-cyan-600" />}
      showCloseButton={true}
    >
      <div className="p-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Service Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.serviceName", "Service Name")} *
              </label>
              <input
                type="text"
                placeholder={t("services.enterServiceName", "Enter service name")}
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </div>

            {/* Service Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.serviceType", "Service Type")} *
              </label>
              <input
                type="text"
                placeholder={t("services.enterServiceType", "Enter service type")}
                value={form.serviceType}
                onChange={(e) => handleFormChange("serviceType", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </div>

            {/* Cost Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.costPrice", "Cost Price")} ({t("common.currency", "DA")})
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t("services.enterCostPrice", "Enter cost price")}
                value={form.costPrice}
                onChange={(e) => handleFormChange("costPrice", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Service Price */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("services.servicePrice", "Service Price")} ({t("common.currency", "DA")}) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t("services.enterServicePrice", "Enter service price")}
                value={form.servicePrice}
                onChange={(e) => handleFormChange("servicePrice", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("services.description", "Description")}
            </label>
            <input
              type="text"
              placeholder={t("services.enterDescriptionOptional", "Enter description (optional)")}
              value={form.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("services.notes", "Notes")}
            </label>
            <input
              type="text"
              placeholder={t("services.enterNotesOptional", "Enter notes (optional)")}
              value={form.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
            />
          </div>

          {/* Client Info (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("services.client", "Client")}
            </label>
            <div className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
              {service.client ? (
                <>
                  <div className="font-medium">{service.client.name}</div>
                  {service.client.phone && (
                    <div className="text-sm text-muted-foreground">{service.client.phone}</div>
                  )}
                </>
              ) : (
                <div className="font-medium italic">{t("services.noClient", "No client assigned")}</div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("services.clientCannotBeChanged", "Client cannot be changed after service creation")}
            </p>
          </div>

          {/* Due Date Info (Read-only) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t("services.dueDate", "Due Date")}
            </label>
            <div className="w-full px-4 py-3 rounded-lg border border-border bg-muted text-sm text-muted-foreground">
              {new Date(service.dueDate).toLocaleDateString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("services.dueDateCannotBeChanged", "Due date cannot be changed after service creation")}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("services.updating", "Updating...")}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  {t("services.updateService", "Update Service")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
