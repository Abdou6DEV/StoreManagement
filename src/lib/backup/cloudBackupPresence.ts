/** Last server presence check time (ms), set when check/upload/download got a definitive result. */
export const CLOUD_BACKUP_LAST_CHECK_AT_MS_KEY = "backup.cloudLastCheckAtMs";

/** `"1"` = cloud file exists; `"0"` = confirmed none; unset = unknown. */
export const CLOUD_BACKUP_LAST_CHECK_AVAILABLE_KEY = "backup.cloudLastCheckAvailable";

/** Last manual "Check cloud backup" click (ms), for 1-minute button cooldown. */
export const CLOUD_BACKUP_LAST_MANUAL_CHECK_AT_MS_KEY = "backup.cloudLastManualCheckAtMs";

/** Last manual "Create & upload to cloud" click (ms), for 1-minute button cooldown. */
export const CLOUD_BACKUP_LAST_MANUAL_UPLOAD_AT_MS_KEY = "backup.cloudLastManualUploadAtMs";

/** `"1"` after the one-time silent presence probe on first Backup tab visit. */
export const CLOUD_BACKUP_INITIAL_CHECK_DONE_KEY = "backup.cloudInitialCheckDone";

export type CloudBackupPresenceSnapshot = {
  lastCheckAtMs: number | null;
  available: boolean | null;
  lastManualCheckAtMs: number | null;
  lastManualUploadAtMs: number | null;
  initialCheckDone: boolean;
};

function parseOptionMs(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number(value.trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function loadCloudBackupPresenceFromOptions(): Promise<CloudBackupPresenceSnapshot> {
  const [atMs, avail, manualAtMs, manualUploadAtMs, initialDone] = await Promise.all([
    window.api.database.options.get(CLOUD_BACKUP_LAST_CHECK_AT_MS_KEY),
    window.api.database.options.get(CLOUD_BACKUP_LAST_CHECK_AVAILABLE_KEY),
    window.api.database.options.get(CLOUD_BACKUP_LAST_MANUAL_CHECK_AT_MS_KEY),
    window.api.database.options.get(CLOUD_BACKUP_LAST_MANUAL_UPLOAD_AT_MS_KEY),
    window.api.database.options.get(CLOUD_BACKUP_INITIAL_CHECK_DONE_KEY),
  ]);
  const trimmedAvail = avail?.trim();
  const available =
    trimmedAvail === "1" ? true : trimmedAvail === "0" ? false : null;
  return {
    lastCheckAtMs: parseOptionMs(atMs),
    available,
    lastManualCheckAtMs: parseOptionMs(manualAtMs),
    lastManualUploadAtMs: parseOptionMs(manualUploadAtMs),
    initialCheckDone: initialDone === "1" || initialDone?.trim().toLowerCase() === "true",
  };
}

export async function persistCloudBackupPresence(
  snapshot: CloudBackupPresenceSnapshot,
): Promise<void> {
  const tasks: Promise<unknown>[] = [];

  if (snapshot.lastCheckAtMs != null) {
    tasks.push(
      window.api.database.options.set(
        CLOUD_BACKUP_LAST_CHECK_AT_MS_KEY,
        String(snapshot.lastCheckAtMs),
      ),
    );
    if (snapshot.available === true) {
      tasks.push(window.api.database.options.set(CLOUD_BACKUP_LAST_CHECK_AVAILABLE_KEY, "1"));
    } else if (snapshot.available === false) {
      tasks.push(window.api.database.options.set(CLOUD_BACKUP_LAST_CHECK_AVAILABLE_KEY, "0"));
    }
  }

  if (snapshot.lastManualCheckAtMs != null) {
    tasks.push(
      window.api.database.options.set(
        CLOUD_BACKUP_LAST_MANUAL_CHECK_AT_MS_KEY,
        String(snapshot.lastManualCheckAtMs),
      ),
    );
  }

  if (snapshot.lastManualUploadAtMs != null) {
    tasks.push(
      window.api.database.options.set(
        CLOUD_BACKUP_LAST_MANUAL_UPLOAD_AT_MS_KEY,
        String(snapshot.lastManualUploadAtMs),
      ),
    );
  }

  if (snapshot.initialCheckDone) {
    tasks.push(window.api.database.options.set(CLOUD_BACKUP_INITIAL_CHECK_DONE_KEY, "1"));
  }

  await Promise.all(tasks);
}
