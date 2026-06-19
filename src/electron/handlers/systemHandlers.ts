import { ipcMain } from "electron";
import { getMachineGuid } from "../utils/validationKey";

export function setupSystemHandlers() {
  ipcMain.handle("system:getMachineId", async () => {
    try {
      const machineGuid = getMachineGuid();
      return { success: true, machineId: machineGuid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

}
