import { ipcRenderer } from "electron";

export const backupAPI = {
  // Create a new backup
  create: () => ipcRenderer.invoke("backup:create"),
  
  // Create manual backup (from admin panel)
  createManual: () => ipcRenderer.invoke("backup:createManual"),

  /** Snapshot for cloud upload (`cloud_backup_*.db`, removed from disk after a successful upload). */
  createCloud: () => ipcRenderer.invoke("backup:createCloud"),

  deleteCloudUploadStaging: (backupPath: string) =>
    ipcRenderer.invoke("backup:deleteCloudUploadStaging", backupPath) as Promise<{
      success: boolean;
      error?: string;
    }>,

  deleteListingFile: (backupPath: string) =>
    ipcRenderer.invoke("backup:deleteListingFile", backupPath) as Promise<{
      success: boolean;
      error?: string;
    }>,

  // Create manual backup to custom path
  createManualToPath: (customPath: string) => ipcRenderer.invoke("backup:createManualToPath", customPath),
  
  // Ensure daily backup exists (call after user logs in; once per day, toast on create)
  ensureDailyBackup: () =>
    ipcRenderer.invoke("backup:ensureDailyBackup") as Promise<{
      success: boolean;
      created?: boolean;
      skipped?: boolean;
      error?: string;
    }>,

  // List all available backups
  list: () => ipcRenderer.invoke("backup:list"),
  
  // Restore from a specific backup
  restore: (backupPath: string) => ipcRenderer.invoke("backup:restore", backupPath),
  
  // Get backup system info
  getInfo: () => ipcRenderer.invoke("backup:info"),
  
  // Clean up old automatic backups
  cleanup: () => ipcRenderer.invoke("backup:cleanup"),
  
  // Open file dialog to select backup path
  selectPath: () => ipcRenderer.invoke("backup:selectPath"),
  
  // Open file dialog to select restore path
  selectRestorePath: () => ipcRenderer.invoke("backup:selectRestorePath"),

  // Subscribe to auto backup success (main process sends when daily backup completes)
  onAutoBackupSuccess: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("backup:autoBackupSuccess", handler);
    return () => ipcRenderer.removeListener("backup:autoBackupSuccess", handler);
  },
};

export type BackupInfo = {
  backupDir: string;
  databasePath: string;
  backupExists: boolean;
};

export type BackupFile = {
  name: string;
  path: string;
  size: number;
  date: string;
  readableDate: string;
  type: "automatic" | "manual" | "cloud";
};

export type BackupResult = {
  success: boolean;
  error?: string;
  backupPath?: string;
  size?: number;
  date?: string;
  message?: string;
  backups?: BackupFile[];
};
