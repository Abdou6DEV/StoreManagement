import { ipcRenderer } from "electron";

export const appAPI = {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  downloadUpdate: (url: string) => ipcRenderer.invoke("app:downloadUpdate", url),
  cancelUpdateDownload: () => ipcRenderer.invoke("app:cancelUpdateDownload"),
  installUpdate: (path: string) => ipcRenderer.invoke("app:installUpdate", path),
  printSilently: (html: string) => ipcRenderer.invoke("app:printSilently", html),
  
  // Event listeners for download progress
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  
  removeDownloadProgressListener: (callback: (data: any) => void) => {
    ipcRenderer.removeListener('download-progress', callback);
  }
};
