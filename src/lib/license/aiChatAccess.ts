import {
  resolvePremiumAccess,
  type PremiumAccess,
  type PremiumBlockReason,
} from "./premiumAccess";

export type AiChatBlockReason = PremiumBlockReason;

export type AiChatAccess = {
  canUseAi: boolean;
  blockReason: AiChatBlockReason | null;
};

/** `aiEnabled` from device-check = Premium enabled on the server (`allowed_devices.ai_enabled`). */
export function resolveAiChatAccess(params: {
  isOnline: boolean;
  isTrialActive: boolean;
  aiEnabled?: boolean;
}): AiChatAccess {
  const access = resolvePremiumAccess(params);
  return { canUseAi: access.canUsePremium, blockReason: access.blockReason };
}

export { resolvePremiumAccess, type PremiumAccess, type PremiumBlockReason } from "./premiumAccess";
