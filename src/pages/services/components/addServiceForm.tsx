import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Wrench, Loader2, Check, User, Plus, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { DatePicker } from "../../../lib/components/datePicker";
import { Popover, PopoverContent, PopoverTrigger } from "../../../lib/components/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "../../../lib/components/command";
import { useToast } from "../../../lib/contexts/toastContext";
import { cn } from "../../../lib/utils";
import AddClientModal from "../../../pages/cashier/components/addClientModal";

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
  const [serviceNames, setServiceNames] = useState<string[]>([]);
  const [serviceNameToTypeMap, setServiceNameToTypeMap] = useState<Map<string, string>>(new Map());
  const [isExistingService, setIsExistingService] = useState(false);
  
  // Enhanced dropdown states
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [filteredTypes, setFilteredTypes] = useState<string[]>([]);
  const [filteredNames, setFilteredNames] = useState<string[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedTypeIndex, setSelectedTypeIndex] = useState(-1);
  const [selectedNameIndex, setSelectedNameIndex] = useState(-1);
  const [clientPopoverOpen, setClientPopoverOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Add client modal state
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  
  // Refs for dropdown management and field navigation
  const typeInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const clientButtonRef = useRef<HTMLButtonElement>(null);
  const costPriceRef = useRef<HTMLInputElement>(null);
  const servicePriceRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLInputElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is on a dropdown item (don't close if clicking on dropdown items)
      if (target.closest("[data-type-dropdown]") || target.closest("[data-name-dropdown]")) {
        return;
      }
      
      // Close dropdowns
      setShowTypeDropdown(false);
      setSelectedTypeIndex(-1);
      setShowNameDropdown(false);
      setSelectedNameIndex(-1);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const loadServiceData = async () => {
    try {
      const [clientsData, typesData, namesData, allAppointments] = await Promise.all([
        window.api.database.clients.getAll(),
        window.api.database.serviceAppointments.getServiceTypes(),
        window.api.database.serviceAppointments.getServiceNames(),
        window.api.database.serviceAppointments.getAll()
      ]);
      setClients(clientsData);
      setServiceTypes(typesData);
      setServiceNames(namesData);
      setFilteredNames(namesData); // Initialize filtered names
      
      // Create a map from service name to service type
      // Use the most recent occurrence of each service name
      const nameToTypeMap = new Map<string, string>();
      allAppointments.forEach((appointment: { name: string; serviceType: string }) => {
        // Only update if not already in map (keeps the first/most recent occurrence)
        if (!nameToTypeMap.has(appointment.name)) {
          nameToTypeMap.set(appointment.name, appointment.serviceType);
        }
      });
      setServiceNameToTypeMap(nameToTypeMap);
    } catch (error) {
      console.error("Error loading service data:", error);
    }
  };

  const handleAddClient = async () => {
    try {
      const newClient = await window.api.database.clients.create({
        name: clientName.trim(),
        phone: clientPhone.trim() || undefined,
        address: clientAddress.trim() || undefined,
        notes: clientNotes.trim() || undefined,
      });
      
      // Refresh clients list
      await loadServiceData();
      
      // Select the newly created client
      const updatedClients = await window.api.database.clients.getAll();
      const createdClient = updatedClients.find((c: Client) => c.id === newClient.id);
      if (createdClient) {
        selectClient(createdClient);
        setClientPopoverOpen(false);
      }
      
      // Reset form and close modal
      setClientName("");
      setClientPhone("");
      setClientAddress("");
      setClientNotes("");
      setShowAddClientModal(false);
      
      showToast(t("clients.addSuccess", "Client added successfully"), "success");
    } catch (error) {
      console.error("Error adding client:", error);
      showToast(t("clients.addError", "Failed to add client"), "error");
    }
  };

  const handleFormChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const filteredClients = clients
    .filter(
      (client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
        (client.phone &&
          client.phone.toLowerCase().includes(clientSearch.toLowerCase())),
    )
    .slice(0, 100);


  // Enhanced type search with filtering
  const handleTypeSearch = (value: string) => {
    setForm((prev) => ({ ...prev, serviceType: value }));
    
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
        } else {
          // If no dropdown or no selection, navigate to next field
          handleFieldKeyDown(e, "type");
        }
        break;
      case "Escape":
        setShowTypeDropdown(false);
        setSelectedTypeIndex(-1);
        break;
    }
  };

  // Service name search handler
  const handleNameSearch = (value: string) => {
    setForm((prev) => ({ ...prev, name: value }));
    
    if (value.trim()) {
      const filtered = serviceNames.filter((name) =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredNames(filtered);
      setShowNameDropdown(true);
      setSelectedNameIndex(-1);
    } else {
      setFilteredNames([]);
      setShowNameDropdown(false);
      setSelectedNameIndex(-1);
    }
  };

  // Keyboard navigation for name dropdown
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showNameDropdown || filteredNames.length === 0) return;
        e.preventDefault();
        setSelectedNameIndex(prev => 
          prev < filteredNames.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        if (!showNameDropdown || filteredNames.length === 0) return;
        e.preventDefault();
        setSelectedNameIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case "Enter":
        e.preventDefault();
        if (showNameDropdown && selectedNameIndex >= 0 && selectedNameIndex < filteredNames.length) {
          selectName(filteredNames[selectedNameIndex]);
        } else {
          // If no dropdown or no selection, navigate to next field
          handleFieldKeyDown(e, "name");
        }
        break;
      case "Escape":
        setShowNameDropdown(false);
        setSelectedNameIndex(-1);
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

  const selectName = (name: string) => {
    // Automatically set the service type when a service name is selected
    const correspondingType = serviceNameToTypeMap.get(name);
    if (correspondingType) {
      setForm(prev => ({ ...prev, name: name, serviceType: correspondingType }));
    } else {
      setForm(prev => ({ ...prev, name: name }));
    }
    setShowNameDropdown(false);
    setSelectedNameIndex(-1);
  };

  // Keyboard navigation between fields
  const handleFieldKeyDown = (e: React.KeyboardEvent, currentField: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Close any open dropdowns first
      setShowTypeDropdown(false);
      setShowNameDropdown(false);
      setSelectedTypeIndex(-1);
      setSelectedNameIndex(-1);
      
      // Navigate to next field
      switch (currentField) {
        case "name":
          typeInputRef.current?.focus();
          break;
        case "type":
          clientButtonRef.current?.click();
          break;
        case "client":
          costPriceRef.current?.focus();
          break;
        case "dueDate":
          costPriceRef.current?.focus();
          break;
        case "costPrice":
          servicePriceRef.current?.focus();
          break;
        case "servicePrice":
          descriptionRef.current?.focus();
          break;
        case "description":
          notesRef.current?.focus();
          break;
        case "notes":
          // Submit form if on last field
          handleAddService(e as React.FormEvent);
          break;
      }
    }
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
              <div className="relative">
                <input
                  ref={nameInputRef}
                  data-field="service-name"
                  type="text"
                  placeholder={t("services.enterServiceName", "Enter service name")}
                  value={form.name}
                  onChange={(e) => handleNameSearch(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  onFocus={() => {
                    if (form.name.trim()) {
                      setShowNameDropdown(true);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                  required
                />
                
                {/* Enhanced name dropdown */}
                {showNameDropdown && filteredNames.length > 0 && (
                  <div 
                    data-name-dropdown
                    className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
                  >
                    {filteredNames.map((name, index) => (
                      <div
                        key={name}
                        className={cn(
                          "px-4 py-3 cursor-pointer text-sm transition-colors border-b border-border last:border-b-0",
                          index === selectedNameIndex
                            ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300"
                            : "hover:bg-muted text-foreground"
                        )}
                        onClick={() => selectName(name)}
                      >
                        <div className="font-medium">{name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
              <label>{t("services.client", "Client")} <span className="text-muted-foreground text-xs">({t("common.optional", "Optional")})</span></label>
              <div className="flex gap-2">
                <Popover
                  open={clientPopoverOpen}
                  onOpenChange={(open) => {
                    setClientPopoverOpen(open);
                    if (open) setClientSearch(""); // Reset search when opening
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      ref={clientButtonRef}
                      variant="outline"
                      className="flex-1 justify-start px-4 py-3 h-12 text-sm"
                      aria-label={t("services.client", "Client")}
                      onKeyDown={(e) => handleFieldKeyDown(e, "client")}
                    >
                      {selectedClient ? selectedClient.name : t("services.searchClient", "Search for client")}
                      <ChevronDown className="ml-auto w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50">
                    <Command shouldFilter={false}>
                      <div className="flex items-center border-b">
                        <CommandInput
                          placeholder={t("services.searchClient", "Search for client")}
                          className="h-9 flex-1 border-0"
                          value={clientSearch}
                          onValueChange={setClientSearch}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-9 w-9 p-0 mr-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClientPopoverOpen(false);
                            setShowAddClientModal(true);
                          }}
                          title={t("cashier.addNewClient", "Add New Client")}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
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
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 px-3 flex items-center justify-center gap-1"
                  onClick={() => setShowAddClientModal(true)}
                  title={t("cashier.addNewClient", "Add New Client")}
                >
                  <Users className="w-4 h-4" />
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
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
                ref={costPriceRef}
                data-field="service-cost-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("services.enterCostPrice", "Enter cost price")}
                value={form.costPrice}
                onChange={(e) => handleFormChange("costPrice", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "costPrice")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("services.servicePrice", "Service Price")} ({t("common.currency", "DA")})</label>
            <input
                ref={servicePriceRef}
                data-field="service-price"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("services.enterServicePrice", "Enter service price")}
                value={form.servicePrice}
                onChange={(e) => handleFormChange("servicePrice", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "servicePrice")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              required
            />
            </Legend>
            <Legend>
              <label>{t("services.description", "Description")}</label>
              <input
                ref={descriptionRef}
                type="text"
                placeholder={t("services.enterDescriptionOptional", "Enter description (optional)")}
                value={form.description}
                onChange={(e) => handleFormChange("description", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "description")}
                className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
              />
            </Legend>
            <Legend>
              <label>{t("services.notes", "Notes")}</label>
              <input
                ref={notesRef}
                type="text"
                placeholder={t("services.enterNotesOptional", "Enter notes (optional)")}
                value={form.notes}
                onChange={(e) => handleFormChange("notes", e.target.value)}
                onKeyDown={(e) => handleFieldKeyDown(e, "notes")}
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
      
      <AddClientModal
        open={showAddClientModal}
        onClose={() => {
          setShowAddClientModal(false);
          setClientName("");
          setClientPhone("");
          setClientAddress("");
          setClientNotes("");
        }}
        clientName={clientName}
        setClientName={setClientName}
        clientPhone={clientPhone}
        setClientPhone={setClientPhone}
        clientAddress={clientAddress}
        setClientAddress={setClientAddress}
        clientNotes={clientNotes}
        setClientNotes={setClientNotes}
        t={t}
        onConfirm={handleAddClient}
      />
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

