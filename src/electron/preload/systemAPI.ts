import { ipcRenderer } from "electron";

export const systemAPI = {
  getMachineId: () => ipcRenderer.invoke("system:getMachineId"),
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  off: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.off(channel, callback);
  },
};



