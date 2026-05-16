export type DeviceLinkExistingPayload = {
  customerId: string;
  name: string;
  phone: string;
};

export type DeviceLinkExistingResult =
  | {
      success: true;
      customerId: string;
      mode?: string | null;
      alreadyLinked?: boolean;
      raw?: unknown;
    }
  | {
      success: false;
      error: string;
      code: "missing_env" | "network" | "http" | "edge" | "invalid";
    };
