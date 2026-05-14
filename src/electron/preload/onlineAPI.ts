import { ipcRenderer } from "electron";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceCheckResult } from "../types/deviceCheck";
import type { LicenseGraceSnapshot } from "./types";
import type {
  CloudBackupDownloadResult,
  CloudBackupDownloadToLocalResult,
  CloudBackupTransferProgressPayload,
  CloudBackupUploadResult,
} from "../types/cloudBackup";

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
  backupUploadLatest: (backupFilePath: string, uploadSource?: string) =>
    ipcRenderer.invoke("online:backupUploadLatest", backupFilePath, uploadSource) as Promise<CloudBackupUploadResult>,
  backupDownloadLatest: () =>
    ipcRenderer.invoke("online:backupDownloadLatest") as Promise<CloudBackupDownloadResult>,
  backupDownloadLatestToLocal: () =>
    ipcRenderer.invoke("online:backupDownloadLatestToLocal") as Promise<CloudBackupDownloadToLocalResult>,
  onCloudBackupTransferProgress: (
    callback: (data: CloudBackupTransferProgressPayload) => void,
  ): (() => void) => {
    const handler = (_e: unknown, data: CloudBackupTransferProgressPayload) => callback(data);
    ipcRenderer.on("cloud-backup-transfer-progress", handler);
    const cleanup = (): void => {
      void ipcRenderer.removeListener("cloud-backup-transfer-progress", handler);
    };
    return cleanup;
  },
};
