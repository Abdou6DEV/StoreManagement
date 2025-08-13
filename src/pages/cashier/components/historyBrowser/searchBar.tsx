import React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "../../../../lib/components/input";
import { SearchBarProps } from "./types";

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  refreshing,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-muted/20">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
        <Input
          placeholder={t(
            "cashier.searchSalesOrScan",
            "Search sales or scan the receipt barcode...",
          )}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 text-sm border-2 border-primary/20 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        {refreshing && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
