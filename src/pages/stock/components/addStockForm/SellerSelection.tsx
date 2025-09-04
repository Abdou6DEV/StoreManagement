import React from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../../lib/utils";

interface SellerSelectionProps {
  form: any;
  showSellerDropdown: boolean;
  setShowSellerDropdown: (show: boolean) => void;
  sellers: Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }>;
  filteredSellers: Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }>;
  setFilteredSellers: (sellers: Array<{
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }>) => void;
  dropdownSellerSearch: string;
  setDropdownSellerSearch: (search: string) => void;
  onSellerSelect: (sellerId: string) => void;
  onFormChange: (key: string, value: any) => void;
  onNextField?: () => void;
  onFieldFocus?: () => void;
}

export default function SellerSelection({
  form,
  showSellerDropdown,
  setShowSellerDropdown,
  sellers,
  filteredSellers,
  setFilteredSellers,
  dropdownSellerSearch,
  setDropdownSellerSearch,
  onSellerSelect,
  onFormChange,
  onNextField,
  onFieldFocus,
}: SellerSelectionProps) {
  const { t } = useTranslation();
  
  // State for keyboard navigation
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  // No global handler - let the local handler do its job

  // Enhanced search function with keyboard navigation reset
  const handleSellerSearch = (value: string) => {
    onFormChange("sellerName", value);
    
    // Always filter from ALL sellers, never lock to current selection
    if (value.trim()) {
      const filtered = sellers.filter(s => 
        s.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSellers(filtered);
      setShowSellerDropdown(true);
      setSelectedIndex(-1); // Reset selection when searching
    } else {
      setFilteredSellers([]);
      setShowSellerDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Enhanced keyboard handler with arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showSellerDropdown || filteredSellers.length === 0) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSellers.length - 1 ? prev + 1 : prev
        );
        // Auto-scroll to keep selected item visible
        setTimeout(() => scrollToSelectedItem(), 10);
        break;
      case "ArrowUp":
        if (!showSellerDropdown || filteredSellers.length === 0) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        // Auto-scroll to keep selected item visible
        setTimeout(() => scrollToSelectedItem(), 10);
        break;
      case "Enter":
        e.preventDefault();
        if (showSellerDropdown && selectedIndex >= 0 && selectedIndex < filteredSellers.length) {
          // Select the highlighted seller
          selectSeller(filteredSellers[selectedIndex]);
        } else {
          // Always move to next field when Enter is pressed
          setShowSellerDropdown(false);
          if (onNextField) {
            onNextField();
          }
        }
        break;
      case "Escape":
        if (!showSellerDropdown) return;
        e.preventDefault();
        setShowSellerDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Smooth scroll function - animate to the selected item
  const scrollToSelectedItem = () => {
    if (selectedIndex >= 0) {
      const dropdown = document.querySelector('[data-seller-dropdown]') as HTMLElement;
      const selectedElement = dropdown?.querySelector(`[data-seller-index="${selectedIndex}"]`) as HTMLElement;
      
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

  // Enhanced seller selection with auto-advance
  const selectSeller = (seller: any) => {
    onSellerSelect(seller.id);
    onFormChange("sellerName", seller.name);
    setShowSellerDropdown(false);
    setSelectedIndex(-1);
    // DON'T lock the field - user can still type and change it
    
    // Auto-advance to next field after selection
    setTimeout(() => {
      if (onNextField) {
        onNextField();
      }
    }, 100);
  };

  return (
    <div className="space-y-2">
      <label>{t("stock.seller")}</label>
      <div className="relative">
                 <input
           data-field="seller-name"
           type="text"
           placeholder={t("stock.seller")}
           value={form.sellerName}
           onChange={(e) => handleSellerSearch(e.target.value)}
           onKeyDown={handleKeyDown}
           onFocus={() => {
             onFieldFocus?.();
             if (form.sellerName.trim()) {
               setShowSellerDropdown(true);
             }
           }}
           className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all"
         />
        
                                   {/* Enhanced suggestions dropdown with keyboard navigation and auto-scroll */}
          {showSellerDropdown && filteredSellers.length > 0 && (
                          <div 
                data-seller-dropdown
                className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
              >
             {filteredSellers.map((seller, index) => (
                               <div
                  key={seller.id}
                  data-seller-index={index}
                  className={cn(
                    "px-4 py-2 cursor-pointer",
                    index === selectedIndex 
                      ? "bg-accent text-accent-foreground" 
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => selectSeller(seller)}
                >
                 <div className="flex flex-col">
                   <span className="text-sm font-medium">{seller.name}</span>
                   {seller.phone && (
                     <span className="text-xs text-muted-foreground">
                       {seller.phone}
                     </span>
                   )}
                 </div>
               </div>
             ))}
           </div>
         )}
      </div>
    </div>
  );
}
