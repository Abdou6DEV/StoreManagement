import { ipcRenderer } from "electron";
import { LogLevel } from "../../lib/logger/common";

export const loggerAPI = {
  log: (entry: {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: string;
    data?: any;
    userId?: string;
  }) => ipcRenderer.invoke("logger:log", entry),
  getLogFiles: () => ipcRenderer.invoke("logger:getLogFiles"),
  readLogFile: (filePath: string, lines?: number) =>
    ipcRenderer.invoke("logger:readLogFile", { filePath, lines }),
  getLogFileStats: (filePath: string) =>
    ipcRenderer.invoke("logger:getLogFileStats", { filePath }),
  clearLogs: () => ipcRenderer.invoke("logger:clearLogs"),
  updateConfig: (config: any) =>
    ipcRenderer.invoke("logger:updateConfig", config),
  getConfig: () => ipcRenderer.invoke("logger:getConfig"),
}; 