import React from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { Input } from "../../../../lib/components/input";

interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  onSearchChange,
  placeholder,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-muted/20 rounded-lg p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
        <Input
          placeholder={placeholder || t("history.searchSales", "Search by products, clients, or sale ID...")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 text-sm border-2 border-primary/20 hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
        />
      </div>
    </div>
  );
};

export default SearchBar;
