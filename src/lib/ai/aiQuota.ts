export type AiQuotaLimits = {
  requests_per_minute: number;
  requests_per_day: number;
};

export type AiQuotaSnapshot = {
  remainingMinute: number | null;
  remainingDay: number | null;
  limits: AiQuotaLimits;
};

export function quotaFromConsumePayload(payload: {
  remainingMinute?: number | null;
  remainingDay?: number | null;
  limits?: AiQuotaLimits;
}): AiQuotaSnapshot | null {
  if (!payload.limits) return null;
  return {
    remainingMinute:
      payload.remainingMinute === undefined ? null : payload.remainingMinute,
    remainingDay:
      payload.remainingDay === undefined ? null : payload.remainingDay,
    limits: payload.limits,
  };
}

export function dailyQuotaProgress(quota: AiQuotaSnapshot | null): {
  used: number;
  max: number;
  ratio: number;
} | null {
  if (!quota?.limits?.requests_per_day) return null;
  const max = quota.limits.requests_per_day;
  const remaining =
    quota.remainingDay == null ? max : Math.max(quota.remainingDay, 0);
  const used = Math.min(Math.max(max - remaining, 0), max);
  return {
    used,
    max,
    ratio: max > 0 ? used / max : 0,
  };
}
