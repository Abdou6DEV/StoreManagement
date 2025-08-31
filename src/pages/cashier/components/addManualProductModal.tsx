import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FormModal } from "../../../lib/components/modal";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Plus } from "lucide-react";
import type { CartItem } from "../../../types";
import type { ManualProduct } from "@prisma/client";

interface AddManualProductModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (product: CartItem) => void;
}

export default function AddManualProductModal({
  open,
  onClose,
  onAdd,
}: AddManualProductModalProps) {
  const { t } = useTranslation();
  const [manualProduct, setManualProduct] = useState({
    name: "",
    type: "",
    sold: 0,
    costPrice: 0,
  });
  const [suggestions, setSuggestions] = useState<ManualProduct[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelectedSuggestion, setJustSelectedSuggestion] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search for suggestions when name or type changes
  useEffect(() => {
    const searchSuggestions = async () => {
      if (!manualProduct.name.trim() && !manualProduct.type.trim()) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const query = manualProduct.name.trim() || manualProduct.type.trim();
        const results = await window.api.database.manualProducts.search(query);
        setSuggestions(results.slice(0, 2));
        // Only show suggestions if we haven't just selected one
        if (!justSelectedSuggestion) {
          setShowSuggestions(results.length > 0);
        }
        setSelectedSuggestionIndex(-1);
      } catch (error) {
        console.error("Error searching manual products:", error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [manualProduct.name, manualProduct.type, justSelectedSuggestion]);

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

  const selectSuggestion = (suggestion: ManualProduct) => {
    setManualProduct((prev) => ({
      ...prev,
      name: suggestion.name,
      type: suggestion.type,
      costPrice: (suggestion as any).costPrice || 0,
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
    setManualProduct((p) => ({ ...p, name: newValue }));

    // If user is typing something completely different, reset the flag
    if (newValue.trim() !== manualProduct.name.trim()) {
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
      manualProduct.name.trim() &&
      suggestions.length > 0 &&
      !justSelectedSuggestion
    ) {
      setShowSuggestions(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !manualProduct.name.trim() ||
      !manualProduct.type.trim() ||
      !manualProduct.sold
    )
      return;

    onAdd({
      id: `manual-${Date.now()}`,
      name: manualProduct.name,
      price: manualProduct.sold,
      qty: 1,
      isManual: true,
      manualProductType: manualProduct.type,
      manualProductCostPrice: manualProduct.costPrice,
    });

    // Reset form
    setManualProduct({ name: "", type: "", sold: 0, costPrice: 0 });
    setSuggestions([]);
    setShowSuggestions(false);
    setJustSelectedSuggestion(false);
    onClose();
  };

  const handleClose = () => {
    setManualProduct({ name: "", type: "", sold: 0, costPrice: 0 });
    setSuggestions([]);
    setShowSuggestions(false);
    setJustSelectedSuggestion(false);
    onClose();
  };

  return (
    <FormModal
      open={open}
      onClose={handleClose}
      title={t("cashier.addManualProduct", "Add Manual Product")}
      subtitle={t(
        "cashier.addManualProductDesc",
        "Add a product that is not in your inventory",
      )}
      icon={<Plus className="w-5 h-5 text-green-500" />}
      size="lg"
      className="max-w-md"
      onSubmit={handleSubmit}
      submitText={t("cashier.addToCart", "Add to Cart")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={
        !manualProduct.name.trim() ||
        !manualProduct.type.trim() ||
        !manualProduct.sold
      }
    >
      {/* Product Information Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Legend>
            <label className="text-sm font-medium text-foreground">
              {t("cashier.productName", "Product Name")} *
            </label>
            <div className="relative">
              <input
                ref={nameInputRef}
                type="text"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                value={manualProduct.name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={handleNameFocus}
                placeholder={t(
                  "cashier.enterProductName",
                  "Enter product name",
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
                          <div className="text-xs text-muted-foreground">
                            {suggestion.type}
                          </div>
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
              {t("cashier.type", "Type")} *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              value={manualProduct.type}
              onChange={(e) =>
                setManualProduct((p) => ({ ...p, type: e.target.value }))
              }
              placeholder={t("cashier.enterType", "Enter product type")}
              required
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
          <div className="grid grid-cols-2 gap-4">
            <Legend>
              <label className="text-sm font-medium text-foreground">
                {t("cashier.costPrice", "Cost Price")} *
              </label>
              <div className="w-full">
                <StyledNumberInput
                  value={manualProduct.costPrice}
                  onChange={(val) =>
                    setManualProduct((p) => ({
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
                {t("cashier.soldPrice", "Sold Price")} *
              </label>
              <div className="w-full">
                <StyledNumberInput
                  value={manualProduct.sold}
                  onChange={(val) =>
                    setManualProduct((p) => ({
                      ...p,
                      sold: val === "" ? 0 : val,
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
