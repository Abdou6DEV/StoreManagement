import React from "react";
import { useTranslation } from "react-i18next";
import { Search, Filter } from "lucide-react";

interface ServiceAppointmentsFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: "all" | "upcoming" | "overdue" | "completed";
  onFilterChange: (type: "all" | "upcoming" | "overdue" | "completed") => void;
}

export default function ServiceAppointmentsFilters({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterChange,
}: ServiceAppointmentsFiltersProps) {
  const { t } = useTranslation();

  const filterOptions = [
    {
      value: "all" as const,
      label: t("services.allAppointments", "All Appointments"),
      count: null,
    },
    {
      value: "upcoming" as const,
      label: t("services.upcoming", "Upcoming"),
      count: null,
    },
    {
      value: "overdue" as const,
      label: t("services.overdue", "Overdue"),
      count: null,
    },
    {
      value: "completed" as const,
      label: t("services.completed", "Completed"),
      count: null,
    },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search Bar */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t("services.searchAppointments", "Search appointments...")}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {t("common.filter", "Filter")}:
          </span>
        </div>
        <div className="flex gap-1">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => onFilterChange(option.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterType === option.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {option.label}
              {option.count !== null && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}


