import {
  staleMobileSyncIds,
  validateMobileSyncSnapshot,
} from "./mobileSyncSnapshot.ts";

const customerId = "customer-1";
const timestamp = "2026-10-23T12:00:00.000Z";

function createSnapshot(): Record<string, unknown[]> {
  return {
    users: [{
      customer_id: customerId,
      source_id: "user-1",
      username: "owner",
      email: null,
      password_hash: `$2b$12$${"a".repeat(53)}`,
      role: "ADMIN",
      is_active: true,
      source_created_at: timestamp,
      source_updated_at: timestamp,
    }],
    permissions: [],
    categories: [],
    products: [{
      customer_id: customerId,
      source_id: "product-1",
      name: "Product",
      category_name: "General",
      quantity: 1,
      bought_price: 100,
      selling_price: 150,
      codebar: null,
      source_created_at: timestamp,
      source_updated_at: timestamp,
    }],
    manual_products: [{
      customer_id: customerId,
      source_id: "manual-product-1",
      name: "Manual item",
      type: "item",
      cost_price: 75,
      source_created_at: timestamp,
      source_updated_at: timestamp,
    }],
    suppliers: [{
      customer_id: customerId,
      source_id: "supplier-1",
      name: "Supplier",
      phone: null,
      email: null,
      address: null,
      notes: null,
      source_created_at: timestamp,
      source_updated_at: timestamp,
    }],
    purchases: [{
      customer_id: customerId,
      source_id: "purchase-1",
      supplier_source_id: "supplier-1",
      source_created_at: timestamp,
      source_updated_at: timestamp,
    }],
    purchase_items: [{
      customer_id: customerId,
      source_id: "purchase-item-1",
      purchase_source_id: "purchase-1",
      product_source_id: "product-1",
      quantity: 1,
      price: 100,
      source_created_at: timestamp,
      source_updated_at: timestamp,
    }],
    clients: [],
    services: [],
    service_appointments: [],
    sales: [],
    sale_items: [],
    payments: [],
    bills: [],
    bill_payments: [],
    dashboard_daily: [],
  };
}

function assertRejected(snapshot: unknown, reason: string): void {
  try {
    validateMobileSyncSnapshot(snapshot, customerId);
  } catch (error) {
    if (error instanceof Error && error.message.includes(reason)) return;
    throw error;
  }
  throw new Error(`Expected snapshot rejection: ${reason}`);
}

Deno.test("accepts the exact 17-array desktop snapshot including new entities", () => {
  const snapshot = createSnapshot();
  if (Object.keys(snapshot).length !== 17) {
    throw new Error(`Expected 17 snapshot arrays, got ${Object.keys(snapshot).length}`);
  }
  validateMobileSyncSnapshot(snapshot, customerId);
});

Deno.test("accepts empty snapshots for the four newer entities", () => {
  const snapshot = createSnapshot();
  snapshot.manual_products = [];
  snapshot.suppliers = [];
  snapshot.purchases = [];
  snapshot.purchase_items = [];
  validateMobileSyncSnapshot(snapshot, customerId);
});

Deno.test("rejects purchase rows whose supplier is missing", () => {
  const snapshot = createSnapshot();
  snapshot.suppliers = [];
  assertRejected(snapshot, "unknown_supplier");
});

Deno.test("rejects purchase items whose purchase or product is missing", () => {
  const snapshot = createSnapshot();
  const purchaseItems = snapshot.purchase_items as Array<
    Record<string, unknown>
  >;
  purchaseItems[0].purchase_source_id = "missing-purchase";
  assertRejected(snapshot, "unknown_purchase");

  const snapshotWithoutProduct = createSnapshot();
  const purchaseItemsWithoutProduct = snapshotWithoutProduct.purchase_items as Array<
    Record<string, unknown>
  >;
  purchaseItemsWithoutProduct[0].product_source_id = "missing-product";
  assertRejected(snapshotWithoutProduct, "unknown_product");
});

Deno.test("rejects snapshots with unexpected keys", () => {
  const snapshot = { ...createSnapshot(), unexpected: [] as unknown[] };
  assertRejected(snapshot, "unexpected_or_missing_table");
});

Deno.test("empty full snapshot marks every current-customer row stale", () => {
  const existingRows = [
    { customer_id: customerId, source_id: "old-1" },
    { customer_id: customerId, source_id: "old-2" },
  ];
  const staleIds = staleMobileSyncIds(existingRows, customerId, new Set());
  if (staleIds.join(",") !== "old-1,old-2") {
    throw new Error("An empty snapshot must reconcile every existing ID as stale.");
  }
});

Deno.test("full-snapshot reconciliation preserves included and other-customer IDs", () => {
  const staleIds = staleMobileSyncIds(
    [
      { customer_id: customerId, source_id: "old-1" },
      { customer_id: customerId, source_id: "current-1" },
      { customer_id: customerId, source_id: "old-2" },
      { customer_id: "another-customer", source_id: "other-tenant" },
    ],
    customerId,
    new Set(["current-1"]),
  );
  if (staleIds.join(",") !== "old-1,old-2") {
    throw new Error("Reconciliation selected an included ID or missed a stale ID.");
  }
});

Deno.test("new entity rows are checked against their exact schema", () => {
  const snapshot = createSnapshot();
  const manualProducts = snapshot.manual_products as Array<
    Record<string, unknown>
  >;
  manualProducts[0].unexpected = "not allowed";
  assertRejected(snapshot, "unexpected_or_missing_field");
});
