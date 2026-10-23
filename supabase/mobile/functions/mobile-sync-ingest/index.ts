import {
  checkLicensingDesktop,
  corsHeaders,
  json,
  mobileAdminClient,
} from "../_shared/licensing.ts";
import {
  readAllPages,
  validateMobileSyncSnapshot,
} from "../_shared/mobileSyncSnapshot.ts";

const BATCH_SIZE = 500;
const TABLES = [
  ["pos_users", "users"],
  ["pos_user_permissions", "permissions"],
  ["pos_categories", "categories"],
  ["pos_products", "products"],
  ["pos_manual_products", "manual_products"],
  ["pos_suppliers", "suppliers"],
  ["pos_purchases", "purchases"],
  ["pos_purchase_items", "purchase_items"],
  ["pos_clients", "clients"],
  ["pos_services", "services"],
  ["pos_service_appointments", "service_appointments"],
  ["pos_sales", "sales"],
  ["pos_sale_items", "sale_items"],
  ["pos_payments", "payments"],
  ["pos_bills", "bills"],
  ["pos_bill_payments", "bill_payments"],
] as const;
const REQUIRED_SNAPSHOT_KEYS = [
  ...TABLES.map(([, key]) => key),
  "dashboard_daily",
];

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < items.length; offset += size) {
    result.push(items.slice(offset, offset + size));
  }
  return result;
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" }, cors);
  }

  const expected = Deno.env.get("MOBILE_DESKTOP_SECRET") ?? "";
  if (!expected || req.headers.get("x-mobile-desktop-secret") !== expected) {
    return json(401, { ok: false, error: "unauthorized" }, cors);
  }

  let body: { device_id?: string; snapshot?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }
  const desktopDeviceId = (body.device_id ?? "").trim();
  if (!desktopDeviceId || !body.snapshot || typeof body.snapshot !== "object") {
    return json(400, { ok: false, error: "invalid_sync_request" }, cors);
  }
  if (
    REQUIRED_SNAPSHOT_KEYS.some((key) => !Array.isArray(body.snapshot?.[key]))
  ) {
    return json(400, { ok: false, error: "incomplete_snapshot" }, cors);
  }

  let license;
  try {
    license = await checkLicensingDesktop(desktopDeviceId);
  } catch (error) {
    console.error("mobile sync licensing check failed", error);
    return json(503, { ok: false, error: "licensing_unavailable" }, cors);
  }
  if (!license?.allowed || !license.customer_id) {
    return json(403, { ok: false, error: "desktop_not_licensed" }, cors);
  }
  if (!license.mobile_enabled || license.mobile_device_limit < 1) {
    return json(403, { ok: false, error: "mobile_not_enabled" }, cors);
  }

  try {
    validateMobileSyncSnapshot(body.snapshot, license.customer_id);
  } catch {
    return json(400, { ok: false, error: "invalid_snapshot" }, cors);
  }

  const db = mobileAdminClient();
  const snapshot = body.snapshot;
  const syncVersion = Date.now();
  const syncedAt = new Date(syncVersion).toISOString();
  const counts: Record<string, number> = {};

  let previousUsers: Array<
    { source_id: string; password_hash: string; is_active: boolean }
  >;
  try {
    previousUsers = await readAllPages(async (from, to) =>
      db
        .from("pos_users")
        .select("source_id, password_hash, is_active")
        .eq("customer_id", license.customer_id)
        .order("source_id", { ascending: true })
        .range(from, to)
    );
  } catch (error) {
    console.error("mobile sync user lookup failed", error);
    return json(500, { ok: false, error: "sync_failed" }, cors);
  }
  const users = snapshot.users as Array<Record<string, unknown>>;
  const previousById = new Map(
    previousUsers.map((row) => [row.source_id, row]),
  );
  const currentUserIds = new Set<string>();
  const changedCredentialIds: string[] = [];
  for (const value of users) {
    if (!value || typeof value !== "object") continue;
    const row = value as Record<string, unknown>;
    if (typeof row.source_id !== "string") continue;
    currentUserIds.add(row.source_id);
    const previous = previousById.get(row.source_id);
    if (
      previous &&
      (previous.password_hash !== row.password_hash ||
        previous.is_active !== (row.is_active === true))
    ) {
      changedCredentialIds.push(row.source_id);
    }
  }
  for (const previous of previousUsers) {
    if (!currentUserIds.has(previous.source_id)) {
      changedCredentialIds.push(previous.source_id);
    }
  }

  for (const [table, key] of TABLES) {
    const input = Array.isArray(snapshot[key])
      ? snapshot[key] as unknown[]
      : [];
    if (input.length > 10000) {
      return json(413, { ok: false, error: "sync_batch_too_large" }, cors);
    }

    const rows: Array<Record<string, unknown>> = input.flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const row = value as Record<string, unknown>;
      if (typeof row.source_id !== "string" || !row.source_id) return [];
      const normalizedRow: Record<string, unknown> = {
        ...row,
        customer_id: license.customer_id,
        sync_version: syncVersion,
        deleted_at: null,
        source_updated_at: typeof row.source_updated_at === "string"
          ? row.source_updated_at
          : syncedAt,
      };
      return [normalizedRow];
    });

    for (const batch of chunks(rows, BATCH_SIZE)) {
      const { error } = await db.from(table).upsert(batch, {
        onConflict: "customer_id,source_id",
      });
      if (error) {
        console.error(`mobile sync failed for ${table}`, error);
        return json(500, { ok: false, error: "sync_failed", table }, cors);
      }
    }

    let existing: Array<{ source_id: string }>;
    try {
      existing = await readAllPages(async (from, to) =>
        db
          .from(table)
          .select("source_id")
          .eq("customer_id", license.customer_id)
          .is("deleted_at", null)
          .order("source_id", { ascending: true })
          .range(from, to)
      );
    } catch (error) {
      console.error(`mobile sync reconcile lookup failed for ${table}`, error);
      return json(500, { ok: false, error: "sync_failed", table }, cors);
    }
    const includedIds = new Set(rows.map((row) => row.source_id as string));
    const staleIds = existing
      .map((row) => row.source_id as string)
      .filter((id) => !includedIds.has(id));
    for (const staleBatch of chunks(staleIds, BATCH_SIZE)) {
      const { error } = await db
        .from(table)
        .update({ deleted_at: syncedAt, sync_version: syncVersion })
        .eq("customer_id", license.customer_id)
        .in("source_id", staleBatch);
      if (error) {
        console.error(`mobile sync reconcile failed for ${table}`, error);
        return json(500, { ok: false, error: "sync_failed", table }, cors);
      }
    }
    counts[key] = rows.length;
  }

  if (changedCredentialIds.length > 0) {
    const { error } = await db
      .from("mobile_sessions")
      .update({ revoked_at: syncedAt })
      .eq("customer_id", license.customer_id)
      .is("revoked_at", null)
      .in("user_source_id", [...new Set(changedCredentialIds)]);
    if (error) {
      console.error("mobile sync session revocation failed", error);
      return json(500, { ok: false, error: "sync_failed" }, cors);
    }
  }

  const daily = snapshot.dashboard_daily as unknown[];
  if (daily.length > 5000) {
    return json(413, { ok: false, error: "sync_batch_too_large" }, cors);
  }
  const dailyRows = daily.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    if (typeof row.local_day !== "string") return [];
    return [{
      customer_id: license.customer_id,
      local_day: row.local_day,
      sales_count: Number(row.sales_count) || 0,
      revenue: Number(row.revenue) || 0,
      profit: Number(row.profit) || 0,
      total_items: Number(row.total_items) || 0,
      bill_payments: Number(row.bill_payments) || 0,
      source_updated_at: syncedAt,
      sync_version: syncVersion,
    }];
  });
  for (const batch of chunks(dailyRows, BATCH_SIZE)) {
    const { error } = await db.from("pos_dashboard_daily").upsert(batch, {
      onConflict: "customer_id,local_day",
    });
    if (error) {
      console.error("mobile dashboard aggregate sync failed", error);
      return json(500, {
        ok: false,
        error: "sync_failed",
        table: "pos_dashboard_daily",
      }, cors);
    }
  }
  const existingDaily: Array<{ local_day: string }> = [];
  for (let offset = 0;; offset += BATCH_SIZE) {
    const { data, error } = await db
      .from("pos_dashboard_daily")
      .select("local_day")
      .eq("customer_id", license.customer_id)
      .order("local_day", { ascending: true })
      .range(offset, offset + BATCH_SIZE - 1);
    if (error) {
      console.error("mobile dashboard reconciliation lookup failed", error);
      return json(500, {
        ok: false,
        error: "sync_failed",
        table: "pos_dashboard_daily",
      }, cors);
    }
    const batch = data ?? [];
    existingDaily.push(...batch);
    if (batch.length < BATCH_SIZE) break;
  }
  const currentDays = new Set(dailyRows.map((row) => row.local_day as string));
  const staleDays = (existingDaily ?? [])
    .map((row) => row.local_day as string)
    .filter((day) => !currentDays.has(day));
  for (const staleBatch of chunks(staleDays, BATCH_SIZE)) {
    const { error } = await db
      .from("pos_dashboard_daily")
      .delete()
      .eq("customer_id", license.customer_id)
      .in("local_day", staleBatch);
    if (error) {
      console.error("mobile dashboard reconciliation failed", error);
      return json(500, {
        ok: false,
        error: "sync_failed",
        table: "pos_dashboard_daily",
      }, cors);
    }
  }
  counts.dashboard_daily = dailyRows.length;

  return json(200, { ok: true, synced_at: syncedAt, counts });
});
