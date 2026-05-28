import type { DeviceCheckResult } from "../../electron/types/deviceCheck";
import { persistOnlineCustomerProfileFromDeviceCheck } from "../onboarding/onlineCustomerProfile";

export const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

export type LicenseGraceSnapshot = {
  lastOkAtMs: number;
  graceUntilMs: number;
  trialEndsAtMs?: number;
  expiresAtMs?: number;
};

export function getEffectiveOfflineDeadlineMs(
  snapshot: LicenseGraceSnapshot,
  nowMs: number = Date.now(),
): number {
  const candidates = [snapshot.graceUntilMs];
  if (snapshot.trialEndsAtMs != null && snapshot.trialEndsAtMs > nowMs) {
    candidates.push(snapshot.trialEndsAtMs);
  }
  if (snapshot.expiresAtMs != null) {
    candidates.push(snapshot.expiresAtMs);
  }
  return Math.min(...candidates);
}

export function isOfflineLicenseAllowed(
  snapshot: LicenseGraceSnapshot | null,
  nowMs: number = Date.now(),
): boolean {
  if (!snapshot) return false;
  return nowMs < getEffectiveOfflineDeadlineMs(snapshot);
}

export async function readLicenseGraceSnapshot(): Promise<LicenseGraceSnapshot | null> {
  return window.api.online.readLicenseGrace();
}

export async function resolveLicenseValidityFromDeviceCheck(
  result: DeviceCheckResult,
): Promise<boolean> {
  if (result.success === true) {
    await persistOnlineCustomerProfileFromDeviceCheck(result);
    if (!result.allowed) return false;
    return true;
  }

  if (result.code === "network") {
    const snapshot = await readLicenseGraceSnapshot();
    return isOfflineLicenseAllowed(snapshot);
  }

  return false;
}
