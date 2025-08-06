import { contextBridge } from "electron";
import { databaseAPI, appAPI, loggerAPI } from "./preload/index";

contextBridge.exposeInMainWorld("api", {
  database: databaseAPI,
  app: appAPI,
  logger: loggerAPI,
});

declare global {
  interface Window {
    api: {
      database: typeof databaseAPI;
      app: typeof appAPI;
      logger: typeof loggerAPI;
    };
  }
}
