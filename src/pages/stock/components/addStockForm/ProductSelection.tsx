import React from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "../../../../lib/utils";
import type { Product } from "@prisma/client";
import type { AddStockFormState } from "../../../../types";

interface ProductSelectionProps {
  form: AddStockFormState;
  showProductDropdown: boolean;
  setShowProductDropdown: (show: boolean) => void;
  filteredProducts: Product[];
  setFilteredProducts: (products: Product[]) => void;
  dropdownProductSearch: string;
  setDropdownProductSearch: (search: string) => void;
  products: Product[];
  paginatedProducts: Product[];
  loadingMoreProducts: boolean;
  hasMoreProducts: boolean;
  handleLoadMoreProducts: () => void;
  onProductSelect: (product: Product) => void;
  onFormChange: (key: string, value: string | number | null) => void;
  onNextField?: () => void;
}

export default function ProductSelection({
  form,
  showProductDropdown,
  setShowProductDropdown,
  filteredProducts,
  setFilteredProducts,
  dropdownProductSearch,
  setDropdownProductSearch,
  products,
  paginatedProducts,
  loadingMoreProducts,
  hasMoreProducts,
  handleLoadMoreProducts,
  onProductSelect,
  onFormChange,
  onNextField,
}: ProductSelectionProps) {
  const { t } = useTranslation();
  
  // State for keyboard navigation
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  // Simple search function - limit initial results for performance
  const handleProductSearch = (value: string) => {
    onFormChange("name", value);
    
    if (value.trim()) {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(value.toLowerCase()) ||
        (product.codebar && product.codebar.toLowerCase().includes(value.toLowerCase()))
      );
      setFilteredProducts(filtered);
      setShowProductDropdown(true);
      setSelectedIndex(-1); // Reset selection when searching
    } else {
      setFilteredProducts([]);
      setShowProductDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Enhanced keyboard handler with arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showProductDropdown || flatProductList.length === 0) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < flatProductList.length - 1 ? prev + 1 : prev
        );
        // Auto-scroll to keep selected item visible
        setTimeout(() => scrollToSelectedItem(), 10);
        break;
      case "ArrowUp":
        if (!showProductDropdown || flatProductList.length === 0) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        // Auto-scroll to keep selected item visible
        setTimeout(() => scrollToSelectedItem(), 10);
        break;
      case "Enter":
        e.preventDefault();
        if (showProductDropdown && selectedIndex >= 0 && selectedIndex < flatProductList.length) {
          // Select the highlighted product
          selectProduct(flatProductList[selectedIndex]);
        } else {
          // Always move to next field when Enter is pressed
          setShowProductDropdown(false);
          if (onNextField) {
            onNextField();
          }
        }
        break;
      case "Escape":
        if (!showProductDropdown) return;
        e.preventDefault();
        setShowProductDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Smooth scroll function - animate to the selected item
  const scrollToSelectedItem = () => {
    if (selectedIndex >= 0) {
      const dropdown = document.querySelector('[data-product-dropdown]') as HTMLElement;
      const selectedElement = dropdown?.querySelector(`[data-product-index="${selectedIndex}"]`) as HTMLElement;
      
      if (dropdown && selectedElement) {
        const elementTop = selectedElement.offsetTop;
        const elementHeight = selectedElement.offsetHeight;
        const dropdownHeight = dropdown.clientHeight;
        const currentScrollTop = dropdown.scrollTop;
        
        // Calculate target scroll position (center the item)
        const targetScrollTop = elementTop - (dropdownHeight / 2) + (elementHeight / 2);
        const boundedTargetScrollTop = Math.max(0, Math.min(targetScrollTop, dropdown.scrollHeight - dropdownHeight));
        
        // Only scroll if we need to move
        if (Math.abs(currentScrollTop - boundedTargetScrollTop) > 5) {
          // Smooth scroll animation
          const startScrollTop = currentScrollTop;
          const distance = boundedTargetScrollTop - startScrollTop;
          const duration = 150; // 150ms for smooth animation
          const startTime = performance.now();
          
          const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            dropdown.scrollTop = startScrollTop + (distance * easeOut);
            
            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            }
          };
          
          requestAnimationFrame(animateScroll);
        }
      }
    }
  };

  // Enhanced product selection with auto-advance
  const selectProduct = (product: Product) => {
    onProductSelect(product);
    setShowProductDropdown(false);
    setSelectedIndex(-1);
    
    // Auto-advance to next field after selection
    setTimeout(() => {
      if (onNextField) {
        onNextField();
      }
    }, 100);
  };

  // Simple flat list for navigation and display
  const flatProductList = paginatedProducts;

  return (
    <div className="space-y-2">
      <label>{t("stock.product")}</label>
      <div className="relative">
        <input
          data-field="product-name"
          type="text"
          placeholder={t("stock.product")}
          value={form.name}
          onChange={(e) => handleProductSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (form.name.trim()) {
              setShowProductDropdown(true);
            }
          }}
          className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
          required
        />

                 {/* Simple flat suggestions dropdown with keyboard navigation */}
         {showProductDropdown && flatProductList.length > 0 && (
                       <div 
              data-product-dropdown
              className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
            >
             {flatProductList.map((product, index) => (
               <div
                 key={product.id}
                 data-product-index={index}
                 className={cn(
                   "px-4 py-2 cursor-pointer",
                   index === selectedIndex 
                     ? "bg-accent text-accent-foreground" 
                     : "hover:bg-accent/50"
                 )}
                 onClick={() => selectProduct(product)}
               >
                                   <div className="flex flex-col">
                    <span className="text-sm font-medium">{product.name}</span>
                    <span className="text-xs text-muted-foreground">{product.categoryName}</span>
                  </div>
               </div>
             ))}
            
            {hasMoreProducts && (
              <div className="px-4 py-2 border-t border-border">
                <div className="text-xs text-muted-foreground text-center mb-2">
                  Showing {paginatedProducts.length} of {filteredProducts.length} products
                </div>
                <button
                  onClick={handleLoadMoreProducts}
                  disabled={loadingMoreProducts}
                  className="w-full px-3 py-2 text-sm text-center text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  {loadingMoreProducts ? (
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin mr-2" />
                      {t("common.loading")}
                    </div>
                  ) : (
                    t("common.loadMore")
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
