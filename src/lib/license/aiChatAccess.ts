export type AiChatBlockReason = "offline" | "trial";

export type AiChatAccess = {
  canUseAi: boolean;
  blockReason: AiChatBlockReason | null;
};

export function resolveAiChatAccess(params: {
  isOnline: boolean;
  isTrialActive: boolean;
}): AiChatAccess {
  if (!params.isOnline) {
    return { canUseAi: false, blockReason: "offline" };
  }
  if (params.isTrialActive) {
    return { canUseAi: false, blockReason: "trial" };
  }
  return { canUseAi: true, blockReason: null };
}
