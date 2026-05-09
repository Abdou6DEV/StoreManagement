import { ipcMain } from "electron";
import { isCoreModulesDatabaseEmpty } from "../../lib/database/onboarding";

export function setupOnboardingHandlers(): void {
  ipcMain.handle("onboarding:isCoreDatabaseEmpty", async () => {
    try {
      const isEmpty = await isCoreModulesDatabaseEmpty();
      return { success: true, isEmpty };
    } catch (e) {
      return {
        success: false,
        isEmpty: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });
}
