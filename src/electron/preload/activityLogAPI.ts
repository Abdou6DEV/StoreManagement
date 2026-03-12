import { ipcRenderer } from "electron";

export type ActivityLogEntry = {
  id: string;
  username: string;
  action: string;
  details: string | null;
  createdAt: string;
};

export type ActivityLogFilter = {
  username?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export const activityLogAPI = {
  log: (payload: { username: string; action: string; details?: string | null }) =>
    ipcRenderer.invoke("activityLog:log", payload),

  getList: (filter: ActivityLogFilter) =>
    ipcRenderer.invoke("activityLog:getList", filter),

  getUsernames: () => ipcRenderer.invoke("activityLog:getUsernames"),

  getRetentionDays: () => ipcRenderer.invoke("activityLog:getRetentionDays"),

  setRetentionDays: (days: number) =>
    ipcRenderer.invoke("activityLog:setRetentionDays", days),

  cleanupOld: () => ipcRenderer.invoke("activityLog:cleanupOld"),
};
