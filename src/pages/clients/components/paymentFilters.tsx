import React from "react";
import { Input } from "../../../lib/components/input";
import { Filter, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaymentFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: "all" | "paid" | "unpaid";
  setStatusFilter: (value: "all" | "paid" | "unpaid") => void;
  typeFilter: "all" | "CREDIT" | "VERSEMENT";
  setTypeFilter: (value: "all" | "CREDIT" | "VERSEMENT") => void;
  dateFilter: "all" | "overdue" | "dueSoon" | "paid";
  setDateFilter: (value: "all" | "overdue" | "dueSoon" | "paid") => void;
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
          <select
            className="w-full px-3 py-2 border rounded-md bg-card"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">{t("clients.allStatus", "All Status")}</option>
            <option value="paid">{t("clients.paid", "Paid")}</option>
            <option value="unpaid">{t("clients.unpaid", "Unpaid")}</option>
          </select>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("clients.type", "Type")}
          </label>
          <select
            className="w-full px-3 py-2 border rounded-md bg-card"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
          >
            <option value="all">{t("clients.allTypes", "All Types")}</option>
            <option value="CREDIT">{t("clients.credits", "Credits")}</option>
            <option value="VERSEMENT">
              {t("clients.versements", "Versements")}
            </option>
          </select>
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t("clients.dateFilter", "Date Filter")}
          </label>
          <select
            className="w-full px-3 py-2 border rounded-md bg-card"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
          >
            <option value="all">{t("clients.allDates", "All Dates")}</option>
            <option value="overdue">{t("clients.overdue", "Overdue")}</option>
            <option value="dueSoon">{t("clients.dueSoon", "Due Soon")}</option>
            <option value="paid">{t("clients.paid", "Paid")}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default PaymentFilters;
