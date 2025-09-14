import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  QrCode,
  Filter,
  X,
} from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../lib/components/popover";
import { Button } from "../../../../lib/components/button";
import { Tooltip } from "../../../../lib/components/tooltip";
import { cn } from "../../../../lib/utils";
import {
  handleTooltipEnter,
  handleTooltipLeave,
} from "../../../../lib/utils/tooltipUtils";
import { useLowStock } from "../../../../lib/contexts/lowStockContext";
import { BadgeNotification } from "../../../../lib/components/badgeNotification";
import type { FiltersProps } from "./types";

export const Filters = ({
  filters,
  viewMode,
  categories,
  itemsPerPage,
  onFilterChange,
  onItemsPerPageChange,
  onToggleFilter,
  onRemoveFilter,
  getActiveFilterCount,
  getActiveFiltersSummary,
}: FiltersProps) => {
  const { t } = useTranslation();
  const { unseenLowStockCount, markLowStockAsSeen } = useLowStock();
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Items per page selector - shown in both views */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("stock.itemsPerPage", "Items per page:")}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="px-3 py-1.5 min-w-[70px]"
                aria-label={t(
                  "stock.selectItemsPerPage",
                  "Select items per page",
                )}
              >
                {itemsPerPage}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[120px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    {[5, 10, 25, 50, 100].map((size) => (
                      <CommandItem
                        key={size}
                        value={size.toString()}
                        onSelect={() => {
                          onItemsPerPageChange(size);
                        }}
                      >
                        {size}
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            itemsPerPage === size ? "opacity-100" : "opacity-0",
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search input - shown in both views */}
        <input
          type="text"
          placeholder={
            viewMode === "product"
              ? t("stock.searchProductNameOrBarcode", "Search by product name or barcode...")
              : t("stock.searchCategory", "Search categories...")
          }
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="px-3 py-1.5 rounded-md border-2 border-primary/20 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition max-w-[220px]"
          aria-label={t("stock.searchProductNameOrBarcode", "Search by product name or barcode")}
        />

        {/* Category Filter Dropdown - only in product view */}
        {viewMode === "product" && (
          <Popover
            open={categoryDropdownOpen}
            onOpenChange={(open) => {
              setCategoryDropdownOpen(open);
              if (open) setCategorySearch(""); // Reset search when opening
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="px-3 py-1.5"
                aria-label={t("stock.filterByCategory", "Filter by category")}
              >
                {filters.category
                  ? filters.category
                  : t("stock.allCategories", "All Categories")}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t("stock.searchType")}
                  className="h-9"
                  value={categorySearch}
                  onValueChange={setCategorySearch}
                />
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      key="all"
                      value=""
                      onSelect={() => onFilterChange("category", "")}
                    >
                      {t("stock.allCategories", "All Categories")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          !filters.category ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    {categories
                      .filter((cat) =>
                        cat
                          .toLowerCase()
                          .includes(categorySearch.toLowerCase()),
                      )
                      .map((cat) => (
                        <CommandItem
                          key={cat}
                          value={cat}
                          onSelect={() => onFilterChange("category", cat)}
                        >
                          {cat}
                          <Check
                            className={cn(
                              "ml-auto h-4 w-4",
                              filters.category === cat
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

        {/* Filters Section - only in product view */}
      {viewMode === "product" && (
        <Popover>
          <PopoverTrigger asChild>
            <div className="relative inline-block">
              <Button
                variant="outline"
                className="px-3 py-1.5 min-w-[120px] justify-start relative"
                aria-label={t("stock.filters", "Filters")}
                onMouseEnter={handleTooltipEnter}
                onMouseLeave={handleTooltipLeave}
              >
                <Filter className="w-4 h-4 mr-2" />
                {getActiveFilterCount() > 0 ? (
                  <div className="flex items-center gap-1 flex-wrap">
                    {getActiveFiltersSummary()
                      .slice(0, 2)
                      .map((filter, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                        >
                          {filter}
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveFilter(filter);
                            }}
                            className="ml-1 hover:bg-primary/20 rounded-full w-3 h-3 flex items-center justify-center cursor-pointer"
                          >
                            <X className="w-2 h-2" />
                          </span>
                        </span>
                      ))}
                    {getActiveFilterCount() > 2 && (
                      <span className="text-xs text-muted-foreground">
                        +{getActiveFilterCount() - 2}
                      </span>
                    )}
                  </div>
                ) : (
                  t("stock.filters", "Filters")
                )}
                <ChevronDown className="ml-auto w-4 h-4" />
                {unseenLowStockCount > 0 && (
                  <BadgeNotification count={unseenLowStockCount} />
                )}
              </Button>
              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full z-[9999] whitespace-nowrap px-2 py-1 rounded bg-black text-white dark:bg-white dark:text-black text-xs opacity-0 scale-95 transition-all duration-200">
                {t(
                  "stock.filtersTooltip",
                  "Filter products by various criteria",
                )}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 z-50">
            <div className="py-1">
              <Tooltip
                content={t(
                  "stock.lowStockTooltip",
                  "Show products with quantity below threshold",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "198px" }}
                  onClick={() => {
                    onToggleFilter("lowStock");
                    // Mark low stock products as seen when filter is activated
                    if (!filters.lowStock) {
                      markLowStockAsSeen();
                    }
                  }}
                >
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4",
                      filters.lowStock
                        ? "text-yellow-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.lowStock")}</span>
                  <div className="flex items-center gap-2">
                    {unseenLowStockCount > 0 && (
                      <BadgeNotification count={unseenLowStockCount} />
                    )}
                    {filters.lowStock && (
                      <Check className="w-4 h-4 text-yellow-600" />
                    )}
                  </div>
                </div>
              </Tooltip>
              <Tooltip
                content={t(
                  "stock.bestSellingTooltip",
                  "Show products with highest sales",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "198px" }}
                  onClick={() => onToggleFilter("bestSelling")}
                >
                  <TrendingUp
                    className={cn(
                      "w-4 h-4",
                      filters.bestSelling
                        ? "text-green-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.bestSelling")}</span>
                  {filters.bestSelling && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
              </Tooltip>
              <Tooltip
                content={t(
                  "stock.worstSellingTooltip",
                  "Show products with lowest sales",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "198px" }}
                  onClick={() => onToggleFilter("worstSelling")}
                >
                  <TrendingDown
                    className={cn(
                      "w-4 h-4",
                      filters.worstSelling
                        ? "text-red-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.worstSelling")}</span>
                  {filters.worstSelling && (
                    <Check className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </Tooltip>
              <Tooltip
                content={t(
                  "stock.noBarcodeTooltip",
                  "Show products without barcode",
                )}
                position="left"
              >
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent"
                  style={{ width: "100%", minWidth: "200px" }}
                  onClick={() => onToggleFilter("noBarcode")}
                >
                  <QrCode
                    className={cn(
                      "w-4 h-4",
                      filters.noBarcode
                        ? "text-orange-600"
                        : "text-muted-foreground",
                    )}
                  />
                  <span className="flex-1">{t("stock.noBarcode")}</span>
                  {filters.noBarcode && (
                    <Check className="w-4 h-4 text-orange-600" />
                  )}
                </div>
              </Tooltip>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
