import type { CloudBackupUploadMeta } from "../types/cloudBackup";
import { isInstalledAppOlderThan } from "../../lib/utils/compareVersions";

export function parseCloudBackupUploadMeta(value: unknown): CloudBackupUploadMeta | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.uploaded_at !== "string" ||
    typeof o.size_bytes !== "number" ||
    typeof o.source !== "string" ||
    typeof o.app_version !== "string" ||
    typeof o.device_id !== "string" ||
    typeof o.customer_id !== "string"
  ) {
    return null;
  }
  return {
    uploaded_at: o.uploaded_at,
    size_bytes: o.size_bytes,
    source: o.source,
    app_version: o.app_version,
    device_id: o.device_id,
    customer_id: o.customer_id,
  };
}

export type CloudBackupVersionGateFailure = {
  blocked: true;
  cloudAppVersion: string;
  installedAppVersion: string;
};

export function checkCloudBackupAppVersionGate(
  meta: CloudBackupUploadMeta,
  installedAppVersion: string,
): CloudBackupVersionGateFailure | { blocked: false } {
  const cloud = meta.app_version.trim();
  const installed = installedAppVersion.trim();
  if (!cloud || !installed) return { blocked: false };
  if (isInstalledAppOlderThan(installed, cloud)) {
    return { blocked: true, cloudAppVersion: cloud, installedAppVersion: installed };
  }
  return { blocked: false };
}
