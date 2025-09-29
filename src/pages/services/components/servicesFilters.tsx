import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Check,
  ChevronDown,
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
import { cn } from "../../../lib/utils";

interface ServicesFiltersProps {
  filters: {
    search: string;
    status: string;
    dateFilter: string;
  };
  itemsPerPage: number;
  onFilterChange: (key: string, value: any) => void;
  onItemsPerPageChange: (size: number) => void;
}

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "complete", label: "Complete" },
  { value: "incomplete", label: "Incomplete" },
];

const dateFilterOptions = [
  { value: "all", label: "All Dates" },
  { value: "overdue", label: "Overdue" },
  { value: "dueSoon", label: "Due Soon" },
];

export default function ServicesFilters({
  filters,
  itemsPerPage,
  onFilterChange,
  onItemsPerPageChange,
}: ServicesFiltersProps) {
  const { t } = useTranslation();
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [dateFilterDropdownOpen, setDateFilterDropdownOpen] = useState(false);

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
        <input
          type="text"
          placeholder={t("services.searchServiceNameOrType", "Search by service name or type...")}
          value={filters.search}
          onChange={(e) => onFilterChange("search", e.target.value)}
          className="px-3 py-1.5 rounded-md border-2 border-primary/20 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition max-w-[220px]"
          aria-label={t("services.searchServiceNameOrType", "Search by service name or type")}
        />

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
              {statusOptions.find(option => option.value === filters.status)?.label || "All Status"}
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
              className="px-3 py-1.5"
              aria-label={t("services.filterByDate", "Filter by date")}
            >
              {dateFilterOptions.find(option => option.value === filters.dateFilter)?.label || "All Dates"}
              <ChevronDown className="ml-2 w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[140px] p-0 z-50">
            <Command shouldFilter={false}>
              <CommandList>
                <CommandGroup>
                  {dateFilterOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        onFilterChange("dateFilter", option.value);
                        setDateFilterDropdownOpen(false);
                      }}
                    >
                      {option.label}
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
      </div>

    </div>
  );
}