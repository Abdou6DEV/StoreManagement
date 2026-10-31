import {
  checkLicensingDesktop,
  corsHeaders,
  json,
  mobileAdminClient,
} from "../_shared/licensing.ts";
import { validateMobileSyncChunk } from "../_shared/mobileSyncSnapshot.ts";

const CHUNK_SIZE = 100;
const ENTITIES = [
  "users", "permissions", "categories", "products", "manual_products",
  "suppliers", "purchases", "purchase_items", "clients", "services",
  "service_appointments", "sales", "sale_items", "payments", "bills",
  "bill_payments", "dashboard_daily",
] as const;
type Entity = typeof ENTITIES[number];

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((part) => part.toString(16).padStart(2, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" }, cors);
  const expected = Deno.env.get("MOBILE_DESKTOP_SECRET") ?? "";
  if (!expected || req.headers.get("x-mobile-desktop-secret") !== expected) {
    return json(401, { ok: false, error: "unauthorized" }, cors);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = await req.json();
    if (!isRecord(parsed)) return json(400, { ok: false, error: "invalid_sync_request" }, cors);
    body = parsed;
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }
  const deviceId = typeof body.device_id === "string" ? body.device_id.trim() : "";
  const snapshotId = typeof body.snapshot_id === "string" ? body.snapshot_id : "";
  const action = body.action;
  if (!deviceId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(snapshotId)) {
    return json(400, { ok: false, error: "invalid_sync_request" }, cors);
  }

  const db = mobileAdminClient();
  let customerId: string;
  if (action === "chunk") {
    const { data: owner, error: ownerError } = await db.from("mobile_sync_snapshots")
      .select("customer_id,status")
      .eq("snapshot_id", snapshotId)
      .eq("device_id", deviceId)
      .maybeSingle();
    if (ownerError || !owner || owner.status !== "uploading") {
      return json(403, { ok: false, error: "snapshot_not_owned" }, cors);
    }
    customerId = owner.customer_id;
  } else if (action === "start" || action === "finalize") {
    let license;
    try {
      license = await checkLicensingDesktop(deviceId);
    } catch {
      console.error("mobile sync licensing check failed");
      return json(503, { ok: false, error: "licensing_unavailable" }, cors);
    }
    if (!license?.allowed || !license.customer_id) return json(403, { ok: false, error: "desktop_not_licensed" }, cors);
    if (!license.mobile_enabled || license.mobile_device_limit < 1) return json(403, { ok: false, error: "mobile_not_enabled" }, cors);
    customerId = license.customer_id;
  } else {
    return json(400, { ok: false, error: "unknown_sync_action" }, cors);
  }

  try {
    if (action === "start") {
      const counts = body.expected_counts;
      const chunks = body.expected_chunks;
      if (!isRecord(counts) || !isRecord(chunks)) return json(400, { ok: false, error: "invalid_manifest" }, cors);
      const keys = Object.keys(counts).sort();
      const chunkKeys = Object.keys(chunks).sort();
      if (keys.length !== ENTITIES.length || chunkKeys.length !== ENTITIES.length ||
        ENTITIES.some((entity) => !keys.includes(entity) || !chunkKeys.includes(entity))) {
        return json(400, { ok: false, error: "invalid_manifest" }, cors);
      }
      for (const entity of ENTITIES) {
        const count = counts[entity];
        const chunkCount = chunks[entity];
        const minimumChunks = Number.isSafeInteger(count) && (count as number) >= 0
          ? Math.ceil((count as number) / CHUNK_SIZE)
          : -1;
        if (minimumChunks < 0 || !Number.isSafeInteger(chunkCount) ||
          (chunkCount as number) < minimumChunks || (chunkCount as number) > (count as number)) {
          return json(400, { ok: false, error: "invalid_manifest" }, cors);
        }
      }
      const { data, error } = await db.rpc("begin_mobile_sync_snapshot", {
        p_customer_id: customerId,
        p_device_id: deviceId,
        p_snapshot_id: snapshotId,
        p_expected_counts: counts,
        p_expected_chunks: chunks,
      });
      if (error) {
        console.error("mobile snapshot start failed");
        return json(409, { ok: false, error: "snapshot_start_failed" }, cors);
      }
      return json(200, { ok: true, status: data?.status ?? "uploading" }, cors);
    }

    if (action === "chunk") {
      const entity = body.entity as Entity;
      const index = body.chunk_index;
      const rows = body.rows;
      const checksum = body.checksum;
      if (!ENTITIES.includes(entity) || !Number.isSafeInteger(index) || (index as number) < 0 ||
        !Array.isArray(rows) || rows.length < 1 || rows.length > CHUNK_SIZE ||
        typeof checksum !== "string" || !/^[0-9a-f]{64}$/.test(checksum)) {
        return json(400, { ok: false, error: "invalid_chunk" }, cors);
      }
      if (await sha256(rows) !== checksum) return json(400, { ok: false, error: "chunk_checksum_mismatch" }, cors);
      try {
        validateMobileSyncChunk(entity, rows, customerId);
      } catch {
        return json(400, { ok: false, error: "invalid_chunk" }, cors);
      }
      const { data, error } = await db.rpc("stage_mobile_sync_chunk", {
        p_customer_id: customerId,
        p_device_id: deviceId,
        p_snapshot_id: snapshotId,
        p_entity: entity,
        p_chunk_index: index,
        p_checksum: checksum,
        p_rows: rows,
      });
      if (error) {
        console.error("mobile snapshot chunk staging failed");
        return json(409, { ok: false, error: "chunk_stage_failed" }, cors);
      }
      return json(200, { ok: true, duplicate: data?.duplicate === true }, cors);
    }

    if (action === "finalize") {
      const { error } = await db.rpc("finalize_mobile_sync_snapshot", {
        p_customer_id: customerId,
        p_device_id: deviceId,
        p_snapshot_id: snapshotId,
      });
      if (error) {
        console.error("mobile snapshot finalization failed");
        return json(409, { ok: false, error: "snapshot_incomplete_or_invalid" }, cors);
      }
      const { data: snapshot } = await db.from("mobile_sync_snapshots")
        .select("expected_counts,status,completed_at")
        .eq("customer_id", customerId)
        .eq("snapshot_id", snapshotId)
        .maybeSingle();
      if (snapshot?.status !== "active") return json(500, { ok: false, error: "snapshot_activation_unconfirmed" }, cors);
      return json(200, {
        ok: true,
        synced_at: snapshot.completed_at ?? new Date().toISOString(),
        counts: snapshot.expected_counts,
      }, cors);
    }
    return json(400, { ok: false, error: "unknown_sync_action" }, cors);
  } catch {
    console.error("mobile sync request failed unexpectedly");
    return json(500, { ok: false, error: "sync_failed" }, cors);
  }
});
