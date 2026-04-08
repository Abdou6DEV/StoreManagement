type WarmupKey =
  | "options"
  | "stock"
  | "clients"
  | "payments"
  | "bills"
  | "services";

export type WarmupSnapshot = {
  options: Record<string, string | null>;
  categories: { name: string }[] | null;
  products: any[] | null;
  salesCounts: any[] | null;
  clients: any[] | null;
  payments: any[] | null;
  bills: any[] | null;
  services: any[] | null;
  completedServices: any[] | null;
};

type WarmupUpdateDetail = { key: WarmupKey; snapshot: WarmupSnapshot };

const UPDATE_EVENT = "appWarmup:update";

let started = false;
let snapshot: WarmupSnapshot = {
  options: {},
  categories: null,
  products: null,
  salesCounts: null,
  clients: null,
  payments: null,
  bills: null,
  services: null,
  completedServices: null,
};

let intervals: number[] = [];

function emit(key: WarmupKey) {
  window.dispatchEvent(
    new CustomEvent<WarmupUpdateDetail>(UPDATE_EVENT, {
      detail: { key, snapshot },
    }),
  );
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

async function loadOptionsOnce() {
  const keys = [
    "enableLowStockBadge",
    "enableOutOfStockBadge",
    "lowStockThreshold",
    "enableDueSoonPaymentsBadge",
    "enableOverduePaymentsBadge",
    "enableDueSoonBillsBadge",
    "enableOverdueBillsBadge",
    "enableDueSoonServicesBadge",
    "enableOverdueServicesBadge",
    "dueSoonThresholdDays",
    "dueSoonBillsThresholdDays",
    "dueSoonServicesThresholdDays",
    "enableCompletedServicesBadge",
  ];

  const results = await Promise.all(
    keys.map(async (k) => [k, await safe(() => window.api.database.options.get(k))] as const),
  );
  for (const [k, v] of results) snapshot.options[k] = v;
  emit("options");
}

async function loadStockOnce() {
  const [categories, products, salesCounts] = await Promise.all([
    safe(() => window.api.database.categories.getAll()),
    safe(() => window.api.database.products.getAll()),
    safe(() => window.api.database.products.getSalesCounts()),
  ]);
  snapshot.categories = categories;
  snapshot.products = products;
  snapshot.salesCounts = salesCounts;
  emit("stock");
}

async function loadClientsOnce() {
  snapshot.clients = await safe(() => window.api.database.clients.getAll());
  emit("clients");
}

async function loadPaymentsOnce() {
  snapshot.payments = await safe(() => window.api.database.payments.getAll());
  emit("payments");
}

async function loadBillsOnce() {
  snapshot.bills = await safe(() => window.api.database.bills.getAll());
  emit("bills");
}

async function loadServicesOnce() {
  const [services, completed] = await Promise.all([
    safe(() => window.api.database.serviceAppointments.getAll()),
    safe(() => window.api.database.serviceAppointments.getCompletedForCashier()),
  ]);
  snapshot.services = services;
  snapshot.completedServices = completed;
  emit("services");
}

export function getWarmupSnapshot() {
  return snapshot;
}

export function subscribeWarmup(cb: (detail: WarmupUpdateDetail) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<WarmupUpdateDetail>).detail);
  window.addEventListener(UPDATE_EVENT, handler as EventListener);
  return () => window.removeEventListener(UPDATE_EVENT, handler as EventListener);
}

/**
 * Start background warmup + polling. Idempotent and safe to call from preload.
 * This is renderer-side on purpose so it shares the same IPC + cache as the UI.
 */
export function startAppWarmup() {
  if (started) return;
  started = true;

  // Initial warmup ASAP
  void loadOptionsOnce();
  void loadStockOnce();
  void loadClientsOnce();
  void loadPaymentsOnce();
  void loadBillsOnce();
  void loadServicesOnce();

  // Background refresh (keep the UI stable; no 1s polling)
  intervals = [
    window.setInterval(loadOptionsOnce, 10_000),
    window.setInterval(loadPaymentsOnce, 10_000),
    window.setInterval(loadBillsOnce, 10_000),
    window.setInterval(loadServicesOnce, 30_000),
    window.setInterval(loadStockOnce, 30_000),
  ];
}

export async function runAppWarmupOnce() {
  // Ensure started so later polling continues
  startAppWarmup();
  // Do a deterministic initial pass so preload can wait for it
  await loadOptionsOnce();
  await loadStockOnce();
  await loadClientsOnce();
  await loadPaymentsOnce();
  await loadBillsOnce();
  await loadServicesOnce();
}

