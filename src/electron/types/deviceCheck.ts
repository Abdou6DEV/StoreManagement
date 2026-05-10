export type DeviceCheckResult =
  | {
      success: true;
      allowed: boolean;
      trialEndsAt?: string | null;
      expiresAt?: string | null;
      raw?: unknown;
    }
  | {
      success: false;
      error: string;
      code: "missing_env" | "network" | "http" | "edge" | "invalid";
    };
