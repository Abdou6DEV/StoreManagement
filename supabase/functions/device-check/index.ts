import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** YYYY-MM-DD in UTC */
function utcDay(isoOrMs: string | number | null | undefined): string | null {
  if (isoOrMs == null) return null;
  const d = typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

serve(async (req) => {
  const appSecret = req.headers.get("x-app-secret") ?? "";
  if (!appSecret || appSecret !== Deno.env.get("X_APP_SECRET")) {
    return json(401, { ok: false, error: "unauthorized" });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" });
  }

  let payload: { device_id?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const device_id = (payload.device_id ?? "").trim();
  if (!device_id) {
    return json(400, { ok: false, error: "device_id_required" });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("allowed_devices")
    .select(
      "device_id, customer_id, active, expires_at, trial_ends_at, seen_count, last_seen_at, ai_enabled",
    )
    .eq("device_id", device_id)
    .maybeSingle();

  if (error) return json(500, { ok: false, error: "db_error" });

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();

  if (!data) {
    return json(200, {
      ok: true,
      device_id,
      allowed: false,
      ai_enabled: false,
      mobile_enabled: false,
      mobile_device_limit: 0,
      customer_id: null,
      customer_name: null,
      customer_phone: null,
      expires_at: null,
      trial_ends_at: null,
      now: nowIso,
    });
  }

  const prevCount = typeof data.seen_count === "number" ? data.seen_count : 0;
  const todayUtc = utcDay(nowMs);
  const lastSeenDay = utcDay(data.last_seen_at as string | null);
  const shouldBumpSeen = todayUtc != null && lastSeenDay !== todayUtc;
  const nextCount = shouldBumpSeen ? prevCount + 1 : prevCount;

  const { error: seenError } = await supabase
    .from("allowed_devices")
    .update({
      last_seen_at: nowIso,
      seen_count: nextCount,
    })
    .eq("device_id", device_id);
  if (seenError) {
    console.error("device-check last_seen update failed", seenError);
  }

  let customer_name: string | null = null;
  let customer_phone: string | null = null;
  if (data.customer_id) {
    const { data: cust } = await supabase
      .from("customers")
      .select("name, phone")
      .eq("id", data.customer_id)
      .maybeSingle();
    if (cust && typeof cust.name === "string" && cust.name.trim()) {
      customer_name = cust.name.trim();
    }
    if (cust && typeof cust.phone === "string" && cust.phone.trim()) {
      customer_phone = cust.phone.trim();
    }
  }

  // Entitlement lookup is fail-closed for mobile, without blocking desktop licensing.
  let mobile_enabled = false;
  let mobile_device_limit = 0;
  if (data.customer_id) {
    const { data: mobileSettings, error: mobileSettingsError } = await supabase
      .from("customer_mobile_settings")
      .select("mobile_enabled, mobile_device_limit")
      .eq("customer_id", data.customer_id)
      .maybeSingle();

    if (mobileSettingsError) {
      console.error("device-check mobile entitlement lookup failed", mobileSettingsError);
    } else if (mobileSettings) {
      mobile_enabled = mobileSettings.mobile_enabled === true;
      mobile_device_limit = Number.isInteger(mobileSettings.mobile_device_limit)
        ? mobileSettings.mobile_device_limit
        : 0;
    }
  }

  const trialEndMs = data.trial_ends_at
    ? new Date(data.trial_ends_at as string).getTime()
    : NaN;
  const trialOk = Number.isFinite(trialEndMs) && trialEndMs > nowMs;

  const paidOk =
    data.active === true &&
    (data.expires_at === null ||
      new Date(data.expires_at as string).getTime() > nowMs);

  const allowed = trialOk || paidOk;
  const ai_enabled = data.ai_enabled === true;

  return json(200, {
    ok: true,
    device_id,
    allowed,
    ai_enabled,
    mobile_enabled,
    mobile_device_limit,
    customer_id: data.customer_id ?? null,
    customer_name,
    customer_phone,
    expires_at: data.expires_at ?? null,
    trial_ends_at: data.trial_ends_at ?? null,
    now: nowIso,
  });
});
