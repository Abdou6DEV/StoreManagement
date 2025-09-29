import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Wrench, Loader2, Check, Search, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../lib/components/select";
import { DatePicker } from "../../../lib/components/datePicker";
import { Popover, PopoverContent, PopoverTrigger } from "../../../lib/components/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../lib/components/command";
import { useToast } from "../../../lib/contexts/toastContext";
import { cn } from "../../../lib/utils";

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

interface AddServiceFormProps {
  openPanel: "add" | null;
  setOpenPanel: React.Dispatch<React.SetStateAction<"add" | null>>;
  editingService?: ServiceAppointment | null;
  onServiceAdded?: () => void;
  onServiceUpdated?: () => void;
}

const initialForm = {
    name: "",
    serviceType: "",
    description: "",
  costPrice: "",
  servicePrice: "",
    clientId: "",
    dueDate: "",
    notes: "",
};

export default function AddServiceForm({
  openPanel,
  setOpenPanel,
  editingService,
  onServiceAdded,
  onServiceUpdated,
}: AddServiceFormProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [isExistingService, setIsExistingService] = useState(false);
  
  // Enhanced dropdown states
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredTypes, setFilteredTypes] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [selectedClientIndex, setSelectedClientIndex] = useState(-1);
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(-1);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Refs for dropdown management
  const clientInputRef = useRef<HTMLInputElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingService) {
      setForm({
        name: editingService.name,
        serviceType: editingService.serviceType,
        description: editingService.description || "",
        costPrice: editingService.costPrice.toString(),
        servicePrice: editingService.servicePrice.toString(),
        clientId: editingService.clientId,
        dueDate: editingService.dueDate.split('T')[0],
        notes: editingService.notes || "",
      });
      setIsExistingService(true);
    } else {
      // Set default due date to 3 days later for new services
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 3);
      const defaultDateString = defaultDate.toISOString().split('T')[0];
      
      setForm({
        ...initialForm,
        dueDate: defaultDateString,
      });
      setIsExistingService(false);
    }
  }, [editingService, openPanel]);

  useEffect(() => {
    if (openPanel) {
      loadServiceData();
    }
  }, [openPanel]);

  // Close type dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is on a dropdown item (don't close if clicking on dropdown items)
      if (target.closest("[data-type-dropdown]")) {
        return;
      }
      
      // Close type dropdown
      setShowTypeDropdown(false);
      setSelectedTypeIndex(-1);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadServiceData = async () => {
    try {
      const [clientsData, typesData] = await Promise.all([
        window.api.database.clients.getAll(),
        window.api.database.serviceAppointments.getServiceTypes()
      ]);
      setClients(clientsData);
      setServiceTypes(typesData);
      setFilteredClients(clientsData); // Initialize filtered clients
    } catch (error) {
      console.error("Error loading service data:", error);
    }
  };

  const handleFormChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Enhanced client search with filtering
  const handleClientSearch = (value: string) => {
    setClientSearch(value);
    
    if (value.trim()) {
      const filtered = clients.filter((client) =>
        client.name.toLowerCase().includes(value.toLowerCase()) ||
        (client.phone && client.phone.includes(value))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  };

  // Enhanced type search with filtering
  const handleTypeSearch = (value: string) => {
    setForm((prev) => ({ ...prev, serviceType: value }));
    setTypeSearch(value);
    
    if (value.trim()) {
      const filtered = serviceTypes.filter((type) =>
        type.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredTypes(filtered);
      setShowTypeDropdown(true);
      setSelectedTypeIndex(-1);
    } else {
      setFilteredTypes([]);
      setShowTypeDropdown(false);
      setSelectedTypeIndex(-1);
    }
  };

  // Keyboard navigation for type dropdown
  const handleTypeKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showTypeDropdown || filteredTypes.length === 0) return;
        e.preventDefault();
        setSelectedTypeIndex(prev => 
          prev < filteredTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showTypeDropdown || filteredTypes.length === 0) return;
        e.preventDefault();
        setSelectedTypeIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (showTypeDropdown && selectedTypeIndex >= 0 && selectedTypeIndex < filteredTypes.length) {
          selectType(filteredTypes[selectedTypeIndex]);
        }
        break;
      case "Escape":
        setShowTypeDropdown(false);
        setSelectedTypeIndex(-1);
        break;
    }
  };

  // Select client
  const selectClient = (client: Client) => {
    setSelectedClient(client);
    setForm(prev => ({ ...prev, clientId: client.id }));
  };

  // Select type
  const selectType = (type: string) => {
    setForm(prev => ({ ...prev, serviceType: type }));
    setShowTypeDropdown(false);
    setSelectedTypeIndex(-1);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Set default due date to 3 days later if not provided
      let dueDate = form.dueDate;
      if (!dueDate) {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 3);
        dueDate = defaultDate.toISOString().split('T')[0];
      }

      if (editingService) {
        // Update existing service
        const serviceData = {
          name: form.name.trim(),
          serviceType: form.serviceType.trim(),
          description: form.description.trim() || undefined,
          costPrice: parseFloat(form.costPrice) || 0,
          servicePrice: parseFloat(form.servicePrice) || 0,
          clientId: form.clientId.trim() || undefined,
          dueDate: new Date(dueDate),
          notes: form.notes.trim() || undefined,
        };

        await window.api.database.serviceAppointments.update(editingService.id, serviceData);
        onServiceUpdated?.();
        showToast(t("services.serviceUpdatedSuccessfully", "Service updated successfully"), "success");
      } else {
        // Create new service
        const serviceData = {
          name: form.name.trim(),
          serviceType: form.serviceType.trim(),
          description: form.description.trim() || undefined,
          costPrice: parseFloat(form.costPrice) || 0,
          servicePrice: parseFloat(form.servicePrice) || 0,
          clientId: form.clientId.trim() || undefined,
          dueDate: new Date(dueDate),
          notes: form.notes.trim() || undefined,
        };

        await window.api.database.serviceAppointments.create(serviceData);
        onServiceAdded?.();
        showToast(t("services.serviceAddedSuccessfully", "Service added successfully"), "success");
      }
      
      setForm(initialForm);
      setIsExistingService(false);
    } catch (err) {
      showToast(t("services.failedToSaveService", "Failed to save service"), "error");
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="bg-card border border-border rounded-xl shadow-sm">
      <header
        className="flex items-center justify-between p-6 cursor-pointer select-none"
        onClick={() => setOpenPanel(openPanel === "add" ? null : "add")}
        aria-expanded={openPanel === "add"}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <Wrench className="w-5 h-5 text-cyan-600" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {editingService ? t("services.editService", "Edit Service") : isExistingService ? t("services.updateService", "Update Service") : t("services.addService", "Add Service")}
          </h2>
          </div>
        {openPanel === "add" ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </header>
      {openPanel === "add" && (
        <form onSubmit={handleAddService} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <Legend>
              <label>{t("services.serviceName", "Service Name")}</label>
              <input
                data-field="service-name"
                type="text"
                placeholder={t("services.enterServiceName", "Enter service name")}
                value={form.name}
                onChange={(e) => handleFormChange("name", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                required
              />
            </Legend>
            <Legend>
              <label>{t("services.serviceType", "Service Type")}</label>
              <div className="relative">
                <input
                  ref={typeInputRef}
                  data-field="service-type"
                  type="text"
                  placeholder={t("services.enterServiceType", "Enter service type")}
                  value={form.serviceType}
                  onChange={(e) => handleTypeSearch(e.target.value)}
                  onKeyDown={handleTypeKeyDown}
                  onFocus={() => {
                    if (form.serviceType.trim()) {
                      setShowTypeDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  required
                />
                
                {/* Enhanced type dropdown */}
                {showTypeDropdown && filteredTypes.length > 0 && (
                  <div 
                    data-type-dropdown
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {filteredTypes.map((type, index) => (
                      <div
                        key={type}
                        className={cn(
                          "px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between",
                          selectedTypeIndex === index && "bg-muted/50"
                        )}
                        onMouseDown={() => selectType(type)}
                        onMouseEnter={() => setSelectedTypeIndex(index)}
                      >
                        <div className="font-medium text-foreground">{type}</div>
                        {selectedTypeIndex === index && (
                          <Check className="w-4 h-4 text-cyan-600" />
                          )}
                        </div>
                    ))}
                    </div>
                  )}
                </div>
            </Legend>
            <Legend>
              <label>{t("services.client", "Client")}</label>
              <Popover
                open={clientPopoverOpen}
                onOpenChange={(open) => {
                  setClientPopoverOpen(open);
                  if (open) setClientSearch(""); // Reset search when opening
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start px-4 py-3 h-12 text-sm"
                    aria-label={t("services.client", "Client")}
                  >
                    {selectedClient ? selectedClient.name : t("services.searchClient", "Search for client")}
                    <ChevronDown className="ml-auto w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("services.searchClient", "Search for client")}
                      className="h-9"
                      value={clientSearch}
                      onValueChange={setClientSearch}
                    />
                    <CommandList>
                      <CommandGroup>
                        {filteredClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              selectClient(client);
                              setClientPopoverOpen(false);
                            }}
                          >
                            <User className="w-4 h-4 mr-2" />
                            <div className="flex-1">
                              <div className="font-medium">{client.name}</div>
                              {client.phone && (
                                <div className="text-sm text-muted-foreground">{client.phone}</div>
              )}
            </div>
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                selectedClient?.id === client.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Legend>
            <Legend>
              <label>{t("services.dueDate", "Due Date")}</label>
              <DatePicker
                value={form.dueDate}
                onChange={(date) => handleFormChange("dueDate", date)}
                placeholder={t("services.selectDueDate", "Select due date (default: 3 days later)")}
                className="w-full h-12 px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                min={new Date().toISOString().split('T')[0]}
              />
            </Legend>
            <Legend>
              <label>{t("services.costPrice", "Cost Price")} ({t("common.currency", "DA")})</label>
              <input
                data-field="service-cost-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("services.enterCostPrice", "Enter cost price")}
                value={form.costPrice}
                onChange={(e) => handleFormChange("costPrice", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("services.servicePrice", "Service Price")} ({t("common.currency", "DA")})</label>
            <input
                data-field="service-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("services.enterServicePrice", "Enter service price")}
                value={form.servicePrice}
                onChange={(e) => handleFormChange("servicePrice", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              required
            />
            </Legend>
            <Legend>
              <label>{t("services.description", "Description")}</label>
              <input
                type="text"
                placeholder={t("services.enterDescriptionOptional", "Enter description (optional)")}
                value={form.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("services.notes", "Notes")}</label>
              <input
                type="text"
                placeholder={t("services.enterNotesOptional", "Enter notes (optional)")}
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
          </div>
          <hr />
          <div>
          <Button
            type="submit"
            disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-700 text-white h-10"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {editingService ? t("services.updating", "Updating...") : isExistingService ? t("services.updating", "Updating...") : t("services.adding", "Adding...")}
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4" />
                  {editingService ? t("services.updateService", "Update Service") : isExistingService ? t("services.updateService", "Update Service") : t("services.addService", "Add Service")}
                </>
              )}
          </Button>
        </div>
      </form>
      )}
    </section>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}

