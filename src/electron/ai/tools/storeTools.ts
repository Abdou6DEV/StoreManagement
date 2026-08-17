/**
 * Production store tools for the AI assistant.
 * Three read-only tools. The database computes totals; the model copies them.
 */

import * as salesDb from "../../../lib/database/sales";
import * as productsDb from "../../../lib/database/products";
import * as clientsDb from "../../../lib/database/clients";
import * as paymentsDb from "../../../lib/database/payments";
import * as purchasesDb from "../../../lib/database/purchases";
import * as serviceAppointmentsDb from "../../../lib/database/serviceAppointments";
import * as billsDb from "../../../lib/database/bills";
import * as sellersDb from "../../../lib/database/sellers";
import * as activityLogsDb from "../../../lib/database/activityLogs";
import {
  getStoreTimeZone,
  localRangeMeta,
  localYmdFromDate,
  parseLocalDateRange,
  type LocalDateRange,
} from "./parseLocalDateRange";

export interface AIToolInput {
  [key: string]: unknown;
}

export interface AIToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

type ToolParam = {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
};

type ToolDef = {
  name: string;
  description: string;
  fn: (input?: any) => Promise<AIToolResult>;
  input_schema: Record<string, ToolParam>;
};

const SAMPLE_LIMIT = 70;
const BREAKDOWN_LIMIT = 40;

function fail(error: string): AIToolResult {
  return { success: false, error };
}

function ok(data: unknown): AIToolResult {
  return { success: true, data };
}

function matchesQ(value: unknown, q?: string): boolean {
  if (!q?.trim()) return true;
  const needle = q.trim().toLowerCase();
  return String(value ?? "").toLowerCase().includes(needle);
}

function todayYmd() {
  return localYmdFromDate(new Date());
}

function yearStartYmd() {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

/** Bills/BillPayments are stored in centimes (DA * 100). Sales are already DA. */
function centimesToDA(amount: unknown): number {
  return Math.round(Number(amount) || 0) / 100;
}

function roundDA(value: number): number {
  return Math.round(value * 100) / 100;
}

function isSalaryType(type: unknown): boolean {
  return String(type ?? "").trim().toUpperCase() === "SALARY";
}

const NOTES_YMD = /(\d{4}-\d{2}-\d{2})/;

/** Salary "for" date in notes (YYYY-MM-DD); otherwise the day the payment was recorded. */
function paymentAttributionDate(
  payment: { notes?: string | null; paidDate: Date | string },
  isSalary: boolean
): Date {
  if (isSalary) {
    const match = NOTES_YMD.exec(String(payment.notes ?? ""));
    if (match) {
      const [year, month, day] = match[1].split("-").map(Number);
      const local = new Date(year, month - 1, day);
      if (
        local.getFullYear() === year &&
        local.getMonth() === month - 1 &&
        local.getDate() === day
      ) {
        return local;
      }
    }
  }
  return new Date(payment.paidDate);
}

function billsRange(
  groupBy: string,
  startDate?: unknown,
  endDate?: unknown
): LocalDateRange | { ok: true; allTime: true } {
  if (startDate == null && endDate == null) {
    if (groupBy === "month" || groupBy === "year") {
      return defaultRange(groupBy, startDate, endDate);
    }
    return { ok: true, allTime: true };
  }
  return defaultRange(groupBy, startDate, endDate);
}

function defaultRange(
  groupBy: string,
  startDate?: unknown,
  endDate?: unknown
): LocalDateRange {
  if (startDate != null && endDate != null) {
    return parseLocalDateRange(startDate, endDate);
  }
  if (startDate != null && endDate == null) {
    return parseLocalDateRange(startDate, startDate);
  }
  if (endDate != null && startDate == null) {
    return parseLocalDateRange(endDate, endDate);
  }

  const today = todayYmd();
  if (groupBy === "month" || groupBy === "year") {
    return parseLocalDateRange(yearStartYmd(), today);
  }
  return parseLocalDateRange(today, today);
}

function slimProduct(product: {
  id: string;
  name: string;
  quantity: number;
  sellingPrice: number;
  boughtPrice: number;
  codebar?: string | null;
  categoryName?: string;
}) {
  return {
    id: product.id,
    name: product.name,
    quantity: product.quantity,
    sellingPrice: product.sellingPrice,
    boughtPrice: product.boughtPrice,
    barcode: product.codebar ?? null,
    category: product.categoryName ?? null,
  };
}

function saleMatchesQ(sale: any, q?: string): boolean {
  if (!q?.trim()) return true;
  if (matchesQ(sale.client?.name, q)) return true;
  if (matchesQ(sale.id, q)) return true;
  return (sale.saleItems ?? []).some(
    (item: any) =>
      matchesQ(item.product?.name, q) ||
      matchesQ(item.manualProduct?.name, q) ||
      matchesQ(item.service?.name, q)
  );
}

function isUnpaidVersement(sale: any): boolean {
  if (!sale.payment) return false;
  if (sale.payment.type === "CREDIT") return false;
  return sale.payment.type === "VERSEMENT" && sale.payment.paidDate === null;
}

function saleRevenue(sale: any): number {
  return Number(sale.totalAmountWithDiscount || 0);
}

function saleProfit(sale: any): number {
  return Number(sale.totalProfit || 0);
}

function periodKey(date: Date, groupBy: string): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  if (groupBy === "day") return `${year}-${month}-${day}`;
  if (groupBy === "month") return `${year}-${month}`;
  if (groupBy === "year") return String(year);
  return `${year}-${month}-${day}`;
}

function emptyTotals() {
  return { revenue: 0, count: 0, profit: 0 };
}

function addTotals(
  totals: { revenue: number; count: number; profit: number },
  revenue: number,
  profit: number,
  count = 1
) {
  totals.revenue += revenue;
  totals.profit += profit;
  totals.count += count;
}

type LineMix = {
  productRevenue: number;
  productLineProfit: number;
  productQuantity: number;
  serviceRevenue: number;
  serviceProfit: number;
  serviceQuantity: number;
  manualRevenue: number;
  manualProfit: number;
  manualQuantity: number;
};

function emptyMix(): LineMix {
  return {
    productRevenue: 0,
    productLineProfit: 0,
    productQuantity: 0,
    serviceRevenue: 0,
    serviceProfit: 0,
    serviceQuantity: 0,
    manualRevenue: 0,
    manualProfit: 0,
    manualQuantity: 0,
  };
}

function roundMix(mix: LineMix): LineMix {
  return {
    productRevenue: roundDA(mix.productRevenue),
    productLineProfit: roundDA(mix.productLineProfit),
    productQuantity: mix.productQuantity,
    serviceRevenue: roundDA(mix.serviceRevenue),
    serviceProfit: roundDA(mix.serviceProfit),
    serviceQuantity: mix.serviceQuantity,
    manualRevenue: roundDA(mix.manualRevenue),
    manualProfit: roundDA(mix.manualProfit),
    manualQuantity: mix.manualQuantity,
  };
}

function saleItemKind(item: {
  serviceId?: string | null;
  service?: unknown;
  manualProductId?: string | null;
  manualProduct?: unknown;
}): "product" | "service" | "manual" {
  if (item.serviceId || item.service) return "service";
  if (item.manualProductId || item.manualProduct) return "manual";
  return "product";
}

function serviceLineType(
  item: { service?: { serviceAppointmentId?: string | null; serviceType?: string | null } | null },
  appointmentTypes?: Map<string, string>
): string {
  const appointmentId = item.service?.serviceAppointmentId;
  if (appointmentId && appointmentTypes?.has(appointmentId)) {
    return appointmentTypes.get(appointmentId) || "";
  }
  return String(item.service?.serviceType || "");
}

async function getAppointmentTypeMap() {
  const jobs = await serviceAppointmentsDb.getAllServiceAppointments();
  const map = new Map<string, string>();
  for (const job of jobs as { id: string; serviceType: string }[]) {
    map.set(job.id, job.serviceType || "");
  }
  return { jobs, map };
}

function saleItemCost(item: {
  quantity?: number;
  boughtPrice?: number | null;
  service?: { costPrice?: number | null } | null;
  manualProduct?: { costPrice?: number | null } | null;
  product?: { boughtPrice?: number | null } | null;
}): number {
  const qty = Number(item.quantity || 0);
  if (typeof item.boughtPrice === "number") return item.boughtPrice * qty;
  if (item.service?.costPrice != null) return Number(item.service.costPrice) * qty;
  if (item.manualProduct?.costPrice != null) {
    return Number(item.manualProduct.costPrice) * qty;
  }
  if (item.product?.boughtPrice != null) return Number(item.product.boughtPrice) * qty;
  return 0;
}

function saleItemMatchesQ(
  sale: any,
  item: any,
  q?: string,
  appointmentTypes?: Map<string, string>
): boolean {
  if (!q?.trim()) return true;
  if (matchesQ(sale.client?.name, q) || matchesQ(sale.id, q)) return true;
  const name =
    item.product?.name || item.manualProduct?.name || item.service?.name || "";
  const type = serviceLineType(item, appointmentTypes);
  return matchesQ(name, q) || matchesQ(type, q);
}

function matchingSaleTicket(
  sale: any,
  q?: string,
  appointmentTypes?: Map<string, string>
): { revenue: number; profit: number } {
  if (!q?.trim() || matchesQ(sale.client?.name, q) || matchesQ(sale.id, q)) {
    return { revenue: saleRevenue(sale), profit: saleProfit(sale) };
  }
  let revenue = 0;
  let profit = 0;
  for (const item of sale.saleItems ?? []) {
    if (!saleItemMatchesQ(sale, item, q, appointmentTypes)) continue;
    const lineRevenue = Number(item.price || 0) * Number(item.quantity || 0);
    revenue += lineRevenue;
    profit += lineRevenue - saleItemCost(item);
  }
  return { revenue, profit };
}

function addSaleItemsToMix(
  mix: LineMix,
  sale: any,
  q?: string,
  appointmentTypes?: Map<string, string>
) {
  for (const item of sale.saleItems ?? []) {
    if (!saleItemMatchesQ(sale, item, q, appointmentTypes)) continue;
    const revenue = Number(item.price || 0) * Number(item.quantity || 0);
    const profit = revenue - saleItemCost(item);
    const qty = Number(item.quantity || 0);
    const kind = saleItemKind(item);
    if (kind === "service") {
      mix.serviceRevenue += revenue;
      mix.serviceProfit += profit;
      mix.serviceQuantity += qty;
    } else if (kind === "manual") {
      mix.manualRevenue += revenue;
      mix.manualProfit += profit;
      mix.manualQuantity += qty;
    } else {
      mix.productRevenue += revenue;
      mix.productLineProfit += profit;
      mix.productQuantity += qty;
    }
  }
}

function withTicketMix(
  ticket: { revenue: number; count: number; profit: number },
  mix: LineMix,
  billsPaidDA = 0
) {
  const rounded = roundMix(mix);
  const billsPaid = roundDA(billsPaidDA);
  return {
    ...ticket,
    ...rounded,
    productProfit: roundDA(ticket.profit - rounded.serviceProfit),
    billsPaid,
    netProfit: roundDA(ticket.profit - billsPaid),
  };
}

async function billsPaidInRangeDA(startDate: Date, endDate: Date): Promise<number> {
  const rows = await billsDb.bills.getBillsPaymentsAggregatedByPeriod(
    "day",
    startDate,
    endDate
  );
  return centimesToDA(
    rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0)
  );
}

function breakdownFromMap(
  grouped: Map<string, { revenue: number; count: number; profit: number }>,
  groupBy: string
) {
  const rows = Array.from(grouped.entries()).map(([key, value]) => ({
    key,
    ...value,
  }));
  const isTime =
    groupBy === "day" || groupBy === "month" || groupBy === "year";
  if (isTime) {
    return rows.sort((a, b) => a.key.localeCompare(b.key)).slice(-BREAKDOWN_LIMIT);
  }
  return rows
    .sort((a, b) => b.revenue - a.revenue || a.key.localeCompare(b.key))
    .slice(0, BREAKDOWN_LIMIT);
}

function purchaseAmount(purchase: {
  PurchaseItems: { price: number; quantity: number }[];
}): number {
  return purchase.PurchaseItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
}

async function reportSales(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
}): Promise<AIToolResult> {
  const range = defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const meta = localRangeMeta(range.startDate, range.endDate);
  const q = input.q?.trim();
  const salesMixRule = q
    ? "profit is ticket profit (DA). billsPaid is 0 on a filtered (q) slice, so netProfit equals profit — store-wide bills are not subtracted. Do not treat this as History net profit. serviceProfit is sold service lines. productProfit is already profit minus serviceProfit. Do not subtract again. Counts are not DA."
    : "profit is ticket profit (DA). netProfit is already profit minus billsPaid (same as History net profit). serviceProfit is sold service lines. productProfit is already profit minus serviceProfit. Do not subtract again. Counts are not DA.";

  if (!q && (input.groupBy === "day" || input.groupBy === "month" || input.groupBy === "year")) {
    const period = input.groupBy as "day" | "month" | "year";
    const [rows, sales] = await Promise.all([
      salesDb.getSalesAggregatedByPeriod(period, range.startDate, range.endDate),
      salesDb.getSalesByDateRange(range.startDate, range.endDate),
    ]);
    const mixByPeriod = new Map<string, LineMix>();
    const mixTotals = emptyMix();
    for (const sale of sales as any[]) {
      const key = periodKey(new Date(sale.createdAt), input.groupBy);
      const current = mixByPeriod.get(key) ?? emptyMix();
      addSaleItemsToMix(current, sale);
      mixByPeriod.set(key, current);
      addSaleItemsToMix(mixTotals, sale);
    }
    const totals = emptyTotals();
    let billsPaidTotal = 0;
    const breakdown = rows.map((row) => {
      totals.revenue += row.revenue;
      totals.profit += row.profit;
      totals.count += row.count;
      const mix = mixByPeriod.get(row.period) ?? emptyMix();
      const billsPaid = centimesToDA(row.billsPayments);
      billsPaidTotal += billsPaid;
      return {
        key: row.period,
        purchases: row.purchases,
        bills: billsPaid,
        ...withTicketMix(
          { revenue: row.revenue, count: row.count, profit: row.profit },
          mix,
          billsPaid
        ),
      };
    });
    return ok({
      ...meta,
      entity: "sales",
      groupBy: input.groupBy,
      totals: withTicketMix(totals, mixTotals, billsPaidTotal),
      breakdown,
      rule: `${salesMixRule} bills/billsPaid are already DA. Do not add rows.`,
    });
  }

  const sales = (await salesDb.getSalesByDateRange(
    range.startDate,
    range.endDate
  )) as any[];
  const included = sales.filter(
    (sale) => !isUnpaidVersement(sale) && saleMatchesQ(sale, q)
  );

  if (!q && input.groupBy === "none") {
    const [summary, billsPaid] = await Promise.all([
      salesDb.getSalesSummary(range.startDate, range.endDate),
      billsPaidInRangeDA(range.startDate, range.endDate),
    ]);
    const mix = emptyMix();
    for (const sale of included) addSaleItemsToMix(mix, sale);
    return ok({
      ...meta,
      entity: "sales",
      groupBy: "none",
      totals: withTicketMix(
        {
          revenue: summary.totalRevenue,
          count: summary.totalSales,
          profit: summary.totalProfit,
        },
        mix,
        billsPaid
      ),
      breakdown: [],
      rule: `${salesMixRule} Copy totals.netProfit for net profit. Do not invent a monthly split.`,
    });
  }

  const totals = emptyTotals();
  const mix = emptyMix();
  const grouped = new Map<string, { revenue: number; count: number; profit: number }>();
  const appointmentTypes = q ? (await getAppointmentTypeMap()).map : undefined;

  for (const sale of included) {
    const { revenue, profit } = matchingSaleTicket(sale, q, appointmentTypes);
    addTotals(totals, revenue, profit, 1);
    addSaleItemsToMix(mix, sale, q, appointmentTypes);

    let key = "all";
    if (input.groupBy === "product") {
      for (const item of sale.saleItems ?? []) {
        const name =
          item.product?.name ||
          item.manualProduct?.name ||
          item.service?.name ||
          "unknown";
        if (!saleItemMatchesQ(sale, item, q, appointmentTypes)) {
          continue;
        }
        const current = grouped.get(name) ?? emptyTotals();
        const lineRevenue = Number(item.price || 0) * Number(item.quantity || 0);
        addTotals(
          current,
          lineRevenue,
          lineRevenue - saleItemCost(item),
          Number(item.quantity || 0)
        );
        grouped.set(name, current);
      }
      continue;
    }
    if (input.groupBy === "client") {
      key = sale.client?.name || "no-client";
    } else if (input.groupBy === "day" || input.groupBy === "month" || input.groupBy === "year") {
      key = periodKey(new Date(sale.createdAt), input.groupBy);
    }
    const current = grouped.get(key) ?? emptyTotals();
    addTotals(current, revenue, profit, 1);
    grouped.set(key, current);
  }

  return ok({
    ...meta,
    entity: "sales",
    q: q || null,
    groupBy: input.groupBy,
    totals: withTicketMix(
      totals,
      mix,
      q ? 0 : await billsPaidInRangeDA(range.startDate, range.endDate)
    ),
    breakdown: input.groupBy === "none" ? [] : breakdownFromMap(grouped, input.groupBy),
    rule: `${salesMixRule} Do not count sample rows.`,
  });
}

async function reportStock(q?: string): Promise<AIToolResult> {
  const products = await productsDb.getAllProducts();
  const matched = products.filter(
    (product) =>
      matchesQ(product.name, q) ||
      matchesQ(product.codebar, q) ||
      matchesQ(product.categoryName, q)
  );

  const inventoryCost = matched.reduce(
    (sum, product) => sum + product.quantity * product.boughtPrice,
    0
  );
  const inventoryRetail = matched.reduce(
    (sum, product) => sum + product.quantity * product.sellingPrice,
    0
  );

  const byCategoryMap = new Map<
    string,
    {
      category: string;
      productCount: number;
      totalQuantity: number;
      inventoryCost: number;
      inventoryRetail: number;
      profitPotential: number;
    }
  >();
  for (const product of matched) {
    const category = String(product.categoryName ?? "").trim() || "Uncategorized";
    const current = byCategoryMap.get(category) ?? {
      category,
      productCount: 0,
      totalQuantity: 0,
      inventoryCost: 0,
      inventoryRetail: 0,
      profitPotential: 0,
    };
    const cost = product.quantity * product.boughtPrice;
    const retail = product.quantity * product.sellingPrice;
    current.productCount += 1;
    current.totalQuantity += product.quantity;
    current.inventoryCost += cost;
    current.inventoryRetail += retail;
    current.profitPotential += retail - cost;
    byCategoryMap.set(category, current);
  }

  const byCategory = [...byCategoryMap.values()]
    .map((row) => ({
      ...row,
      inventoryCost: roundDA(row.inventoryCost),
      inventoryRetail: roundDA(row.inventoryRetail),
      profitPotential: roundDA(row.profitPotential),
    }))
    .sort((a, b) => b.inventoryRetail - a.inventoryRetail);

  return ok({
    entity: "stock",
    q: q || null,
    totals: {
      matchCount: matched.length,
      totalQuantity: matched.reduce((sum, product) => sum + product.quantity, 0),
      inventoryCost: roundDA(inventoryCost),
      inventoryRetail: roundDA(inventoryRetail),
      profitPotential: roundDA(inventoryRetail - inventoryCost),
      zakatOnStock: roundDA(inventoryRetail * 0.025),
    },
    byCategory,
    matches: matched
      .slice()
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, SAMPLE_LIMIT)
      .map(slimProduct),
    rule: "Copy totals. byCategory is stock by category (same as Stock page). zakatOnStock is 2.5% of inventoryRetail (selling price). Cash and nisab are on the Zakat page, not in the store. Do not count matches.",
  });
}

async function reportPayments(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
}): Promise<AIToolResult> {
  const range = defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const payments = (await paymentsDb.getPaymentsByDateRange(
    range.startDate,
    range.endDate
  )) as any[];
  const matched = payments.filter(
    (payment) =>
      matchesQ(payment.client?.name, input.q) ||
      matchesQ(payment.reason, input.q)
  );

  const totals = {
    count: matched.length,
    givenAmount: matched.reduce(
      (sum, payment) => sum + Number(payment.givenAmount || 0),
      0
    ),
  };
  const grouped = new Map<string, { revenue: number; count: number; profit: number }>();
  for (const payment of matched) {
    const key =
      input.groupBy === "client"
        ? payment.client?.name || "unknown"
        : input.groupBy === "none"
          ? "all"
          : periodKey(new Date(payment.createdAt), input.groupBy);
    const current = grouped.get(key) ?? emptyTotals();
    addTotals(current, Number(payment.givenAmount || 0), 0, 1);
    grouped.set(key, current);
  }

  return ok({
    ...localRangeMeta(range.startDate, range.endDate),
    entity: "payments",
    q: input.q?.trim() || null,
    groupBy: input.groupBy,
    totals,
    breakdown: input.groupBy === "none" ? [] : breakdownFromMap(grouped, input.groupBy),
    rule: "Copy totals. Do not add payment rows.",
  });
}

async function reportPurchases(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
}): Promise<AIToolResult> {
  const range = defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const purchases = await purchasesDb.getPurchasesByDateRange(
    range.startDate,
    range.endDate
  );
  const matched = purchases.filter((purchase) => {
    if (!input.q?.trim()) return true;
    if (matchesQ(purchase.seller?.name, input.q)) return true;
    if (matchesQ(purchase.seller?.phone, input.q)) return true;
    if (matchesQ(purchase.seller?.email, input.q)) return true;
    return purchase.PurchaseItems.some((item) =>
      matchesQ(item.product?.name, input.q)
    );
  });

  const totals = {
    count: matched.length,
    amount: matched.reduce((sum, purchase) => sum + purchaseAmount(purchase), 0),
  };

  const grouped = new Map<string, { revenue: number; count: number; profit: number }>();
  for (const purchase of matched) {
    const amount = purchaseAmount(purchase);
    let key = "all";
    if (input.groupBy === "seller") {
      key = purchase.seller?.name || "unknown";
    } else if (input.groupBy === "product") {
      for (const item of purchase.PurchaseItems) {
        if (input.q && !matchesQ(item.product?.name, input.q)) continue;
        const name = item.product?.name || "unknown";
        const current = grouped.get(name) ?? emptyTotals();
        addTotals(current, item.price * item.quantity, 0, item.quantity);
        grouped.set(name, current);
      }
      continue;
    } else if (input.groupBy !== "none") {
      key = periodKey(new Date(purchase.createdAt), input.groupBy);
    }
    const current = grouped.get(key) ?? emptyTotals();
    addTotals(current, amount, 0, 1);
    grouped.set(key, current);
  }

  return ok({
    ...localRangeMeta(range.startDate, range.endDate),
    entity: "purchases",
    q: input.q?.trim() || null,
    groupBy: input.groupBy,
    totals,
    breakdown: input.groupBy === "none" ? [] : breakdownFromMap(grouped, input.groupBy),
    rule: "Copy totals.amount (DA) and totals.count. groupBy=seller is by supplier name. Do not add purchase rows.",
  });
}

async function reportServices(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
}): Promise<AIToolResult> {
  const range = defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const meta = localRangeMeta(range.startDate, range.endDate);
  const q = input.q?.trim();
  const { jobs, map: appointmentTypes } = await getAppointmentTypeMap();
  const sales = (await salesDb.getSalesByDateRange(
    range.startDate,
    range.endDate
  )) as any[];

  type ServiceSoldRow = {
    name: string;
    type: string;
    client: string | null;
    revenue: number;
    cost: number;
    profit: number;
    quantity: number;
    soldAt: Date;
  };

  const soldRows: ServiceSoldRow[] = [];
  const soldAppointmentIds = new Set<string>();
  const mix = emptyMix();

  for (const sale of sales) {
    if (isUnpaidVersement(sale)) continue;
    for (const item of sale.saleItems ?? []) {
      if (saleItemKind(item) !== "service") continue;
      const name = item.service?.name || "unknown";
      const type = serviceLineType(item, appointmentTypes);
      if (
        q &&
        !matchesQ(name, q) &&
        !matchesQ(type, q) &&
        !matchesQ(sale.client?.name, q)
      ) {
        continue;
      }
      const revenue = Number(item.price || 0) * Number(item.quantity || 0);
      const cost = saleItemCost(item);
      soldRows.push({
        name,
        type,
        client: sale.client?.name ?? null,
        revenue,
        cost,
        profit: revenue - cost,
        quantity: Number(item.quantity || 0),
        soldAt: new Date(sale.createdAt),
      });
      addSaleItemsToMix(mix, { ...sale, saleItems: [item] }, undefined, appointmentTypes);
      const appointmentId = item.service?.serviceAppointmentId;
      if (appointmentId) soldAppointmentIds.add(appointmentId);
    }
  }

  const now = Date.now();
  let jobsPendingCount = 0;
  let jobsOverdueCount = 0;
  let jobsCompletedInPeriodCount = 0;
  let jobsUnsoldCompletedInPeriodCount = 0;
  const byTypeMap = new Map<
    string,
    {
      soldCount: number;
      serviceRevenue: number;
      serviceProfit: number;
      jobsPendingCount: number;
      jobsCompletedInPeriodCount: number;
    }
  >();

  const typeBucket = (key: string) => {
    const typeKey = key.trim() || "unknown";
    const current = byTypeMap.get(typeKey) ?? {
      soldCount: 0,
      serviceRevenue: 0,
      serviceProfit: 0,
      jobsPendingCount: 0,
      jobsCompletedInPeriodCount: 0,
    };
    byTypeMap.set(typeKey, current);
    return current;
  };

  for (const row of soldRows) {
    const bucket = typeBucket(row.type);
    bucket.soldCount += 1;
    bucket.serviceRevenue += row.revenue;
    bucket.serviceProfit += row.profit;
  }

  for (const job of jobs as any[]) {
    if (
      q &&
      !matchesQ(job.name, q) &&
      !matchesQ(job.serviceType, q) &&
      !matchesQ(job.client?.name, q)
    ) {
      continue;
    }
    if (!job.isCompleted) {
      jobsPendingCount += 1;
      typeBucket(job.serviceType).jobsPendingCount += 1;
      if (job.dueDate && new Date(job.dueDate).getTime() < now) {
        jobsOverdueCount += 1;
      }
    }
    if (job.completedAt) {
      const completed = new Date(job.completedAt).getTime();
      if (completed >= range.startDate.getTime() && completed <= range.endDate.getTime()) {
        jobsCompletedInPeriodCount += 1;
        typeBucket(job.serviceType).jobsCompletedInPeriodCount += 1;
        if (!soldAppointmentIds.has(job.id)) {
          jobsUnsoldCompletedInPeriodCount += 1;
        }
      }
    }
  }

  const grouped = new Map<string, { revenue: number; count: number; profit: number }>();
  if (input.groupBy !== "none") {
    for (const row of soldRows) {
      let key = "all";
      if (
        input.groupBy === "day" ||
        input.groupBy === "month" ||
        input.groupBy === "year"
      ) {
        key = periodKey(row.soldAt, input.groupBy);
      } else if (input.groupBy === "client") {
        key = row.client || "no-client";
      } else if (input.groupBy === "seller") {
        key = row.type || "unknown";
      } else {
        key = row.name;
      }
      const current = grouped.get(key) ?? emptyTotals();
      addTotals(current, row.revenue, row.profit, row.quantity);
      grouped.set(key, current);
    }
  }

  const rounded = roundMix(mix);
  const byType = Array.from(byTypeMap.entries())
    .map(([key, value]) => ({
      key,
      soldCount: value.soldCount,
      serviceRevenue: roundDA(value.serviceRevenue),
      serviceProfit: roundDA(value.serviceProfit),
      jobsPendingCount: value.jobsPendingCount,
      jobsCompletedInPeriodCount: value.jobsCompletedInPeriodCount,
    }))
    .sort((a, b) => b.serviceProfit - a.serviceProfit)
    .slice(0, BREAKDOWN_LIMIT);

  return ok({
    ...meta,
    entity: "services",
    currency: "DA",
    q: q || null,
    groupBy: input.groupBy,
    totals: {
      soldCount: soldRows.length,
      serviceRevenue: rounded.serviceRevenue,
      serviceProfit: rounded.serviceProfit,
      serviceQuantity: rounded.serviceQuantity,
      jobsPendingCount,
      jobsOverdueCount,
      jobsCompletedInPeriodCount,
      jobsUnsoldCompletedInPeriodCount,
    },
    byType,
    breakdown: input.groupBy === "none" ? [] : breakdownFromMap(grouped, input.groupBy),
    matches: soldRows
      .slice()
      .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime())
      .slice(0, SAMPLE_LIMIT)
      .map((row) => ({
        name: row.name,
        type: row.type,
        client: row.client,
        revenue: roundDA(row.revenue),
        profit: roundDA(row.profit),
        soldDate: localYmdFromDate(row.soldAt),
      })),
    rule: "Money fields are DA from services SOLD on Cashier in this period. q filters Service Type (repair, flash, …) as on the Services page. byType is the split by that type. jobs*Count fields are COUNTS, not DA. Do not use completed counts as profit.",
  });
}

type BillPaymentRow = {
  title: string;
  type: string;
  amountDA: number;
  isSalary: boolean;
  paidDate: Date;
  periodDate: Date;
  notes: string | null;
};

async function reportBills(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
}): Promise<AIToolResult> {
  const rangeOrAll = billsRange(input.groupBy, input.startDate, input.endDate);
  if (!("allTime" in rangeOrAll) && rangeOrAll.ok === false) {
    return fail(rangeOrAll.error);
  }
  const bounded = "allTime" in rangeOrAll ? null : rangeOrAll;

  const meta = bounded
    ? {
        ...localRangeMeta(bounded.startDate, bounded.endDate),
        period: `${bounded.startYmd} to ${bounded.endYmd}`,
      }
    : {
        timezone: getStoreTimeZone(),
        timeline: "local store time (same as History and dashboard)",
        startLocal: "all-time",
        endLocal: "all-time",
        period: "all-time",
      };

  const bills = await billsDb.bills.getAll();
  const q = input.q?.trim();
  const rows: BillPaymentRow[] = [];

  for (const bill of bills as any[]) {
    const isSalary = isSalaryType(bill.type);
    const billMatches =
      !q ||
      matchesQ(bill.title, q) ||
      matchesQ(bill.type, q) ||
      matchesQ(bill.description, q) ||
      matchesQ(bill.notes, q);

    for (const payment of bill.payments ?? []) {
      if (q && !billMatches && !matchesQ(payment.notes, q)) continue;

      const periodDate = paymentAttributionDate(payment, isSalary);
      if (bounded) {
        const time = periodDate.getTime();
        if (
          time < bounded.startDate.getTime() ||
          time > bounded.endDate.getTime()
        ) {
          continue;
        }
      }

      rows.push({
        title: bill.title,
        type: bill.type,
        amountDA: centimesToDA(payment.amount),
        isSalary,
        paidDate: new Date(payment.paidDate),
        periodDate,
        notes: payment.notes ?? null,
      });
    }
  }

  const totals = { paid: 0, paymentCount: rows.length, salaryPaid: 0, expensePaid: 0 };
  for (const row of rows) {
    totals.paid += row.amountDA;
    if (row.isSalary) totals.salaryPaid += row.amountDA;
    else totals.expensePaid += row.amountDA;
  }
  totals.paid = roundDA(totals.paid);
  totals.salaryPaid = roundDA(totals.salaryPaid);
  totals.expensePaid = roundDA(totals.expensePaid);

  const byTypeMap = new Map<string, { paid: number; count: number }>();
  for (const row of rows) {
    const key = row.type || "unknown";
    const current = byTypeMap.get(key) ?? { paid: 0, count: 0 };
    current.paid += row.amountDA;
    current.count += 1;
    byTypeMap.set(key, current);
  }
  const byType = Array.from(byTypeMap.entries())
    .map(([key, value]) => ({
      key,
      paid: roundDA(value.paid),
      count: value.count,
    }))
    .sort((a, b) => b.paid - a.paid)
    .slice(0, BREAKDOWN_LIMIT);

  let breakdown: Array<{
    key: string;
    paid: number;
    count: number;
    salaryPaid: number;
    expensePaid: number;
  }> = [];

  if (input.groupBy !== "none") {
    const grouped = new Map<
      string,
      { paid: number; count: number; salaryPaid: number; expensePaid: number }
    >();
    for (const row of rows) {
      let key = "all";
      if (
        input.groupBy === "day" ||
        input.groupBy === "month" ||
        input.groupBy === "year"
      ) {
        key = periodKey(row.periodDate, input.groupBy);
      } else if (input.groupBy === "product") {
        key = row.title || "unknown";
      } else {
        key = row.type || "unknown";
      }
      const current = grouped.get(key) ?? {
        paid: 0,
        count: 0,
        salaryPaid: 0,
        expensePaid: 0,
      };
      current.paid += row.amountDA;
      current.count += 1;
      if (row.isSalary) current.salaryPaid += row.amountDA;
      else current.expensePaid += row.amountDA;
      grouped.set(key, current);
    }
    const rowsByKey = Array.from(grouped.entries()).map(([key, value]) => ({
      key,
      paid: roundDA(value.paid),
      count: value.count,
      salaryPaid: roundDA(value.salaryPaid),
      expensePaid: roundDA(value.expensePaid),
    }));
    const isTime =
      input.groupBy === "day" ||
      input.groupBy === "month" ||
      input.groupBy === "year";
    breakdown = isTime
      ? rowsByKey.sort((a, b) => a.key.localeCompare(b.key)).slice(-BREAKDOWN_LIMIT)
      : rowsByKey
          .sort((a, b) => b.paid - a.paid || a.key.localeCompare(b.key))
          .slice(0, BREAKDOWN_LIMIT);
  }

  return ok({
    ...meta,
    entity: "bills",
    currency: "DA",
    amountsAreDA: true,
    q: q || null,
    groupBy: input.groupBy,
    totals,
    byType,
    breakdown,
    matches: rows
      .slice()
      .sort((a, b) => b.periodDate.getTime() - a.periodDate.getTime())
      .slice(0, SAMPLE_LIMIT)
      .map((row) => ({
        title: row.title,
        type: row.type,
        amountDA: row.amountDA,
        kind: row.isSalary ? "salary" : "expense",
        periodDate: localYmdFromDate(row.periodDate),
        paidDate: localYmdFromDate(row.paidDate),
      })),
    rule: "Amounts are already DA. expenses = totals.expensePaid (non-salary). salaries = totals.salaryPaid. all bills = totals.paid. Copy totals; do not add matches.",
  });
}

async function reportActivity(input: {
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
}): Promise<AIToolResult> {
  const today = todayYmd();
  const range = parseLocalDateRange(
    input.startDate ?? today,
    input.endDate ?? today
  );
  if (range.ok === false) return fail(range.error);

  const result = await activityLogsDb.getActivityLogs({
    dateFrom: range.startDate,
    dateTo: range.endDate,
    searchDetails: input.q?.trim() || undefined,
    limit: 20,
    offset: 0,
  });

  return ok({
    ...localRangeMeta(range.startDate, range.endDate),
    entity: "activity",
    q: input.q?.trim() || null,
    totals: { count: result.total },
    matches: result.entries.slice(0, SAMPLE_LIMIT).map((entry) => ({
      username: entry.username,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
    })),
    rule: "Copy totals.count. Do not count matches.",
  });
}

export async function tool_report(input: {
  entity?: string;
  groupBy?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<AIToolResult> {
  try {
    const entity = String(input.entity ?? "").trim().toLowerCase();
    const groupBy = String(input.groupBy ?? "none").trim().toLowerCase() || "none";
    const allowedEntity = [
      "sales",
      "payments",
      "purchases",
      "stock",
      "services",
      "bills",
      "activity",
    ];
    if (!allowedEntity.includes(entity)) {
      return fail(
        `entity is required: sales | payments | purchases | stock | services | bills | activity`
      );
    }

    const allowedGroup = [
      "none",
      "day",
      "month",
      "year",
      "product",
      "client",
      "seller",
    ];
    if (!allowedGroup.includes(groupBy)) {
      return fail(
        `groupBy must be none | day | month | year | product | client | seller`
      );
    }

    const groupByByEntity: Record<string, string[]> = {
      sales: ["none", "day", "month", "year", "product", "client"],
      payments: ["none", "day", "month", "year", "client"],
      purchases: ["none", "day", "month", "year", "product", "seller"],
      services: ["none", "day", "month", "year", "product", "client", "seller"],
      bills: ["none", "day", "month", "year", "product", "client", "seller"],
    };
    const entityGroups = groupByByEntity[entity];
    if (entityGroups && !entityGroups.includes(groupBy)) {
      return fail(
        `groupBy=${groupBy} is not valid for ${entity}. Use ${entityGroups.join(" | ")}`
      );
    }

    if (entity === "sales") return reportSales({ groupBy, q: input.q, startDate: input.startDate, endDate: input.endDate });
    if (entity === "stock") return reportStock(input.q);
    if (entity === "payments") return reportPayments({ groupBy, q: input.q, startDate: input.startDate, endDate: input.endDate });
    if (entity === "purchases") return reportPurchases({ groupBy, q: input.q, startDate: input.startDate, endDate: input.endDate });
    if (entity === "services") {
      return reportServices({
        groupBy,
        q: input.q,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }
    if (entity === "bills") {
      return reportBills({
        groupBy,
        q: input.q,
        startDate: input.startDate,
        endDate: input.endDate,
      });
    }
    return reportActivity({ q: input.q, startDate: input.startDate, endDate: input.endDate });
  } catch (error) {
    return fail(`report failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function tool_find(input: {
  type?: string;
  q?: string;
} = {}): Promise<AIToolResult> {
  try {
    const type = String(input.type ?? "").trim().toLowerCase();
    const q = String(input.q ?? "").trim();
    if (!q && type !== "seller" && type !== "client") {
      return fail("q is required (name, brand, barcode, client, or supplier).");
    }

    if (type === "product") {
      const byBarcode = await productsDb.findProductByBarcode(q);
      if (byBarcode) {
        return ok({
          type: "product",
          q,
          totals: {
            matchCount: 1,
            totalQuantity: byBarcode.quantity,
          },
          matches: [slimProduct(byBarcode)],
          rule: "Copy totals. This was an exact barcode match.",
        });
      }
      return reportStock(q);
    }

    if (type === "client") {
      const clients = await clientsDb.getAllClientsWithTotalPurchases();
      const matched = (q
        ? clients.filter(
            (client) => matchesQ(client.name, q) || matchesQ(client.phone, q)
          )
        : clients.filter(
            (client) =>
              Number(client.totalCredit || 0) > 0 ||
              Number(client.totalVersement || 0) > 0
          )
      ).map((client) => {
        const clientsOweYou = Number(client.totalCredit || 0);
        const youOweClients = Number(client.totalVersement || 0);
        return {
          id: client.id,
          name: client.name,
          phone: client.phone,
          totalPurchases: client.totalPurchases,
          clientsOweYou,
          youOweClients,
          totalCredit: clientsOweYou,
          totalVersement: youOweClients,
        };
      });
      const clientsOweYou = matched.reduce(
        (sum, client) => sum + client.clientsOweYou,
        0
      );
      const youOweClients = matched.reduce(
        (sum, client) => sum + client.youOweClients,
        0
      );
      return ok({
        type: "client",
        q: q || null,
        totals: {
          matchCount: matched.length,
          clientsOweYou,
          youOweClients,
          totalCredit: clientsOweYou,
          totalVersement: youOweClients,
        },
        matches: matched
          .slice()
          .sort(
            (a, b) =>
              b.clientsOweYou + b.youOweClients - (a.clientsOweYou + a.youOweClients)
          )
          .slice(0, SAMPLE_LIMIT),
        rule: "CREDIT = clientsOweYou (they owe you). VERSEMENT = youOweClients (deposit you hold). Never mix or subtract them. Copy totals. Do not count matches.",
      });
    }

    if (type === "seller") {
      const sellers = await sellersDb.getAllSellers();
      const matched = q
        ? sellers.filter(
            (seller) =>
              matchesQ(seller.name, q) ||
              matchesQ(seller.phone, q) ||
              matchesQ(seller.email, q) ||
              matchesQ(seller.address, q) ||
              matchesQ(seller.notes, q)
          )
        : sellers;

      const purchases = await purchasesDb.getAllPurchases();
      const bySeller = new Map<
        string,
        { count: number; amount: number; lastPurchase: Date | null }
      >();
      for (const purchase of purchases) {
        if (!purchase.sellerId) continue;
        const current = bySeller.get(purchase.sellerId) ?? {
          count: 0,
          amount: 0,
          lastPurchase: null,
        };
        current.count += 1;
        current.amount += purchaseAmount(purchase);
        const created = new Date(purchase.createdAt);
        if (
          !current.lastPurchase ||
          created.getTime() > current.lastPurchase.getTime()
        ) {
          current.lastPurchase = created;
        }
        bySeller.set(purchase.sellerId, current);
      }

      const rows = matched.map((seller) => {
        const stats = bySeller.get(seller.id) ?? {
          count: 0,
          amount: 0,
          lastPurchase: null,
        };
        return {
          name: seller.name,
          phone: seller.phone,
          email: seller.email,
          address: seller.address,
          notes: seller.notes,
          purchaseCount: stats.count,
          purchaseAmount: stats.amount,
          lastPurchaseDate: stats.lastPurchase
            ? localYmdFromDate(stats.lastPurchase)
            : null,
        };
      });

      return ok({
        type: "seller",
        q: q || null,
        totals: {
          matchCount: rows.length,
          purchaseCount: rows.reduce((sum, row) => sum + row.purchaseCount, 0),
          purchaseAmount: rows.reduce((sum, row) => sum + row.purchaseAmount, 0),
        },
        matches: rows
          .slice()
          .sort((a, b) => b.purchaseAmount - a.purchaseAmount)
          .slice(0, SAMPLE_LIMIT),
        rule: "Sellers are suppliers. Copy totals. purchaseAmount is all-time DA. For a day/month/year use report entity=purchases with dates. There is no supplier debt in the store.",
      });
    }

    if (type === "sale") {
      const result = await salesDb.searchSales(q, 20, 0, 365);
      return ok({
        type: "sale",
        q,
        totals: { matchCount: result.totalCount },
        matches: result.sales.slice(0, SAMPLE_LIMIT).map((sale: any) => ({
          id: sale.id,
          client: sale.client?.name ?? null,
          total: sale.totalAmountWithDiscount,
          createdAt: sale.createdAt,
        })),
        rule: "Copy totals.matchCount. Do not add sample totals.",
      });
    }

    return fail("type is required: product | client | seller | sale");
  } catch (error) {
    return fail(`find failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function tool_alerts(input: {
  kind?: string;
  threshold?: number;
} = {}): Promise<AIToolResult> {
  try {
    const kind = String(input.kind ?? "").trim().toLowerCase();
    const threshold =
      typeof input.threshold === "number" && input.threshold >= 0
        ? input.threshold
        : 5;

    if (kind === "low_stock") {
      const products = await productsDb.getAllProducts();
      const matched = products.filter(
        (product) => product.quantity > 0 && product.quantity <= threshold
      );
      return ok({
        kind,
        threshold,
        totals: {
          matchCount: matched.length,
          totalQuantity: matched.reduce((sum, product) => sum + product.quantity, 0),
        },
        matches: matched
          .sort((a, b) => a.quantity - b.quantity)
          .slice(0, SAMPLE_LIMIT)
          .map(slimProduct),
        rule: "Copy totals.matchCount. Do not count matches.",
      });
    }

    if (kind === "out_of_stock") {
      const products = await productsDb.getAllProducts();
      const matched = products.filter((product) => product.quantity === 0);
      return ok({
        kind,
        totals: { matchCount: matched.length, totalQuantity: 0 },
        matches: matched.slice(0, SAMPLE_LIMIT).map(slimProduct),
        rule: "Copy totals.matchCount.",
      });
    }

    if (kind === "unpaid" || kind === "overdue") {
      const payments = (await paymentsDb.getAllPaymentsWithClientInfo()) as any[];
      const now = new Date();
      const matched = payments.filter((payment) => {
        if (payment.paidDate) return false;
        if (kind === "overdue") {
          return new Date(payment.dueDate).getTime() < now.getTime();
        }
        return true;
      });
      const credits = matched.filter((payment) => payment.type === "CREDIT");
      const versements = matched.filter((payment) => payment.type === "VERSEMENT");
      const clientsOweYou = credits.reduce(
        (sum, payment) =>
          sum + Number(payment.remainingAmount ?? payment.givenAmount ?? 0),
        0
      );
      const youOweClients = versements.reduce(
        (sum, payment) => sum + Number(payment.givenAmount || 0),
        0
      );
      return ok({
        kind,
        totals: {
          matchCount: matched.length,
          creditCount: credits.length,
          versementCount: versements.length,
          clientsOweYou,
          youOweClients,
          amount: clientsOweYou + youOweClients,
        },
        matches: matched.slice(0, SAMPLE_LIMIT).map((payment) => ({
          id: payment.id,
          type: payment.type,
          meaning:
            payment.type === "CREDIT" ? "client_owes_you" : "you_hold_deposit",
          client: payment.client?.name ?? null,
          amount:
            payment.type === "CREDIT"
              ? payment.remainingAmount ?? payment.givenAmount
              : payment.givenAmount,
          dueDate: payment.dueDate,
        })),
        rule: "CREDIT = clientsOweYou (they owe you). VERSEMENT = youOweClients (deposit you hold). Never mix them. Copy totals. Do not add matches.",
      });
    }

    if (kind === "bills_due" || kind === "bills_overdue") {
      const days =
        kind === "bills_due" &&
        typeof input.threshold === "number" &&
        input.threshold > 0
          ? input.threshold
          : 7;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const soon = new Date(today);
      soon.setDate(soon.getDate() + days);
      soon.setHours(23, 59, 59, 999);

      const bills = await billsDb.bills.getAll();
      const matched = (bills as any[]).filter((bill) => {
        if (bill.duration === "NO_NEXT" || !bill.nextBillDate) return false;
        const due = new Date(bill.nextBillDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() === 0) return false;
        if (kind === "bills_overdue") return due < today;
        return due >= today && due <= soon;
      });

      const amount = matched.reduce(
        (sum, bill) => sum + centimesToDA(bill.amount),
        0
      );
      return ok({
        kind,
        days: kind === "bills_due" ? days : undefined,
        totals: {
          matchCount: matched.length,
          amount: roundDA(amount),
          salaryCount: matched.filter((bill) => isSalaryType(bill.type)).length,
          expenseCount: matched.filter((bill) => !isSalaryType(bill.type)).length,
        },
        matches: matched
          .slice()
          .sort(
            (a, b) =>
              new Date(a.nextBillDate).getTime() - new Date(b.nextBillDate).getTime()
          )
          .slice(0, SAMPLE_LIMIT)
          .map((bill) => ({
            title: bill.title,
            type: bill.type,
            duration: bill.duration,
            amount: centimesToDA(bill.amount),
            nextBillDate: localYmdFromDate(new Date(bill.nextBillDate)),
            billKind: isSalaryType(bill.type) ? "salary" : "expense",
          })),
        rule: "These are store bills (rent, salary, expenses), not client debts. amount is already DA. Copy totals. Do not add matches.",
      });
    }

    if (kind === "upcoming_services") {
      const upcoming = await serviceAppointmentsDb.getUpcomingServiceAppointments(7);
      const overdue = await serviceAppointmentsDb.getOverdueServiceAppointments();
      return ok({
        kind,
        totals: {
          upcomingCount: upcoming.length,
          overdueCount: overdue.length,
        },
        matches: upcoming.slice(0, SAMPLE_LIMIT).map((item: any) => ({
          id: item.id,
          name: item.name,
          dueDate: item.dueDate,
          client: item.client?.name ?? null,
        })),
        rule: "Copy totals.upcomingCount and totals.overdueCount.",
      });
    }

    return fail(
      "kind is required: low_stock | out_of_stock | unpaid | overdue | bills_due | bills_overdue | upcoming_services"
    );
  } catch (error) {
    return fail(`alerts failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const AI_TOOLS_REGISTRY: Record<string, ToolDef> = {
  report: {
    name: "report",
    description:
      "Store numbers with server-side totals. Use for today/month/year, month-by-month, best sellers, stock (incl. by category and zakatOnStock), payments, purchases/suppliers, services, bills/expenses/salaries, activity. Sales totals include profit, billsPaid, and netProfit (profit minus bills paid when q is omitted, same as History; with q, billsPaid is 0 and netProfit equals profit). groupBy=product/client/seller returns top rows by revenue. Pass local YYYY-MM-DD from the system prompt. Bills amounts are already DA. Copy totals and breakdown; never add rows.",
    fn: tool_report,
    input_schema: {
      entity: {
        type: "string",
        description: "sales | payments | purchases | stock | services | bills | activity",
        enum: [
          "sales",
          "payments",
          "purchases",
          "stock",
          "services",
          "bills",
          "activity",
        ],
      },
      startDate: {
        type: "string",
        description: "Local store date YYYY-MM-DD. Same day as endDate for one day.",
        required: false,
      },
      endDate: {
        type: "string",
        description: "Local store date YYYY-MM-DD, inclusive full local day.",
        required: false,
      },
      groupBy: {
        type: "string",
        description:
          "none = one total. month = by month. day = by day. product = best sellers, or for bills = by bill/employee name. client/seller = by customer/supplier, or for bills = by bill type.",
        required: false,
        enum: ["none", "day", "month", "year", "product", "client", "seller"],
      },
      q: {
        type: "string",
        description:
          "Optional name/brand/barcode/employee/bill-type/supplier/service-type filter (e.g. samsung, abdellah, SALARY, repair, flash).",
        required: false,
      },
    },
  },
  find: {
    name: "find",
    description:
      "Look up products, clients, suppliers (sellers), or sales by name/brand/barcode. Returns server totals. Use for Samsung stock, who owes you (CREDIT=clientsOweYou), deposits you hold (VERSEMENT=youOweClients), supplier phone, barcode lookup. Omit q for type=client to list outstanding CREDIT/VERSEMENT, or type=seller for all suppliers. Copy totals; do not count the matches array.",
    fn: tool_find,
    input_schema: {
      type: {
        type: "string",
        description: "product | client | seller (supplier) | sale",
        enum: ["product", "client", "seller", "sale"],
      },
      q: {
        type: "string",
        description:
          "Name, brand, barcode, phone, sale text, or supplier. Omit for outstanding clients when type=client, or a full supplier list when type=seller.",
        required: false,
      },
    },
  },
  alerts: {
    name: "alerts",
    description:
      "Low stock, out of stock, unpaid/overdue client CREDIT vs VERSEMENT, bills due soon or overdue, upcoming/overdue services. Returns server totals plus a short sample.",
    fn: tool_alerts,
    input_schema: {
      kind: {
        type: "string",
        description:
          "low_stock | out_of_stock | unpaid | overdue | bills_due | bills_overdue | upcoming_services",
        enum: [
          "low_stock",
          "out_of_stock",
          "unpaid",
          "overdue",
          "bills_due",
          "bills_overdue",
          "upcoming_services",
        ],
      },
      threshold: {
        type: "number",
        description:
          "low_stock: quantity threshold (default 5). bills_due: days ahead (default 7).",
        required: false,
      },
    },
  },
};

export function getToolByName(toolName: string): ToolDef | undefined {
  return AI_TOOLS_REGISTRY[toolName];
}

export function getAllToolNames(): string[] {
  return Object.keys(AI_TOOLS_REGISTRY);
}
