export type DeviceCheckResult =
  | {
      success: true;
      allowed: boolean;
      trialEndsAt?: string | null;
      expiresAt?: string | null;
      /** Present when `allowed_devices` has a row for this device (Supabase `device-check`). */
      customerId?: string | null;
      /** Optional; add to Edge `device-check` JSON when available. */
      customerName?: string | null;
      customerPhone?: string | null;
      raw?: unknown;
    }
  | {
      success: false;
      error: string;
      code: "missing_env" | "network" | "http" | "edge" | "invalid";
    };
