import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, User, DollarSign, FileText, Clock, Tag } from "lucide-react";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { useToast } from "../../../lib/contexts/toastContext";

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}

interface Client {
  id: string;
  name: string;
  phone?: string;
}

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

interface AddServiceAppointmentFormProps {
  appointment?: ServiceAppointment;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const serviceTypes = [
  "Haircut",
  "Hair Coloring",
  "Hair Styling",
  "Manicure",
  "Pedicure",
  "Facial Treatment",
  "Massage",
  "Consultation",
  "Hair Wash",
  "Hair Treatment",
  "Eyebrow Shaping",
  "Eyelash Extension",
  "Makeup Application",
  "Skin Analysis",
  "Acne Treatment",
  "Anti-Aging Treatment",
  "Body Scrub",
  "Body Wrap",
  "Hot Stone Massage",
  "Other",
];

export default function AddServiceAppointmentForm({
  appointment,
  onSubmit,
  onCancel,
}: AddServiceAppointmentFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    serviceType: "",
    description: "",
    costPrice: 0,
    servicePrice: 0,
    clientId: "",
    dueDate: "",
    notes: "",
  });

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1);

  // Load clients
  useEffect(() => {
    const loadClients = async () => {
      try {
        const data = await window.api.database.clients.getAll();
        setClients(data);
      } catch (error) {
        console.error("Error loading clients:", error);
      }
    };
    loadClients();
  }, []);

  // Initialize form with appointment data if editing
  useEffect(() => {
    if (appointment) {
      setFormData({
        name: appointment.name,
        serviceType: appointment.serviceType,
        description: appointment.description || "",
        costPrice: appointment.costPrice,
        servicePrice: appointment.servicePrice,
        clientId: appointment.clientId,
        dueDate: appointment.dueDate.split('T')[0], // Convert to YYYY-MM-DD format
        notes: appointment.notes || "",
      });
    }
  }, [appointment]);

  // Search clients
  const searchClients = (query: string) => {
    if (!query.trim()) {
      setClientSuggestions([]);
      setShowClientSuggestions(false);
      return;
    }

    const filtered = clients.filter((client) =>
      client.name.toLowerCase().includes(query.toLowerCase())
    );
    setClientSuggestions(filtered.slice(0, 5));
    setShowClientSuggestions(true);
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, clientId: value }));
    searchClients(value);
  };

  const selectClient = (client: Client) => {
    setFormData((prev) => ({ ...prev, clientId: client.id }));
    setShowClientSuggestions(false);
    setSelectedClientIndex(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast(t("services.nameRequired", "Service name is required"), "error");
      return;
    }
    
    if (!formData.serviceType.trim()) {
      showToast(t("services.serviceTypeRequired", "Service type is required"), "error");
      return;
    }
    
    // Client is now optional - no validation needed
    
    if (!formData.dueDate) {
      showToast(t("services.dueDateRequired", "Due date is required"), "error");
      return;
    }
    
    if (formData.servicePrice <= 0) {
      showToast(t("services.servicePriceRequired", "Service price must be greater than 0"), "error");
      return;
    }

    // Validate client only if one is selected
    if (formData.clientId.trim()) {
      const selectedClient = clients.find(c => c.id === formData.clientId);
      if (!selectedClient) {
        showToast(t("services.clientNotFound", "Selected client not found"), "error");
        return;
      }
    }

    onSubmit({
      ...formData,
      dueDate: new Date(formData.dueDate),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showClientSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedClientIndex((prev) =>
          prev < clientSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedClientIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedClientIndex >= 0) {
          selectClient(clientSuggestions[selectedClientIndex]);
        }
        break;
      case "Escape":
        setShowClientSuggestions(false);
        break;
    }
  };

  const selectedClient = clients.find(c => c.id === formData.clientId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Tag className="w-4 h-4" />
            {t("services.serviceName", "Service Name")} *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            placeholder={t("services.enterServiceName", "Enter service name")}
            required
          />
        </div>

        {/* Service Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t("services.serviceType", "Service Type")} *
          </label>
          <select
            value={formData.serviceType}
            onChange={(e) => setFormData(prev => ({ ...prev, serviceType: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          >
            <option value="">{t("services.selectServiceType", "Select service type")}</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Client Selection */}
        <div className="space-y-2 relative">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <User className="w-4 h-4" />
            {t("services.client", "Client")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={selectedClient ? selectedClient.name : formData.clientId}
              onChange={handleClientChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (clientSuggestions.length > 0) {
                  setShowClientSuggestions(true);
                }
              }}
              className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder={t("services.searchClient", "Search for client")}
              required
            />
            {showClientSuggestions && (
              <div className="absolute z-10 w-full top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {clientSuggestions.length > 0 ? (
                  clientSuggestions.map((client, index) => (
                    <button
                      key={client.id}
                      type="button"
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                        index === selectedClientIndex ? "bg-muted/50" : ""
                      }`}
                      onClick={() => selectClient(client)}
                      onMouseEnter={() => setSelectedClientIndex(index)}
                    >
                      <div>
                        <div className="font-medium">{client.name}</div>
                        {client.phone && (
                          <div className="text-xs text-muted-foreground">{client.phone}</div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">
                    {t("services.noClientsFound", "No clients found")}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" />
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

        {/* Cost Price */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t("services.costPrice", "Cost Price")}
          </label>
          <StyledNumberInput
            value={formData.costPrice}
            onChange={(val) => setFormData(prev => ({ ...prev, costPrice: val === "" ? 0 : val }))}
            min={0}
            placeholder="0"
          />
        </div>

        {/* Service Price */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            {t("services.servicePrice", "Service Price")} *
          </label>
          <StyledNumberInput
            value={formData.servicePrice}
            onChange={(val) => setFormData(prev => ({ ...prev, servicePrice: val === "" ? 0 : val }))}
            min={0}
            placeholder="0"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t("services.description", "Description")}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          placeholder={t("services.enterDescription", "Enter service description (optional)")}
          rows={3}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" />
          {t("services.notes", "Notes")}
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          placeholder={t("services.enterNotes", "Enter additional notes (optional)")}
          rows={2}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("common.cancel", "Cancel")}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          {appointment ? t("common.update", "Update") : t("common.create", "Create")}
        </button>
      </div>
    </form>
  );
}
