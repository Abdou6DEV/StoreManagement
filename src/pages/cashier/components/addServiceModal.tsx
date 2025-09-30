import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../lib/contexts/toastContext";
import { FormModal } from "../../../lib/components/modal";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Plus } from "lucide-react";
import type { CartItem } from "../../../types";
import type { Service } from "@prisma/client";

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
}

// Maximum value for INT column in SQLite (2^31 - 1)
const MAX_PRICE = 2147483647;

export default function AddServiceModal({
  open,
  onClose,
  onAdd,
  cart,
}: AddServiceModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
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
  
  // Fetch all services and completed service appointments when modal opens or cart changes
  useEffect(() => {
    if (open) {
      Promise.all([
        window.api.database.services.getAll(),
        window.api.database.serviceAppointments.getCompletedForCashier()
      ])
        .then(([services, completed]) => {
          setAllServices(services);
          
          // Filter out completed services that are already in the cart
          const servicesInCart = cart
            .filter(item => item.isService)
            .map(item => ({ name: item.name, description: item.description || '' }));
          
           const availableCompletedServices = completed.filter((service: CompletedServiceAppointment) => {
             return !servicesInCart.some(cartService => 
               cartService.name === service.name && 
               cartService.description === (service.description || '')
             );
           });
          
          setCompletedServices(availableCompletedServices);
        })
        .catch(() => {
          setAllServices([]);
          setCompletedServices([]);
        });
    }
  }, [open, cart]);

  const handleSelectService = (selectedService: Service) => {
    // For service templates, just pre-fill the form instead of adding directly to cart
    setService({
      name: selectedService.name,
      description: selectedService.description || "",
      price: selectedService.costPrice || 1000,
      costPrice: selectedService.costPrice || 1000,
    });
  };

  const handleSelectCompletedService = (completedService: CompletedServiceAppointment) => {
    // Check if this service is already in the cart
    const isAlreadyInCart = cart.some(item => 
      item.isService && 
      item.name === completedService.name && 
      (item.description || '') === (completedService.description || '')
    );
    
    if (isAlreadyInCart) {
      showToast(t("cashier.serviceAlreadyInCart", "This service is already in your cart"), "error");
      return;
    }
    
    // Add service directly to cart with pre-filled prices
    onAdd({
      id: `service-${Date.now()}`,
      name: completedService.name,
      price: completedService.servicePrice || 0,
      qty: 1,
      isService: true,
      description: completedService.description || undefined,
      serviceCostPrice: completedService.costPrice || 0,
    });
    
    onClose();
  };
  const [suggestions, setSuggestions] = useState<Service[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelectedSuggestion, setJustSelectedSuggestion] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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
        setSuggestions(results.slice(0, 2));
        // Only show suggestions if we haven't just selected one
        if (!justSelectedSuggestion) {
          setShowSuggestions(results.length > 0);
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
    }));
    // Close dropdown and reset selection
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    // Set flag to prevent immediate reopening
    setJustSelectedSuggestion(true);
    // Clear suggestions to prevent them from showing again
    setSuggestions([]);
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

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={t("cashier.addService", "Add Service")}
        subtitle={t("cashier.selectServiceDesc", "Click completed services to add directly to cart, or select templates to customize")}
      icon={<Plus className="w-5 h-5 text-blue-500" />}
      size="lg"
      className="max-w-5xl"
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
            <div className="w-full">
              <StyledNumberInput
                value={service.costPrice}
                onChange={(val) =>
                  setService((p) => ({
                    ...p,
                    costPrice: val === "" ? 0 : val,
                  }))
                }
                min={0}
                placeholder="0"
              />
            </div>
          </Legend>
          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.servicePrice", "Service Price")} *
            </label>
            <div className="w-full">
              <StyledNumberInput
                value={service.price}
                onChange={(val) =>
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
                    {completedServices.map((srv) => (
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
                          {srv.client && (
                            <div className="text-green-700 dark:text-green-300 text-xs truncate">
                              {srv.client.name}
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
