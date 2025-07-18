import React from "react";
import { Input } from "../../../lib/components/ui/input";
import { useTranslation } from "react-i18next";

interface SearchBarProps {
  search: string;
  setSearch: (val: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ search, setSearch }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <Input
        type="text"
        placeholder={t("clients.search", "Search clients...")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
    </div>
  );
};

export default SearchBar;
