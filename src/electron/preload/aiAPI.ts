import { ipcRenderer } from "electron";

export const aiAPI = {
  chat: (message: string): Promise<string> =>
    ipcRenderer.invoke("ai:chat", message),
};