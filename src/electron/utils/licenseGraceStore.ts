import fs from "fs";
import path from "path";
import { app } from "electron";
import { getMachineGuid } from "./validationKey";

export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export const LEGACY_LICENSE_OPTION_KEYS = [
  "license.last_ok_at_ms",
  "license.last_ok_grace_until_ms",
  "license.last_ok_trial_ends_at_ms",
  "license.last_ok_expires_at_ms",
] as const;

export type StoredLicenseGrace = {
  deviceId: string;
  lastOkAtMs: number;
  graceUntilMs: number;
  trialEndsAtMs?: number;
  expiresAtMs?: number;
  aiEnabled?: boolean;
};

export type LicenseGraceSnapshot = Omit<StoredLicenseGrace, "deviceId">;

function licenseGraceFilePath(): string {
  return path.join(app.getPath("userData"), "license-grace.json");
}

function parseIsoToMs(value: string | null | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readDeviceId(): string | null {
  try {
    return getMachineGuid();
  } catch {
    return null;
  }
}

function isValidSnapshot(data: StoredLicenseGrace, deviceId: string): boolean {
  return (
    data.deviceId === deviceId &&
    Number.isFinite(data.lastOkAtMs) &&
    Number.isFinite(data.graceUntilMs)
  );
}

export function readStoredLicenseGrace(): LicenseGraceSnapshot | null {
  const deviceId = readDeviceId();
  if (!deviceId) return null;

  const filePath = licenseGraceFilePath();
  if (!fs.existsSync(filePath)) return null;

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as StoredLicenseGrace;
    if (!isValidSnapshot(parsed, deviceId)) return null;

    const { deviceId: _deviceId, ...snapshot } = parsed;
    return snapshot;
  } catch {
    return null;
  }
}

export function persistStoredLicenseGrace(
  trialEndsAt?: string | null,
  expiresAt?: string | null,
  aiEnabled?: boolean,
): void {
  const deviceId = readDeviceId();
  if (!deviceId) {
    throw new Error("Could not read device identity for license grace storage.");
  }

  const nowMs = Date.now();
  const trialEndsAtMs = parseIsoToMs(trialEndsAt);
  const expiresAtMs = parseIsoToMs(expiresAt);
  const payload: StoredLicenseGrace = {
    deviceId,
    lastOkAtMs: nowMs,
    graceUntilMs: nowMs + OFFLINE_GRACE_MS,
    trialEndsAtMs:
      trialEndsAtMs != null && trialEndsAtMs > nowMs ? trialEndsAtMs : undefined,
    expiresAtMs,
    ...(typeof aiEnabled === "boolean" ? { aiEnabled } : {}),
  };

  const filePath = licenseGraceFilePath();
  fs.writeFileSync(filePath, JSON.stringify(payload), "utf8");
}

export function clearStoredLicenseGrace(): void {
  const filePath = licenseGraceFilePath();
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
