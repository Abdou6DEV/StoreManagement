import { contextBridge } from "electron";
import { databaseAPI, appAPI, loggerAPI, authAPI, systemAPI } from "./preload/index";
import { backupAPI } from "./preload/backupAPI";

contextBridge.exposeInMainWorld("api", {
  database: databaseAPI,
  app: appAPI,
  logger: loggerAPI,
  auth: authAPI,
  system: systemAPI,
  backup: backupAPI,
});

declare global {
  interface Window {
    api: {
      database: typeof databaseAPI;
      app: typeof appAPI;
      logger: typeof loggerAPI;
      auth: typeof authAPI;
      system: typeof systemAPI;
      backup: typeof backupAPI;
    };
  }
}
