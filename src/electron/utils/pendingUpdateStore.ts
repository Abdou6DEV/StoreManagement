import fs from "fs";
import path from "path";
import { app } from "electron";

export type PendingUpdate = {
  version: string;
  path: string;
  downloadedAtMs: number;
};

function pendingUpdateFilePath(): string {
  return path.join(app.getPath("userData"), "pending-update.json");
}

export function readPendingUpdateRecord(): PendingUpdate | null {
  const filePath = pendingUpdateFilePath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as PendingUpdate;
    if (
      typeof parsed.version !== "string" ||
      !parsed.version.trim() ||
      typeof parsed.path !== "string" ||
      !parsed.path.trim()
    ) {
      return null;
    }
    return {
      version: parsed.version.trim(),
      path: parsed.path.trim(),
      downloadedAtMs:
        typeof parsed.downloadedAtMs === "number" && Number.isFinite(parsed.downloadedAtMs)
          ? parsed.downloadedAtMs
          : Date.now(),
    };
  } catch {
    return null;
  }
}

/** Returns pending update only if the installer file still exists; otherwise clears and returns null. */
export function readValidPendingUpdate(): PendingUpdate | null {
  const pending = readPendingUpdateRecord();
  if (!pending) return null;

  if (!fs.existsSync(pending.path)) {
    clearPendingUpdate();
    return null;
  }

  return pending;
}

export function persistPendingUpdate(version: string, installerPath: string): void {
  const payload: PendingUpdate = {
    version: version.trim(),
    path: installerPath.trim(),
    downloadedAtMs: Date.now(),
  };
  if (!payload.version || !payload.path) {
    throw new Error("Invalid pending update payload.");
  }
  fs.writeFileSync(pendingUpdateFilePath(), JSON.stringify(payload), "utf8");
}

export function clearPendingUpdate(): void {
  const filePath = pendingUpdateFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
