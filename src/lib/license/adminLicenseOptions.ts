/** Last successful manual "Check online" on the License tab (ms), for 1-minute cooldown. */
export const LICENSE_LAST_ONLINE_CHECK_AT_MS_KEY = "license.lastOnlineCheckAtMs";

function parseOptionMs(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function loadLicenseLastOnlineCheckAtMs(): Promise<number | null> {
  const raw = await window.api.database.options.get(LICENSE_LAST_ONLINE_CHECK_AT_MS_KEY);
  return parseOptionMs(raw);
}

export async function persistLicenseLastOnlineCheckAtMs(atMs: number): Promise<void> {
  await window.api.database.options.set(LICENSE_LAST_ONLINE_CHECK_AT_MS_KEY, String(atMs));
}
