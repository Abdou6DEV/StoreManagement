import { ipcMain } from "electron";
import {
  getMachineGuid,
  generateValidationKey,
  validateKey as validateKeyUtil,
} from "../utils/validationKey";

export function setupSystemHandlers() {
  ipcMain.handle("system:getMachineId", async () => {
    try {
      const machineGuid = getMachineGuid();
      return { success: true, machineId: machineGuid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("system:generateValidationKey", async (_event, machineId: string) => {
    try {
      const validationKey = generateValidationKey(machineId);
      return { success: true, validationKey };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle("system:validateKey", async (_event, machineId: string, enteredKey: string) => {
    try {
      const isValid = validateKeyUtil(machineId, enteredKey);
      return { success: true, isValid };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
