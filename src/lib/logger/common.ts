export enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
  TRACE = "TRACE",
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  maxFileSize: number;
  maxFiles: number;
  logToFile: boolean;
  logToConsole: boolean;
}
