import { getOption, setOption } from "../database/options";
import { ONLINE_CUSTOMER_ID_OPTION_KEY } from "./constants";

export { readCustomerIdFromDeviceCheck } from "./deviceCheckCustomerId";

export async function getStoredOnlineCustomerId(): Promise<string | null> {
  const value = (await getOption(ONLINE_CUSTOMER_ID_OPTION_KEY))?.trim();
  return value || null;
}

/**
 * Persists `online.customerId` from the server when this device is registered online.
 * Overwrites a stale local value (e.g. after DB restore or linking another shop).
 */
export async function syncOnlineCustomerIdFromServer(
  customerId: string | null | undefined,
): Promise<string | null> {
  const trimmed = (customerId ?? "").trim();
  if (!trimmed) {
    return getStoredOnlineCustomerId();
  }

  const existing = await getStoredOnlineCustomerId();
  if (existing !== trimmed) {
    await setOption(ONLINE_CUSTOMER_ID_OPTION_KEY, trimmed);
  }
  return trimmed;
}

/** @deprecated Prefer {@link syncOnlineCustomerIdFromServer} for server responses. */
export async function persistOnlineCustomerIdIfAbsent(
  customerId: string | null | undefined,
): Promise<string | null> {
  const trimmed = (customerId ?? "").trim();
  if (!trimmed) {
    return getStoredOnlineCustomerId();
  }

  const existing = await getStoredOnlineCustomerId();
  if (existing) {
    return existing;
  }

  await setOption(ONLINE_CUSTOMER_ID_OPTION_KEY, trimmed);
  return trimmed;
}
