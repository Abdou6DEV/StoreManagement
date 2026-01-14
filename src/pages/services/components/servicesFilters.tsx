import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
  Calendar,
  Search,
} from "lucide-react";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";
import { Button } from "../../../lib/components/button";
import { BadgeNotification } from "../../../lib/components/badgeNotification";
import { DatePicker } from "../../../lib/components/datePicker";
import { Checkbox } from "../../../lib/components/checkbox";
import { cn } from "../../../lib/utils";

interface ServicesFiltersProps {
  filters: {
    search: string;
    status: string;
    dateFilter: string;
    startDate: string;
    endDate: string;
    hideProfit: boolean;
  };
  itemsPerPage: number;
  onFilterChange: (key: string, value: any) => void;
  onItemsPerPageChange: (size: number) => void;
  unseenOverdueCount?: number;
  unseenDueSoonCount?: number;
}

const getStatusOptions = (t: any) => [
  { value: "all", label: t("services.allStatus", "All Status") },
  { value: "complete", label: t("services.complete", "Complete") },
  { value: "incomplete", label: t("services.incomplete", "Incomplete") },
];

const getDateFilterOptions = (t: any) => [
  { value: "all", label: t("services.allDates", "All Dates") },
  { value: "overdue", label: t("services.overdue", "Overdue") },
  { value: "dueSoon", label: t("services.dueSoon", "Due Soon") },
];

export default function ServicesFilters({
  filters,
  itemsPerPage,
  onFilterChange,
  onItemsPerPageChange,
  unseenOverdueCount = 0,
  unseenDueSoonCount = 0,
}: ServicesFiltersProps) {
  const { t } = useTranslation();
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateFilterDropdownOpen, setDateFilterDropdownOpen] = useState(false);
  
  const statusOptions = getStatusOptions(t);
  const dateFilterOptions = getDateFilterOptions(t);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Items per page selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("services.itemsPerPage", "Items per page:")}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="px-3 py-1.5 min-w-[70px]"
                aria-label={t(
                  "services.selectItemsPerPage",
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

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={t("services.searchServiceNameOrType", "Search by service name or type...")}
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            className="pl-9 pr-3 py-1.5 rounded-md border-2 border-primary/20 bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition w-[310px]"
            aria-label={t("services.searchServiceNameOrType", "Search by service name or type")}
          />
        </div>

        {/* Status Filter */}
        <Popover
          open={statusDropdownOpen}
          onOpenChange={setStatusDropdownOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="px-3 py-1.5"
              aria-label={t("services.filterByStatus", "Filter by status")}
            >
              {statusOptions.find(option => option.value === filters.status)?.label || t("services.allStatus", "All Status")}
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-0 z-50">
            <Command shouldFilter={false}>
              <CommandList>
                <CommandGroup>
                  {statusOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onFilterChange("status", option.value);
                        setStatusDropdownOpen(false);
                      }}
                    >
                      {option.label}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          filters.status === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Date Filter */}
        <Popover
          open={dateFilterDropdownOpen}
          onOpenChange={setDateFilterDropdownOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="px-3 py-1.5 relative"
              aria-label={t("services.filterByDate", "Filter by date")}
            >
              <div className="flex items-center gap-2">
                {dateFilterOptions.find(option => option.value === filters.dateFilter)?.label || t("services.allDates", "All Dates")}
                {unseenOverdueCount > 0 && (
                  <BadgeNotification 
                    count={unseenOverdueCount} 
                    variant="red"
                    className="h-4 text-xs"
                  />
                )}
                {unseenOverdueCount === 0 && unseenDueSoonCount > 0 && (
                  <BadgeNotification 
                    count={unseenDueSoonCount} 
                    variant="orange"
                    className="h-4 text-xs"
                  />
                )}
              </div>
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[160px] p-0 z-50">
            <Command shouldFilter={false}>
              <CommandList>
                <CommandGroup>
                  {dateFilterOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onFilterChange("dateFilter", option.value);
                        // Clear date range when selecting predefined filters
                        if (option.value !== "all") {
                          onFilterChange("startDate", "");
                          onFilterChange("endDate", "");
                        }
                        setDateFilterDropdownOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {option.label}
                        {option.value === "overdue" && unseenOverdueCount > 0 && (
                          <BadgeNotification 
                            count={unseenOverdueCount} 
                            variant="red"
                            className="absolute top-1 right-3 z-10"
                          />
                        )}
                        {option.value === "dueSoon" && unseenDueSoonCount > 0 && (
                          <BadgeNotification 
                            count={unseenDueSoonCount} 
                            variant="orange"
                            className="absolute top-1 right-3 z-10"
                          />
                        )}
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          filters.dateFilter === option.value ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Date Range Selectors */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("history.from", "From")}:
            </span>
            <DatePicker
              value={filters.startDate}
              onChange={(date) => {
                onFilterChange("startDate", date);
                // Clear predefined date filter when using custom range
                if (filters.dateFilter !== "all") {
                  onFilterChange("dateFilter", "all");
                }
              }}
              placeholder={t("history.from", "From")}
              className="w-40 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t("history.to", "To")}:
            </span>
            <DatePicker
              value={filters.endDate}
              onChange={(date) => {
                onFilterChange("endDate", date);
                // Clear predefined date filter when using custom range
                if (filters.dateFilter !== "all") {
                  onFilterChange("dateFilter", "all");
                }
              }}
              placeholder={t("history.to", "To")}
              className="w-40 h-8 text-sm"
              min={filters.startDate || undefined}
            />
          </div>
        </div>
      </div>

      {/* Hide Profit Checkbox */}
      <Checkbox
        checked={filters.hideProfit}
        onChange={(checked) => onFilterChange("hideProfit", checked)}
        label={t("services.hideProfit", "Hide Profit")}
        color="cyan"
      />
    </div>
  );
}