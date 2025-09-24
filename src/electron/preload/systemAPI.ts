import { ipcRenderer } from "electron";

export const systemAPI = {
  getMachineId: () => ipcRenderer.invoke("system:getMachineId"),
  generateValidationKey: (machineId: string) => ipcRenderer.invoke("system:generateValidationKey", machineId),
  validateKey: (machineId: string, enteredKey: string) => ipcRenderer.invoke("system:validateKey", machineId, enteredKey),
};

