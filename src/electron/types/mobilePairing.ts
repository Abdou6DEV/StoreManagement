export type MobileDevice = {
  id: string;
  deviceName: string;
  platform: string;
  pairedAt: string;
  lastSeenAt: string | null;
  active: boolean;
  revokedAt: string | null;
};

export type MobileDeviceListResult =
  | { success: true; devices: MobileDevice[] }
  | { success: false; error: string };

export type MobileDeviceRevokeResult =
  | { success: true }
  | { success: false; error: string };

export type MobilePairingCreateResult =
  | {
      success: true;
      token: string;
      expiresAt: string;
    }
  | {
      success: false;
      error: string;
      code:
        | "missing_env"
        | "not_licensed"
        | "mobile_disabled"
        | "http"
        | "edge"
        | "network"
        | "invalid";
    };
