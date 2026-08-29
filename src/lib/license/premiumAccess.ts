export type PremiumBlockReason = "offline" | "trial" | "disabled";

export type PremiumAccess = {
  canUsePremium: boolean;
  blockReason: PremiumBlockReason | null;
};

/** `aiEnabled` from device-check = Premium enabled on the server (`allowed_devices.ai_enabled`). */
export function resolvePremiumAccess(params: {
  isOnline: boolean;
  isTrialActive: boolean;
  aiEnabled?: boolean;
}): PremiumAccess {
  if (!params.isOnline) {
    return { canUsePremium: false, blockReason: "offline" };
  }
  if (params.isTrialActive) {
    return { canUsePremium: false, blockReason: "trial" };
  }
  if (params.aiEnabled === false) {
    return { canUsePremium: false, blockReason: "disabled" };
  }
  return { canUsePremium: true, blockReason: null };
}
