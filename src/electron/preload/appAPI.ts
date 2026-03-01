import { ipcRenderer } from "electron";

export const appAPI = {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  downloadUpdate: (url: string) => ipcRenderer.invoke("app:downloadUpdate", url),
  cancelUpdateDownload: () => ipcRenderer.invoke("app:cancelUpdateDownload"),
  installUpdate: (path: string) => ipcRenderer.invoke("app:installUpdate", path),
  getPrinters: () => ipcRenderer.invoke("app:getPrinters") as Promise<{ name: string; displayName: string; status: number }[]>,
  printSilently: (html: string, deviceName?: string) => ipcRenderer.invoke("app:printSilently", html, deviceName),
  
  // Event listeners for download progress
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  
  removeDownloadProgressListener: (callback: (data: any) => void) => {
    ipcRenderer.removeListener('download-progress', callback);
  }
};
