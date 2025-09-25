import { ipcRenderer } from "electron";

export const backupAPI = {
  // Create a new backup
  create: () => ipcRenderer.invoke("backup:create"),
  
  // Create manual backup (from admin panel)
  createManual: () => ipcRenderer.invoke("backup:createManual"),
  
  // Create manual backup to custom path
  createManualToPath: (customPath: string) => ipcRenderer.invoke("backup:createManualToPath", customPath),
  
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
