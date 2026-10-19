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

  let license;
  try {
    license = await checkLicensingDesktop(desktopDeviceId);
  } catch (error) {
    console.error("mobile device list licensing check failed", error);
    return json(503, { ok: false, error: "licensing_unavailable" }, cors);
  }
  if (!license?.allowed || !license.customer_id) {
    return json(403, { ok: false, error: "desktop_not_licensed" }, cors);
  }

  const { data, error } = await mobileAdminClient()
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
