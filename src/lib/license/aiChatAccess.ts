export type AiChatBlockReason = "offline" | "trial" | "disabled";

export type AiChatAccess = {
  canUseAi: boolean;
  blockReason: AiChatBlockReason | null;
};

export function resolveAiChatAccess(params: {
  isOnline: boolean;
  isTrialActive: boolean;
  /** From last successful device-check; when `false`, block paid users without AI. */
  aiEnabled?: boolean;
}): AiChatAccess {
  if (!params.isOnline) {
    return { canUseAi: false, blockReason: "offline" };
  }
  if (params.isTrialActive) {
    return { canUseAi: false, blockReason: "trial" };
  }
  if (params.aiEnabled === false) {
    return { canUseAi: false, blockReason: "disabled" };
  }
  return { canUseAi: true, blockReason: null };
}
