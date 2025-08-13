import { LogLevel } from "../../../../lib/logger/common";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  process: "main" | "renderer";
  userId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  maxFileSize: number;
  maxFiles: number;
  logToFile: boolean;
  logToConsole: boolean;
}

export interface FileStats {
  totalLines: number;
  fileSize: number;
}

export interface FilteredAndPaginatedEntries {
  entries: LogEntry[];
  totalEntries: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
