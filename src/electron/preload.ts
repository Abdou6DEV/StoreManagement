import { contextBridge } from "electron";
import { databaseAPI, appAPI, loggerAPI, authAPI } from "./preload/index";

contextBridge.exposeInMainWorld("api", {
  database: databaseAPI,
  app: appAPI,
  logger: loggerAPI,
  auth: authAPI,
});

declare global {
  interface Window {
    api: {
      database: typeof databaseAPI;
      app: typeof appAPI;
      logger: typeof loggerAPI;
      auth: typeof authAPI;
    };
  }
}
