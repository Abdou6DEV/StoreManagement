import { ipcRenderer } from "electron";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceLinkExistingPayload, DeviceLinkExistingResult } from "../types/deviceLinkExisting";
import type { DeviceCheckResult } from "../types/deviceCheck";
import type { LicenseGraceSnapshot } from "./types";
import type {
  CloudBackupDownloadResult,
  CloudBackupDownloadToLocalResult,
  CloudBackupTransferProgressPayload,
  CloudBackupUploadResult,
} from "../types/cloudBackup";
import type {
  InvoiceScanCreateResult,
  InvoiceScanDownloadResult,
  InvoiceScanStartResult,
  InvoiceScanStatusResult,
} from "../types/invoiceScan";

export const onlineAPI = {
  deviceCheck: () => ipcRenderer.invoke("online:deviceCheck") as Promise<DeviceCheckResult>,
  deviceRequest: (payload: DeviceRequestPayload) =>
    ipcRenderer.invoke("online:deviceRequest", payload) as Promise<DeviceRequestResult>,
  deviceLinkExisting: (payload: DeviceLinkExistingPayload) =>
    ipcRenderer.invoke("online:deviceLinkExisting", payload) as Promise<DeviceLinkExistingResult>,
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
  backupDownloadLatestToLocal: (customerId?: string) =>
    ipcRenderer.invoke("online:backupDownloadLatestToLocal", customerId) as Promise<CloudBackupDownloadToLocalResult>,
  invoiceScanCreateSession: () =>
    ipcRenderer.invoke("online:invoiceScanCreateSession") as Promise<InvoiceScanCreateResult>,
  invoiceScanStartSession: (forceNew?: boolean) =>
    ipcRenderer.invoke("online:invoiceScanStartSession", forceNew === true) as Promise<InvoiceScanStartResult>,
  invoiceScanGetStatus: (sessionId: string) =>
    ipcRenderer.invoke("online:invoiceScanGetStatus", sessionId) as Promise<InvoiceScanStatusResult>,
  invoiceScanDownloadAndCleanup: (sessionId: string) =>
    ipcRenderer.invoke(
      "online:invoiceScanDownloadAndCleanup",
      sessionId,
    ) as Promise<InvoiceScanDownloadResult>,
  invoiceScanDeleteTemp: (localPath: string) =>
    ipcRenderer.invoke("online:invoiceScanDeleteTemp", localPath) as Promise<{
      success: boolean;
    }>,
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
