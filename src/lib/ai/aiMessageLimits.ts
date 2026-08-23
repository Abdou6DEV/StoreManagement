/** Max characters per user chat message (UI + main-process). */
export const MAX_AI_MESSAGE_CHARS = 500;

export const AI_MESSAGE_TOO_LONG = "AI_MESSAGE_TOO_LONG";

/** Thrown when ai-consume cannot be reached (offline / network). */
export const AI_OFFLINE = "ai_offline";

export function resolveAiChatErrorMessage(
  errText: string,
  messages: {
    tooLong: string;
    unavailable: string;
    rateLimitMinute: string;
    rateLimitDay: string;
    disabled: string;
    notLicensed: string;
    offline: string;
    trialBlocked: string;
  },
): string {
  if (errText.includes(AI_MESSAGE_TOO_LONG)) return messages.tooLong;
  if (errText.includes(AI_OFFLINE)) return messages.offline;
  if (errText.includes("ai_disabled")) return messages.disabled;
  if (errText.includes("ai_trial_blocked")) return messages.trialBlocked;
  if (errText.includes("ai_not_licensed")) return messages.notLicensed;
  if (errText.includes("rate_limit_minute")) return messages.rateLimitMinute;
  if (errText.includes("rate_limit_day")) return messages.rateLimitDay;
  return messages.unavailable;
}
