import { usePremiumGate, type PremiumBlockReason } from "./usePremiumGate";

export function useAiChatGate() {
  const { canUsePremium, blockReason } = usePremiumGate();
  return { canUseAi: canUsePremium, blockReason };
}

export type AiChatBlockReason = PremiumBlockReason;
