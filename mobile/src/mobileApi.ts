export type MobileLanguage = "en" | "fr" | "ar";
export type MobileRow = Record<string, unknown>;

export type MobilePermissions = {
  can_access_cashier: boolean;
  can_access_stock: boolean;
  can_access_clients: boolean;
  can_access_bills: boolean;
  can_access_history: boolean;
  can_access_dashboard: boolean;
  can_access_services: boolean;
  can_access_zakat: boolean;
  can_manage_users: boolean;
  can_view_logs: boolean;
  can_manage_settings: boolean;
};

export type MobileUser = {
  id: string;
  username: string;
  role: string;
  permissions: MobilePermissions;
};

export type MobileBundle = {
  dashboard_daily: MobileRow[];
  products: MobileRow[];
  clients: MobileRow[];
  payments: MobileRow[];
  service_appointments: MobileRow[];
  bills: MobileRow[];
  bill_payments: MobileRow[];
  services: MobileRow[];
};

export type MobileSessionResponse = {
  ok: true;
  session_code?: string;
  expires_at?: string;
  user: MobileUser;
  data: MobileBundle;
};

export const MOBILE_DEVICE_CREDENTIAL_KEY = "reda-mobile-device-credential";

export const MOBILE_SUPABASE_URL = (
  import.meta.env.VITE_MOBILE_SUPABASE_URL ??
  "https://rztritesbzeunyjluqdi.supabase.co"
).replace(/\/$/, "");
export const MOBILE_PUBLISHABLE_KEY =
  import.meta.env.VITE_MOBILE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_xgFvypeJMKifcefAPiS38Q_niLG4IR9";

export class MobileApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "MobileApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPermissions(value: unknown): value is MobilePermissions {
  if (!isRecord(value)) return false;
  return [
    "can_access_cashier",
    "can_access_stock",
    "can_access_clients",
    "can_access_bills",
    "can_access_history",
    "can_access_dashboard",
    "can_access_services",
    "can_access_zakat",
    "can_manage_users",
    "can_view_logs",
    "can_manage_settings",
  ].every((key) => typeof value[key] === "boolean");
}

function rows(value: unknown): MobileRow[] {
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new MobileApiError("invalid_response", 502);
  }
  return value;
}

function validateSessionResponse(value: unknown): MobileSessionResponse {
  if (
    !isRecord(value) ||
    value.ok !== true ||
    !isRecord(value.user) ||
    !isPermissions(value.user.permissions) ||
    !isRecord(value.data)
  ) {
    throw new MobileApiError("invalid_response", 502);
  }
  if (
    typeof value.user.id !== "string" ||
    typeof value.user.username !== "string" ||
    typeof value.user.role !== "string"
  ) {
    throw new MobileApiError("invalid_response", 502);
  }

  const user: MobileUser = {
    id: value.user.id,
    username: value.user.username,
    role: value.user.role,
    permissions: value.user.permissions,
  };
  const data: MobileBundle = {
    dashboard_daily: rows(value.data.dashboard_daily),
    products: rows(value.data.products),
    clients: rows(value.data.clients),
    payments: rows(value.data.payments),
    service_appointments: rows(value.data.service_appointments),
    bills: rows(value.data.bills),
    bill_payments: rows(value.data.bill_payments),
    services: rows(value.data.services),
  };
  if (
    (value.session_code !== undefined && typeof value.session_code !== "string") ||
    (value.expires_at !== undefined && typeof value.expires_at !== "string")
  ) {
    throw new MobileApiError("invalid_response", 502);
  }
  return {
    ok: true,
    ...(typeof value.session_code === "string" ? { session_code: value.session_code } : {}),
    ...(typeof value.expires_at === "string" ? { expires_at: value.expires_at } : {}),
    user,
    data,
  };
}

export async function callMobileApi(
  body: Record<string, string>,
): Promise<MobileSessionResponse> {
  let response: Response;
  try {
    response = await fetch(`${MOBILE_SUPABASE_URL}/functions/v1/mobile-api`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: MOBILE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new MobileApiError("network_error", 0);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new MobileApiError("invalid_response", response.status);
  }

  if (!response.ok) {
    const code =
      isRecord(result) && typeof result.error === "string"
        ? result.error
        : "request_failed";
    throw new MobileApiError(code, response.status);
  }
  return validateSessionResponse(result);
}

export async function loginMobile(
  deviceCredential: string,
  username: string,
  password: string,
): Promise<MobileSessionResponse & { session_code: string }> {
  const result = await callMobileApi({
    action: "login",
    device_credential: deviceCredential,
    username,
    password,
  });
  if (typeof result.session_code !== "string" || !result.session_code) {
    throw new MobileApiError("invalid_response", 502);
  }
  return { ...result, session_code: result.session_code };
}

export async function refreshMobile(
  sessionCode: string,
): Promise<MobileSessionResponse> {
  return callMobileApi({ action: "refresh", session_code: sessionCode });
}

export async function logoutMobile(sessionCode: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${MOBILE_SUPABASE_URL}/functions/v1/mobile-api`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: MOBILE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ action: "logout", session_code: sessionCode }),
    });
  } catch {
    throw new MobileApiError("network_error", 0);
  }
  if (!response.ok) {
    throw new MobileApiError("logout_failed", response.status);
  }
  const result: unknown = await response.json().catch((): null => null);
  if (!isRecord(result) || result.ok !== true) {
    throw new MobileApiError("logout_failed", response.status);
  }
}
