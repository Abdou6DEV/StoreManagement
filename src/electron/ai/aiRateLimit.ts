import {
  AI_MAX_MESSAGES_PER_MINUTE,
  AI_RATE_LIMIT_MINUTE,
  AI_RATE_LIMIT_WINDOW_MS,
  AI_SEND_COOLDOWN,
  AI_SEND_COOLDOWN_MS,
} from "../../lib/ai/aiMessageLimits";
import type { AiSession } from "./aiSession";

export type AiRateLimitResult =
  | { ok: true }
  | { ok: false; code: typeof AI_SEND_COOLDOWN | typeof AI_RATE_LIMIT_MINUTE };

function pruneSendTimestamps(session: AiSession, nowMs: number) {
  session.recentSendTimestampsMs = session.recentSendTimestampsMs.filter(
    (atMs) => nowMs - atMs < AI_RATE_LIMIT_WINDOW_MS,
  );
}

export function checkAiSendRateLimit(
  session: AiSession,
  nowMs = Date.now(),
): AiRateLimitResult {
  pruneSendTimestamps(session, nowMs);

  if (
    session.lastSendAtMs != null &&
    nowMs - session.lastSendAtMs < AI_SEND_COOLDOWN_MS
  ) {
    return { ok: false, code: AI_SEND_COOLDOWN };
  }

  if (session.recentSendTimestampsMs.length >= AI_MAX_MESSAGES_PER_MINUTE) {
    return { ok: false, code: AI_RATE_LIMIT_MINUTE };
  }

  return { ok: true };
}

export function recordAiSend(session: AiSession, nowMs = Date.now()) {
  pruneSendTimestamps(session, nowMs);
  session.recentSendTimestampsMs.push(nowMs);
  session.lastSendAtMs = nowMs;
}

export function resetAiSendRateLimit(session: AiSession) {
  session.recentSendTimestampsMs = [];
  session.lastSendAtMs = null;
}
