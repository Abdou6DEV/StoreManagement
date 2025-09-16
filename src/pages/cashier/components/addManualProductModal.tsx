import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FormModal } from "../../../lib/components/modal";
import StyledNumberInput from "../../../lib/components/inputNumber";
import { Plus } from "lucide-react";
import type { CartItem } from "../../../types";
import type { ManualProduct } from "@prisma/client";
import { useToast } from "../../../lib/contexts/toastContext";

// Use ManualProduct directly since it already has costPrice
type ManualProductWithCost = ManualProduct & {
  codebar?: string;
};

// Type for inventory products from the database
interface InventoryProduct {
  id: string;
  name: string;
  categoryName: string;
  quantity: number;
  boughtPrice: number;
  sellingPrice: number;
  codebar: string;
  photo: string;
  createdAt: Date;
  updatedAt: Date;
}

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
  const { showToast } = useToast();
  const [manualProduct, setManualProduct] = useState({
    name: "",
    type: "",
    sold: 0,
    costPrice: 0,
    barcode: "",
  });
  const [addToStock, setAddToStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState<number | "">("");
  const [allManualProducts, setAllManualProducts] = useState<ManualProductWithCost[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingProductWarning, setExistingProductWarning] = useState<string | null>(null);
  
  // Helper function for safe price calculations with proper rounding
  const safePrice = (value: number | string | undefined): number => {
    const num = Number(value || 0);
    return Math.round(num * 100) / 100; // Rounds to 2 decimal places without string conversion
  };

  // Fetch all manual products when modal opens
  useEffect(() => {
    if (open) {
      window.api.database.manualProducts
        .getAll()
        .then(setAllManualProducts)
        .catch(() => setAllManualProducts([]));
    }
  }, [open]);

  // Check for existing products in inventory when name/type changes
  useEffect(() => {
    const checkExistingProduct = async () => {
      if (!addToStock || !manualProduct.name.trim() || !manualProduct.type.trim()) {
        setExistingProductWarning(null);
        return;
      }

      try {
        const existingProducts = await window.api.database.products.getAll();
        const existingProduct = existingProducts.find(
          (p: InventoryProduct) => 
            p.name.toLowerCase().trim() === manualProduct.name.toLowerCase().trim() &&
            p.categoryName.toLowerCase().trim() === manualProduct.type.toLowerCase().trim()
        );

        if (existingProduct) {
          setExistingProductWarning(
            t("cashier.productExistsWarning", `"${manualProduct.name}" already exists in inventory (${existingProduct.quantity} units)`)
          );
        } else {
          setExistingProductWarning(null);
        }
      } catch (error) {
        console.error("Error checking existing products:", error);
        setExistingProductWarning(null);
      }
    };

    const debounceTimer = setTimeout(checkExistingProduct, 500);
    return () => clearTimeout(debounceTimer);
  }, [manualProduct.name, manualProduct.type, addToStock, t]);

  const handleSelectManualProduct = (selectedProduct: ManualProductWithCost) => {
    setManualProduct((prev) => ({
      ...prev,
      name: selectedProduct.name || "",
      type: selectedProduct.type || "",
      costPrice: safePrice(selectedProduct.costPrice) || 0,
      barcode: selectedProduct.codebar || "",
    }));
  };
  const [suggestions, setSuggestions] = useState<ManualProductWithCost[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [justSelectedSuggestion, setJustSelectedSuggestion] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Search for suggestions when name or type changes
  useEffect(() => {
    let isCancelled = false;
    
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
        
        // Only update state if this search hasn't been cancelled
        if (!isCancelled) {
        setSuggestions(results.slice(0, 2));
        // Only show suggestions if we haven't just selected one
        if (!justSelectedSuggestion) {
          setShowSuggestions(results.length > 0);
        }
        setSelectedSuggestionIndex(-1);
        }
      } catch (error) {
        console.error("Error searching manual products:", error);
        if (!isCancelled) {
        setSuggestions([]);
        setShowSuggestions(false);
        }
      } finally {
        if (!isCancelled) {
        setIsLoading(false);
        }
      }
    };

    const debounceTimer = setTimeout(searchSuggestions, 300);
    return () => {
      clearTimeout(debounceTimer);
      isCancelled = true;
    };
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

  const selectSuggestion = (suggestion: ManualProductWithCost) => {
    setManualProduct((prev) => ({
      ...prev,
      name: suggestion.name,
      type: suggestion.type,
      costPrice: suggestion.costPrice || 0,
      barcode: suggestion.codebar || "",
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
    // Sanitize input - remove excessive whitespace and limit length
    const sanitizedValue = newValue.trim().slice(0, 100);

    setManualProduct((p) => {
    // If user is typing something completely different, reset the flag
      if (sanitizedValue !== p.name.trim()) {
      setJustSelectedSuggestion(false);
    }
      
      return { ...p, name: sanitizedValue };
    });

    // Only show suggestions if there's text, suggestions, and haven't just selected one
    if (sanitizedValue && suggestions.length > 0 && !justSelectedSuggestion) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isSubmitting) return;

    // Comprehensive validation - same as addStockForm
    if (!manualProduct.name.trim()) {
      showToast(t("cashier.nameRequired", "Product name is required"), "error");
      return;
    }

    if (!manualProduct.type.trim()) {
      showToast(t("cashier.typeRequired", "Product type is required"), "error");
      return;
    }

    if (!manualProduct.sold || Number(manualProduct.sold) <= 0) {
      showToast(
        t("cashier.soldPriceRequired", "Sold price is required and must be greater than 0"),
        "error"
      );
      return;
    }

    if (!manualProduct.costPrice || Number(manualProduct.costPrice) < 0) {
      showToast(
        t("cashier.costPriceRequired", "Cost price is required and must be 0 or greater"),
        "error"
      );
      return;
    }

    if (addToStock && (!stockQuantity || (typeof stockQuantity === "number" && stockQuantity <= 0))) {
      showToast(
        t("cashier.stockQuantityRequired", "Stock quantity is required and must be greater than 0"),
        "error"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // If user wants to add to stock, check if product already exists first
      if (addToStock) {
        try {
          // Check if product already exists in inventory
          const existingProducts = await window.api.database.products.getAll();
          const existingProduct = existingProducts.find(
            (p: InventoryProduct) => 
              p.name.toLowerCase().trim() === manualProduct.name.toLowerCase().trim() &&
              p.categoryName.toLowerCase().trim() === manualProduct.type.toLowerCase().trim()
          );

          if (existingProduct) {
            // Product already exists - ask user what to do
            const shouldUpdate = window.confirm(
              t(
                "cashier.productExists", 
                `Product "${manualProduct.name}" already exists in inventory. Do you want to add stock to the existing product instead of creating a new one?`
              )
            );

            if (shouldUpdate) {
              // Ensure the category exists (in case it was changed)
              await window.api.database.categories.ensure(manualProduct.type.trim());
              
              // Update existing product with new stock
              await window.api.database.products.update(existingProduct.id, {
                quantity: existingProduct.quantity + Number(stockQuantity),
                // Optionally update prices if they're different
                boughtPrice: safePrice(manualProduct.costPrice),
                sellingPrice: safePrice(manualProduct.sold),
              });
              
              showToast(
                t("cashier.stockUpdated", `Added ${stockQuantity} units to existing product "${manualProduct.name}"`),
                "success"
              );
            } else {
              // User chose not to update - continue as manual product only
              showToast(
                t("cashier.continuingAsManual", "Continuing as manual product only"),
                "info"
              );
              // Don't add to stock, just continue as manual
            }
          } else {
            // Product doesn't exist - create new one
            // First ensure the category exists
            await window.api.database.categories.ensure(manualProduct.type.trim());
            
            await window.api.database.products.add({
              name: manualProduct.name.trim(),
              categoryName: manualProduct.type.trim(),
              quantity: Number(stockQuantity),
              boughtPrice: safePrice(manualProduct.costPrice),
              sellingPrice: safePrice(manualProduct.sold),
              codebar: manualProduct.barcode.trim() || null, // Use entered barcode or null
              photo: null, // Empty photo for now
            });
            
            showToast(
              t("cashier.productAddedToStock", "Product added to stock successfully"),
              "success"
            );
          }
        } catch (error) {
          console.error("Error adding product to stock:", error);
          showToast(
            t("cashier.stockAddError", "Failed to add product to stock, but continuing with manual product"),
            "error"
          );
          // Continue with manual product even if stock addition fails
        }
      }

    onAdd({
      id: `manual-${Date.now()}`,
        name: manualProduct.name.trim(),
        price: safePrice(manualProduct.sold),
      qty: 1,
        isManual: !addToStock, // If added to stock, it's no longer manual
        manualProductType: manualProduct.type.trim(),
        manualProductCostPrice: safePrice(manualProduct.costPrice),
    });

      // Reset form
      setManualProduct({ name: "", type: "", sold: 0, costPrice: 0, barcode: "" });
      setAddToStock(false);
      setStockQuantity("");
      setSuggestions([]);
      setShowSuggestions(false);
      setJustSelectedSuggestion(false);
      onClose();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      showToast(
        t("cashier.submitError", "An error occurred while processing the request"),
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setManualProduct({ name: "", type: "", sold: 0, costPrice: 0, barcode: "" });
    setAddToStock(false);
    setStockQuantity("");
    setSuggestions([]);
    setShowSuggestions(false);
    setJustSelectedSuggestion(false);
    setExistingProductWarning(null);
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
      className="max-w-5xl"
      onSubmit={handleSubmit}
      submitText={t("cashier.addToCart", "Add to Cart")}
      cancelText={t("cashier.cancel", "Cancel")}
      submitDisabled={
        isSubmitting ||
        !manualProduct.name.trim() ||
        !manualProduct.type.trim() ||
        !manualProduct.sold ||
        (addToStock && (!stockQuantity || (typeof stockQuantity === "number" && stockQuantity <= 0)))
      }
    >
      <div className="flex flex-row gap-8">
        {/* Left: Product Form */}
        <div className="w-[260px] min-w-0 space-y-4 pl-2">
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
              onChange={(e) => {
                // Sanitize input - remove excessive whitespace and limit length
                const sanitizedValue = e.target.value.trim().slice(0, 50);
                setManualProduct((p) => ({ ...p, type: sanitizedValue }));
              }}
              placeholder={t("cashier.enterType", "Enter product type")}
              required
            />
          </Legend>

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
                      costPrice: val === "" ? 0 : safePrice(val),
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
                      sold: val === "" ? 0 : safePrice(val),
                    }))
                  }
                  min={0}
                  placeholder="0"
                />
              </div>
            </Legend>

          {/* Stock Addition Section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="checkbox"
                id="addToStock"
                checked={addToStock}
                onChange={(e) => setAddToStock(e.target.checked)}
                className="w-4 h-4 text-primary bg-background rounded transition-colors"
              />
              <label htmlFor="addToStock" className="text-sm font-medium text-foreground">
                {t("cashier.addToStock", "Add to Stock")}
              </label>
            </div>
            
            {/* Existing Product Warning */}
            {existingProductWarning && (
              <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-yellow-200 dark:bg-yellow-800/50 flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-yellow-800 dark:text-yellow-200 text-sm font-medium leading-relaxed">
                    {existingProductWarning}
                  </div>
                </div>
              </div>
            )}
            {addToStock && (
              <>
                <Legend>
                  <label className="text-sm font-medium text-foreground">
                    {t("cashier.stockQuantity", "Stock Quantity")} *
                  </label>
                  <div className="w-full">
                    <StyledNumberInput
                      value={stockQuantity}
                      onChange={(val) =>
                        setStockQuantity(val)
                      }
                      min={1}
                      placeholder={t("cashier.enterQuantity", "أدخل الكمية")}
                    />
                  </div>
                </Legend>

                <Legend>
                  <label className="text-sm font-medium text-foreground">
                    {t("cashier.barcode", "Barcode")}
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={manualProduct.barcode}
                    onChange={(e) => {
                      // Sanitize input - remove excessive whitespace and limit length
                      const sanitizedValue = e.target.value.trim().slice(0, 50);
                      setManualProduct((p) => ({ ...p, barcode: sanitizedValue }));
                    }}
                    placeholder={t("cashier.enterBarcode", "Enter barcode (optional)")}
                  />
                </Legend>
              </>
            )}
          </div>
        </div>

        {/* Right: All Manual Products List */}
        <div className="flex-1 bg-muted/40 rounded-lg p-4 overflow-y-auto border border-border h-[400px]">
          <div className="font-semibold text-base mb-3 text-foreground">
            {t("cashier.manualProduct", "Manual Product")}{" "}
            {t("cashier.productsList", "List")}
          </div>
          {allManualProducts.length === 0 ? (
            <div className="text-muted-foreground text-sm text-center py-8">
              {t("cashier.noSuggestions", "No suggestions found")}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 auto-rows-max">
              {allManualProducts.map((product) => (
                <div
                  key={product.id}
                  className="p-3 border rounded-lg h-[60px] flex flex-col justify-between relative overflow-hidden w-full bg-card hover:border-primary hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectManualProduct(product)}
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
                      {product.name}
                    </div>
                    <div className="text-muted-foreground text-xs truncate">
                      {product.type}
                    </div>
                  </div>
                </div>
              ))}
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
