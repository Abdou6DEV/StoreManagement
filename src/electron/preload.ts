import { contextBridge } from "electron";
import { databaseAPI, appAPI, loggerAPI, authAPI, systemAPI } from "./preload/index";

contextBridge.exposeInMainWorld("api", {
  database: databaseAPI,
  app: appAPI,
  logger: loggerAPI,
  auth: authAPI,
  system: systemAPI,
});

declare global {
  interface Window {
    api: {
      database: typeof databaseAPI;
      app: typeof appAPI;
      logger: typeof loggerAPI;
      auth: typeof authAPI;
      system: typeof systemAPI;
    };
  }
}
