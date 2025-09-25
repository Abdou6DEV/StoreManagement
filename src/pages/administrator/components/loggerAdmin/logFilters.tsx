import React from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../../lib/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../lib/components/select";
import { LogLevel } from "../../../../lib/logger/common";
import { FileStats } from "./types";

interface LogFiltersProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedLevel: LogLevel | "ALL";
  onLevelChange: (level: LogLevel | "ALL") => void;
  selectedProcess: "main" | "renderer" | "ALL";
  onProcessChange: (process: "main" | "renderer" | "ALL") => void;
  fileStats: FileStats | null;
  totalEntries: number;
  visibleEntries: number;
}

export const LogFilters: React.FC<LogFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedLevel,
  onLevelChange,
  selectedProcess,
  onProcessChange,
  fileStats,
  totalEntries,
  visibleEntries,
}) => {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <div>
        <Input
          placeholder={t("admin.logger.searchPlaceholder", "Search logs...")}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={selectedLevel}
          onValueChange={(value: string) =>
            onLevelChange(value as LogLevel | "ALL")
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.logger.allLevels", "All Levels")}</SelectItem>
            {Object.values(LogLevel).map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={selectedProcess}
          onValueChange={(value: string) =>
            onProcessChange(value as "main" | "renderer" | "ALL")
          }
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("admin.logger.allProcesses", "All")}</SelectItem>
            <SelectItem value="main">{t("admin.logger.mainProcess", "Main")}</SelectItem>
            <SelectItem value="renderer">{t("admin.logger.rendererProcess", "Renderer")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        {t("admin.logger.showingEntries", "Showing {visible} of {total} entries", { visible: visibleEntries, total: totalEntries })}
        {fileStats && (
          <div className="mt-1">
            {t("admin.logger.fileInfo", "File: {lines} lines, {size} KB", { 
              lines: fileStats.totalLines.toLocaleString(), 
              size: (fileStats.fileSize / 1024).toFixed(1) 
            })}
          </div>
        )}
      </div>
    </div>
  );
};
