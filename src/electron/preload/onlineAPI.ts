import { ipcRenderer } from "electron";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceCheckResult } from "../types/deviceCheck";

export const onlineAPI = {
  deviceCheck: () => ipcRenderer.invoke("online:deviceCheck") as Promise<DeviceCheckResult>,
  deviceRequest: (payload: DeviceRequestPayload) =>
    ipcRenderer.invoke("online:deviceRequest", payload) as Promise<DeviceRequestResult>,
};
