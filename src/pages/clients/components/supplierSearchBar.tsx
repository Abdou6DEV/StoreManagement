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
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
      <input
        type="text"
        placeholder={t("suppliers.searchPlaceholder", "Search suppliers...")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border-2 border-primary/20 rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
    </div>
  );
}
