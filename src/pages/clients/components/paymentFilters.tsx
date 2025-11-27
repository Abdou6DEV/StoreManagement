import React from "react";
import { Filter, ChevronDown, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/components/button";
import { BadgeNotification } from "../../../lib/components/badgeNotification";
import { useOverduePayments } from "../../../lib/contexts/overduePaymentsContext";
import { useDueSoonPayments } from "../../../lib/contexts/dueSoonPaymentsContext";
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
import ClientSearchInput from "./clientSearchInput";

interface PaymentFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: "all" | "paid" | "unpaid";
  setStatusFilter: (value: "all" | "paid" | "unpaid") => void;
  typeFilter: "all" | "CREDIT" | "VERSEMENT";
  setTypeFilter: (value: "all" | "CREDIT" | "VERSEMENT") => void;
  dateFilter: "all" | "overdue" | "dueSoon";
  setDateFilter: (value: "all" | "overdue" | "dueSoon") => void;
  clients: Array<{ id: string; name: string; phone?: string | null }>;
  selectedClientId: string | null;
  onSelectClient: (client: { id: string; name: string }) => void;
  onClearSelectedClient: () => void;
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
  clients,
  selectedClientId,
  onSelectClient,
  onClearSelectedClient,
}) => {
  const { t } = useTranslation();
  const { unseenOverdueCreditsCount, unseenOverdueVersementsCount } = useOverduePayments();
  const { unseenDueSoonCreditsCount, unseenDueSoonVersementsCount } = useDueSoonPayments();

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
          <ClientSearchInput
            value={search}
            onChange={(value) => setSearch(value)}
            clients={clients}
            selectedClientId={selectedClientId}
            onSelectClient={(client) => onSelectClient(client)}
            onClearSelection={onClearSelectedClient}
            placeholder={t(
              "clients.searchPayments",
              "Search by client name or phone...",
            )}
          />
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
            <PopoverContent className="w-[250px] p-0 z-50">
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
            <PopoverContent className="w-[250px] p-0 z-50">
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
                className="w-full justify-between relative"
                aria-label={t("clients.selectDateFilter", "Select date filter")}
              >
                <div className="flex items-center gap-2">
                  {dateFilter === "all"
                    ? t("clients.allDates", "All Dates")
                    : dateFilter === "overdue"
                      ? t("clients.overdue", "Overdue")
                      : t("clients.dueSoon", "Due Soon")}
                </div>
                {(() => {
                  const hasRedBadge = (unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0);
                  const hasOrangeBadge = (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0);
                  
                  if (hasRedBadge) {
                    return <BadgeNotification count={unseenOverdueCreditsCount + unseenOverdueVersementsCount} />;
                  } else if (hasOrangeBadge) {
                    return <BadgeNotification count={unseenDueSoonCreditsCount + unseenDueSoonVersementsCount} variant="orange" />;
                  }
                  return null;
                })()}
                <ChevronDown className="ml-2 w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 z-50">
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
                      className="relative"
                    >
                      <div className="flex items-center justify-between w-full pr-6">
                        <span>{t("clients.overdue", "Overdue")}</span>
                        {(unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) && (
                          <BadgeNotification 
                            count={unseenOverdueCreditsCount + unseenOverdueVersementsCount} 
                            variant="red" 
                            className="absolute top-1 right-3 z-10"
                          />
                        )}
                      </div>
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
                      className="relative"
                    >
                      <div className="flex items-center justify-between w-full pr-6">
                        <span>{t("clients.dueSoon", "Due Soon")}</span>
                        {(unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0) && (
                          <BadgeNotification 
                            count={unseenDueSoonCreditsCount + unseenDueSoonVersementsCount} 
                            variant="orange" 
                            className="absolute top-1 right-3 z-10"
                          />
                        )}
                      </div>
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
