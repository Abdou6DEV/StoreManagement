export type DeviceRequestPayload = {
  name: string;
  phone: string;
  customerId?: string;
};

export type DeviceRequestResult =
  | { success: true; customerId?: string | null; raw?: unknown }
  | { success: false; error: string; code: "missing_env" | "network" | "http" | "edge" | "invalid" };
