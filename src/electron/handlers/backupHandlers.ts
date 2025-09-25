import { ipcMain, app, dialog } from "electron";
import fs from "fs";
import path from "path";
import { prisma } from "../../lib/database/prismaClient";
import logger from "../../lib/logger";

// Backup directory path
const getBackupDir = () => {
  const userDataPath = app.getPath("userData");
  return path.join(userDataPath, "backups");
};

// Ensure backup directory exists
const ensureBackupDir = () => {
  const backupDir = getBackupDir();
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
};

// Get database file path
const getDatabasePath = () => {
  const isDev = process.env.NODE_ENV === "development";
  return isDev
    ? path.join(process.cwd(), "prisma", "dev.db")
    : path.join(app.getPath("userData"), "database.db");
};

// Create automatic backup filename with date and time
const getAutoBackupFileName = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `auto_backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.db`;
};

// Create manual backup filename with timestamp
const getManualBackupFileName = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `manual_backup_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.db`;
};

// Get automatic backup file path
const getAutoBackupFilePath = (date: Date) => {
  const backupDir = ensureBackupDir();
  const fileName = getAutoBackupFileName(date);
  return path.join(backupDir, fileName);
};

// Get manual backup file path
const getManualBackupFilePath = (date: Date) => {
  const backupDir = ensureBackupDir();
  const fileName = getManualBackupFileName(date);
  return path.join(backupDir, fileName);
};

// Create an automatic backup with safety checks
const createAutoBackup = async (date: Date = new Date()) => {
  try {
    // Check if we already have a backup for today (prevent multiple backups per day)
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    
    const backupDir = ensureBackupDir();
    const existingTodayBackups = fs.readdirSync(backupDir)
      .filter(file => file.startsWith(`auto_backup_${todayStr}`) && file.endsWith(".db"));
    
    if (existingTodayBackups.length > 0) {
      logger.info("Automatic backup already exists for today, skipping", "Backup", { 
        existingBackups: existingTodayBackups.length,
        today: todayStr 
      });
      return {
        success: true,
        message: "Backup already exists for today",
        skipped: true
      };
    }
    
    const sourcePath = getDatabasePath();
    const backupPath = getAutoBackupFilePath(date);
    
    // 1. Check if source database exists and is valid
    if (!fs.existsSync(sourcePath)) {
      throw new Error("Database file not found");
    }
    
    if (!validateSQLiteFile(sourcePath)) {
      throw new Error("Source database is corrupted or invalid");
    }
    
    // 2. Ensure backup directory exists
    ensureBackupDir();
    
    // 3. Create backup with atomic operation
    const tempBackupPath = backupPath + ".tmp";
    fs.copyFileSync(sourcePath, tempBackupPath);
    
    // 4. Validate the backup file
    if (!validateSQLiteFile(tempBackupPath)) {
      fs.unlinkSync(tempBackupPath);
      throw new Error("Backup file is corrupted");
    }
    
    // 5. Atomic move to final location
    fs.renameSync(tempBackupPath, backupPath);
    
    // 6. Final verification
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup creation failed - file not found after creation");
    }
    
    const stats = fs.statSync(backupPath);
    
    // 7. Verify backup is readable
    try {
      const { PrismaClient } = await import("@prisma/client");
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${backupPath}`,
          },
        },
      });
      await testPrisma.$connect();
      await testPrisma.$queryRaw`SELECT 1`;
      await testPrisma.$disconnect();
    } catch (testError) {
      logger.error("Backup validation failed", "Backup", testError);
      fs.unlinkSync(backupPath);
      throw new Error("Backup file is not a valid database");
    }
    
    logger.info("Backup created successfully", "Backup", {
      backupPath,
      size: stats.size,
      date: date.toISOString()
    });
    
    return {
      success: true,
      backupPath,
      size: stats.size,
      date: date.toISOString()
    };
  } catch (error) {
    logger.error("Backup creation failed", "Backup", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create a manual backup with safety checks
const createManualBackup = async (date: Date = new Date()) => {
  try {
    const sourcePath = getDatabasePath();
    const backupPath = getManualBackupFilePath(date);
    
    // 1. Check if source database exists and is valid
    if (!fs.existsSync(sourcePath)) {
      throw new Error("Database file not found");
    }
    
    if (!validateSQLiteFile(sourcePath)) {
      throw new Error("Source database is corrupted or invalid");
    }
    
    // 2. Ensure backup directory exists
    ensureBackupDir();
    
    // 3. Create backup with atomic operation
    const tempBackupPath = backupPath + ".tmp";
    fs.copyFileSync(sourcePath, tempBackupPath);
    
    // 4. Validate the backup file
    if (!validateSQLiteFile(tempBackupPath)) {
      fs.unlinkSync(tempBackupPath);
      throw new Error("Backup file is corrupted");
    }
    
    // 5. Atomic move to final location
    fs.renameSync(tempBackupPath, backupPath);
    
    // 6. Final verification
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup creation failed - file not found after creation");
    }
    
    const stats = fs.statSync(backupPath);
    
    // 7. Verify backup is readable
    try {
      const { PrismaClient } = await import("@prisma/client");
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${backupPath}`,
          },
        },
      });
      await testPrisma.$connect();
      await testPrisma.$queryRaw`SELECT 1`;
      await testPrisma.$disconnect();
    } catch (testError) {
      logger.error("Backup validation failed", "Backup", testError);
      fs.unlinkSync(backupPath);
      throw new Error("Backup file is not a valid database");
    }
    
    logger.info("Manual backup created successfully", "Backup", {
      backupPath,
      size: stats.size,
      date: date.toISOString()
    });
    
    return {
      success: true,
      backupPath,
      size: stats.size,
      date: date.toISOString()
    };
  } catch (error) {
    logger.error("Manual backup creation failed", "Backup", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create a manual backup to a custom path
const createManualBackupToPath = async (customPath: string, date: Date = new Date()) => {
  try {
    const sourcePath = getDatabasePath();
    
    // 1. Check if source database exists and is valid
    if (!fs.existsSync(sourcePath)) {
      throw new Error("Database file not found");
    }
    
    if (!validateSQLiteFile(sourcePath)) {
      throw new Error("Source database is corrupted or invalid");
    }
    
    // 2. Ensure custom directory exists
    const customDir = path.dirname(customPath);
    if (!fs.existsSync(customDir)) {
      fs.mkdirSync(customDir, { recursive: true });
    }
    
    // 3. Create backup with atomic operation
    const tempBackupPath = customPath + ".tmp";
    fs.copyFileSync(sourcePath, tempBackupPath);
    
    // 4. Validate the backup file
    if (!validateSQLiteFile(tempBackupPath)) {
      fs.unlinkSync(tempBackupPath);
      throw new Error("Backup file is corrupted");
    }
    
    // 5. Atomic move to final location
    fs.renameSync(tempBackupPath, customPath);
    
    // 6. Final verification
    if (!fs.existsSync(customPath)) {
      throw new Error("Backup creation failed - file not found after creation");
    }
    
    const stats = fs.statSync(customPath);
    
    // 7. Verify backup is readable
    try {
      const { PrismaClient } = await import("@prisma/client");
      const testPrisma = new PrismaClient({
        datasources: {
          db: {
            url: `file:${customPath}`,
          },
        },
      });
      await testPrisma.$connect();
      await testPrisma.$queryRaw`SELECT 1`;
      await testPrisma.$disconnect();
    } catch (testError) {
      logger.error("Backup validation failed", "Backup", testError);
      fs.unlinkSync(customPath);
      throw new Error("Backup file is not a valid database");
    }
    
    logger.info("Manual backup created to custom path successfully", "Backup", {
      customPath,
      size: stats.size,
      date: date.toISOString()
    });
    
    return {
      success: true,
      backupPath: customPath,
      size: stats.size,
      date: date.toISOString()
    };
  } catch (error) {
    logger.error("Manual backup to custom path failed", "Backup", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Clean old automatic backups (keep only 2 most recent)
const cleanOldAutoBackups = () => {
  try {
    const backupDir = ensureBackupDir();
    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith("auto_backup_") && file.endsWith(".db"))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        date: fs.statSync(path.join(backupDir, file)).mtime
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Keep only the 2 most recent automatic backups
    if (files.length > 2) {
      const filesToDelete = files.slice(2);
      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
          logger.info("Old automatic backup deleted", "Backup", { file: file.name });
        } catch (deleteError) {
          logger.error("Failed to delete old backup", "Backup", { file: file.name, error: deleteError });
        }
      });
    }
    
    logger.info("Automatic backup cleanup completed", "Backup", { 
      totalFiles: files.length, 
      keptFiles: Math.min(files.length, 2),
      deletedFiles: Math.max(0, files.length - 2)
    });
    
    return files.slice(0, 2); // Return the 2 most recent automatic backups
  } catch (error) {
    logger.error("Failed to clean old automatic backups", "Backup", error);
    return [];
  }
};

// List available backups
const listBackups = () => {
  try {
    const backupDir = ensureBackupDir();
    const files = fs.readdirSync(backupDir)
      .filter(file => (file.startsWith("auto_backup_") || file.startsWith("manual_backup_")) && file.endsWith(".db"))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        const isAuto = file.startsWith("auto_backup_");
        return {
          name: file,
          path: filePath,
          size: stats.size,
          date: stats.mtime.toISOString(),
          readableDate: stats.mtime.toLocaleDateString(),
          type: isAuto ? "automatic" : "manual"
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    
    return {
      success: true,
      backups: files
    };
  } catch (error) {
    logger.error("Failed to list backups", "Backup", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Validate SQLite database file
const validateSQLiteFile = (filePath: string): boolean => {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const stats = fs.statSync(filePath);
    if (stats.size < 100) { // SQLite files should be at least 100 bytes
      return false;
    }
    
    // Read first 16 bytes to check SQLite header
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    // SQLite files start with "SQLite format 3\0"
    const sqliteHeader = buffer.toString('ascii');
    return sqliteHeader.startsWith('SQLite format 3');
  } catch (error) {
    logger.error("Failed to validate SQLite file", "Backup", { filePath, error });
    return false;
  }
};

// Restore from backup with full safety checks
const restoreBackup = async (backupPath: string) => {
  let tempBackupPath: string | null = null;
  
  try {
    const targetPath = getDatabasePath();
    
    // 1. Validate backup file exists and is valid
    if (!fs.existsSync(backupPath)) {
      throw new Error("Backup file not found");
    }
    
    if (!validateSQLiteFile(backupPath)) {
      throw new Error("Invalid backup file - not a valid SQLite database");
    }
    
    // 2. Create safety backup of current database
    tempBackupPath = getAutoBackupFilePath(new Date()) + ".before_restore";
    if (fs.existsSync(targetPath)) {
      fs.copyFileSync(targetPath, tempBackupPath);
      logger.info("Safety backup created", "Backup", { tempBackupPath });
    }
    
    // 3. Gracefully close database connections
    try {
      await prisma.$disconnect();
      // Small delay to ensure all operations complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (disconnectError) {
      logger.warn("Error during disconnect", "Backup", disconnectError);
    }
    
    // 4. Perform the restore operation
    fs.copyFileSync(backupPath, targetPath);
    
    // 5. Validate the restored database
    if (!validateSQLiteFile(targetPath)) {
      throw new Error("Restored database is invalid - restoring from safety backup");
    }
    
    // 6. Test database connection
    try {
      await prisma.$connect();
      // Test a simple query to ensure database is working
      await prisma.$queryRaw`SELECT 1`;
    } catch (connectError) {
      throw new Error(`Database connection failed after restore: ${connectError.message}`);
    }
    
    logger.info("Database restored successfully", "Backup", {
      backupPath,
      targetPath,
      safetyBackup: tempBackupPath
    });
    
    return {
      success: true,
      message: "Database restored successfully",
      safetyBackup: tempBackupPath
    };
    
  } catch (error) {
    logger.error("Database restore failed", "Backup", error);
    
    // 7. Emergency recovery - restore from safety backup if available
    if (tempBackupPath && fs.existsSync(tempBackupPath)) {
      try {
        const targetPath = getDatabasePath();
        fs.copyFileSync(tempBackupPath, targetPath);
        await prisma.$connect();
        logger.info("Emergency recovery successful", "Backup", { tempBackupPath });
      } catch (recoveryError) {
        logger.error("Emergency recovery failed", "Backup", recoveryError);
      }
    }
    
    // 8. Try to reconnect to database
    try {
      await prisma.$connect();
    } catch (reconnectError) {
      logger.error("Failed to reconnect to database", "Backup", reconnectError);
    }
    
    return {
      success: false,
      error: error.message,
      safetyBackup: tempBackupPath
    };
  }
};

// Check if database is currently in use
const isDatabaseInUse = async (): Promise<boolean> => {
  try {
    // Try to execute a simple query to check if database is locked
    await prisma.$queryRaw`SELECT 1`;
    return false; // Database is available
  } catch (error) {
    // If we get a "database is locked" error, it's in use
    return error.message.includes('database is locked') || 
           error.message.includes('SQLITE_BUSY');
  }
};

export function setupBackupHandlers() {
  // Create automatic backup
  ipcMain.handle("backup:create", async () => {
    // Check if database is in use
    if (await isDatabaseInUse()) {
      return {
        success: false,
        error: "Database is currently in use. Please wait and try again."
      };
    }
    
    const result = await createAutoBackup();
    if (result.success) {
      cleanOldAutoBackups(); // Clean old automatic backups after creating new one
    }
    return result;
  });

  // List backups
  ipcMain.handle("backup:list", async () => {
    return listBackups();
  });

  // Restore backup
  ipcMain.handle("backup:restore", async (_, backupPath: string) => {
    // Check if database is in use
    if (await isDatabaseInUse()) {
      return {
        success: false,
        error: "Database is currently in use. Please close all operations and try again."
      };
    }
    
    return await restoreBackup(backupPath);
  });

  // Get backup info
  ipcMain.handle("backup:info", async () => {
    const backupDir = ensureBackupDir();
    const databasePath = getDatabasePath();
    
    return {
      backupDir,
      databasePath,
      backupExists: fs.existsSync(databasePath)
    };
  });

  // Manual backup creation (for admin panel)
  ipcMain.handle("backup:createManual", async () => {
    // Check if database is in use
    if (await isDatabaseInUse()) {
      return {
        success: false,
        error: "Database is currently in use. Please wait and try again."
      };
    }
    
    const result = await createManualBackup();
    if (result.success) {
      // Clean up old automatic backups after manual backup too
      cleanOldAutoBackups();
    }
    return result;
  });

  // Manual backup to custom path
  ipcMain.handle("backup:createManualToPath", async (_, customPath: string) => {
    // Check if database is in use
    if (await isDatabaseInUse()) {
      return {
        success: false,
        error: "Database is currently in use. Please wait and try again."
      };
    }
    
    const result = await createManualBackupToPath(customPath);
    if (result.success) {
      // Clean up old automatic backups after manual backup too
      cleanOldAutoBackups();
    }
    return result;
  });

  // Clean up old backups (for admin panel)
  ipcMain.handle("backup:cleanup", async () => {
    try {
      const cleanedFiles = cleanOldAutoBackups();
      return {
        success: true,
        message: `Cleaned up ${cleanedFiles.length} old automatic backups`,
        cleanedFiles: cleanedFiles.map(f => f.name)
      };
    } catch (error) {
      logger.error("Manual cleanup failed", "Backup", error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Open file dialog for backup path selection
  ipcMain.handle("backup:selectPath", async () => {
    try {
      const result = await dialog.showSaveDialog({
        title: "Select Backup Location",
        defaultPath: `backup_${new Date().toISOString().split('T')[0]}.db`,
        filters: [
          { name: "Database Files", extensions: ["db"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["createDirectory", "showOverwriteConfirmation"]
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      return {
        success: true,
        filePath: result.filePath
      };
    } catch (error) {
      logger.error("File dialog failed", "Backup", error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  // Open file dialog for restore path selection
  ipcMain.handle("backup:selectRestorePath", async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: "Select Backup File to Restore",
        filters: [
          { name: "Database Files", extensions: ["db"] },
          { name: "All Files", extensions: ["*"] }
        ],
        properties: ["openFile"]
      });

      if (result.canceled) {
        return { success: false, canceled: true };
      }

      if (result.filePaths.length === 0) {
        return { success: false, error: "No file selected" };
      }

      return {
        success: true,
        filePath: result.filePaths[0]
      };
    } catch (error) {
      logger.error("Restore file dialog failed", "Backup", error);
      return {
        success: false,
        error: error.message
      };
    }
  });
}

// Auto-backup function (call this daily)
export const performDailyBackup = async () => {
  try {
    logger.info("Starting daily automatic backup", "Backup");
    const result = await createAutoBackup();
    
    if (result.success) {
      if (result.skipped) {
        logger.info("Daily automatic backup skipped - already exists for today", "Backup");
      } else {
        logger.info("Daily automatic backup completed successfully", "Backup");
        // Only clean up if we actually created a new backup
        cleanOldAutoBackups();
      }
    } else {
      logger.error("Daily automatic backup failed", "Backup", { error: result.error });
    }
    return result;
  } catch (error) {
    logger.error("Daily automatic backup error", "Backup", error);
    return { success: false, error: error.message };
  }
};
