import fs from "fs";
import path from "path";
import { faker } from "@faker-js/faker";
import os from "os";

// Log level enum (copied from common.ts to be independent)
enum LogLevel {
  ERROR = "ERROR",
  WARN = "WARN",
  INFO = "INFO",
  DEBUG = "DEBUG",
  TRACE = "TRACE",
}

// Log entry interface (copied from common.ts to be independent)
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  userId?: string;
  process: "main" | "renderer";
}

// Standalone logger class (simplified version of the main logger)
class StandaloneLogger {
  private logDir: string;
  private logFilePath: string;

  constructor(logDir: string) {
    this.logDir = logDir;
    this.logFilePath = path.join(this.logDir, "app.log");
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private writeToFile(entry: LogEntry): void {
    const logLine = JSON.stringify(entry) + "\n";
    fs.appendFileSync(this.logFilePath, logLine);
  }

  log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    userId?: string,
    process: "main" | "renderer" = "main",
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      userId,
      process,
    };

    this.writeToFile(entry);
  }

  error(
    message: string,
    context?: string,
    data?: any,
    userId?: string,
    process?: "main" | "renderer",
  ): void {
    this.log(LogLevel.ERROR, message, context, data, userId, process);
  }

  warn(
    message: string,
    context?: string,
    data?: any,
    userId?: string,
    process?: "main" | "renderer",
  ): void {
    this.log(LogLevel.WARN, message, context, data, userId, process);
  }

  info(
    message: string,
    context?: string,
    data?: any,
    userId?: string,
    process?: "main" | "renderer",
  ): void {
    this.log(LogLevel.INFO, message, context, data, userId, process);
  }

  debug(
    message: string,
    context?: string,
    data?: any,
    userId?: string,
    process?: "main" | "renderer",
  ): void {
    this.log(LogLevel.DEBUG, message, context, data, userId, process);
  }

  trace(
    message: string,
    context?: string,
    data?: any,
    userId?: string,
    process?: "main" | "renderer",
  ): void {
    this.log(LogLevel.TRACE, message, context, data, userId, process);
  }
}

// Log message generators
class LogMessageGenerator {
  private static contexts = [
    "auth",
    "database",
    "api",
    "ui",
    "payment",
    "inventory",
    "sales",
    "client",
    "product",
    "session",
  ];

  private static errorMessages = [
    "Failed to connect to database",
    "Authentication failed",
    "Payment processing error",
    "Product not found",
    "Invalid user credentials",
    "Network connection timeout",
    "File upload failed",
    "Database query error",
    "Session expired",
    "Permission denied",
  ];

  private static warnMessages = [
    "Database connection slow",
    "High memory usage detected",
    "Payment pending verification",
    "Product stock low",
    "User session expiring soon",
    "Cache miss",
    "API rate limit approaching",
    "Disk space running low",
    "Backup incomplete",
    "Sync conflict detected",
  ];

  private static infoMessages = [
    "User logged in successfully",
    "Product added to inventory",
    "Payment processed successfully",
    "Database backup completed",
    "Session started",
    "Product updated",
    "Client information saved",
    "Report generated",
    "Data synchronized",
    "Configuration updated",
  ];

  private static debugMessages = [
    "Processing request",
    "Validating input data",
    "Executing database query",
    "Rendering component",
    "Calculating totals",
    "Applying filters",
    "Updating cache",
    "Sending API request",
    "Parsing response",
    "Building query parameters",
  ];

  private static traceMessages = [
    "Function entry",
    "Variable assignment",
    "Condition check",
    "Loop iteration",
    "Method call",
    "Property access",
    "Event handler",
    "State update",
    "Effect trigger",
    "Component render",
  ];

  static generateRandomLog(): LogEntry {
    const level = this.getRandomLevel();
    const context = faker.helpers.arrayElement(this.contexts);
    const userId = faker.string.uuid();
    const process = faker.helpers.arrayElement(["main", "renderer"]);

    let message: string;
    let data: any = null;

    switch (level) {
      case LogLevel.ERROR:
        message = faker.helpers.arrayElement(this.errorMessages);
        data = {
          errorCode: faker.number.int({ min: 1000, max: 9999 }),
          stack: faker.lorem.paragraph(),
          requestId: faker.string.uuid(),
        };
        break;
      case LogLevel.WARN:
        message = faker.helpers.arrayElement(this.warnMessages);
        data = {
          threshold: faker.number.int({ min: 80, max: 95 }),
          current: faker.number.int({ min: 60, max: 90 }),
          timestamp: faker.date.recent().toISOString(),
        };
        break;
      case LogLevel.INFO:
        message = faker.helpers.arrayElement(this.infoMessages);
        data = {
          userId: faker.string.uuid(),
          action: faker.helpers.arrayElement([
            "create",
            "update",
            "delete",
            "read",
          ]),
          resource: faker.helpers.arrayElement([
            "product",
            "client",
            "sale",
            "payment",
          ]),
        };
        break;
      case LogLevel.DEBUG:
        message = faker.helpers.arrayElement(this.debugMessages);
        data = {
          duration: faker.number.int({ min: 10, max: 500 }),
          memoryUsage: faker.number.int({ min: 50, max: 200 }),
          queryCount: faker.number.int({ min: 1, max: 10 }),
        };
        break;
      case LogLevel.TRACE:
        message = faker.helpers.arrayElement(this.traceMessages);
        data = {
          functionName: faker.helpers.arrayElement([
            "processPayment",
            "validateInput",
            "updateInventory",
            "generateReport",
          ]),
          lineNumber: faker.number.int({ min: 1, max: 100 }),
          executionTime: faker.number.float({
            min: 0.1,
            max: 10.0,
            fractionDigits: 1,
          }),
        };
        break;
    }

    return {
      timestamp: faker.date.recent().toISOString(),
      level,
      message,
      context,
      data,
      userId,
      process,
    };
  }

  private static getRandomLevel(): LogLevel {
    const weights = {
      [LogLevel.ERROR]: 0.1, // 10%
      [LogLevel.WARN]: 0.15, // 15%
      [LogLevel.INFO]: 0.4, // 40%
      [LogLevel.DEBUG]: 0.25, // 25%
      [LogLevel.TRACE]: 0.1, // 10%
    };

    const random = Math.random();
    let cumulative = 0;

    for (const [level, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (random <= cumulative) {
        return level as LogLevel;
      }
    }

    return LogLevel.INFO;
  }
}

// Function to get the correct app data directory
function getAppDataDir(): string {
  const platform = os.platform();
  const appName = "storemanagementelectron";

  switch (platform) {
    case "win32":
      return path.join(process.env.APPDATA || "", appName);
    case "darwin":
      return path.join(os.homedir(), "Library", "Application Support", appName);
    case "linux":
      return path.join(os.homedir(), ".config", appName);
    default:
      return path.join(os.homedir(), ".config", appName);
  }
}

// Function to display log directory information
function displayLogDirectoryInfo(logDir: string): void {
  const fullLogDir = path.resolve(logDir);
  const fullLogFile = path.resolve(path.join(logDir, "app.log"));

  console.log(`\n📂 Log Directory Information:`);
  console.log(`   Directory: ${fullLogDir}`);
  console.log(`   Log file: ${fullLogFile}`);

  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    if (files.length > 0) {
      console.log(`   Existing files: ${files.join(", ")}`);
    } else {
      console.log(`   Directory exists but is empty`);
    }
  } else {
    console.log(`   Directory does not exist (will be created)`);
  }
  console.log("");
}

// Main seeding function
async function seedLogs(options: {
  count?: number;
  logDir?: string;
  clearExisting?: boolean;
  timeRange?: { start: Date; end: Date };
}) {
  const {
    count = 1000,
    logDir = path.join(getAppDataDir(), "logs"),
    clearExisting = false,
    timeRange,
  } = options;

  console.log(`Starting log seeding...`);
  console.log(`Target count: ${count}`);
  console.log(`Platform: ${os.platform()}`);
  console.log(`App data directory: ${getAppDataDir()}`);

  displayLogDirectoryInfo(logDir);

  const logger = new StandaloneLogger(logDir);

  if (clearExisting) {
    console.log("Clearing existing logs...");
    if (fs.existsSync(logDir)) {
      fs.rmSync(logDir, { recursive: true, force: true });
    }
  }

  console.log("Generating log entries...");

  for (let i = 0; i < count; i++) {
    const logEntry = LogMessageGenerator.generateRandomLog();

    // Override timestamp if timeRange is specified
    if (timeRange) {
      logEntry.timestamp = faker.date
        .between({
          from: timeRange.start,
          to: timeRange.end,
        })
        .toISOString();
    }

    logger.log(
      logEntry.level,
      logEntry.message,
      logEntry.context,
      logEntry.data,
      logEntry.userId,
      logEntry.process,
    );

    if ((i + 1) % 100 === 0) {
      console.log(`Generated ${i + 1} log entries...`);
    }
  }

  console.log(`✅ Log seeding completed! Generated ${count} log entries.`);

  // Display final log file information
  const logFilePath = path.resolve(path.join(logDir, "app.log"));
  if (fs.existsSync(logFilePath)) {
    const stats = fs.statSync(logFilePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`\n📊 Final Log File Information:`);
    console.log(`   Full path: ${logFilePath}`);
    console.log(`   File size: ${fileSizeInMB} MB`);
    console.log(`   Created: ${stats.birthtime.toLocaleString()}`);
    console.log(`   Modified: ${stats.mtime.toLocaleString()}`);
  } else {
    console.log(`\n❌ Error: Log file was not created at ${logFilePath}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  const options: any = {
    count: 1000,
    logDir: path.join(getAppDataDir(), "logs"),
    clearExisting: false,
  };

  // Simple argument parsing - just handle count
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--count" || arg === "-c") {
      const nextArg = args[i + 1];
      if (nextArg && !isNaN(parseInt(nextArg))) {
        options.count = parseInt(nextArg);
        i++; // Skip the next argument
      }
    }
  }

  seedLogs(options).catch(console.error);
}

export { seedLogs, StandaloneLogger, LogMessageGenerator, LogLevel };
