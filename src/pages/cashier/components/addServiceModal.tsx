import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import { FormModal } from "../../../lib/components/modal";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Plus, Trash2 } from "lucide-react";
import type { CartItem } from "../../../types";
import type { Service } from "@prisma/client";
import { useCompletedServices } from "../../../lib/contexts/completedServicesContext";
import { ConfirmDialog } from "../../../lib/components/confirmDialog";

interface CompletedServiceAppointment {
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

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (service: CartItem) => void;
  cart: CartItem[];
  onClientSelect?: (clientId: string, clientName: string) => void;
}

// Maximum value for INT column in SQLite (2^31 - 1)
const MAX_PRICE = 2147483647;
const HIDDEN_SERVICE_TEMPLATES_OPTION_KEY = "hiddenServiceTemplateIds";

export default function AddServiceModal({
  open,
  onClose,
  onAdd,
  cart,
  onClientSelect,
}: AddServiceModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { refreshCompletedServicesCount } = useCompletedServices();
  const [service, setService] = useState<{
    name: string;
    description: string;
    price: number;
    costPrice: number;
  }>({
    name: "",
    description: "",
    price: 0,
    costPrice: 0,
  });
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [completedServices, setCompletedServices] = useState<CompletedServiceAppointment[]>([]);
  const [hideCostPrice, setHideCostPrice] = useState(true);
  const [hiddenTemplateIds, setHiddenTemplateIds] = useState<Set<string>>(new Set());
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [hideTarget, setHideTarget] = useState<Service | null>(null);
  const [isHidingTemplate, setIsHidingTemplate] = useState(false);
  
  // Fetch all services and completed service appointments when modal opens
  // Filter cart items on render instead of in useEffect for better performance
  useEffect(() => {
    if (open) {
      (async () => {
        try {
          const hiddenRaw = await window.api.database.options.get(HIDDEN_SERVICE_TEMPLATES_OPTION_KEY);
          const hiddenIds = (() => {
            if (!hiddenRaw) return [];
            try {
              const parsed = JSON.parse(hiddenRaw);
              return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
            } catch {
              return [];
            }
          })();
          const hiddenSet = new Set<string>(hiddenIds);
          setHiddenTemplateIds(hiddenSet);

          const [services, completed] = await Promise.all([
            window.api.database.services.getAll(),
            window.api.database.serviceAppointments.getCompletedForCashier(),
          ]);
          setAllServices(services.filter((s: Service) => !hiddenSet.has(s.id)));
          setCompletedServices(completed);
        } catch {
          setHiddenTemplateIds(new Set());
          setAllServices([]);
          setCompletedServices([]);
        }
      })();
    }
  }, [open]); // Removed cart dependency - filter during render instead

  const confirmHideTemplate = async () => {
    if (!hideTarget) return;
    if (isHidingTemplate) return;

    setIsHidingTemplate(true);
    try {
      const next = new Set(hiddenTemplateIds);
      next.add(hideTarget.id);
      await window.api.database.options.set(
        HIDDEN_SERVICE_TEMPLATES_OPTION_KEY,
        JSON.stringify(Array.from(next)),
      );
      setHiddenTemplateIds(next);
      setAllServices((prev) => prev.filter((s: Service) => s.id !== hideTarget.id));
      showToast(t("cashier.hideServiceTemplateSuccess", "Template hidden"), "success");
    } catch (error) {
      console.error("Failed to hide service template:", error);
      showToast(t("cashier.hideServiceTemplateError", "Failed to hide template"), "error");
    } finally {
      setIsHidingTemplate(false);
    }
  };
  
  // Filter completed services based on cart (computed during render)
  const availableCompletedServices = completedServices.filter((service) => {
    const serviceIdsInCart = cart
      .filter(item => item.isService && item.serviceId)
      .map(item => item.serviceId);
    return !serviceIdsInCart.includes(service.id);
  });

  const handleSelectService = (selectedService: Service) => {
    // For service templates, just pre-fill the form instead of adding directly to cart
    setService({
      name: selectedService.name,
      description: selectedService.description || "",
      price: 0, // Selling price - user enters it fresh each time
      costPrice: selectedService.costPrice || 0, // Use stored cost price from service
    });
    // Focus on selling price field after selection
    setTimeout(() => {
      servicePriceInputRef.current?.focus();
    }, 100);
  };

  const handleSelectCompletedService = (completedService: CompletedServiceAppointment) => {
    // Check if this service is already in the cart using ID
    const isAlreadyInCart = cart.some(item => 
      item.isService && item.serviceId === completedService.id
    );
    
    if (isAlreadyInCart) {
      showToast(t("cashier.serviceAlreadyInCart", "This service is already in your cart"), "error");
      return;
    }
    
    // Add service directly to cart with pre-filled prices and proper ID
    onAdd({
      id: `service-${Date.now()}`,
      serviceId: completedService.id, // Use the actual service ID
      name: completedService.name,
      price: completedService.servicePrice || 0,
      qty: 1,
      isService: true,
      description: completedService.description || undefined,
      serviceCostPrice: completedService.costPrice || 0,
    });
    
    // If service has a client, automatically select it in the cashier session
    if (completedService.client?.id && completedService.client?.name && onClientSelect) {
      onClientSelect(completedService.client.id, completedService.client.name);
    }
    
    // Refresh completed services count since this service is now being sold
    refreshCompletedServicesCount();
    
    onClose();
  };
  const [suggestions, setSuggestions] = useState<Service[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelectedSuggestion, setJustSelectedSuggestion] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const servicePriceInputRef = useRef<HTMLInputElement>(null);

  // Search for suggestions when name or description changes
  useEffect(() => {
    const searchSuggestions = async () => {
      if (!service.name.trim() && !service.description.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const query = service.name.trim() || service.description.trim();
        const results = await window.api.database.services.search(query);
        const filtered = results.filter((s: Service) => !hiddenTemplateIds.has(s.id));
        setSuggestions(filtered.slice(0, 2));
        // Only show suggestions if we haven't just selected one
        if (!justSelectedSuggestion) {
          setShowSuggestions(filtered.length > 0);
        }
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error("Error searching services:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [service.name, service.description, justSelectedSuggestion]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showSuggestions) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (selectedSuggestionIndex >= 0) {
            selectSuggestion(suggestions[selectedSuggestionIndex]);
          }
          break;
        case "Escape":
          setShowSuggestions(false);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showSuggestions, selectedSuggestionIndex, suggestions]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        nameInputRef.current &&
        !nameInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectSuggestion = (suggestion: Service) => {
    setService((prev) => ({
      ...prev,
      name: suggestion.name,
      description: suggestion.description || "",
      price: 0, // Selling price - user enters it fresh each time
      costPrice: suggestion.costPrice || 0, // Use stored cost price from service
    }));
    // Close dropdown and reset selection
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Set flag to prevent immediate reopening
    setJustSelectedSuggestion(true);
    // Clear suggestions to prevent them from showing again
    setSuggestions([]);
    // Focus on selling price field after selection
    setTimeout(() => {
      servicePriceInputRef.current?.focus();
    }, 100);
  };

  const handleNameChange = (newValue: string) => {
    setService((p) => ({ ...p, name: newValue }));

    // If user is typing something completely different, reset the flag
    if (newValue.trim() !== service.name.trim()) {
      setJustSelectedSuggestion(false);
    }

    // Only show suggestions if there's text, suggestions, and haven't just selected one
    if (newValue.trim() && suggestions.length > 0 && !justSelectedSuggestion) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleNameFocus = () => {
    // Only show suggestions if we have text, suggestions, and haven't just selected one
    if (
      service.name.trim() &&
      suggestions.length > 0 &&
      !justSelectedSuggestion
    ) {
      setShowSuggestions(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.name.trim() || !service.price) return;

    // Validate price limits
    if (Number(service.price) > MAX_PRICE) {
      showToast(
        t("cashier.servicePriceTooLarge", "Service price is too large. Maximum allowed value is 2,147,483,647"),
        "error"
      );
      return;
    }

    if (Number(service.costPrice) > MAX_PRICE) {
      showToast(
        t("cashier.priceTooLarge", "Price is too large. Maximum allowed value is 2,147,483,647"),
        "error"
      );
      return;
    }

    onAdd({
      id: `service-${Date.now()}`,
      name: service.name,
      price: service.price,
      qty: 1,
      isService: true,
      description: service.description || undefined,
      serviceCostPrice: service.costPrice,
    });

    // Reset form
    setService({ name: "", description: "", price: 0, costPrice: 0 });
    setSuggestions([]);
    setShowSuggestions(false);
    setJustSelectedSuggestion(false);
    onClose();
  };

  const handleClose = () => {
    setService({ name: "", description: "", price: 0, costPrice: 0 });
    setSuggestions([]);
    setShowSuggestions(false);
    setJustSelectedSuggestion(false);
    onClose();
  };

  const hasServiceDraft =
    open &&
    (service.name.trim() !== "" ||
      service.description.trim() !== "" ||
      service.price !== 0 ||
      service.costPrice !== 0);

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      hasUnsavedChanges={hasServiceDraft}
      onDiscard={handleClose}
      title={t("cashier.addService", "Add Service")}
        subtitle={t("cashier.selectServiceDesc", "Click completed services to add directly to cart, or select templates to customize")}
      icon={<Plus className="w-5 h-5 text-blue-500" />}
      size="xl"
      className="max-w-7xl"
      onSubmit={handleSubmit}
      submitText={t("cashier.addToCart", "Add to Cart")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={!service.name.trim() || !service.price}
    >
      <div className="flex flex-row gap-8">
        {/* Left: Service Form */}
        <div className="w-[260px] min-w-0 space-y-4">
          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.serviceName", "Service Name")} *
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={service.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={handleNameFocus}
                placeholder={t(
                  "cashier.enterServiceName",
                  "Enter service name",
                )}
                required
              />
              {showSuggestions && (
                <div
                  ref={suggestionsRef}
                  className="absolute z-[9999] w-full top-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
                >
                  {isLoading ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {t("cashier.searching", "Searching...")}
                    </div>
                  ) : suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                          index === selectedSuggestionIndex ? "bg-muted/50" : ""
                        }`}
                        onClick={() => selectSuggestion(suggestion)}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {suggestion.name}
                          </div>
                          {suggestion.description && (
                            <div className="text-xs text-muted-foreground">
                              {suggestion.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      {t("cashier.noSuggestions", "No suggestions found")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Legend>

          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.description", "Description")}
            </label>
            <textarea
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              value={service.description}
              onChange={(e) =>
                setService((p) => ({ ...p, description: e.target.value }))
              }
              placeholder={t(
                "cashier.enterDescription",
                "Enter service description (optional)",
              )}
              rows={3}
            />
          </Legend>

          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.costPrice", "Cost Price")} *
            </label>
            <div className="flex items-center gap-2">
              <StyledNumberInput
                type={hideCostPrice ? "password" : "number"}
                value={service.costPrice}
                onChange={(val: number | "") =>
                  setService((p) => ({
                    ...p,
                    costPrice: val === "" ? 0 : val,
                  }))
                }
                min={0}
                placeholder="0"
              />
              <label className="flex items-center space-x-2 cursor-pointer text-sm text-muted-foreground whitespace-nowrap">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHideCostPrice(!hideCostPrice);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    hideCostPrice
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 hover:border-green-400 dark:border-gray-600 dark:hover:border-green-500'
                  }`}
                >
                  {hideCostPrice && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span 
                  className="text-xs select-none"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setHideCostPrice(!hideCostPrice);
                  }}
                >
                  {t("services.hideCostPrice", "Hide")}
                </span>
              </label>
            </div>
          </Legend>
          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.servicePrice", "Service Price")} *
            </label>
            <div className="w-full">
              <StyledNumberInput
                ref={servicePriceInputRef}
                value={service.price}
                onChange={(val: number | "") =>
                  setService((p) => ({
                    ...p,
                    price: val === "" ? 0 : val,
                  }))
                }
                min={0}
                placeholder="0"
              />
            </div>
          </Legend>
        </div>

        {/* Right: All Services List */}
        <div className="flex-1 bg-muted/40 rounded-lg p-4 overflow-y-auto border border-border h-[400px]">
          <div className="font-semibold text-base mb-3 text-foreground">
            {t("cashier.service", "Service")}{" "}
            {t("cashier.servicesList", "List")}
          </div>
          {completedServices.length === 0 && allServices.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-8">
              {t("cashier.noSuggestions", "No suggestions found")}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Completed Services Section - Show First */}
              {completedServices.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {t("cashier.completedServices", "Completed Services")}
                  </div>
                  <div className="grid grid-cols-3 gap-3 auto-rows-max">
                    {availableCompletedServices.map((srv) => (
                      <div
                        key={`completed-${srv.id}`}
                        className="p-3 border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 rounded-lg h-[80px] flex flex-col justify-between relative overflow-hidden w-full hover:border-green-400 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleSelectCompletedService(srv)}
                      >
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <div
                              className="font-medium text-sm break-words leading-tight min-h-[1rem] flex-1 overflow-hidden text-green-800 dark:text-green-200"
                              style={{
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                lineHeight: "1rem",
                              }}
                            >
                              {srv.name}
                            </div>
                            <span className="text-xs px-1.5 py-0.5 bg-green-600 text-white rounded-full whitespace-nowrap">
                              {t("cashier.completed", "Completed")}
                            </span>
                          </div>
                          {(srv.client || srv.description) && (
                            <div className="text-green-700 dark:text-green-300 text-xs truncate">
                              {srv.client 
                                ? (srv.description 
                                    ? `${srv.client.name} (${srv.description})`
                                    : srv.client.name)
                                : srv.description 
                                  ? `(${srv.description})`
                                  : null}
                            </div>
                          )}
                          <div className="text-green-600 dark:text-green-400 text-xs">
                            {srv.servicePrice > 0 ? `${srv.servicePrice} DA` : t("cashier.priceNotSet", "Price not set")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Services Section */}
              {allServices.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                    {t("cashier.serviceTemplates", "Service Templates")}
                  </div>
                  <div className="grid grid-cols-3 gap-3 auto-rows-max">
                    {allServices.map((srv) => (
                      <div
                        key={srv.id}
                        className="p-3 border rounded-lg h-[60px] flex flex-col justify-between relative overflow-hidden w-full bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleSelectService(srv)}
                      >
                        <button
                          type="button"
                          className="absolute top-1.5 right-1.5 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label={t("cashier.hideServiceTemplate", "Hide template")}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setHideTarget(srv);
                            setHideDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <div
                            className="font-medium text-sm break-words leading-tight min-h-[1rem] max-h-[1rem] flex-1 overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              lineHeight: "0.8rem",
                            }}
                          >
                            {srv.name}
                          </div>
                          {srv.description && (
                            <div className="text-muted-foreground text-xs truncate">
                              {srv.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={hideDialogOpen}
        onOpenChange={(nextOpen) => {
          setHideDialogOpen(nextOpen);
          if (!nextOpen) {
            setHideTarget(null);
            setIsHidingTemplate(false);
          }
        }}
        title={t("cashier.hideServiceTemplate", "Hide template")}
        message={t(
          "cashier.hideServiceTemplateConfirm",
          "Hide service template \"{{name}}\"? It will no longer appear in the list, but it will stay in your database so past sales keep their names.",
          { name: hideTarget?.name ?? "" },
        )}
        confirmText={t("cashier.hide", "Hide")}
        cancelText={t("common.cancel", "Cancel")}
        variant="danger"
        loading={isHidingTemplate}
        onConfirm={confirmHideTemplate}
        onCancel={() => setHideTarget(null)}
      />
    </FormModal>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <legend className="space-y-2 text-sm [&>label]:font-medium">
      {children}
    </legend>
  );
}
