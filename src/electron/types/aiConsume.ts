export type AiConsumeEntitlementError =
  | "device_not_found"
  | "ai_disabled"
  | "ai_trial_blocked"
  | "ai_not_licensed"
  | "rate_limit_minute"
  | "rate_limit_day";

export type AiConsumeResult =
  | {
      success: true;
      remainingMinute?: number | null;
      remainingDay?: number | null;
      limits?: {
        requests_per_minute: number;
        requests_per_day: number;
      };
    }
  | {
      success: false;
      error: string;
      code:
        | "missing_env"
        | "network"
        | "http"
        | "edge"
        | "invalid"
        | "entitlement";
      entitlementError?: AiConsumeEntitlementError;
    };
