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

const READ_COLUMNS: Record<string, string> = {
  pos_categories: "source_id,name,source_updated_at",
  pos_manual_products: "source_id,name,type,cost_price,source_created_at,source_updated_at",
  pos_suppliers: "source_id,name,phone,email,address,notes,source_created_at,source_updated_at",
  pos_purchases: "source_id,supplier_source_id,source_created_at,source_updated_at",
  pos_purchase_items: "source_id,purchase_source_id,product_source_id,quantity,price,source_created_at,source_updated_at",
  pos_products:
    "source_id,name,category_name,quantity,bought_price,selling_price,codebar,source_created_at,source_updated_at",
  pos_clients:
    "source_id,name,phone,address,notes,source_created_at,source_updated_at",
  pos_payments:
    "source_id,sale_source_id,client_source_id,given_amount,credit_amount,reason,due_date,paid_date,type,pending_sale_items,discount,source_created_at,source_updated_at",
  pos_service_appointments:
    "source_id,name,service_type,description,cost_price,service_price,client_source_id,due_date,notes,is_completed,completed_at,source_created_at,source_updated_at",
  pos_bills:
    "source_id,title,description,type,amount,next_bill_date,duration,notes,source_created_at,source_updated_at",
  pos_bill_payments:
    "source_id,bill_source_id,amount,paid_date,notes,source_created_at,source_updated_at",
  pos_services: "source_id,name,description,cost_price,source_updated_at",
  pos_sales:
    "source_id,client_source_id,discount,total_amount,total_amount_with_discount,total_items,total_cost,total_profit,source_created_at,source_updated_at",
  pos_sale_items:
    "source_id,sale_source_id,product_source_id,manual_product_source_id,service_source_id,quantity,price,bought_price,source_updated_at",
};

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

async function readRows(
  db: ReturnType<typeof mobileAdminClient>,
  table: string,
  customerId: string,
  order: string,
  limit: number,
  ascending = true,
) {
  const columns = READ_COLUMNS[table];
  if (!columns) throw new Error("data_unavailable");
  const { data, error } = await db
    .from(table)
    .select(columns)
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order(order, { ascending })
    .limit(limit);
  if (error) throw new Error("data_unavailable");
  return data ?? [];
}

async function readBundle(
  db: ReturnType<typeof mobileAdminClient>,
  customerId: string,
  permissions: PermissionSet,
) {
  const dashboardCutoff = new Date();
  dashboardCutoff.setUTCDate(dashboardCutoff.getUTCDate() - 364);
  const dashboardStartDay = dashboardCutoff.toISOString().slice(0, 10);
  const [
    daily,
    categories,
    products,
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
      ? db.from("pos_dashboard_daily").select(
        "local_day,sales_count,revenue,profit,total_items,bill_payments",
      )
        .eq("customer_id", customerId).gte("local_day", dashboardStartDay)
        .order("local_day", { ascending: false }).limit(365)
      : Promise.resolve({ data: [], error: null }),
    permissions.can_access_stock
      ? readRows(db, "pos_categories", customerId, "name", 2000)
      : Promise.resolve([]),
    permissions.can_access_stock
      ? readRows(db, "pos_products", customerId, "name", 2000)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "pos_manual_products", customerId, "name", 5000)
      : Promise.resolve([]),
    permissions.can_access_clients
      ? readRows(db, "pos_suppliers", customerId, "name", 2000)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "pos_purchases", customerId, "source_created_at", 5000, false)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "pos_purchase_items", customerId, "purchase_source_id", 10000)
      : Promise.resolve([]),
    permissions.can_access_clients
      ? readRows(db, "pos_clients", customerId, "name", 2000)
      : Promise.resolve([]),
    permissions.can_access_clients
      ? readRows(db, "pos_payments", customerId, "due_date", 3000)
      : Promise.resolve([]),
    permissions.can_access_services
      ? readRows(db, "pos_service_appointments", customerId, "due_date", 1000)
      : Promise.resolve([]),
    permissions.can_access_bills
      ? readRows(db, "pos_bills", customerId, "next_bill_date", 1000)
      : Promise.resolve([]),
    permissions.can_access_bills
      ? readRows(db, "pos_bill_payments", customerId, "paid_date", 3000)
      : Promise.resolve([]),
    permissions.can_access_services
      ? readRows(db, "pos_services", customerId, "name", 500)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "pos_sales", customerId, "source_created_at", 5000, false)
      : Promise.resolve([]),
    permissions.can_access_history
      ? readRows(db, "pos_sale_items", customerId, "sale_source_id", 10000)
      : Promise.resolve([]),
  ]);

  if (daily.error) throw new Error("data_unavailable");
  return {
    dashboard_daily: daily.data ?? [],
    categories,
    products,
    manual_products: manualProducts,
    suppliers,
    purchases,
    purchase_items: purchaseItems,
    clients,
    payments,
    service_appointments: appointments,
    bills,
    bill_payments: billPayments,
    services,
    sales,
    sale_items: saleItems,
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
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (sessionError) throw new Error("session_unavailable");
  if (!session) throw new Error("session_expired");

  const [
    { data: device, error: deviceError },
    { data: user, error: userError },
    { data: permission, error: permissionError },
  ] = await Promise.all([
    db.from("mobile_devices")
      .select(
        "id,customer_id,device_id,active,revoked_at,paired_by_desktop_device_id",
      )
      .eq("id", session.mobile_device_id)
      .maybeSingle(),
    db.from("pos_users")
      .select("source_id,username,role,is_active,deleted_at")
      .eq("customer_id", session.customer_id)
      .eq("source_id", session.user_source_id)
      .maybeSingle(),
    db.from("pos_user_permissions")
      .select("*")
      .eq("customer_id", session.customer_id)
      .eq("user_source_id", session.user_source_id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);
  if (deviceError || userError || permissionError) {
    throw new Error("session_unavailable");
  }
  if (
    !device ||
    device.customer_id !== session.customer_id ||
    !device.active ||
    device.revoked_at
  ) {
    throw new Error("device_revoked");
  }
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
  const data = await readBundle(db, session.customer_id, permissions);
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

    const { data: user, error: userError } = await db
      .from("pos_users")
      .select("source_id,username,password_hash,role,is_active,deleted_at")
      .eq("customer_id", device.customer_id)
      .eq("username", username)
      .maybeSingle();
    if (userError) {
      return json(500, { ok: false, error: "login_unavailable" }, cors);
    }
    if (!user || !user.is_active || user.deleted_at) {
      return json(401, { ok: false, error: "invalid_credentials" }, cors);
    }
    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return json(401, { ok: false, error: "invalid_credentials" }, cors);
    }

    const sessionCode = randomToken();
    const sessionHash = await sha256Hex(sessionCode);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
    const { data: permission, error: permissionError } = await db
      .from("pos_user_permissions")
      .select("*")
      .eq("customer_id", device.customer_id)
      .eq("user_source_id", user.source_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (permissionError) {
      return json(500, { ok: false, error: "login_unavailable" }, cors);
    }

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
      const data = await readBundle(db, device.customer_id, permissions);
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
