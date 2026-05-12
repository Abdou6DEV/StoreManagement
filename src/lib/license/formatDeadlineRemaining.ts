import type { TFunction } from "i18next";

export function formatDeadlineRemaining(
  deadlineMs: number,
  nowMs: number,
  t: TFunction,
): string {
  if (nowMs >= deadlineMs) {
    return t("navigation.trialExpired", "Expired");
  }

  const diffMs = deadlineMs - nowMs;
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) {
    return t("navigation.trialRemainingDaysHours", "{{days}}d {{hours}}h left", { days, hours });
  }
  if (hours > 0) {
    return t("navigation.trialRemainingHoursMinutes", "{{hours}}h {{minutes}}m left", { hours, minutes });
  }
  return t("navigation.trialRemainingMinutes", "{{minutes}}m left", { minutes });
}
