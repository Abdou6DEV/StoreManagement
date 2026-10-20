type FieldType =
  | "string"
  | "nullable_string"
  | "integer"
  | "nullable_integer"
  | "boolean"
  | "timestamp"
  | "nullable_timestamp"
  | "bcrypt"
  | "day";

type TableSchema = Record<string, FieldType>;

const TABLE_SCHEMAS: Record<string, TableSchema> = {
  users: {
    customer_id: "string",
    source_id: "string",
    username: "string",
    email: "nullable_string",
    password_hash: "bcrypt",
    role: "string",
    is_active: "boolean",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  permissions: {
    customer_id: "string",
    source_id: "string",
    user_source_id: "string",
    can_access_cashier: "boolean",
    can_access_stock: "boolean",
    can_access_clients: "boolean",
    can_access_bills: "boolean",
    can_access_history: "boolean",
    can_access_dashboard: "boolean",
    can_access_services: "boolean",
    can_access_zakat: "boolean",
    can_manage_users: "boolean",
    can_view_logs: "boolean",
    can_manage_settings: "boolean",
    source_updated_at: "timestamp",
  },
  categories: {
    customer_id: "string",
    source_id: "string",
    name: "string",
    source_updated_at: "timestamp",
  },
  products: {
    customer_id: "string",
    source_id: "string",
    name: "string",
    category_name: "string",
    quantity: "integer",
    bought_price: "integer",
    selling_price: "integer",
    codebar: "nullable_string",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  clients: {
    customer_id: "string",
    source_id: "string",
    name: "string",
    phone: "nullable_string",
    address: "nullable_string",
    notes: "nullable_string",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  services: {
    customer_id: "string",
    source_id: "string",
    name: "string",
    description: "nullable_string",
    cost_price: "integer",
    source_updated_at: "timestamp",
  },
  service_appointments: {
    customer_id: "string",
    source_id: "string",
    name: "string",
    service_type: "string",
    description: "nullable_string",
    cost_price: "integer",
    service_price: "integer",
    client_source_id: "nullable_string",
    due_date: "timestamp",
    notes: "nullable_string",
    is_completed: "boolean",
    completed_at: "nullable_timestamp",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  sales: {
    customer_id: "string",
    source_id: "string",
    client_source_id: "nullable_string",
    discount: "integer",
    total_amount: "integer",
    total_amount_with_discount: "integer",
    total_items: "integer",
    total_cost: "integer",
    total_profit: "integer",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  sale_items: {
    customer_id: "string",
    source_id: "string",
    sale_source_id: "string",
    product_source_id: "nullable_string",
    manual_product_source_id: "nullable_string",
    service_source_id: "nullable_string",
    quantity: "integer",
    price: "integer",
    bought_price: "nullable_integer",
    source_updated_at: "timestamp",
  },
  payments: {
    customer_id: "string",
    source_id: "string",
    sale_source_id: "nullable_string",
    client_source_id: "string",
    given_amount: "integer",
    credit_amount: "nullable_integer",
    reason: "nullable_string",
    due_date: "nullable_timestamp",
    paid_date: "nullable_timestamp",
    type: "string",
    pending_sale_items: "nullable_string",
    discount: "nullable_integer",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  bills: {
    customer_id: "string",
    source_id: "string",
    title: "string",
    description: "nullable_string",
    type: "string",
    amount: "integer",
    next_bill_date: "nullable_timestamp",
    duration: "string",
    notes: "nullable_string",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  bill_payments: {
    customer_id: "string",
    source_id: "string",
    bill_source_id: "string",
    amount: "integer",
    paid_date: "nullable_timestamp",
    notes: "nullable_string",
    source_created_at: "nullable_timestamp",
    source_updated_at: "timestamp",
  },
  dashboard_daily: {
    customer_id: "string",
    local_day: "day",
    sales_count: "integer",
    revenue: "integer",
    profit: "integer",
    total_items: "integer",
    bill_payments: "integer",
  },
};

const REQUIRED_TABLES = Object.keys(TABLE_SCHEMAS);
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/;
const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validTimestamp(value: unknown): boolean {
  return (
    typeof value === "string" &&
    ISO_TIMESTAMP.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function validDay(value: unknown): boolean {
  if (typeof value !== "string" || !LOCAL_DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function validField(value: unknown, type: FieldType): boolean {
  switch (type) {
    case "string":
      return typeof value === "string" && value.length > 0 &&
        !value.includes("\0");
    case "nullable_string":
      return value === null ||
        (typeof value === "string" && !value.includes("\0"));
    case "integer":
      return Number.isSafeInteger(value);
    case "nullable_integer":
      return value === null || Number.isSafeInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "timestamp":
      return validTimestamp(value);
    case "nullable_timestamp":
      return value === null || validTimestamp(value);
    case "bcrypt":
      return typeof value === "string" && BCRYPT_HASH.test(value);
    case "day":
      return validDay(value);
  }
}

function fail(table: string, reason: string): never {
  throw new Error(`invalid_snapshot:${table}:${reason}`);
}

export function validateMobileSyncSnapshot(
  snapshot: unknown,
  customerId: string,
): asserts snapshot is Record<string, unknown[]> {
  if (!isRecord(snapshot)) fail("snapshot", "not_an_object");
  const providedKeys = Object.keys(snapshot).sort();
  const expectedKeys = [...REQUIRED_TABLES].sort();
  if (
    providedKeys.length !== expectedKeys.length ||
    providedKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    fail("snapshot", "unexpected_or_missing_table");
  }

  const rowsByTable = new Map<string, Map<string, Record<string, unknown>>>();
  for (const table of REQUIRED_TABLES) {
    const values = snapshot[table];
    if (!Array.isArray(values) || values.length > 10_000) {
      fail(table, "invalid_row_collection");
    }

    const schema = TABLE_SCHEMAS[table];
    const rowById = new Map<string, Record<string, unknown>>();
    const rowByUniqueField = new Map<string, Set<string>>();
    if (table === "users") rowByUniqueField.set("username", new Set());
    if (table === "permissions") {
      rowByUniqueField.set("user_source_id", new Set());
    }
    if (table === "dashboard_daily") {
      rowByUniqueField.set("local_day", new Set());
    }

    for (const value of values) {
      if (!isRecord(value)) fail(table, "row_not_an_object");
      const keys = Object.keys(value);
      if (
        keys.length !== Object.keys(schema).length ||
        keys.some((key) => !(key in schema))
      ) {
        fail(table, "unexpected_or_missing_field");
      }
      if (value.customer_id !== customerId) fail(table, "customer_mismatch");

      for (const [field, type] of Object.entries(schema)) {
        if (!validField(value[field], type)) fail(table, `invalid_${field}`);
      }

      const idField = table === "dashboard_daily" ? "local_day" : "source_id";
      const id = value[idField];
      if (typeof id !== "string") fail(table, "invalid_identity");
      if (rowById.has(id)) fail(table, "duplicate_identity");
      rowById.set(id, value);

      for (const [field, seen] of rowByUniqueField) {
        const uniqueValue = value[field];
        if (typeof uniqueValue !== "string") fail(table, `invalid_${field}`);
        if (seen.has(uniqueValue)) fail(table, `duplicate_${field}`);
        seen.add(uniqueValue);
      }
    }
    rowsByTable.set(table, rowById);
  }

  const users = rowsByTable.get("users")!;
  if (
    !users.size || ![...users.values()].some((user) => user.is_active === true)
  ) {
    fail("users", "no_active_user");
  }
  for (const permission of rowsByTable.get("permissions")!.values()) {
    if (!users.has(String(permission.user_source_id))) {
      fail("permissions", "unknown_user");
    }
  }
  for (const item of rowsByTable.get("sale_items")!.values()) {
    if (!rowsByTable.get("sales")!.has(String(item.sale_source_id))) {
      fail("sale_items", "unknown_sale");
    }
  }
  for (const payment of rowsByTable.get("bill_payments")!.values()) {
    if (!rowsByTable.get("bills")!.has(String(payment.bill_source_id))) {
      fail("bill_payments", "unknown_bill");
    }
  }
  if ((snapshot.dashboard_daily as unknown[]).length > 5_000) {
    fail("dashboard_daily", "row_limit_exceeded");
  }
}

export type PageResult<T> = {
  data: T[] | null;
  error: unknown | null;
};

export async function readAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = 500,
): Promise<T[]> {
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new Error("page_size_must_be_positive");
  }

  const rows: T[] = [];
  for (let offset = 0;; offset += pageSize) {
    const { data, error } = await fetchPage(offset, offset + pageSize - 1);
    if (error) throw new Error("page_read_failed");
    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
