import type { WebContents } from "electron";
import {
  quotaFromConsumePayload,
  type AiQuotaSnapshot,
} from "../../lib/ai/aiQuota";
import type { AiConsumeResult } from "../types/aiConsume";

let lastQuota: AiQuotaSnapshot | null = null;

export function getCachedAiQuota(): AiQuotaSnapshot | null {
  return lastQuota;
}

export function setCachedAiQuota(
  sender: WebContents | null,
  snapshot: AiQuotaSnapshot | null,
): AiQuotaSnapshot | null {
  lastQuota = snapshot;
  if (snapshot && sender && !sender.isDestroyed()) {
    sender.send("ai:quota", snapshot);
  }
  return snapshot;
}

export function applyAiQuotaFromConsume(
  sender: WebContents,
  result: Extract<AiConsumeResult, { success: true }>,
): AiQuotaSnapshot | null {
  const snapshot = quotaFromConsumePayload({
    remainingMinute: result.remainingMinute,
    remainingDay: result.remainingDay,
    limits: result.limits,
  });
  return setCachedAiQuota(sender, snapshot);
}
