import { LogLevel, LogEntry } from "./common";

export interface RendererLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
}

class RendererLogger {
  private isElectron: boolean;

  constructor() {
    this.isElectron = typeof window !== "undefined" && !!window.api;
  }

  private async sendToMain(entry: RendererLogEntry): Promise<void> {
    if (this.isElectron && window.api?.logger) {
      try {
        await window.api.logger.log(entry);
      } catch (error) {
        console.error("Failed to send log to main process:", error);
      }
    }
  }

  log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    userId?: string,
  ): void {
    const entry: RendererLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId,
    };

    // Send to main process if available
    this.sendToMain(entry);

    // Also log to console for development
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const consoleMessage = `[${timestamp}] [${level}] [Renderer] ${context ? `[${context}] ` : ""}${message}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(consoleMessage);
        if (data) console.error(data);
        break;
      case LogLevel.WARN:
        console.warn(consoleMessage);
        if (data) console.warn(data);
        break;
      case LogLevel.INFO:
        console.info(consoleMessage);
        if (data) console.info(data);
        break;
      case LogLevel.DEBUG:
        console.debug(consoleMessage);
        if (data) console.debug(data);
        break;
      case LogLevel.TRACE:
        console.trace(consoleMessage);
        if (data) console.trace(data);
        break;
    }
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
}

// Create singleton instance for renderer
const rendererLogger = new RendererLogger();

export default rendererLogger;
