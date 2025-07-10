import { contextBridge, ipcRenderer } from "electron";
import { User } from "@prisma/client";

contextBridge.exposeInMainWorld("api", {
  database: {
    users: {
      getAll: () => ipcRenderer.invoke("db:users:getAll"),
    },
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
  },
});

declare global {
  interface Window {
    api: {
      database: {
        users: {
          getAll: () => Promise<User[]>;
        };
      };
      app: {
        getVersion: () => Promise<string>;
      };
    };
  }
}
