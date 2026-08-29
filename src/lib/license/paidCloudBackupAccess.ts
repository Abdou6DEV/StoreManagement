import type { DeviceCheckResult } from "../../electron/types/deviceCheck";
import type { LicenseGraceSnapshot } from "./offlineGrace";
import { isOfflineLicenseAllowed } from "./offlineGrace";
import { resolvePremiumAccess } from "./premiumAccess";

export type CloudBackupAccessBlockReason =
  | "offline"
  | "trial"
  | "disabled"
  | "not_licensed"
  | "subscription_expired"
  | "unknown";

export type PaidCloudBackupAccess = {
  hasPaidCloudBackupAccess: boolean;
  blockReason: CloudBackupAccessBlockReason | null;
};

export function resolvePaidCloudBackupAccess(params: {
  effectiveCheckResult: DeviceCheckResult | null;
  snapshot: LicenseGraceSnapshot | null;
  isLicenseValid: boolean;
  nowMs: number;
  isOnline: boolean;
  aiEnabled?: boolean;
}): PaidCloudBackupAccess {
  const { effectiveCheckResult, snapshot, isLicenseValid, nowMs, isOnline, aiEnabled } = params;

  if (!isOnline) {
    return { hasPaidCloudBackupAccess: false, blockReason: "offline" };
  }

  let trialEndsAtMs: number | null = null;
  let expiresAtMs: number | null = null;

  if (effectiveCheckResult?.success === true) {
    if (effectiveCheckResult.trialEndsAt) {
      const parsed = Date.parse(effectiveCheckResult.trialEndsAt);
      if (Number.isFinite(parsed)) trialEndsAtMs = parsed;
    }
    if (effectiveCheckResult.expiresAt) {
      const parsed = Date.parse(effectiveCheckResult.expiresAt);
      if (Number.isFinite(parsed)) expiresAtMs = parsed;
    }
  }

  if (trialEndsAtMs == null && snapshot?.trialEndsAtMs != null) {
    trialEndsAtMs = snapshot.trialEndsAtMs;
  }
  if (expiresAtMs == null && snapshot?.expiresAtMs != null) {
    expiresAtMs = snapshot.expiresAtMs;
  }

  const isTrialActive =
    trialEndsAtMs != null && Number.isFinite(trialEndsAtMs) && nowMs < trialEndsAtMs;

  const premium = resolvePremiumAccess({ isOnline, isTrialActive, aiEnabled });
  if (!premium.canUsePremium && premium.blockReason === "trial") {
    return { hasPaidCloudBackupAccess: false, blockReason: "trial" };
  }

  let hasPaidAccess = false;

  if (!effectiveCheckResult) {
    if (!snapshot) {
      return { hasPaidCloudBackupAccess: false, blockReason: "unknown" };
    }
    if (!isOfflineLicenseAllowed(snapshot, nowMs)) {
      return { hasPaidCloudBackupAccess: false, blockReason: "not_licensed" };
    }
    hasPaidAccess = isLicenseValid;
  } else if (effectiveCheckResult.success === true) {
    if (!effectiveCheckResult.allowed) {
      return { hasPaidCloudBackupAccess: false, blockReason: "not_licensed" };
    }
    hasPaidAccess = true;
  } else if (
    effectiveCheckResult.code === "network" &&
    snapshot &&
    isOfflineLicenseAllowed(snapshot, nowMs)
  ) {
    hasPaidAccess = isLicenseValid;
  } else {
    return { hasPaidCloudBackupAccess: false, blockReason: "not_licensed" };
  }

  if (!hasPaidAccess) {
    return { hasPaidCloudBackupAccess: false, blockReason: "not_licensed" };
  }

  if (expiresAtMs != null) {
    if (nowMs >= expiresAtMs) {
      return { hasPaidCloudBackupAccess: false, blockReason: "subscription_expired" };
    }
  }

  if (!premium.canUsePremium) {
    return {
      hasPaidCloudBackupAccess: false,
      blockReason: premium.blockReason ?? "disabled",
    };
  }

  return { hasPaidCloudBackupAccess: true, blockReason: null };
}
