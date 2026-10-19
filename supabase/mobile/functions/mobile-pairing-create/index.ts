import { corsHeaders, json, mobileAdminClient, randomToken, sha256Hex, checkLicensingDesktop } from "../_shared/licensing.ts";

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, cors);

  const expected = Deno.env.get("MOBILE_DESKTOP_SECRET") ?? "";
  const provided = req.headers.get("x-mobile-desktop-secret") ?? "";
  if (!expected || provided !== expected) return json(401, { ok: false, error: "unauthorized" }, cors);

  let body: { device_id?: string; device_name?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }
  const desktopDeviceId = (body.device_id ?? "").trim();
  const deviceName = (body.device_name ?? "").trim();
  if (!desktopDeviceId || desktopDeviceId.length > 256 || !deviceName || deviceName.length > 60) {
    return json(400, { ok: false, error: "device_id_required" }, cors);
  }

  let license;
  try {
    license = await checkLicensingDesktop(desktopDeviceId);
  } catch (error) {
    console.error("mobile pairing licensing check failed", error);
    return json(503, { ok: false, error: "licensing_unavailable" }, cors);
  }
  if (!license?.allowed || !license.customer_id) {
    return json(403, { ok: false, error: "desktop_not_licensed" }, cors);
  }
  if (!license.mobile_enabled || license.mobile_device_limit < 1) {
    return json(403, { ok: false, error: "mobile_not_enabled" }, cors);
  }

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const db = mobileAdminClient();

  const { error } = await db.from("mobile_pairing_tokens").insert({
    token_hash: tokenHash,
    customer_id: license.customer_id,
    requesting_desktop_device_id: desktopDeviceId,
    device_name: deviceName,
    expires_at: expiresAt,
  });
  if (error) {
    console.error("mobile pairing token insert failed", error);
    return json(500, { ok: false, error: "pairing_token_create_failed" }, cors);
  }

  return json(200, { ok: true, pairing_token: token, expires_at: expiresAt }, cors);
});
