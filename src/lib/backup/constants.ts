/** When `"1"` or `"true"`, upload to cloud after each new daily automatic local backup. */
export const AUTO_CLOUD_BACKUP_ENABLED_OPTION_KEY = "backup.autoCloudUploadEnabled";

export function isAutoCloudBackupEnabledOptionValue(value: string | null | undefined): boolean {
  const v = value?.trim().toLowerCase();
  return v === "1" || v === "true";
}
