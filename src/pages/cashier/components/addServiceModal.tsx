import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FormModal } from "../../../lib/components/Modal";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Plus } from "lucide-react";
import type { CartItem, Service } from "../../../types";

interface AddServiceModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (service: CartItem) => void;
}

export default function AddServiceModal({
  open,
  onClose,
  onAdd,
}: AddServiceModalProps) {
  const { t } = useTranslation();
  const [service, setService] = useState({
    name: "",
    description: "",
    price: 0,
  });
  const [suggestions, setSuggestions] = useState<Service[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
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
        setShowSuggestions(results.length > 0);
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
  }, [service.name, service.description]);

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
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    nameInputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!service.name.trim() || !service.price) return;

    onAdd({
      id: `service-${Date.now()}`,
      name: service.name,
      price: service.price,
      qty: 1,
      isService: true,
      description: service.description || undefined,
    });

    // Reset form
    setService({ name: "", description: "", price: 0 });
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  const handleClose = () => {
    setService({ name: "", description: "", price: 0 });
    setSuggestions([]);
    setShowSuggestions(false);
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={t("cashier.addService", "Add Service")}
      subtitle={t(
        "cashier.addServiceDesc",
        "Add a service to the cart",
      )}
      icon={<Plus className="w-5 h-5 text-blue-500" />}
      size="lg"
      className="max-w-md"
      onSubmit={handleSubmit}
      submitText={t("cashier.addToCart", "Add to Cart")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={!service.name.trim() || !service.price}
    >
      {/* Service Information Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
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
                onChange={(e) => {
                  setService((p) => ({ ...p, name: e.target.value }));
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
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
              placeholder={t("cashier.enterDescription", "Enter service description (optional)")}
              rows={3}
            />
          </Legend>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="space-y-4">
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {t("cashier.pricing", "Pricing Information")}
          </h3>
          <div className="grid grid-cols-1 gap-4">
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
