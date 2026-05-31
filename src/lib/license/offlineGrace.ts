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

export function readLicenseDeadlines(
  lastResult: DeviceCheckResult | null,
  snapshot: LicenseGraceSnapshot | null,
): { trialEndsAtMs: number | null; expiresAtMs: number | null } {
  let trialEndsAtMs: number | null = null;
  let expiresAtMs: number | null = null;

  if (lastResult?.success === true) {
    if (lastResult.trialEndsAt != null) {
      const parsed = Date.parse(lastResult.trialEndsAt);
      if (Number.isFinite(parsed)) trialEndsAtMs = parsed;
    }
    if (lastResult.expiresAt != null) {
      const parsed = Date.parse(lastResult.expiresAt);
      if (Number.isFinite(parsed)) expiresAtMs = parsed;
    }
  }

  if (trialEndsAtMs == null && snapshot?.trialEndsAtMs != null) {
    trialEndsAtMs = snapshot.trialEndsAtMs;
  }
  if (expiresAtMs == null && snapshot?.expiresAtMs != null) {
    expiresAtMs = snapshot.expiresAtMs;
  }

  return { trialEndsAtMs, expiresAtMs };
}

/** Enforces trial/subscription end while the app session is open (ignores offline grace extension). */
export function isSessionLicenseAccessAllowed(
  lastResult: DeviceCheckResult | null,
  snapshot: LicenseGraceSnapshot | null,
  nowMs: number = Date.now(),
): boolean {
  const { trialEndsAtMs, expiresAtMs } = readLicenseDeadlines(lastResult, snapshot);

  const isTrialActive = trialEndsAtMs != null && nowMs < trialEndsAtMs;

  if (isTrialActive) {
    if (lastResult?.success === true) return lastResult.allowed;
    return isOfflineLicenseAllowed(snapshot, nowMs);
  }

  if (expiresAtMs != null) {
    return nowMs < expiresAtMs;
  }

  if (trialEndsAtMs != null && nowMs >= trialEndsAtMs) {
    return false;
  }

  if (lastResult?.success === true) return lastResult.allowed;
  return isOfflineLicenseAllowed(snapshot, nowMs);
}

export async function readLicenseGraceSnapshot(): Promise<LicenseGraceSnapshot | null> {
  return window.api.online.readLicenseGrace();
}

export async function persistLicenseGraceFromAllowedCheck(
  trialEndsAt?: string | null,
  expiresAt?: string | null,
): Promise<void> {
  const result = await window.api.online.persistLicenseGrace({ trialEndsAt, expiresAt });
  if (result.success === false) {
    throw new Error(result.error);
  }
}

export async function resolveLicenseValidityFromDeviceCheck(
  result: DeviceCheckResult,
): Promise<boolean> {
  if (result.success === true) {
    await persistOnlineCustomerProfileFromDeviceCheck(result);
    if (!result.allowed) return false;
    await persistLicenseGraceFromAllowedCheck(result.trialEndsAt, result.expiresAt);
    const snapshot = await readLicenseGraceSnapshot();
    return isSessionLicenseAccessAllowed(result, snapshot);
  }

  if (result.code === "network") {
    const snapshot = await readLicenseGraceSnapshot();
    return isSessionLicenseAccessAllowed(null, snapshot);
  }

  return false;
}
