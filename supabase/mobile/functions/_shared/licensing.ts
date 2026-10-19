import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

export function json(status: number, body: unknown, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("origin") ?? "";
  const defaults = [
    "https://redatechpos.com",
    "https://www.redatechpos.com",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ];
  const configured = (Deno.env.get("MOBILE_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowed = new Set([...defaults, ...configured]);
  const allowOrigin = allowed.has(origin) ? origin : "null";
  return {
    "access-control-allow-origin": allowOrigin,
    "access-control-allow-headers": "authorization, apikey, content-type, x-mobile-desktop-secret",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function mobileAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type LicenseCheck = {
  allowed: boolean;
  customer_id: string | null;
  mobile_enabled: boolean;
  mobile_device_limit: number;
};

export async function checkLicensingDesktop(deviceId: string): Promise<LicenseCheck | null> {
  const baseUrl = Deno.env.get("LICENSING_SUPABASE_URL")?.replace(/\/$/, "");
  const publishableKey =
    Deno.env.get("LICENSING_PUBLISHABLE_KEY") ?? Deno.env.get("LICENSING_ANON_KEY");
  const appSecret = Deno.env.get("LICENSING_APP_SECRET");
  if (!baseUrl || !publishableKey || !appSecret) {
    throw new Error("licensing_configuration_missing");
  }

  const response = await fetch(`${baseUrl}/functions/v1/device-check`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: publishableKey,
      "x-app-secret": appSecret,
    },
    body: JSON.stringify({ device_id: deviceId }),
  });
  if (!response.ok) throw new Error("licensing_unavailable");
  const body: unknown = await response.json();
  if (!body || typeof body !== "object") throw new Error("licensing_invalid_response");
  const row = body as Record<string, unknown>;
  if (row.ok !== true) throw new Error("licensing_rejected");
  if (typeof row.allowed !== "boolean") throw new Error("licensing_invalid_response");

  return {
    allowed: row.allowed,
    customer_id: typeof row.customer_id === "string" ? row.customer_id : null,
    mobile_enabled: row.mobile_enabled === true,
    mobile_device_limit:
      typeof row.mobile_device_limit === "number" && Number.isInteger(row.mobile_device_limit)
        ? row.mobile_device_limit
        : 0,
  };
}
