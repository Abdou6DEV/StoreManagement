
/** Fire-and-forget activity log from the renderer (action must be an i18n key). */
export function logUserActivity(
  username: string | undefined,
  action: string,
  details?: string | null,
): void {
  void window.api?.activityLog
    ?.log({
      username: username?.trim() || "unknown",
      action,
      details: details ?? null,
    })
    .catch((): undefined => undefined);
}
