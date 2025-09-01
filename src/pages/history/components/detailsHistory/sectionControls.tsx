import React from "react";
import SearchBar from "./searchBar";
import ViewToggle from "./viewToggle";

interface SectionControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  placeholder?: string;
}

const SectionControls: React.FC<SectionControlsProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  placeholder,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="w-80">
          <SearchBar
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            placeholder={placeholder}
          />
        </div>
        <ViewToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
      </div>
    </div>
  );
};

export default SectionControls;
