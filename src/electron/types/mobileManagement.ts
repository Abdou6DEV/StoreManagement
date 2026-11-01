import type { DeviceCheckResult } from "./deviceCheck";
import type { MobileDevice } from "./mobilePairing";

export type MobileManagementSnapshot = {
  deviceCheck: DeviceCheckResult | null;
  devices: MobileDevice[];
  devicesError: string | null;
  updatedAt: string | null;
};