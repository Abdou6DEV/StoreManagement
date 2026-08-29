import type { DeviceCheckResult } from "../../electron/types/deviceCheck";

/** Customer ID from a successful device-check (server truth for this device). Renderer-safe. */
export function readCustomerIdFromDeviceCheck(result: DeviceCheckResult | null): string | null {
  if (result?.success !== true) return null;
  const fromField = result.customerId?.trim();
  if (fromField) return fromField;
  if (result.raw && typeof result.raw === "object") {
    const rawId = (result.raw as Record<string, unknown>).customer_id;
    if (typeof rawId === "string" && rawId.trim()) return rawId.trim();
  }
  return null;
}
