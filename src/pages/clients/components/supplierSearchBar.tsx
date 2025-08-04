import React from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SupplierSearchBarProps {
  search: string;
  setSearch: (search: string) => void;
}

export default function SupplierSearchBar({
  search,
  setSearch,
}: SupplierSearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        type="text"
        placeholder={t("suppliers.searchPlaceholder", "Search suppliers...")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-card text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
      />
    </div>
  );
}
