import React from "react";
import { Input } from "../../../lib/components/input";
import { Filter, Search, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "../../../lib/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../lib/components/popover";
import { cn } from "../../../lib/utils";

interface PaymentFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: "all" | "paid" | "unpaid";
  setStatusFilter: (value: "all" | "paid" | "unpaid") => void;
  typeFilter: "all" | "CREDIT" | "VERSEMENT";
  setTypeFilter: (value: "all" | "CREDIT" | "VERSEMENT") => void;
  dateFilter: "all" | "overdue" | "dueSoon";
  setDateFilter: (value: "all" | "overdue" | "dueSoon") => void;
}

const PaymentFilters: React.FC<PaymentFiltersProps> = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  dateFilter,
  setDateFilter,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">{t("clients.filters", "Filters")}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("clients.search", "Search")}
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t(
                "clients.searchPayments",
                "Search by client name or phone...",
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("clients.status", "Status")}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-label={t("clients.selectStatus", "Select status")}
              >
                {statusFilter === "all"
                  ? t("clients.allStatus", "All Status")
                  : statusFilter === "paid"
                    ? t("clients.paid", "Paid")
                    : t("clients.unpaid", "Unpaid")}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setStatusFilter("all")}
                    >
                      {t("clients.allStatus", "All Status")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          statusFilter === "all" ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    <CommandItem
                      value="paid"
                      onSelect={() => setStatusFilter("paid")}
                    >
                      {t("clients.paid", "Paid")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          statusFilter === "paid" ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    <CommandItem
                      value="unpaid"
                      onSelect={() => setStatusFilter("unpaid")}
                    >
                      {t("clients.unpaid", "Unpaid")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          statusFilter === "unpaid"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("clients.type", "Type")}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-label={t("clients.selectType", "Select type")}
              >
                {typeFilter === "all"
                  ? t("clients.allTypes", "All Types")
                  : typeFilter === "CREDIT"
                    ? t("clients.credits", "Credits")
                    : t("clients.versements", "Versements")}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setTypeFilter("all")}
                    >
                      {t("clients.allTypes", "All Types")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          typeFilter === "all" ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    <CommandItem
                      value="CREDIT"
                      onSelect={() => setTypeFilter("CREDIT")}
                    >
                      {t("clients.credits", "Credits")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          typeFilter === "CREDIT" ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    <CommandItem
                      value="VERSEMENT"
                      onSelect={() => setTypeFilter("VERSEMENT")}
                    >
                      {t("clients.versements", "Versements")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          typeFilter === "VERSEMENT"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("clients.dateFilter", "Date Filter")}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
                aria-label={t("clients.selectDateFilter", "Select date filter")}
              >
                {dateFilter === "all"
                  ? t("clients.allDates", "All Dates")
                  : dateFilter === "overdue"
                    ? t("clients.overdue", "Overdue")
                    : t("clients.dueSoon", "Due Soon")}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 z-50">
              <Command shouldFilter={false}>
                <CommandList>
                  <CommandGroup>
                    <CommandItem
                      value="all"
                      onSelect={() => setDateFilter("all")}
                    >
                      {t("clients.allDates", "All Dates")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          dateFilter === "all" ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    <CommandItem
                      value="overdue"
                      onSelect={() => setDateFilter("overdue")}
                    >
                      {t("clients.overdue", "Overdue")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          dateFilter === "overdue"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                    <CommandItem
                      value="dueSoon"
                      onSelect={() => setDateFilter("dueSoon")}
                    >
                      {t("clients.dueSoon", "Due Soon")}
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          dateFilter === "dueSoon"
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default PaymentFilters;
