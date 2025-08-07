import { ipcRenderer } from "electron";

export const appAPI = {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
};
