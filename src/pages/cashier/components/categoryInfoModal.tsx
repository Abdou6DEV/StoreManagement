import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "../../../lib/components/modal";
import { Input } from "../../../lib/components/input";
import { Button } from "../../../lib/components/button";
import { DatePicker } from "../../../lib/components/datePicker";
import { Popover, PopoverContent, PopoverTrigger } from "../../../lib/components/popover";
import { Package, X, Clock } from "lucide-react";
import type { CartItem, CategoryInfo } from "../../../types";

interface CategoryInfoModalProps {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onSubmit: (infoMap: Record<string, CategoryInfo[]>) => void;
  cartItems: CartItem[];
  categoriesRequiringInfo: string[];
  allProducts: any[];
}

// Expand items by quantity - each unit needs its own form
interface ExpandedItem {
  itemId: string;
  name: string;
  unitIndex: number; // 1, 2, 3, etc.
  totalUnits: number;
}

export default function CategoryInfoModal({
  open,
  onClose,
  onSkip,
  onSubmit,
  cartItems,
  categoriesRequiringInfo,
  allProducts,
}: CategoryInfoModalProps) {
  const { t } = useTranslation();

  // Get products that require additional information - memoized to prevent infinite loops
  const productsRequiringInfo = React.useMemo(() => {
    return cartItems.filter((item) => {
      if (item.isManual || item.isService) return false;
      const product = allProducts.find((p) => p.id === item.id);
      return product && categoriesRequiringInfo.includes(product.categoryName || "");
    });
  }, [cartItems, allProducts, categoriesRequiringInfo]);

  // Expand items by quantity: iPhone (qty: 2) becomes 2 separate units - memoized
  const expandedItems: ExpandedItem[] = React.useMemo(() => {
    return productsRequiringInfo.flatMap((item) =>
      Array.from({ length: item.qty }, (_, i) => ({
        itemId: item.id,
        name: item.name,
        unitIndex: i + 1,
        totalUnits: item.qty,
      }))
    );
  }, [productsRequiringInfo]);

  // State: Map of itemId -> array of CategoryInfo (one per unit)
  const [categoryInfoMap, setCategoryInfoMap] = useState<Record<string, CategoryInfo[]>>({});

  // Initialize state when modal opens - use ref to prevent re-initialization on cart changes
  const lastProductsRef = React.useRef<string>("");
  
  React.useEffect(() => {
    if (open && productsRequiringInfo.length > 0) {
      // Create a stable key from products requiring info to detect if they actually changed
      const productsKey = productsRequiringInfo.map(item => `${item.id}:${item.qty}`).join(",");
      
      // Only initialize if products actually changed (first time opening or products changed)
      if (lastProductsRef.current !== productsKey) {
        const initialMap: Record<string, CategoryInfo[]> = {};
        productsRequiringInfo.forEach((item) => {
          initialMap[item.id] = Array.from({ length: item.qty }, () => ({
            imeiSerialNumber: "",
            warranty: "",
            usedNew: "new" as const,
            problemsReplacedParts: "",
            specifications: "",
          }));
        });
        setCategoryInfoMap(initialMap);
        lastProductsRef.current = productsKey;
      }
    }
    
    // Reset when modal closes
    if (!open) {
      lastProductsRef.current = "";
      setCategoryInfoMap({});
    }
  }, [open, productsRequiringInfo]); // productsRequiringInfo is memoized, so it should be stable

  const updateCategoryInfo = (
    itemId: string,
    unitIndex: number,
    updates: Partial<CategoryInfo>
  ) => {
    setCategoryInfoMap((prev) => {
      const itemInfo = [...(prev[itemId] || [])];
      itemInfo[unitIndex] = { ...itemInfo[unitIndex], ...updates };
      return { ...prev, [itemId]: itemInfo };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(categoryInfoMap);
  };

  const handleSkip = () => {
    onSkip();
  };

  const handleCancel = () => {
    onClose();
  };

  const totalUnits = expandedItems.length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={t("cashier.categoryInfoRequired", "Additional Information Required")}
      subtitle={t("cashier.categoryInfoDesc", "Please provide additional information for each unit")}
      icon={<Package className="w-6 h-6 text-blue-600" />}
      showFooter={false}
    >
      <div className="flex flex-col max-h-[80vh]">
        <div className="flex-1 overflow-y-auto space-y-6 px-2">
          {/* Products requiring info */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-sm mb-2">
              {t("cashier.productsRequiringInfo", "Products requiring additional information")}:
            </h4>
            <div className="space-y-1">
              {productsRequiringInfo.map((item) => (
                <div key={item.id} className="text-sm text-muted-foreground">
                  • {item.name} (x{item.qty} {t("cashier.units", "units")})
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" id="category-info-form">
          {/* Form for each unit */}
          {expandedItems.map((expandedItem, idx) => {
            const unitInfo = categoryInfoMap[expandedItem.itemId]?.[expandedItem.unitIndex - 1] || {
              imeiSerialNumber: "",
              warranty: "",
              usedNew: "new" as const,
              problemsReplacedParts: "",
            };

            return (
              <div key={`${expandedItem.itemId}-${expandedItem.unitIndex}`} className="border border-border rounded-lg p-4 space-y-4">
                {/* Unit Header */}
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <h4 className="font-medium text-sm">
                    {expandedItem.totalUnits > 1
                      ? `${expandedItem.name} - ${t("cashier.unit", "Unit")} ${expandedItem.unitIndex}/${expandedItem.totalUnits}`
                      : expandedItem.name}
                  </h4>
                </div>

                {/* IMEI/Serial Number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("cashier.imeiSerialNumber", "IMEI/Serial Number")}
                  </label>
                  <Input
                    value={unitInfo.imeiSerialNumber || ""}
                    onChange={(e) =>
                      updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                        imeiSerialNumber: e.target.value,
                      })
                    }
                    placeholder={t("cashier.imeiSerialNumberPlaceholder", "Enter IMEI or serial number")}
                  />
                </div>

                {/* Warranty */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("cashier.warranty", "Warranty")}
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <DatePicker
                        value={unitInfo.warranty || ""}
                        onChange={(date) =>
                          updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                            warranty: date,
                          })
                        }
                        placeholder={t("cashier.warrantyPlaceholder", "Select warranty date")}
                      />
                    </div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          className="px-3"
                          title={t("cashier.quickWarrantyOptions", "Quick warranty options")}
                        >
                          <Clock className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="start">
                        <div className="space-y-1">
                          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                            {t("cashier.quickOptions", "Quick Options")}
                          </div>
                          {[
                            { label: t("cashier.warranty7Days", "7 days"), days: 7 },
                            { label: t("cashier.warranty15Days", "15 days"), days: 15 },
                            { label: t("cashier.warranty1Month", "1 month"), days: 30 },
                            { label: t("cashier.warranty2Months", "2 months"), days: 60 },
                            { label: t("cashier.warranty3Months", "3 months"), days: 90 },
                            { label: t("cashier.warranty6Months", "6 months"), days: 180 },
                            { label: t("cashier.warranty12Months", "12 months"), days: 365 },
                          ].map((option) => (
                            <button
                              key={option.days}
                              type="button"
                              onClick={() => {
                                const warrantyDate = new Date();
                                warrantyDate.setDate(warrantyDate.getDate() + option.days);
                                const formattedDate = warrantyDate.toISOString().split("T")[0];
                                updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                                  warranty: formattedDate,
                                });
                              }}
                              className="w-full text-left px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Used/New */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("cashier.condition", "Condition")}
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() =>
                          updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                            usedNew: "new",
                          })
                        }
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          unitInfo.usedNew === "new"
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500'
                        }`}
                      >
                        {unitInfo.usedNew === "new" && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <span className="text-sm">{t("cashier.new", "New")}</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <button
                        type="button"
                        onClick={() =>
                          updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                            usedNew: "used",
                          })
                        }
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          unitInfo.usedNew === "used"
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500'
                        }`}
                      >
                        {unitInfo.usedNew === "used" && (
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <span className="text-sm">{t("cashier.used", "Used")}</span>
                    </label>
                  </div>
                </div>

                {/* Problems/Replaced Parts */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("cashier.problemsReplacedParts", "Problems/Replaced Parts")}
                  </label>
                  <textarea
                    value={unitInfo.problemsReplacedParts || ""}
                    onChange={(e) =>
                      updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                        problemsReplacedParts: e.target.value,
                      })
                    }
                    placeholder={t("cashier.problemsReplacedPartsPlaceholder", "Describe any problems or replaced parts")}
                    className="w-full min-h-[80px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={3}
                    disabled={unitInfo.usedNew === "new"}
                  />
                </div>

                {/* Specifications */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {t("cashier.specifications", "Specifications")}
                  </label>
                  <textarea
                    value={unitInfo.specifications || ""}
                    onChange={(e) =>
                      updateCategoryInfo(expandedItem.itemId, expandedItem.unitIndex - 1, {
                        specifications: e.target.value,
                      })
                    }
                    placeholder={t("cashier.specificationsPlaceholder", "ROM/RAM\nProcessor\nBattery Capacity\nScreen Size\nOperating System")}
                    className="w-full min-h-[150px] px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    rows={6}
                  />
                </div>

                {/* Separator between units */}
                {idx < expandedItems.length - 1 && (
                  <div className="border-t border-border pt-4" />
                )}
              </div>
            );
          })}

          </form>
        </div>
        
        {/* Action Buttons - Fixed footer */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 mt-4 border-t bg-background -mx-6 -mb-6 px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="w-full sm:w-auto"
          >
            <X className="w-4 h-4 mr-2" />
            {t("cashier.cancel", "Cancel")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSkip}
            className="w-full sm:w-auto"
          >
            {t("cashier.skip", "Skip")}
          </Button>
          <Button
            type="submit"
            form="category-info-form"
            className="w-full sm:w-auto"
          >
            {t("cashier.submit", "Submit")} ({totalUnits} {t("cashier.units", "units")})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
