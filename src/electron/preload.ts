import { contextBridge } from "electron";
// Updated systemAPI with event listeners
import { databaseAPI, appAPI, loggerAPI, authAPI, systemAPI, activityLogAPI } from "./preload/index";
import { backupAPI } from "./preload/backupAPI";
import { onboardingAPI } from "./preload/onboardingAPI";

contextBridge.exposeInMainWorld("api", {
  database: databaseAPI,
  app: appAPI,
  logger: loggerAPI,
  auth: authAPI,
  system: systemAPI,
  backup: backupAPI,
  activityLog: activityLogAPI,
  onboarding: onboardingAPI,
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
      activityLog: typeof activityLogAPI;
      onboarding: typeof onboardingAPI;
    };
  }
}
