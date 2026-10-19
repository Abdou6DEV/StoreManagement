import { checkLicensingDesktop, corsHeaders, json, mobileAdminClient, sha256Hex } from "../_shared/licensing.ts";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, cors);

  let body: { device_credential?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }
  const credential = (body.device_credential ?? "").trim();
  if (!credential || credential.length > 256) {
    return json(400, { ok: false, error: "device_credential_required" }, cors);
  }

  const db = mobileAdminClient();
  const { data: device, error } = await db
    .from("mobile_devices")
    .select("id, device_id, customer_id, device_name, active, revoked_at, paired_by_desktop_device_id")
    .eq("credential_hash", await sha256Hex(credential))
    .maybeSingle();
  if (error) {
    console.error("mobile device lookup failed", error);
    return json(500, { ok: false, error: "device_check_failed" }, cors);
  }
  if (!device || device.active !== true || device.revoked_at) {
    return json(200, { ok: true, allowed: false, reason: "device_revoked_or_unknown" }, cors);
  }

  let license;
  try {
    license = await checkLicensingDesktop(device.paired_by_desktop_device_id);
  } catch (error) {
    console.error("mobile device licensing check failed", error);
    return json(503, { ok: false, error: "licensing_unavailable" }, cors);
  }
  const allowed = Boolean(
    license?.allowed &&
    license.customer_id === device.customer_id &&
    license.mobile_enabled &&
    license.mobile_device_limit > 0
  );

  if (allowed) {
    await db.from("mobile_devices").update({ last_seen_at: new Date().toISOString() }).eq("id", device.id);
  }

  return json(200, {
    ok: true,
    allowed,
    reason: allowed ? null : "license_or_mobile_entitlement_inactive",
    device_id: device.device_id,
    device_name: device.device_name,
  }, cors);
});
