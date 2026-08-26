/** Whole points only. 8k tokens = 1, 16k = 2, 24k = 3, … */
export const AI_TOKENS_PER_POINT = 8000;

/** Successful receipt scan. Charged on ai_usage_daily only (plus 1 toward the minute cap). */
export const AI_SCAN_DAY_POINTS = 10;

export function chatDayPointsFromTokens(tokens: number): number {
  if (!Number.isFinite(tokens) || tokens <= 0) return 1;
  return Math.max(1, Math.floor(tokens / AI_TOKENS_PER_POINT));
}
