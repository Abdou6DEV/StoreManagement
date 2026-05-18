import { getOption, setOption } from "../database/options";
import { ONLINE_CUSTOMER_ID_OPTION_KEY } from "./constants";

export async function getStoredOnlineCustomerId(): Promise<string | null> {
  const value = (await getOption(ONLINE_CUSTOMER_ID_OPTION_KEY))?.trim();
  return value || null;
}

/** Persists `online.customerId` only when the option is unset (does not overwrite). */
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
