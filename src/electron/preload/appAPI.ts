import { ipcRenderer } from "electron";

export const appAPI = {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  downloadUpdate: (url: string) => ipcRenderer.invoke("app:downloadUpdate", url),
  installUpdate: (path: string) => ipcRenderer.invoke("app:installUpdate", path),
};
