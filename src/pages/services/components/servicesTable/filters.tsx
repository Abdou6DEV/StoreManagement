import { useTranslation } from "react-i18next";
import { Search, Filter, X } from "lucide-react";
import { Button } from "../../../../lib/components/button";
import { cn } from "../../../../lib/utils";
import type { ServiceTableFilters } from "./types";

interface FiltersProps {
  filters: ServiceTableFilters;
  onFilterChange: (key: keyof ServiceTableFilters, value: boolean | string) => void;
  serviceTypes: string[];
  activeFiltersSummary: string[];
}

export const Filters = ({ 
  filters, 
  onFilterChange, 
  serviceTypes, 
  activeFiltersSummary 
}: FiltersProps) => {
  const { t } = useTranslation();

  const clearAllFilters = () => {
    onFilterChange("search", "");
    onFilterChange("serviceType", "");
    onFilterChange("completed", false);
    onFilterChange("pending", false);
    onFilterChange("overdue", false);
  };

  return (
    <div className="space-y-4">
      {/* Search and Service Type Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder={t("services.searchServices", "Search service requests...")}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="sm:w-64">
          <select
            value={filters.serviceType}
            onChange={(e) => onFilterChange("serviceType", e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">{t("services.allTypes", "All Service Types")}</option>
            {serviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {t("common.filter", "Filter")}:
          </span>
        </div>

        <Button
          variant={filters.completed ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("completed", !filters.completed)}
          className="h-8"
        >
          {t("services.completed", "Completed")}
        </Button>

        <Button
          variant={filters.pending ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("pending", !filters.pending)}
          className="h-8"
        >
          {t("services.pending", "Pending")}
        </Button>

        <Button
          variant={filters.overdue ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange("overdue", !filters.overdue)}
          className="h-8"
        >
          {t("services.overdue", "Overdue")}
        </Button>

        {activeFiltersSummary.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            {t("common.clear", "Clear")}
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeFiltersSummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">
            {t("common.activeFilters", "Active filters")}:
          </span>
          {activeFiltersSummary.map((filter, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
            >
              {filter}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

