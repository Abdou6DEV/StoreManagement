/** When `"1"`/`"true"` (or unset), start downloading available updates after login. */
export const AUTO_DOWNLOAD_UPDATES_OPTION_KEY = "updates.autoDownloadEnabled";

/** Default ON when the option has never been saved. */
export function isAutoDownloadUpdatesEnabledOptionValue(
  value: string | null | undefined,
): boolean {
  if (value == null || value.trim() === "") return true;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true";
}
