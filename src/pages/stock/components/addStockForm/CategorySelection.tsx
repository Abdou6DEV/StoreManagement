import React from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "../../../../lib/utils";

interface CategorySelectionProps {
  form: any;
  showCategoryDropdown: boolean;
  setShowCategoryDropdown: (show: boolean) => void;
  categories: string[]; // Changed from object array to string array
  filteredCategories: string[]; // Changed from object array to string array
  setFilteredCategories: (categories: string[]) => void; // Changed from object array to string array
  onCategorySelect: (category: string) => void; // Changed from object to string
  onFormChange: (key: string, value: any) => void;
  onNextField?: () => void;
  isExistingProduct: boolean;
}

export default function CategorySelection({
  form,
  showCategoryDropdown,
  setShowCategoryDropdown,
  categories,
  filteredCategories,
  setFilteredCategories,
  onCategorySelect,
  onFormChange,
  onNextField,
  isExistingProduct,
}: CategorySelectionProps) {
  const { t } = useTranslation();
  
  // State for keyboard navigation
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  // Enhanced search function with keyboard navigation reset
  const handleCategorySearch = (value: string) => {
    onFormChange("categoryName", value);
    
    if (value.trim()) {
      const filtered = categories.filter((category) =>
        category && category.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCategories(filtered);
      setShowCategoryDropdown(true);
      setSelectedIndex(-1); // Reset selection when searching
    } else {
      setFilteredCategories([]);
      setShowCategoryDropdown(false);
      setSelectedIndex(-1);
    }
  };

  // Enhanced keyboard handler with arrow navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        if (!showCategoryDropdown || filteredCategories.length === 0) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCategories.length - 1 ? prev + 1 : prev
        );
        // Auto-scroll to keep selected item visible
        setTimeout(() => scrollToSelectedItem(), 10);
        break;
      case "ArrowUp":
        if (!showCategoryDropdown || filteredCategories.length === 0) return;
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : prev
        );
        // Auto-scroll to keep selected item visible
        setTimeout(() => scrollToSelectedItem(), 10);
        break;
      case "Enter":
        e.preventDefault();
        if (showCategoryDropdown && selectedIndex >= 0 && selectedIndex < filteredCategories.length) {
          // Select the highlighted category
          selectCategory(filteredCategories[selectedIndex]);
        } else {
          // Always move to next field when Enter is pressed
          setShowCategoryDropdown(false);
          if (onNextField) {
            onNextField();
          }
        }
        break;
      case "Escape":
        if (!showCategoryDropdown) return;
        e.preventDefault();
        setShowCategoryDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Smooth scroll function - animate to the selected item
  const scrollToSelectedItem = () => {
    if (selectedIndex >= 0) {
      const dropdown = document.querySelector('[data-category-dropdown]') as HTMLElement;
      const selectedElement = dropdown?.querySelector(`[data-category-index="${selectedIndex}"]`) as HTMLElement;
      
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

  // Enhanced category selection with auto-advance
  const selectCategory = (category: string) => {
    onCategorySelect(category);
    setShowCategoryDropdown(false);
    setSelectedIndex(-1);
    
    // Auto-advance to next field after selection
    setTimeout(() => {
      if (onNextField) {
        onNextField();
      }
    }, 100);
  };

  return (
    <div className="space-y-2">
      <label className={isExistingProduct ? "text-muted-foreground" : ""}>
        {t("stock.type")}
      </label>
      <div className="relative">
        <input
          data-field="category-name"
          type="text"
          placeholder={t("stock.type")}
          value={form.categoryName}
          onChange={(e) => handleCategorySearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (!isExistingProduct && form.categoryName.trim()) {
              setShowCategoryDropdown(true);
            }
          }}
          className="w-full px-4 py-3 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-green-500/50 focus:border-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted/50"
          required
          disabled={isExistingProduct}
        />

        {/* Enhanced suggestions dropdown with keyboard navigation and auto-scroll */}
        {showCategoryDropdown && filteredCategories.length > 0 && (
          <div 
            data-category-dropdown
            className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
          >
            {filteredCategories.map((category, index) => (
              <div
                key={category}
                data-category-index={index}
                className={cn(
                  "px-4 py-2 cursor-pointer",
                  index === selectedIndex 
                    ? "bg-accent text-accent-foreground" 
                    : "hover:bg-accent/50"
                )}
                onClick={() => selectCategory(category)}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
