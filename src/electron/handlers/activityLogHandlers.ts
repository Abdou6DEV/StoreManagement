import { ipcMain } from "electron";
import {
  createActivityLog,
  getActivityLogs,
  getActivityLogUsernames,
  getActivityLogRetentionDays,
  setActivityLogRetentionDays,
  deleteActivityLogsOlderThanRetention,
} from "../../lib/database/activityLogs";

export function setupActivityLogHandlers() {
  ipcMain.handle(
    "activityLog:log",
    async (
      _event,
      payload: { username: string; action: string; details?: string | null }
    ) => {
      try {
        await createActivityLog({
          username: payload.username,
          action: payload.action,
          details: payload.details ?? null,
        });
      } catch (error) {
        console.error("activityLog:log error", error);
      }
    }
  );

  ipcMain.handle(
    "activityLog:getList",
    async (
      _event,
      filter: {
        username?: string | null;
        dateFrom?: string | null;
        dateTo?: string | null;
        search?: string | null;
        limit?: number;
        offset?: number;
      }
    ) => {
      try {
        return await getActivityLogs({
          username: filter.username,
          dateFrom: filter.dateFrom,
          dateTo: filter.dateTo,
          search: filter.search,
          limit: filter.limit ?? 100,
          offset: filter.offset ?? 0,
        });
      } catch (error) {
        console.error("activityLog:getList error", error);
        return { entries: [], total: 0 };
      }
    }
  );

  ipcMain.handle("activityLog:getUsernames", async () => {
    try {
      return await getActivityLogUsernames();
    } catch (error) {
      console.error("activityLog:getUsernames error", error);
      return [];
    }
  });

  ipcMain.handle("activityLog:getRetentionDays", async () => {
    try {
      return await getActivityLogRetentionDays();
    } catch (error) {
      console.error("activityLog:getRetentionDays error", error);
      return 90;
    }
  });

  ipcMain.handle("activityLog:setRetentionDays", async (_event, days: number) => {
    try {
      await setActivityLogRetentionDays(days);
    } catch (error) {
      console.error("activityLog:setRetentionDays error", error);
      throw error;
    }
  });

  ipcMain.handle("activityLog:cleanupOld", async () => {
    try {
      return await deleteActivityLogsOlderThanRetention();
    } catch (error) {
      console.error("activityLog:cleanupOld error", error);
      return 0;
    }
  });
}
