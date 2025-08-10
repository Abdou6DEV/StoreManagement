import React from "react";
import { Input } from "../../../lib/components/input";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";

interface SearchBarProps {
  search: string;
  setSearch: (val: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ search, setSearch }) => {
  const { t } = useTranslation();
  return (
    <div className="relative max-w-xs">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary" />
      <Input
        type="text"
        placeholder={t("clients.search", "Search clients...")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="pl-10 border-2 border-primary/20 focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
};

export default SearchBar;
