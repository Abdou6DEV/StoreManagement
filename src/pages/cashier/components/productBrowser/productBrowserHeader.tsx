import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductBrowserHeaderProps } from "./productBrowserTypes";

const ProductBrowserHeader: React.FC<ProductBrowserHeaderProps> = ({
  productFilter,
  setProductFilter,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedCategory,
  setSelectedCategory,
  categories,
  filterInputRef,
  tabsContainerRef,
  scrollTabs,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center mb-3">
      <div className="flex gap-2 w-full">
        <input
          ref={filterInputRef}
          type="text"
          placeholder={t("cashier.filterProducts", "Filter products...")}
          className="w-full px-3 py-2 rounded-md border-2 border-primary/20 bg-card text-foreground focus:outline-none"
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
        />
        <input
          type="number"
          min={0}
          placeholder={t("cashier.minPrice", "Minimum price")}
          className="w-24 px-3 py-2 rounded-md border-2 border-primary/20 bg-card text-foreground focus:outline-none"
          value={minPrice ?? ""}
          onChange={e => setMinPrice(e.target.value === "" ? undefined : Number(e.target.value))}
        />
        <input
          type="number"
          min={0}
          placeholder={t("cashier.maxPrice", "Maximum price")}
          className="w-24 px-3 py-2 rounded-md border-2 border-primary/20 bg-card text-foreground focus:outline-none"
          value={maxPrice ?? ""}
          onChange={e => setMaxPrice(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      </div>
      <div className="w-full flex items-center gap-2">
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition"
          onClick={() => scrollTabs("left")}
          tabIndex={-1}
          aria-label="Scroll categories left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="overflow-x-auto flex-1 max-w-[50vw]">
          <div
            ref={tabsContainerRef}
            className="flex gap-1 bg-muted rounded-md p-1 border border-border whitespace-nowrap min-w-full overflow-x-auto scrollbar-thin"
          >
            <button
              className={`px-3 py-1 rounded-md font-medium transition-colors text-sm ${
                selectedCategory === "All"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent"
              }`}
              onClick={() => setSelectedCategory("All")}
            >
              {t("cashier.all", "All")}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                className={`px-3 py-1 rounded-md font-medium transition-colors text-sm ${
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 text-primary hover:text-primary/80 transition"
          onClick={() => scrollTabs("right")}
          tabIndex={-1}
          aria-label="Scroll categories right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ProductBrowserHeader;
