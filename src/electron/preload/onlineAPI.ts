import { ipcRenderer } from "electron";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";

export const onlineAPI = {
  deviceRequest: (payload: DeviceRequestPayload) =>
    ipcRenderer.invoke("online:deviceRequest", payload) as Promise<DeviceRequestResult>,
};
