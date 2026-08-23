/** Max characters per user chat message (UI + main-process). */
export const MAX_AI_MESSAGE_CHARS = 500;

export const AI_MESSAGE_TOO_LONG = "AI_MESSAGE_TOO_LONG";

/** Min ms between consecutive sends (local anti-spam; kept when Supabase quota ships). */
export const AI_SEND_COOLDOWN_MS = 2_500;

/** Rolling window cap per chat session (local until Supabase owns minute quota). */
export const AI_MAX_MESSAGES_PER_MINUTE = 10;

export const AI_SEND_COOLDOWN = "AI_SEND_COOLDOWN";
export const AI_RATE_LIMIT_MINUTE = "AI_RATE_LIMIT_MINUTE";

const MINUTE_MS = 60_000;

export function resolveAiChatErrorMessage(
  errText: string,
  messages: {
    tooLong: string;
    unavailable: string;
    cooldown: string;
    rateLimitMinute: string;
  },
): string {
  if (errText.includes(AI_MESSAGE_TOO_LONG)) return messages.tooLong;
  if (errText.includes(AI_SEND_COOLDOWN)) return messages.cooldown;
  if (errText.includes(AI_RATE_LIMIT_MINUTE)) return messages.rateLimitMinute;
  return messages.unavailable;
}

export { MINUTE_MS as AI_RATE_LIMIT_WINDOW_MS };
