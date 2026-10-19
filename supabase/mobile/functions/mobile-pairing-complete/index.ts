import { checkLicensingDesktop, corsHeaders, json, mobileAdminClient, randomToken, sha256Hex } from "../_shared/licensing.ts";

const ALLOWED_PLATFORMS = new Set(["ios", "android", "web"]);

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, cors);

  let body: { pairing_token?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }

  const token = (body.pairing_token ?? "").trim();
  const platform = (body.platform ?? "").trim().toLowerCase();
  if (!token || token.length > 256 || !ALLOWED_PLATFORMS.has(platform)) {
    return json(400, { ok: false, error: "invalid_pairing_request" }, cors);
  }

  const tokenHash = await sha256Hex(token);
  const db = mobileAdminClient();
  const { data: pairing, error: tokenError } = await db
    .from("mobile_pairing_tokens")
    .select("customer_id, requesting_desktop_device_id, device_name, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (tokenError) {
    console.error("mobile pairing token lookup failed", tokenError);
    return json(500, { ok: false, error: "pairing_check_failed" }, cors);
  }
  if (!pairing || pairing.used_at || Date.parse(pairing.expires_at) <= Date.now()) {
    return json(400, { ok: false, error: "invalid_or_expired_token" }, cors);
  }

  let license;
  try {
    license = await checkLicensingDesktop(pairing.requesting_desktop_device_id);
  } catch (error) {
    console.error("mobile pairing licensing check failed", error);
    return json(503, { ok: false, error: "licensing_unavailable" }, cors);
  }
  if (
    !license?.allowed ||
    license.customer_id !== pairing.customer_id ||
    !license.mobile_enabled ||
    license.mobile_device_limit < 1 ||
    !pairing.device_name
  ) {
    return json(403, { ok: false, error: "mobile_not_authorized" }, cors);
  }

  const deviceCredential = randomToken();
  const deviceId = crypto.randomUUID();
  const { data: created, error: consumeError } = await db.rpc("consume_mobile_pairing_token", {
    p_token_hash: tokenHash,
    p_customer_id: pairing.customer_id,
    p_device_name: pairing.device_name,
    p_platform: platform,
    p_credential_hash: await sha256Hex(deviceCredential),
    p_device_id: deviceId,
    p_desktop_device_id: pairing.requesting_desktop_device_id,
    p_device_limit: license.mobile_device_limit,
  });

  if (consumeError) {
    console.error("mobile pairing token consume failed", consumeError);
    return json(500, { ok: false, error: "pairing_complete_failed" }, cors);
  }
  const result = Array.isArray(created) ? created[0] : created;
  if (!result || result.error_code) {
    const errorCode = result?.error_code ?? "pairing_complete_failed";
    const status = errorCode === "device_limit_reached" ? 403 : 400;
    return json(status, { ok: false, error: errorCode }, cors);
  }

  return json(200, {
    ok: true,
    device_id: result.created_device_id,
    device_credential: deviceCredential,
  }, cors);
});
