import type { DeviceCheckResult } from "../../electron/types/deviceCheck";
import {
  ONLINE_CUSTOMER_NAME_OPTION_KEY,
  ONLINE_CUSTOMER_PHONE_OPTION_KEY,
} from "./constants";

export type OnlineCustomerProfile = {
  name: string | null;
  phone: string | null;
};

export async function loadOnlineCustomerProfile(): Promise<OnlineCustomerProfile> {
  const [nameRaw, phoneRaw] = await Promise.all([
    window.api.database.options.get(ONLINE_CUSTOMER_NAME_OPTION_KEY),
    window.api.database.options.get(ONLINE_CUSTOMER_PHONE_OPTION_KEY),
  ]);
  return {
    name: nameRaw?.trim() || null,
    phone: phoneRaw?.trim() || null,
  };
}

/** Overwrites stored name/phone when non-empty values are provided. */
export async function persistOnlineCustomerProfile(
  name: string | null | undefined,
  phone: string | null | undefined,
): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  const trimmedName = name?.trim();
  const trimmedPhone = phone?.trim();
  if (trimmedName) {
    tasks.push(window.api.database.options.set(ONLINE_CUSTOMER_NAME_OPTION_KEY, trimmedName));
  }
  if (trimmedPhone) {
    tasks.push(window.api.database.options.set(ONLINE_CUSTOMER_PHONE_OPTION_KEY, trimmedPhone));
  }
  if (tasks.length > 0) {
    await Promise.all(tasks);
  }
}

/** Mirrors `device-check` customer fields into SQLite options on each successful response. */
export async function persistOnlineCustomerProfileFromDeviceCheck(
  result: DeviceCheckResult,
): Promise<void> {
  if (result.success !== true) return;
  await persistOnlineCustomerProfile(result.customerName, result.customerPhone);
}
