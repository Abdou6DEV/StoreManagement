import { ipcRenderer } from "electron";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceCheckResult } from "../types/deviceCheck";
import type { LicenseGraceSnapshot } from "./types";

export const onlineAPI = {
  deviceCheck: () => ipcRenderer.invoke("online:deviceCheck") as Promise<DeviceCheckResult>,
  deviceRequest: (payload: DeviceRequestPayload) =>
    ipcRenderer.invoke("online:deviceRequest", payload) as Promise<DeviceRequestResult>,
  readLicenseGrace: () =>
    ipcRenderer.invoke("online:licenseGrace:read") as Promise<LicenseGraceSnapshot | null>,
  persistLicenseGrace: (payload: { trialEndsAt?: string | null; expiresAt?: string | null }) =>
    ipcRenderer.invoke("online:licenseGrace:persist", payload) as Promise<
      { success: true } | { success: false; error: string }
    >,
  clearLicenseGrace: () =>
    ipcRenderer.invoke("online:licenseGrace:clear") as Promise<{ success: true }>,
};
