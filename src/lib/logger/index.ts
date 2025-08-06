import { app } from "electron";
import path from "path";
import fs from "fs";
import { LogLevel, LogEntry, LoggerConfig } from "./common";

// Extend the common interfaces for main process specific needs
interface MainLogEntry extends LogEntry {
  process: "main" | "renderer";
}

interface MainLoggerConfig extends LoggerConfig {
  logDir: string;
}

class Logger {
  private config: MainLoggerConfig;
  private logFilePath: string;
  private currentFileSize = 0;

  constructor(config?: Partial<MainLoggerConfig>) {
    this.config = {
      level: LogLevel.WARN,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      logToFile: true,
      logToConsole: true,
      logDir: path.join(app.getPath("userData"), "logs"),
      ...config,
    };

    this.logFilePath = path.join(this.config.logDir, "app.log");
    this.ensureLogDirectory();
    this.initializeLogFile();
    this.loadConfig(); // Load saved configuration
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDir)) {
      fs.mkdirSync(this.config.logDir, { recursive: true });
    }
  }

  private initializeLogFile(): void {
    if (!fs.existsSync(this.logFilePath)) {
      fs.writeFileSync(this.logFilePath, "");
    } else {
      const stats = fs.statSync(this.logFilePath);
      this.currentFileSize = stats.size;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = Object.values(LogLevel);
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private rotateLogFile(): void {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -5);
    const rotatedPath = path.join(this.config.logDir, `app-${timestamp}.log`);

    if (fs.existsSync(this.logFilePath)) {
      fs.renameSync(this.logFilePath, rotatedPath);
    }

    // Clean up old log files
    this.cleanupOldLogs();
  }

  private cleanupOldLogs(): void {
    const files = fs
      .readdirSync(this.config.logDir)
      .filter((file) => file.startsWith("app-") && file.endsWith(".log"))
      .map((file) => ({
        name: file,
        path: path.join(this.config.logDir, file),
        mtime: fs.statSync(path.join(this.config.logDir, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Keep only the most recent maxFiles
    if (files.length > this.config.maxFiles) {
      files.slice(this.config.maxFiles).forEach((file) => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error("Failed to delete old log file:", file.name, error);
        }
      });
    }
  }

  private writeToFile(entry: MainLogEntry): void {
    if (!this.config.logToFile) return;

    const logLine = JSON.stringify(entry) + "\n";
    const logLineSize = Buffer.byteLength(logLine, "utf8");

    // Check if we need to rotate the log file
    if (this.currentFileSize + logLineSize > this.config.maxFileSize) {
      this.rotateLogFile();
      this.currentFileSize = 0;
    }

    try {
      fs.appendFileSync(this.logFilePath, logLine);
      this.currentFileSize += logLineSize;
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  private writeToConsole(entry: MainLogEntry): void {
    if (!this.config.logToConsole) return;

    const timestamp = new Date(entry.timestamp).toLocaleString();
    const levelColor = this.getLevelColor(entry.level);
    const resetColor = "\x1b[0m";

    const consoleMessage = `${timestamp} [${levelColor}${entry.level}${resetColor}] [${entry.process}] ${entry.context ? `[${entry.context}] ` : ""}${entry.message}`;

    switch (entry.level) {
      case LogLevel.ERROR:
        console.error(consoleMessage);
        if (entry.data) console.error(entry.data);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        if (entry.data) console.warn(entry.data);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        if (entry.data) console.info(entry.data);
        break;
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        if (entry.data) console.debug(entry.data);
        break;
      case LogLevel.TRACE:
        console.trace(consoleMessage);
        if (entry.data) console.trace(entry.data);
        break;
    }
  }

  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return "\x1b[31m"; // Red
      case LogLevel.WARN:
        return "\x1b[33m"; // Yellow
      case LogLevel.INFO:
        return "\x1b[36m"; // Cyan
      case LogLevel.DEBUG:
        return "\x1b[35m"; // Magenta
      case LogLevel.TRACE:
        return "\x1b[37m"; // White
      default:
        return "\x1b[0m";
    }
  }

  log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    userId?: string,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: MainLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      process: "main",
      userId,
    };

    this.writeToFile(entry);
    this.writeToConsole(entry);
  }

  error(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.ERROR, message, context, data, userId);
  }

  warn(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.WARN, message, context, data, userId);
  }

  info(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.INFO, message, context, data, userId);
  }

  debug(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.DEBUG, message, context, data, userId);
  }

  trace(message: string, context?: string, data?: any, userId?: string): void {
    this.log(LogLevel.TRACE, message, context, data, userId);
  }

  // Method to get log files for the admin interface
  getLogFiles(): string[] {
    try {
      return fs
        .readdirSync(this.config.logDir)
        .filter((file) => file.endsWith(".log"))
        .map((file) => path.join(this.config.logDir, file));
    } catch (error) {
      this.error("Failed to get log files", "Logger", error);
      return [];
    }
  }

  // Method to read log file content with improved performance
  readLogFile(filePath: string, lines = 100): string[] {
    try {
      // Use streaming for better performance with large files
      const content = fs.readFileSync(filePath, "utf8");
      const logLines = content.split("\n").filter((line) => line.trim());

      // Return the last N lines (most recent)
      return logLines.slice(-lines);
    } catch (error) {
      this.error("Failed to read log file", "Logger", { filePath, error });
      return [];
    }
  }

  // Method to get log file statistics
  getLogFileStats(filePath: string): { totalLines: number; fileSize: number } {
    try {
      const stats = fs.statSync(filePath);
      const content = fs.readFileSync(filePath, "utf8");
      const totalLines = content
        .split("\n")
        .filter((line) => line.trim()).length;

      return {
        totalLines,
        fileSize: stats.size,
      };
    } catch (error) {
      this.error("Failed to get log file stats", "Logger", { filePath, error });
      return { totalLines: 0, fileSize: 0 };
    }
  }

  // Method to clear log files
  clearLogs(): void {
    try {
      const files = fs
        .readdirSync(this.config.logDir)
        .filter((file) => file.endsWith(".log"));

      files.forEach((file) => {
        fs.unlinkSync(path.join(this.config.logDir, file));
      });

      // Recreate the main log file
      this.initializeLogFile();

      this.info("All log files cleared", "Logger");
    } catch (error) {
      this.error("Failed to clear log files", "Logger", error);
    }
  }

  // Method to update configuration
  updateConfig(newConfig: Partial<MainLoggerConfig>): void {
    // Validate the configuration
    if (newConfig.level && !Object.values(LogLevel).includes(newConfig.level)) {
      this.error("Invalid log level provided", "Logger", {
        level: newConfig.level,
      });
      return;
    }

    if (newConfig.maxFileSize && newConfig.maxFileSize <= 0) {
      this.error("Max file size must be greater than 0", "Logger", {
        maxFileSize: newConfig.maxFileSize,
      });
      return;
    }

    if (newConfig.maxFiles && newConfig.maxFiles <= 0) {
      this.error("Max files must be greater than 0", "Logger", {
        maxFiles: newConfig.maxFiles,
      });
      return;
    }

    // Update the configuration
    this.config = { ...this.config, ...newConfig };

    // Save configuration to file for persistence
    this.saveConfig();

    this.info("Logger configuration updated", "Logger", newConfig);
  }

  // Method to save configuration to file
  private saveConfig(): void {
    try {
      const configPath = path.join(this.config.logDir, "logger-config.json");
      const configToSave = {
        level: this.config.level,
        maxFileSize: this.config.maxFileSize,
        maxFiles: this.config.maxFiles,
        logToFile: this.config.logToFile,
        logToConsole: this.config.logToConsole,
      };
      fs.writeFileSync(configPath, JSON.stringify(configToSave, null, 2));
    } catch (error) {
      this.error("Failed to save logger configuration", "Logger", error);
    }
  }

  // Method to load configuration from file
  private loadConfig(): void {
    try {
      const configPath = path.join(this.config.logDir, "logger-config.json");
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, "utf8"));
        this.config = { ...this.config, ...configData };
        this.info(
          "Logger configuration loaded from file",
          "Logger",
          configData,
        );
      }
    } catch (error) {
      this.error("Failed to load logger configuration", "Logger", error);
    }
  }

  // Method to get current configuration
  getConfig(): LoggerConfig {
    return {
      level: this.config.level,
      maxFileSize: this.config.maxFileSize,
      maxFiles: this.config.maxFiles,
      logToFile: this.config.logToFile,
      logToConsole: this.config.logToConsole,
    };
  }
}

// Create singleton instance
const logger = new Logger();

export default logger;
