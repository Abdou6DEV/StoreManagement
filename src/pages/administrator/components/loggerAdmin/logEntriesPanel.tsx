import React from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "../../../../lib/components/scrollArea";
import { LogLevel } from "../../../../lib/logger/common";
import { FileStats, LogEntry } from "./types";
import { LogFilters } from "./logFilters";
import { LogEntryItem } from "./logEntryItem";
import { Pagination } from "./pagination";

interface LogEntriesPanelProps {
  allLogEntries: LogEntry[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedLevel: LogLevel | "ALL";
  onLevelChange: (level: LogLevel | "ALL") => void;
  selectedProcess: "main" | "renderer" | "ALL";
  onProcessChange: (process: "main" | "renderer" | "ALL") => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  entriesPerPage: number;
  fileStats: FileStats | null;
}

export const LogEntriesPanel: React.FC<LogEntriesPanelProps> = ({
  allLogEntries,
  searchTerm,
  onSearchChange,
  selectedLevel,
  onLevelChange,
  selectedProcess,
  onProcessChange,
  currentPage,
  onPageChange,
  entriesPerPage,
  fileStats,
}) => {
  const { t } = useTranslation();

  // Filter and paginate log entries
  const filteredAndPaginatedEntries = React.useMemo(() => {
    let filtered = allLogEntries;

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (entry) =>
          entry.message.toLowerCase().includes(searchLower) ||
          entry.context?.toLowerCase().includes(searchLower) ||
          entry.process.toLowerCase().includes(searchLower),
      );
    }

    // Filter by level
    if (selectedLevel !== "ALL") {
      filtered = filtered.filter((entry) => entry.level === selectedLevel);
    }

    // Filter by process
    if (selectedProcess !== "ALL") {
      filtered = filtered.filter((entry) => entry.process === selectedProcess);
    }

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / entriesPerPage);
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginated = filtered.slice(startIndex, endIndex);

    return {
      entries: paginated,
      totalEntries: filtered.length,
      totalPages,
      currentPage,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
    };
  }, [
    allLogEntries,
    searchTerm,
    selectedLevel,
    selectedProcess,
    currentPage,
    entriesPerPage,
  ]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t("admin.logger.logEntries")}</h3>

      <LogFilters
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        selectedLevel={selectedLevel}
        onLevelChange={onLevelChange}
        selectedProcess={selectedProcess}
        onProcessChange={onProcessChange}
        fileStats={fileStats}
        totalEntries={filteredAndPaginatedEntries.totalEntries}
        visibleEntries={filteredAndPaginatedEntries.entries.length}
      />

      <ScrollArea className="h-40">
        <div className="space-y-2 pr-4">
          {filteredAndPaginatedEntries.entries.map((entry, index) => (
            <LogEntryItem
              key={`${entry.timestamp}-${index}`}
              entry={entry}
              index={index}
            />
          ))}
          {filteredAndPaginatedEntries.entries.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.logger.noLogEntries", "No log entries to display")}</p>
          )}
        </div>
      </ScrollArea>

      <Pagination
        currentPage={filteredAndPaginatedEntries.currentPage}
        totalPages={filteredAndPaginatedEntries.totalPages}
        hasNextPage={filteredAndPaginatedEntries.hasNextPage}
        hasPrevPage={filteredAndPaginatedEntries.hasPrevPage}
        onPageChange={onPageChange}
      />
    </div>
  );
};
