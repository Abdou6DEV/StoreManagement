import bcrypt from "npm:bcryptjs@3.0.2";
import {
  checkLicensingDesktop,
  corsHeaders,
  json,
  mobileAdminClient,
  randomToken,
  sha256Hex,
} from "../_shared/licensing.ts";

type PermissionSet = {
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

const EMPTY_PERMISSIONS: PermissionSet = {
  can_access_cashier: false,
  can_access_stock: false,
  can_access_clients: false,
  can_access_bills: false,
  can_access_history: false,
  can_access_dashboard: false,
  can_access_services: false,
  can_access_zakat: false,
  can_manage_users: false,
  can_view_logs: false,
  can_manage_settings: false,
};

const ADMIN_PERMISSIONS: PermissionSet = Object.fromEntries(
  Object.keys(EMPTY_PERMISSIONS).map((key) => [key, true]),
) as PermissionSet;

function permissionsFor(
  role: string,
  row: Record<string, unknown> | null,
): PermissionSet {
  if (role === "ADMIN") return ADMIN_PERMISSIONS;
  if (!row) return EMPTY_PERMISSIONS;
  return {
    can_access_cashier: row.can_access_cashier === true,
    can_access_stock: row.can_access_stock === true,
    can_access_clients: row.can_access_clients === true,
    can_access_bills: row.can_access_bills === true,
    can_access_history: row.can_access_history === true,
    can_access_dashboard: row.can_access_dashboard === true,
    can_access_services: row.can_access_services === true,
    can_access_zakat: row.can_access_zakat === true,
    can_manage_users: row.can_manage_users === true,
    can_view_logs: row.can_view_logs === true,
    can_manage_settings: row.can_manage_settings === true,
  };
}

function userView(user: Record<string, unknown>, permissions: PermissionSet) {
  return {
    id: user.source_id,
    username: user.username,
    role: user.role,
    permissions,
  };
}

async function readSnapshotRows(
  db: ReturnType<typeof mobileAdminClient>,
  customerId: string,
  snapshotId: string,
  entity: string,
  ascending = true,
) {
  const pageSize = 1000;
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0;; offset += pageSize) {
    const { data, error } = await db.from("mobile_sync_snapshot_rows")
      .select("source_key,payload")
      .eq("customer_id", customerId)
      .eq("snapshot_id", snapshotId)
      .eq("entity", entity)
      .order("source_key", { ascending })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("data_unavailable");
    const page = data ?? [];
    rows.push(...page.map((row) => row.payload as Record<string, unknown>));
    if (page.length < pageSize) break;
  }
  return rows;
}

async function readRows(
  db: ReturnType<typeof mobileAdminClient>, entity: string, customerId: string,
  order: string, snapshotId: string, ascending = true,
) {
  const rows = await readSnapshotRows(db, customerId, snapshotId, entity, true);
  rows.sort((left, right) => {
    const a = left[order]; const b = right[order]; let comparison = 0;
    if (a == null && b != null) comparison = 1;
    else if (a != null && b == null) comparison = -1;
    else if (typeof a === "number" && typeof b === "number") comparison = a - b;
    else if (typeof a === "string" && typeof b === "string") {
      const at = order.includes("date") || order.includes("created_at") ? Date.parse(a) : Number.NaN;
      const bt = order.includes("date") || order.includes("created_at") ? Date.parse(b) : Number.NaN;
      comparison = Number.isFinite(at) && Number.isFinite(bt) ? at - bt : a.localeCompare(b);
    }
    if (comparison === 0) comparison = String(left.source_id ?? "").localeCompare(String(right.source_id ?? ""));
    return ascending ? comparison : -comparison;
  });
  return rows;
}

async function readBundle(
  db: ReturnType<typeof mobileAdminClient>,
  customerId: string,
  permissions: PermissionSet,
  snapshotId: string,
) {
  const dashboardCutoff = new Date();
  dashboardCutoff.setUTCDate(dashboardCutoff.getUTCDate() - 364);
  const dashboardStartDay = dashboardCutoff.toISOString().slice(0, 10);
  const retentionCutoff = Date.now() - 365 * 24 * 60 * 60 * 1000;
  const [
    daily,
    categories,
    products,
    orders,
    manualProducts,
    suppliers,
    purchases,
    purchaseItems,
    clients,
    payments,
    appointments,
    bills,
    billPayments,
    services,
    sales,
    saleItems,
  ] = await Promise.all([
    permissions.can_access_dashboard
      ? readSnapshotRows(db, customerId, snapshotId, "dashboard_daily", false)
        .then((rows) => ({ data: rows.filter((row) => String(row.local_day) >= dashboardStartDay)
          .sort((x, y) => String(y.local_day).localeCompare(String(x.local_day))).slice(0, 365), error: null }))
      : Promise.resolve({ data: [], error: null }),
    permissions.can_access_stock
      ? readRows(db, "categories", customerId, "name", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_stock
      ? readRows(db, "products", customerId, "name", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_stock
      ? readRows(db, "orders", customerId, "due_date", snapshotId, false)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "manual_products", customerId, "name", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_clients
      ? readRows(db, "suppliers", customerId, "name", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "purchases", customerId, "source_created_at", snapshotId, false)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "purchase_items", customerId, "purchase_source_id", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_clients
      ? readRows(db, "clients", customerId, "name", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_clients
      ? readRows(db, "payments", customerId, "due_date", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_services
      ? readRows(db, "service_appointments", customerId, "due_date", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_bills
      ? readRows(db, "bills", customerId, "next_bill_date", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_bills
      ? readRows(db, "bill_payments", customerId, "paid_date", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_services
      ? readRows(db, "services", customerId, "name", snapshotId)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "sales", customerId, "source_created_at", snapshotId, false)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "sale_items", customerId, "sale_source_id", snapshotId)
      : Promise.resolve([]),
  ]);

  if (daily.error) throw new Error("data_unavailable");
  const retainedSales = sales.filter((row) =>
    typeof row.source_created_at === "string" && Date.parse(row.source_created_at) >= retentionCutoff
  );
  const retainedSaleIds = new Set(retainedSales.map((row) => row.source_id));
  const retainedPurchases = purchases.filter((row) =>
    typeof row.source_created_at === "string" && Date.parse(row.source_created_at) >= retentionCutoff
  );
  const retainedPurchaseIds = new Set(retainedPurchases.map((row) => row.source_id));
  const retainedAppointments = appointments.filter((row) =>
    typeof row.source_created_at === "string" && Date.parse(row.source_created_at) >= retentionCutoff
  );
  const retainedBillPayments = billPayments.filter((row) =>
    typeof row.paid_date === "string" && Date.parse(row.paid_date) >= retentionCutoff
  );
  return {
    dashboard_daily: daily.data ?? [],
    categories,
    products,
    orders,
    manual_products: manualProducts,
    suppliers,
    purchases: retainedPurchases,
    purchase_items: purchaseItems.filter((row) => retainedPurchaseIds.has(row.purchase_source_id)),
    clients,
    payments,
    service_appointments: retainedAppointments,
    bills,
    bill_payments: retainedBillPayments,
    services,
    sales: retainedSales,
    sale_items: saleItems.filter((row) => retainedSaleIds.has(row.sale_source_id)),
  };
}

async function sessionData(sessionCode: string) {
  const db = mobileAdminClient();
  const sessionHash = await sha256Hex(sessionCode);
  const now = new Date();
  const { data: session, error: sessionError } = await db
    .from("mobile_sessions")
    .select(
      "session_hash, customer_id, mobile_device_id, user_source_id, expires_at, license_checked_at",
    )
    .eq("session_hash", sessionHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (sessionError) throw new Error("session_unavailable");
  if (!session) throw new Error("session_expired");

  const { data: device, error: deviceError } = await db.from("mobile_devices")
    .select("id,customer_id,device_id,active,revoked_at,paired_by_desktop_device_id")
    .eq("id", session.mobile_device_id)
    .maybeSingle();
  if (deviceError) throw new Error("session_unavailable");
  if (
    !device ||
    device.customer_id !== session.customer_id ||
    !device.active ||
    device.revoked_at
  ) {
    throw new Error("device_revoked");
  }
  if (Date.parse(session.expires_at) <= now.getTime()) {
    throw new Error("session_expired");
  }

  const { data: activeSnapshot, error: snapshotError } = await db
    .from("mobile_sync_snapshots")
    .select("snapshot_id")
    .eq("customer_id", session.customer_id)
    .eq("status", "active")
    .maybeSingle();
  if (snapshotError) throw new Error("session_unavailable");

  if (!activeSnapshot?.snapshot_id) throw new Error("snapshot_unavailable");
  const [{ data: userRow, error: userError }, { data: permissionRow, error: permissionError }] = await Promise.all([
    db.from("mobile_sync_snapshot_rows").select("payload")
      .eq("customer_id", session.customer_id).eq("snapshot_id", activeSnapshot.snapshot_id)
      .eq("entity", "users").eq("source_key", session.user_source_id).maybeSingle(),
    db.from("mobile_sync_snapshot_rows").select("payload")
      .eq("customer_id", session.customer_id).eq("snapshot_id", activeSnapshot.snapshot_id)
      .eq("entity", "permissions").eq("payload->>user_source_id", session.user_source_id).maybeSingle(),
  ]);
  if (userError || permissionError) throw new Error("session_unavailable");
  const user = (userRow?.payload as Record<string, unknown> | undefined) ?? null;
  const permission = (permissionRow?.payload as Record<string, unknown> | undefined) ?? null;
  if (!user || !user.is_active || user.deleted_at) {
    throw new Error("user_inactive");
  }

  let licenseCheckedAt = new Date(session.license_checked_at).getTime();
  if (!Number.isFinite(licenseCheckedAt)) licenseCheckedAt = 0;
  if (Date.now() - licenseCheckedAt >= 60_000) {
    const license = await checkLicensingDesktop(
      device.paired_by_desktop_device_id,
    );
    if (
      !license?.allowed || license.customer_id !== session.customer_id ||
      !license.mobile_enabled
    ) {
      await db.from("mobile_sessions").update({ revoked_at: now.toISOString() })
        .eq("session_hash", sessionHash);
      throw new Error("mobile_access_disabled");
    }
    licenseCheckedAt = Date.now();
  }

  const permissions = permissionsFor(
    String(user.role),
    permission as Record<string, unknown> | null,
  );
  const data = await readBundle(db, session.customer_id, permissions, activeSnapshot.snapshot_id);
  await db.from("mobile_sessions").update({
    last_used_at: now.toISOString(),
    license_checked_at: new Date(licenseCheckedAt).toISOString(),
  }).eq("session_hash", sessionHash);

  return { user: userView(user, permissions), data };
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json(405, { ok: false, error: "method_not_allowed" }, cors);
  }

  let body: {
    action?: string;
    device_credential?: string;
    username?: string;
    password?: string;
    session_code?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" }, cors);
  }

  const db = mobileAdminClient();
  if (body.action === "login") {
    const credential = (body.device_credential ?? "").trim();
    const username = (body.username ?? "").trim();
    const password = body.password ?? "";
    if (!credential || !username || !password) {
      return json(400, { ok: false, error: "credentials_required" }, cors);
    }

    const { data: device, error: deviceError } = await db
      .from("mobile_devices")
      .select(
        "id,customer_id,device_id,active,revoked_at,paired_by_desktop_device_id",
      )
      .eq("credential_hash", await sha256Hex(credential))
      .maybeSingle();
    if (deviceError) {
      return json(500, { ok: false, error: "login_unavailable" }, cors);
    }
    if (!device || !device.active || device.revoked_at) {
      return json(403, { ok: false, error: "device_revoked" }, cors);
    }

    let license;
    try {
      license = await checkLicensingDesktop(device.paired_by_desktop_device_id);
    } catch (error) {
      console.error("mobile login licensing check failed", error);
      return json(503, { ok: false, error: "licensing_unavailable" }, cors);
    }
    if (
      !license?.allowed || license.customer_id !== device.customer_id ||
      !license.mobile_enabled
    ) {
      return json(403, { ok: false, error: "mobile_access_disabled" }, cors);
    }

    const { error: staleSessionsError } = await db
      .from("mobile_sessions")
      .delete()
      .eq("customer_id", device.customer_id)
      .or(`expires_at.lte.${new Date().toISOString()},revoked_at.not.is.null`);
    if (staleSessionsError) {
      console.error("stale mobile session cleanup failed", staleSessionsError);
      return json(500, { ok: false, error: "login_unavailable" }, cors);
    }

    const { data: activeSnapshot, error: snapshotError } = await db.from("mobile_sync_snapshots")
      .select("snapshot_id").eq("customer_id", device.customer_id).eq("status", "active").maybeSingle();
    if (snapshotError) return json(500, { ok: false, error: "login_unavailable" }, cors);
    if (!activeSnapshot?.snapshot_id) return json(503, { ok: false, error: "data_not_synced" }, cors);
    const { data: userRows, error: userError } = await db.from("mobile_sync_snapshot_rows").select("payload")
      .eq("customer_id", device.customer_id).eq("snapshot_id", activeSnapshot.snapshot_id)
      .eq("entity", "users").eq("payload->>username", username).limit(1);
    if (userError) return json(500, { ok: false, error: "login_unavailable" }, cors);
    const user = (userRows?.[0]?.payload as Record<string, unknown> | undefined) ?? null;
    if (!user || !user.is_active || user.deleted_at) {
      return json(401, { ok: false, error: "invalid_credentials" }, cors);
    }
    if (typeof user.password_hash !== "string") {
      console.error("mobile login snapshot is missing a valid password hash");
      return json(500, { ok: false, error: "login_unavailable" }, cors);
    }
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return json(401, { ok: false, error: "invalid_credentials" }, cors);
    }

    const sessionCode = randomToken();
    const sessionHash = await sha256Hex(sessionCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const { data: permissionRows, error: permissionError } = await db.from("mobile_sync_snapshot_rows").select("payload")
      .eq("customer_id", device.customer_id).eq("snapshot_id", activeSnapshot.snapshot_id)
      .eq("entity", "permissions").eq("payload->>user_source_id", user.source_id).limit(1);
    if (permissionError) return json(500, { ok: false, error: "login_unavailable" }, cors);
    const permission = (permissionRows?.[0]?.payload as Record<string, unknown> | undefined) ?? null;

    const { error: sessionError } = await db.from("mobile_sessions").insert({
      session_hash: sessionHash,
      customer_id: device.customer_id,
      mobile_device_id: device.id,
      user_source_id: user.source_id,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_used_at: now.toISOString(),
      license_checked_at: now.toISOString(),
    });
    if (sessionError) {
      return json(500, { ok: false, error: "login_unavailable" }, cors);
    }

    try {
      const permissions = permissionsFor(
        String(user.role),
        permission as Record<string, unknown> | null,
      );
      const data = await readBundle(db, device.customer_id, permissions, activeSnapshot.snapshot_id);
      return json(200, {
        ok: true,
        session_code: sessionCode,
        expires_at: expiresAt.toISOString(),
        user: userView(user, permissions),
        data,
      }, cors);
    } catch (error) {
      await db.from("mobile_sessions").update({
        revoked_at: new Date().toISOString(),
      }).eq("session_hash", sessionHash);
      console.error("mobile login bundle failed", error);
      return json(500, { ok: false, error: "data_unavailable" }, cors);
    }
  }

  if (body.action === "refresh") {
    const sessionCode = (body.session_code ?? "").trim();
    if (!sessionCode) {
      return json(401, { ok: false, error: "session_expired" }, cors);
    }
    try {
      return json(200, { ok: true, ...(await sessionData(sessionCode)) }, cors);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "data_unavailable";
      const status =
        message === "device_revoked" || message === "mobile_access_disabled"
          ? 403
          : message === "session_expired" || message === "user_inactive"
          ? 401
          : 500;
      return json(status, { ok: false, error: message }, cors);
    }
  }

  if (body.action === "logout") {
    const sessionCode = (body.session_code ?? "").trim();
    if (sessionCode) {
      await db.from("mobile_sessions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("session_hash", await sha256Hex(sessionCode))
        .is("revoked_at", null);
    }
    return json(200, { ok: true }, cors);
  }

  return json(400, { ok: false, error: "unknown_action" }, cors);
});
