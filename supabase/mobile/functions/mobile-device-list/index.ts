import { checkLicensingDesktop, corsHeaders, json, mobileAdminClient } from "../_shared/licensing.ts";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, cors);

  const expected = Deno.env.get("MOBILE_DESKTOP_SECRET") ?? "";
  const provided = req.headers.get("x-mobile-desktop-secret") ?? "";
  if (!expected || provided !== expected) return json(401, { ok: false, error: "unauthorized" }, cors);

  let body: { device_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }
  const desktopDeviceId = (body.device_id ?? "").trim();
  if (!desktopDeviceId || desktopDeviceId.length > 256) {
    return json(400, { ok: false, error: "device_id_required" }, cors);
  }

  const db = mobileAdminClient();
  let license;
  try {
    license = await checkLicensingDesktop(desktopDeviceId);
  } catch (error) {
    console.error("mobile device list licensing check failed", error);
    return json(503, { ok: false, error: "licensing_unavailable" }, cors);
  }
  if (!license?.allowed || !license.customer_id) {
    if (license?.customer_id) {
      const { error: authorizationError } = await db
        .from("mobile_desktop_sync_authorizations")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("desktop_device_id", desktopDeviceId)
        .eq("customer_id", license.customer_id);
      if (authorizationError) {
        console.error("mobile desktop authorization update failed", authorizationError);
        return json(500, { ok: false, error: "sync_authorization_update_failed" }, cors);
      }
    }
    return json(403, { ok: false, error: "desktop_not_licensed" }, cors);
  }

  const mobileEnabled = license.mobile_enabled && license.mobile_device_limit > 0;
  const { error: authorizationError } = await db
    .from("mobile_desktop_sync_authorizations")
    .upsert({
      desktop_device_id: desktopDeviceId,
      customer_id: license.customer_id,
      is_active: mobileEnabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: "desktop_device_id" });
  if (authorizationError) {
    console.error("mobile desktop authorization update failed", authorizationError);
    return json(500, { ok: false, error: "sync_authorization_update_failed" }, cors);
  }
  if (!mobileEnabled) return json(200, { ok: true, devices: [] }, cors);

  const { data, error } = await db
    .from("mobile_devices")
    .select("id, device_name, platform, paired_at, last_seen_at, active, revoked_at")
    .eq("customer_id", license.customer_id)
    .order("paired_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("mobile device list failed", error);
    return json(500, { ok: false, error: "device_list_failed" }, cors);
  }

  return json(200, { ok: true, devices: data ?? [] }, cors);
});
