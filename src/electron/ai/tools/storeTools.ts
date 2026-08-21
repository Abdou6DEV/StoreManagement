/**
 * Production store tools for the AI assistant.
 * Read-only tools. The database computes totals; the model copies them.
 */

import * as salesDb from "../../../lib/database/sales";
import * as productsDb from "../../../lib/database/products";
import { getOption } from "../../../lib/database/options";
import * as clientsDb from "../../../lib/database/clients";
import * as paymentsDb from "../../../lib/database/payments";
import * as purchasesDb from "../../../lib/database/purchases";
import * as serviceAppointmentsDb from "../../../lib/database/serviceAppointments";
import * as billsDb from "../../../lib/database/bills";
import * as sellersDb from "../../../lib/database/sellers";
import * as activityLogsDb from "../../../lib/database/activityLogs";
import { getAllCategories } from "../../../lib/database/categories";
import {
  getStoreFirstRecordedYmd,
  peekStoreFirstRecordedYmd,
} from "../../../lib/database/storeFirstDate";
import {
  getStoreTimeZone,
  localRangeMeta,
  localYmdFromDate,
  parseLocalDateRange,
  type LocalDateRange,
} from "./parseLocalDateRange";
import { resolveClientFind } from "./clientStatus";
import { capList, listMeta, listMetaFromTotal } from "./listMeta";

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

/** TEMPORARY: return full lists. Flip to false to restore 70/40 caps. */
const TEMP_SKIP_SAMPLE_LIMIT = true;
const SAMPLE_LIMIT = TEMP_SKIP_SAMPLE_LIMIT ? Number.MAX_SAFE_INTEGER : 70;
const BREAKDOWN_LIMIT = TEMP_SKIP_SAMPLE_LIMIT ? Number.MAX_SAFE_INTEGER : 40;

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

function foldToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function stemLoose(value: string): string {
  const text = foldToken(value);
  if (text.endsWith("ies") && text.length > 4) return `${text.slice(0, -3)}y`;
  if (
    text.endsWith("s") &&
    !text.endsWith("ss") &&
    !text.endsWith("us") &&
    !text.endsWith("is") &&
    text.length > 3
  ) {
    return text.slice(0, -1);
  }
  return text;
}

function tokensOf(value: unknown): string[] {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9\u00c0-\u024f\u0600-\u06ff]+/i)
    .filter(Boolean);
}

function tokenEquals(token: string, queryToken: string): boolean {
  const a = foldToken(token);
  const b = foldToken(queryToken);
  if (!a || !b) return false;
  const aStem = stemLoose(a);
  const bStem = stemLoose(b);
  return (
    a === b ||
    aStem === bStem ||
    a === bStem ||
    aStem === b ||
    a.startsWith(b)
  );
}

function categoryMatchesQ(categoryName: unknown, q: string): boolean {
  const queryTokens = tokensOf(q);
  const categoryTokens = tokensOf(categoryName);
  if (queryTokens.length === 0 || categoryTokens.length === 0) return false;
  return queryTokens.every((queryToken) =>
    categoryTokens.some((categoryToken) => tokenEquals(categoryToken, queryToken)),
  );
}

function nameTokenMatchesQ(name: unknown, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return false;
  const nameText = String(name ?? "").trim().toLowerCase();
  if (nameText === needle) return true;

  const queryTokens = tokensOf(q);
  const nameTokens = tokensOf(name);
  if (queryTokens.length === 0 || nameTokens.length === 0) return false;

  return queryTokens.every((queryToken) =>
    nameTokens.some((token) => tokenEquals(token, queryToken)),
  );
}

function productMatchesStockQ(
  product: { name: string; codebar?: string | null; categoryName?: string },
  q: string,
  categoryHit: boolean,
): boolean {
  if (categoryHit) return categoryMatchesQ(product.categoryName, q);
  if (categoryMatchesQ(product.categoryName, q)) return true;
  if (nameTokenMatchesQ(product.name, q)) return true;
  const barcode = String(product.codebar ?? "").toLowerCase();
  const needle = q.trim().toLowerCase();
  return barcode === needle || barcode.includes(needle);
}

function filterStockProducts<
  T extends { name: string; codebar?: string | null; categoryName?: string },
>(products: T[], q?: string, categoryHitOverride?: boolean): T[] {
  if (!q?.trim()) return products;
  const categoryHit =
    categoryHitOverride ??
    products.some((product) => categoryMatchesQ(product.categoryName, q));
  return products.filter((product) =>
    productMatchesStockQ(product, q, categoryHit),
  );
}

function addCategoryName(names: string[], seen: Set<string>, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return;
  const key = foldToken(text);
  if (seen.has(key)) return;
  seen.add(key);
  names.push(text);
}

function categoryNamesFromSaleItems(sales: any[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const sale of sales) {
    for (const item of sale.saleItems ?? []) {
      addCategoryName(names, seen, item.product?.categoryName);
    }
  }
  return names;
}

async function resolveCategoryQ(
  q: string | undefined,
  extraNames: Iterable<unknown> = []
): Promise<{
  categoryHit: boolean;
  matchedCategory: string | null;
  stockCategories: string[];
}> {
  const stockCategories: string[] = [];
  const seen = new Set<string>();
  try {
    for (const row of await getAllCategories()) {
      addCategoryName(stockCategories, seen, row.name);
    }
  } catch {
    // Product.categoryName still works if the Category table is empty.
  }
  for (const name of extraNames) addCategoryName(stockCategories, seen, name);

  if (!q?.trim()) {
    return { categoryHit: false, matchedCategory: null, stockCategories };
  }
  const matchedCategory =
    stockCategories.find((name) => categoryMatchesQ(name, q)) ?? null;
  return {
    categoryHit: matchedCategory != null,
    matchedCategory,
    stockCategories,
  };
}

function lineNameMatchesQ(name: unknown, q: string): boolean {
  return nameTokenMatchesQ(name, q) || matchesQ(name, q);
}

function isZakatQuery(q?: string): boolean {
  const text = q?.trim().toLowerCase() ?? "";
  return text === "zakat" || text === "zakaat" || text.includes("زكاة");
}

function todayYmd() {
  return localYmdFromDate(new Date());
}

function localYmdDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localYmdFromDate(date);
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

async function billsRange(
  groupBy: string,
  startDate?: unknown,
  endDate?: unknown
): Promise<LocalDateRange | { ok: true; allTime: true }> {
  if (startDate == null && endDate == null) {
    if (groupBy === "month" || groupBy === "year") {
      return defaultRange(groupBy, startDate, endDate);
    }
    return { ok: true, allTime: true };
  }
  return defaultRange(groupBy, startDate, endDate);
}

function isRankGroupBy(groupBy: string) {
  return (
    groupBy === "product" || groupBy === "client" || groupBy === "seller"
  );
}

async function defaultRange(
  groupBy: string,
  startDate?: unknown,
  endDate?: unknown
): Promise<LocalDateRange> {
  if (startDate != null && endDate != null) {
    return parseLocalDateRange(startDate, endDate);
  }
  if (startDate != null && endDate == null) {
    return parseLocalDateRange(startDate, todayYmd());
  }
  if (endDate != null && startDate == null) {
    return parseLocalDateRange(endDate, endDate);
  }

  const today = todayYmd();
  if (isRankGroupBy(groupBy)) {
    return parseLocalDateRange(await getStoreFirstRecordedYmd(), today);
  }
  if (groupBy === "month" || groupBy === "year") {
    return parseLocalDateRange(yearStartYmd(), today);
  }
  return parseLocalDateRange(today, today);
}

function rangeMeta(startDate: Date, endDate: Date) {
  return localRangeMeta(startDate, endDate, peekStoreFirstRecordedYmd());
}

const RANK_BY_VALUES = [
  "revenue",
  "profit",
  "quantity",
  "amount",
  "sellingPrice",
] as const;

type RankBy = (typeof RANK_BY_VALUES)[number];

const SKIP_TOP_KEYS = new Set(["no-client", "unknown", "all"]);

function parseRankBy(value: unknown): RankBy | null {
  if (value == null || value === "") return null;
  const normalized = String(value).trim();
  return RANK_BY_VALUES.includes(normalized as RankBy)
    ? (normalized as RankBy)
    : null;
}

function rowRankValue(row: Record<string, unknown>, rankBy: RankBy): number {
  switch (rankBy) {
    case "profit":
      return Number(row.profit ?? 0);
    case "quantity":
      return Number(
        row.quantity ?? row.count ?? row.totalQuantity ?? row.soldCount ?? 0
      );
    case "amount":
      return Number(row.amount ?? row.paid ?? row.revenue ?? 0);
    case "sellingPrice":
      return Number(row.sellingPrice ?? 0);
    case "revenue":
    default:
      return Number(
        row.revenue ??
          row.paid ??
          row.amount ??
          row.serviceRevenue ??
          row.sellingPrice ??
          0
      );
  }
}

function pickTopGroup(
  breakdown: unknown,
  groupBy: string,
  rankBy: RankBy = "revenue"
): Record<string, unknown> | null {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;
  if (!groupBy || groupBy === "none") return null;
  const ranked = [...breakdown].filter(
    (row): row is Record<string, unknown> =>
      !!row && typeof row === "object" && !Array.isArray(row)
  );
  if (ranked.length === 0) return null;
  ranked.sort(
    (a, b) => rowRankValue(b, rankBy) - rowRankValue(a, rankBy)
  );
  if (groupBy === "client" || groupBy === "seller") {
    return (
      ranked.find((row) => !SKIP_TOP_KEYS.has(String(row.key ?? ""))) ??
      ranked[0]
    );
  }
  return ranked[0];
}

const RANKING_RULE =
  "Ranking: copy top for ranking.rankBy (default revenue, not profit). One most expensive sale/repair/bill/product → copy topMatch. Never use find or matches for ranking.";

function pickTopMatch<T>(rows: T[], amount: (row: T) => number): T | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) =>
    amount(row) > amount(best) ? row : best
  );
}

function withRanking<T extends Record<string, unknown>>(
  payload: T,
  topMatch: unknown = null
): T {
  const groupBy = String(payload.groupBy ?? "none");
  const rankBy = parseRankBy(payload.rankBy) ?? "revenue";
  const top = pickTopGroup(payload.breakdown, groupBy, rankBy);
  return {
    ...payload,
    rankBy,
    ranking: { rankBy, direction: "desc" },
    top,
    topMatch,
    rule: [payload.rule, RANKING_RULE].filter(Boolean).join(" "),
  };
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

function saleMatchesQ(sale: any, q?: string, categoryHit = false): boolean {
  if (!q?.trim()) return true;
  if (categoryHit) {
    return (sale.saleItems ?? []).some((item: any) =>
      categoryMatchesQ(item.product?.categoryName, q)
    );
  }
  if (matchesQ(sale.client?.name, q)) return true;
  if (matchesQ(sale.id, q)) return true;
  return (sale.saleItems ?? []).some(
    (item: any) =>
      lineNameMatchesQ(item.product?.name, q) ||
      lineNameMatchesQ(item.manualProduct?.name, q) ||
      lineNameMatchesQ(item.service?.name, q) ||
      categoryMatchesQ(item.product?.categoryName, q)
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

function saleTopMatch(
  sale: any,
  amounts?: { revenue: number; profit: number }
) {
  const revenue = amounts?.revenue ?? saleRevenue(sale);
  const profit = amounts?.profit ?? saleProfit(sale);
  return {
    client: sale.client?.name || "no-client",
    revenue: roundDA(revenue),
    profit: roundDA(profit),
    soldDate: localYmdFromDate(new Date(sale.createdAt)),
  };
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
  appointmentTypes?: Map<string, string>,
  categoryHit = false
): boolean {
  if (!q?.trim()) return true;
  if (categoryHit) return categoryMatchesQ(item.product?.categoryName, q);
  if (matchesQ(sale.client?.name, q) || matchesQ(sale.id, q)) return true;
  const name =
    item.product?.name || item.manualProduct?.name || item.service?.name || "";
  const type = serviceLineType(item, appointmentTypes);
  return (
    lineNameMatchesQ(name, q) ||
    lineNameMatchesQ(type, q) ||
    categoryMatchesQ(item.product?.categoryName, q)
  );
}

function matchingSaleTicket(
  sale: any,
  q?: string,
  appointmentTypes?: Map<string, string>,
  categoryHit = false
): { revenue: number; profit: number } {
  if (!q?.trim()) {
    return { revenue: saleRevenue(sale), profit: saleProfit(sale) };
  }
  if (
    !categoryHit &&
    (matchesQ(sale.client?.name, q) || matchesQ(sale.id, q))
  ) {
    return { revenue: saleRevenue(sale), profit: saleProfit(sale) };
  }
  let revenue = 0;
  let profit = 0;
  for (const item of sale.saleItems ?? []) {
    if (!saleItemMatchesQ(sale, item, q, appointmentTypes, categoryHit)) continue;
    const lineRevenue = Number(item.price || 0) * Number(item.quantity || 0);
    revenue += lineRevenue;
    profit += lineRevenue - saleItemCost(item);
  }
  return { revenue, profit };
}

function pickSaleTopMatch(
  sales: any[],
  q?: string,
  appointmentTypes?: Map<string, string>,
  categoryHit = false
) {
  let best: any = null;
  let bestAmounts: { revenue: number; profit: number } | null = null;
  for (const sale of sales) {
    const amounts = matchingSaleTicket(sale, q, appointmentTypes, categoryHit);
    if (!bestAmounts || amounts.revenue > bestAmounts.revenue) {
      best = sale;
      bestAmounts = amounts;
    }
  }
  return best && bestAmounts ? saleTopMatch(best, bestAmounts) : null;
}

function addSaleItemsToMix(
  mix: LineMix,
  sale: any,
  q?: string,
  appointmentTypes?: Map<string, string>,
  categoryHit = false
) {
  for (const item of sale.saleItems ?? []) {
    if (!saleItemMatchesQ(sale, item, q, appointmentTypes, categoryHit)) continue;
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
  groupBy: string,
  rankBy?: RankBy | null
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
  const metric = parseRankBy(rankBy) ?? "revenue";
  return rows
    .sort(
      (a, b) =>
        rowRankValue(b, metric) - rowRankValue(a, metric) ||
        a.key.localeCompare(b.key)
    )
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
  rankBy?: RankBy | null;
}): Promise<AIToolResult> {
  const range = await defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const meta = rangeMeta(range.startDate, range.endDate);
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
    return ok(
      withRanking(
        {
          ...meta,
          entity: "sales",
          groupBy: input.groupBy,
          rankBy: input.rankBy ?? null,
          totals: withTicketMix(totals, mixTotals, billsPaidTotal),
          breakdown,
          rule: `${salesMixRule} bills/billsPaid are already DA. Do not add rows.`,
        },
        pickSaleTopMatch(
          (sales as any[]).filter((sale) => !isUnpaidVersement(sale))
        )
      )
    );
  }

  const sales = (await salesDb.getSalesByDateRange(
    range.startDate,
    range.endDate
  )) as any[];
  const categoryQ = q
    ? await resolveCategoryQ(q, categoryNamesFromSaleItems(sales))
    : { categoryHit: false, matchedCategory: null, stockCategories: [] as string[] };
  const categoryHit = categoryQ.categoryHit;
  const included = sales.filter(
    (sale) => !isUnpaidVersement(sale) && saleMatchesQ(sale, q, categoryHit)
  );

  if (!q && input.groupBy === "none") {
    const [summary, billsPaid] = await Promise.all([
      salesDb.getSalesSummary(range.startDate, range.endDate),
      billsPaidInRangeDA(range.startDate, range.endDate),
    ]);
    const mix = emptyMix();
    for (const sale of included) addSaleItemsToMix(mix, sale);
    return ok(
      withRanking(
        {
          ...meta,
          entity: "sales",
          groupBy: "none",
          rankBy: input.rankBy ?? null,
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
        },
        pickSaleTopMatch(included)
      )
    );
  }

  const totals = emptyTotals();
  const mix = emptyMix();
  const grouped = new Map<string, { revenue: number; count: number; profit: number }>();
  const appointmentTypes = q ? (await getAppointmentTypeMap()).map : undefined;

  for (const sale of included) {
    const { revenue, profit } = matchingSaleTicket(
      sale,
      q,
      appointmentTypes,
      categoryHit
    );
    addTotals(totals, revenue, profit, 1);
    addSaleItemsToMix(mix, sale, q, appointmentTypes, categoryHit);

    let key = "all";
    if (input.groupBy === "product") {
      for (const item of sale.saleItems ?? []) {
        const name =
          item.product?.name ||
          item.manualProduct?.name ||
          item.service?.name ||
          "unknown";
        if (!saleItemMatchesQ(sale, item, q, appointmentTypes, categoryHit)) {
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

  const breakdown =
    input.groupBy === "none"
      ? []
      : breakdownFromMap(grouped, input.groupBy, input.rankBy);
  const qMeta =
    q && categoryHit
      ? { matchedCategory: categoryQ.matchedCategory }
      : q && included.length === 0
        ? {
            matchedCategory: null,
            stockCategories: categoryQ.stockCategories.slice(0, 40),
          }
        : {};
  const qRule = categoryHit
    ? `q matched stock category "${categoryQ.matchedCategory}" (plural/accent OK). Only that category's product lines. Copy matchedCategory. Do not list other categories.`
    : q && included.length === 0
      ? "q matched no stock category and no product/client name. If they meant a category, retry report with q set to the closest stockCategories name. Do not list stockCategories unless they asked which categories exist."
      : "Do not count sample rows.";
  return ok(
    withRanking(
      {
        ...meta,
        entity: "sales",
        q: q || null,
        ...qMeta,
        groupBy: input.groupBy,
        rankBy: input.rankBy ?? null,
        totals: withTicketMix(
          totals,
          mix,
          q ? 0 : await billsPaidInRangeDA(range.startDate, range.endDate)
        ),
        breakdown,
        rule: `${salesMixRule} ${qRule}`,
      },
      pickSaleTopMatch(included, q, appointmentTypes, categoryHit)
    )
  );
}

async function reportStock(
  q?: string,
  rankBy?: RankBy | null
): Promise<AIToolResult> {
  const products = await productsDb.getAllProducts();
  const zakatQuery = isZakatQuery(q);
  const categoryQ = q && !zakatQuery
    ? await resolveCategoryQ(
        q,
        products.map((product) => product.categoryName)
      )
    : { categoryHit: false, matchedCategory: null, stockCategories: [] as string[] };
  const matched = zakatQuery
    ? products
    : filterStockProducts(products, q, categoryQ.categoryHit);

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

  const inStock = matched.filter((product) => product.quantity > 0);
  const pricePool = inStock.length > 0 ? inStock : matched;
  const topPriced = pickTopMatch(pricePool, (product) => product.sellingPrice);

  return ok(
    withRanking(
      {
        entity: "stock",
        q: q || null,
        ...(q && categoryQ.categoryHit
          ? { matchedCategory: categoryQ.matchedCategory }
          : q && matched.length === 0
            ? {
                matchedCategory: null,
                stockCategories: categoryQ.stockCategories.slice(0, 40),
              }
            : {}),
        rankBy: rankBy ?? null,
        totals: {
          matchCount: matched.length,
          totalQuantity: matched.reduce((sum, product) => sum + product.quantity, 0),
          inventoryCost: roundDA(inventoryCost),
          inventoryRetail: roundDA(inventoryRetail),
          profitPotential: roundDA(inventoryRetail - inventoryCost),
          ...(zakatQuery
            ? { zakatOnStock: roundDA(inventoryRetail * 0.025) }
            : {}),
        },
        byCategory,
        ...(() => {
          const listed = capList(
            matched
              .slice()
              .sort((a, b) => b.quantity - a.quantity)
              .map(slimProduct),
            SAMPLE_LIMIT
          );
          return { matches: listed.items, ...listMeta(listed) };
        })(),
        rule: zakatQuery
          ? "Copy totals.zakatOnStock (2.5% of inventoryRetail). Cash and nisab are on the Zakat page, not in the store. Do not mention zakat on other stock answers."
          : q
            ? categoryQ.categoryHit
              ? `Copy totals.totalQuantity for units in stock category "${categoryQ.matchedCategory}". Only that category — not names that merely contain those letters. Copy matchedCategory. List products with find type=product. Do not count matches. Do not mention zakat.`
              : matched.length === 0
                ? "q matched no stock category or product. If they meant a category, retry with q set to the closest stockCategories name. Do not list stockCategories unless they asked. Do not mention zakat."
                : "Copy totals.totalQuantity for units in this filter. If q matches a stock category, only that category is included — not product names that merely contain those letters. List products with find type=product. Do not count matches. Do not mention zakat."
            : "Copy totals. byCategory is stock by category (same as Stock page). Do not mention zakat unless the user asked. Do not count matches.",
      },
      topPriced
        ? {
            name: topPriced.name,
            sellingPrice: topPriced.sellingPrice,
            boughtPrice: topPriced.boughtPrice,
            quantity: topPriced.quantity,
            category: topPriced.categoryName ?? null,
          }
        : null
    )
  );
}

async function reportPayments(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
  rankBy?: RankBy | null;
}): Promise<AIToolResult> {
  const range = await defaultRange(input.groupBy, input.startDate, input.endDate);
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

  const breakdown =
    input.groupBy === "none"
      ? []
      : breakdownFromMap(grouped, input.groupBy, input.rankBy);
  const topPayment = pickTopMatch(matched, (payment) =>
    Number(payment.givenAmount || 0)
  );

  return ok(
    withRanking(
      {
        ...rangeMeta(range.startDate, range.endDate),
        entity: "payments",
        q: input.q?.trim() || null,
        groupBy: input.groupBy,
        rankBy: input.rankBy ?? null,
        totals,
        breakdown,
        rule: "Copy totals. Do not add payment rows.",
      },
      topPayment
        ? {
            client: topPayment.client?.name ?? null,
            amount: Number(topPayment.givenAmount || 0),
            date: localYmdFromDate(new Date(topPayment.createdAt)),
          }
        : null
    )
  );
}

async function reportPurchases(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
  rankBy?: RankBy | null;
}): Promise<AIToolResult> {
  const range = await defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const purchases = await purchasesDb.getPurchasesByDateRange(
    range.startDate,
    range.endDate
  );
  const extraCategories = purchases.flatMap((purchase) =>
    purchase.PurchaseItems.map((item) => item.product?.categoryName)
  );
  const categoryQ = await resolveCategoryQ(input.q, extraCategories);
  const categoryHit = categoryQ.categoryHit;
  const sellerMatches = (purchase: (typeof purchases)[number]) =>
    matchesQ(purchase.seller?.name, input.q) ||
    matchesQ(purchase.seller?.phone, input.q) ||
    matchesQ(purchase.seller?.email, input.q);
  const itemMatches = (
    purchase: (typeof purchases)[number],
    item: (typeof purchases)[number]["PurchaseItems"][number]
  ) => {
    if (!input.q?.trim()) return true;
    if (sellerMatches(purchase)) return true;
    if (categoryHit) return categoryMatchesQ(item.product?.categoryName, input.q);
    return (
      lineNameMatchesQ(item.product?.name, input.q) ||
      categoryMatchesQ(item.product?.categoryName, input.q)
    );
  };
  const matched = purchases.filter((purchase) => {
    if (!input.q?.trim()) return true;
    if (sellerMatches(purchase)) return true;
    return purchase.PurchaseItems.some((item) => itemMatches(purchase, item));
  });

  const filteredAmount = (purchase: (typeof purchases)[number]) => {
    if (!input.q?.trim() || sellerMatches(purchase)) {
      return purchaseAmount(purchase);
    }
    return purchase.PurchaseItems.reduce((sum, item) => {
      if (!itemMatches(purchase, item)) return sum;
      return sum + item.price * item.quantity;
    }, 0);
  };

  const totals = {
    count: matched.length,
    amount: matched.reduce((sum, purchase) => sum + filteredAmount(purchase), 0),
  };

  const grouped = new Map<string, { revenue: number; count: number; profit: number }>();
  for (const purchase of matched) {
    const amount = filteredAmount(purchase);
    let key = "all";
    if (input.groupBy === "seller") {
      key = purchase.seller?.name || "unknown";
    } else if (input.groupBy === "product") {
      for (const item of purchase.PurchaseItems) {
        if (!itemMatches(purchase, item)) {
          continue;
        }
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

  const breakdown =
    input.groupBy === "none"
      ? []
      : breakdownFromMap(grouped, input.groupBy, input.rankBy);
  const topPurchase = pickTopMatch(matched, (purchase) =>
    filteredAmount(purchase)
  );
  const q = input.q?.trim() || null;
  const qMeta =
    q && categoryHit
      ? { matchedCategory: categoryQ.matchedCategory }
      : q && matched.length === 0
        ? {
            matchedCategory: null,
            stockCategories: categoryQ.stockCategories.slice(0, 40),
          }
        : {};
  const qRule = categoryHit
    ? `q matched stock category "${categoryQ.matchedCategory}". Product lines in that category only. Copy matchedCategory.`
    : q && matched.length === 0
      ? "q matched no supplier and no stock category. If they meant a category, retry with q set to the closest stockCategories name. Do not list stockCategories unless they asked."
      : "Copy totals.amount (DA) and totals.count. groupBy=seller is by supplier name. Do not add purchase rows.";

  return ok(
    withRanking(
      {
        ...rangeMeta(range.startDate, range.endDate),
        entity: "purchases",
        q,
        ...qMeta,
        groupBy: input.groupBy,
        rankBy: input.rankBy ?? null,
        totals,
        breakdown,
        rule: qRule,
      },
      topPurchase
        ? {
            seller: topPurchase.seller?.name || "unknown",
            amount: roundDA(filteredAmount(topPurchase)),
            date: localYmdFromDate(new Date(topPurchase.createdAt)),
          }
        : null
    )
  );
}

async function reportServices(input: {
  groupBy: string;
  q?: string;
  startDate?: unknown;
  endDate?: unknown;
  rankBy?: RankBy | null;
}): Promise<AIToolResult> {
  const range = await defaultRange(input.groupBy, input.startDate, input.endDate);
  if (range.ok === false) return fail(range.error);

  const meta = rangeMeta(range.startDate, range.endDate);
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

  const breakdown =
    input.groupBy === "none"
      ? []
      : breakdownFromMap(grouped, input.groupBy, input.rankBy);
  const topJob = pickTopMatch(soldRows, (row) => row.revenue);

  return ok(
    withRanking(
      {
        ...meta,
        entity: "services",
        currency: "DA",
        q: q || null,
        groupBy: input.groupBy,
        rankBy: input.rankBy ?? null,
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
        breakdown,
        ...(() => {
          const listed = capList(
            soldRows
              .slice()
              .sort((a, b) => b.soldAt.getTime() - a.soldAt.getTime())
              .map((row) => ({
                name: row.name,
                type: row.type,
                client: row.client,
                revenue: roundDA(row.revenue),
                profit: roundDA(row.profit),
                soldDate: localYmdFromDate(row.soldAt),
              })),
            SAMPLE_LIMIT
          );
          return { matches: listed.items, ...listMeta(listed) };
        })(),
        rule: "Money fields are DA from services SOLD on Cashier in this period. q filters Service Type (repair, flash, …) as on the Services page. byType is the split by that type. jobs*Count fields are COUNTS, not DA. Do not use completed counts as profit.",
      },
      topJob
        ? {
            name: topJob.name,
            type: topJob.type,
            client: topJob.client,
            revenue: roundDA(topJob.revenue),
            profit: roundDA(topJob.profit),
            soldDate: localYmdFromDate(topJob.soldAt),
          }
        : null
    )
  );
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
  rankBy?: RankBy | null;
}): Promise<AIToolResult> {
  const rangeOrAll = await billsRange(input.groupBy, input.startDate, input.endDate);
  if (!("allTime" in rangeOrAll) && rangeOrAll.ok === false) {
    return fail(rangeOrAll.error);
  }
  const bounded = "allTime" in rangeOrAll ? null : rangeOrAll;

  const meta = bounded
    ? {
        ...rangeMeta(bounded.startDate, bounded.endDate),
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

  const topBill = pickTopMatch(rows, (row) => row.amountDA);

  return ok(
    withRanking(
      {
        ...meta,
        entity: "bills",
        currency: "DA",
        amountsAreDA: true,
        q: q || null,
        groupBy: input.groupBy,
        rankBy: input.rankBy ?? null,
        totals,
        byType,
        breakdown,
        ...(() => {
          const listed = capList(
            rows
              .slice()
              .sort((a, b) => b.periodDate.getTime() - a.periodDate.getTime())
              .map((row) => ({
                title: row.title,
                type: row.type,
                amountDA: row.amountDA,
                kind: row.isSalary ? "salary" : "expense",
                periodDate: localYmdFromDate(row.periodDate),
                paidDate: localYmdFromDate(row.paidDate),
              })),
            SAMPLE_LIMIT
          );
          return { matches: listed.items, ...listMeta(listed) };
        })(),
        rule: "Amounts are already DA. expenses = totals.expensePaid (non-salary). salaries = totals.salaryPaid. all bills = totals.paid. Copy totals; do not add matches.",
      },
      topBill
        ? {
            title: topBill.title,
            type: topBill.type,
            amountDA: topBill.amountDA,
            kind: topBill.isSalary ? "salary" : "expense",
            periodDate: localYmdFromDate(topBill.periodDate),
          }
        : null
    )
  );
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
    limit: TEMP_SKIP_SAMPLE_LIMIT ? Number.MAX_SAFE_INTEGER : 20,
    offset: 0,
  });

  return ok({
    ...rangeMeta(range.startDate, range.endDate),
    entity: "activity",
    q: input.q?.trim() || null,
    totals: { count: result.total },
    ...(() => {
      const listed = capList(
        result.entries.map((entry) => ({
          username: entry.username,
          action: entry.action,
          details: entry.details,
          createdAt: entry.createdAt,
        })),
        SAMPLE_LIMIT
      );
      return {
        matches: listed.items,
        ...listMetaFromTotal(listed.returnedCount, Number(result.total) || listed.totalCount),
      };
    })(),
    rule: "Copy totals.count. Do not count matches.",
  });
}

export async function tool_report(input: {
  entity?: string;
  groupBy?: string;
  q?: string;
  startDate?: string;
  endDate?: string;
  rankBy?: string;
} = {}): Promise<AIToolResult> {
  try {
    const entity = String(input.entity ?? "").trim().toLowerCase();
    const groupBy = String(input.groupBy ?? "none").trim().toLowerCase() || "none";
    const rankBy = parseRankBy(input.rankBy);
    if (input.rankBy != null && String(input.rankBy).trim() !== "" && !rankBy) {
      return fail(`rankBy must be ${RANK_BY_VALUES.join(" | ")}`);
    }
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

    if (entity === "sales") return reportSales({ groupBy, q: input.q, startDate: input.startDate, endDate: input.endDate, rankBy });
    if (entity === "stock") return reportStock(input.q, rankBy);
    if (entity === "payments") return reportPayments({ groupBy, q: input.q, startDate: input.startDate, endDate: input.endDate, rankBy });
    if (entity === "purchases") return reportPurchases({ groupBy, q: input.q, startDate: input.startDate, endDate: input.endDate, rankBy });
    if (entity === "services") {
      return reportServices({
        groupBy,
        q: input.q,
        startDate: input.startDate,
        endDate: input.endDate,
        rankBy,
      });
    }
    if (entity === "bills") {
      return reportBills({
        groupBy,
        q: input.q,
        startDate: input.startDate,
        endDate: input.endDate,
        rankBy,
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
  status?: string;
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
            inStockCount: byBarcode.quantity > 0 ? 1 : 0,
            totalQuantity: byBarcode.quantity,
          },
          matches: [slimProduct(byBarcode)],
          ...listMetaFromTotal(1, 1),
          rule: "List the match (name, quantity, sellingPrice, boughtPrice). This was an exact barcode match.",
        });
      }
      const products = await productsDb.getAllProducts();
      const categoryQ = await resolveCategoryQ(
        q,
        products.map((product) => product.categoryName)
      );
      const matched = filterStockProducts(products, q, categoryQ.categoryHit);
      const inStock = matched.filter((product) => product.quantity > 0);
      const rows = (inStock.length > 0 ? inStock : matched)
        .slice()
        .sort(
          (a, b) =>
            b.quantity - a.quantity || a.name.localeCompare(b.name),
        );
      const listed = capList(rows.map(slimProduct), SAMPLE_LIMIT);
      return ok({
        type: "product",
        q,
        ...(categoryQ.categoryHit
          ? { matchedCategory: categoryQ.matchedCategory }
          : matched.length === 0
            ? {
                matchedCategory: null,
                stockCategories: categoryQ.stockCategories.slice(0, 40),
              }
            : {}),
        totals: {
          matchCount: matched.length,
          inStockCount: inStock.length,
          totalQuantity: matched.reduce(
            (sum, product) => sum + product.quantity,
            0,
          ),
        },
        matches: listed.items,
        ...listMeta(listed),
        rule: categoryQ.categoryHit
          ? `List each matches row: name, quantity, sellingPrice, boughtPrice. q matched stock category "${categoryQ.matchedCategory}". totals.totalQuantity is units in that category. Do not paste a category breakdown.`
          : "List each matches row: name, quantity, sellingPrice, boughtPrice. totals.totalQuantity is units in stock. Do not paste a category breakdown.",
      });
    }

    if (type === "client") {
      const clients = await clientsDb.getAllClientsWithTotalPurchases();
      const { status, q: nameQ } = resolveClientFind(input.q, input.status);
      let filtered = clients;
      if (status === "owes_you") {
        filtered = filtered.filter((client) => Number(client.totalCredit || 0) > 0);
      } else if (status === "deposits") {
        filtered = filtered.filter(
          (client) => Number(client.totalVersement || 0) > 0
        );
      }
      if (nameQ) {
        filtered = filtered.filter(
          (client) => matchesQ(client.name, nameQ) || matchesQ(client.phone, nameQ)
        );
      }
      const mapped = filtered.map((client) => {
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
      const clientsOweYou = mapped.reduce(
        (sum, client) => sum + client.clientsOweYou,
        0
      );
      const youOweClients = mapped.reduce(
        (sum, client) => sum + client.youOweClients,
        0
      );
      const sorted = mapped.slice().sort((a, b) => {
        if (status === "owes_you") return b.clientsOweYou - a.clientsOweYou;
        if (status === "deposits") return b.youOweClients - a.youOweClients;
        return a.name.localeCompare(b.name);
      });
      const listed = capList(sorted, SAMPLE_LIMIT);
      return ok({
        type: "client",
        status,
        q: nameQ || null,
        totals: {
          matchCount: mapped.length,
          clientsOweYou,
          youOweClients,
          totalCredit: clientsOweYou,
          totalVersement: youOweClients,
        },
        matches: listed.items,
        ...listMeta(listed),
        rule:
          status === "owes_you"
            ? "CREDIT slice only. Copy totals.clientsOweYou and totals.matchCount. Do not mix with youOweClients."
            : status === "deposits"
              ? "VERSEMENT slice only. Copy totals.youOweClients and totals.matchCount. Do not mix with clientsOweYou."
              : "Copy totals.matchCount for how many clients. That is all clients, not only credit. clientsOweYou / youOweClients are money, not a client count. This list is NOT a best-client ranking — use report entity=sales groupBy=client and copy top. For who owes you, use status=owes_you. For deposits, use status=deposits.",
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

      const listed = capList(
        rows.slice().sort((a, b) => b.purchaseAmount - a.purchaseAmount),
        SAMPLE_LIMIT
      );
      return ok({
        type: "seller",
        q: q || null,
        totals: {
          matchCount: rows.length,
          purchaseCount: rows.reduce((sum, row) => sum + row.purchaseCount, 0),
          purchaseAmount: rows.reduce((sum, row) => sum + row.purchaseAmount, 0),
        },
        matches: listed.items,
        ...listMeta(listed),
        rule: "Sellers are suppliers. Copy totals. purchaseAmount is all-time DA. For a day/month/year use report entity=purchases with dates. There is no supplier debt in the store.",
      });
    }

    if (type === "sale") {
      const first = await getStoreFirstRecordedYmd();
      const start = new Date(`${first}T00:00:00`);
      const days = Math.max(
        1,
        Math.ceil((Date.now() - start.getTime()) / 86400000) + 2
      );
      const result = await salesDb.searchSales(q, 20, 0, days);
      const listed = capList(
        result.sales.map((sale: any) => ({
          id: sale.id,
          client: sale.client?.name ?? null,
          total: sale.totalAmountWithDiscount,
          createdAt: sale.createdAt,
        })),
        SAMPLE_LIMIT
      );
      return ok({
        type: "sale",
        q,
        totals: { matchCount: result.totalCount },
        matches: listed.items,
        ...listMetaFromTotal(listed.returnedCount, result.totalCount),
        rule: "Copy totals.matchCount. Do not add sample totals.",
      });
    }

    return fail("type is required: product | client | seller | sale");
  } catch (error) {
    return fail(`find failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const ALERT_KINDS = [
  "low_stock",
  "out_of_stock",
  "credits_due",
  "credits_due_soon",
  "credits_overdue",
  "versements_due",
  "versements_due_soon",
  "versements_overdue",
  "bills_due",
  "bills_due_soon",
  "bills_overdue",
  "services_due",
  "services_due_soon",
  "services_overdue",
] as const;

const ALERT_KIND_ALIASES: Record<string, string> = {
  credits_unpaid: "credits_due",
  versements_unpaid: "versements_due",
  upcoming_services: "services_due_soon",
};

type PaymentAlertType = "CREDIT" | "VERSEMENT";
type PaymentAlertTiming = "due" | "due_soon" | "overdue";

const PAYMENT_ALERTS: Record<
  string,
  { type: PaymentAlertType; timing: PaymentAlertTiming }
> = {
  credits_due: { type: "CREDIT", timing: "due" },
  credits_due_soon: { type: "CREDIT", timing: "due_soon" },
  credits_overdue: { type: "CREDIT", timing: "overdue" },
  versements_due: { type: "VERSEMENT", timing: "due" },
  versements_due_soon: { type: "VERSEMENT", timing: "due_soon" },
  versements_overdue: { type: "VERSEMENT", timing: "overdue" },
};

const ALERT_KIND_LIST = ALERT_KINDS.join(" | ");

function paymentDueTime(dueDate: unknown): number {
  const due = new Date(dueDate as string | Date);
  return due.getTime();
}

function paymentIsOverdue(dueDate: unknown, now: Date): boolean {
  const time = paymentDueTime(dueDate);
  return Number.isFinite(time) && time !== 0 && time < now.getTime();
}

function paymentIsDueSoon(dueDate: unknown, now: Date, days: number): boolean {
  const time = paymentDueTime(dueDate);
  if (!Number.isFinite(time) || time === 0) return false;
  const diffDays = Math.ceil((time - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= days;
}

function slimServiceAppointment(
  item: {
    id: string;
    name: string;
    dueDate: Date | string;
    client?: { name?: string | null } | null;
  },
  now: Date
) {
  const dueTime = paymentDueTime(item.dueDate);
  return {
    id: item.id,
    name: item.name,
    dueDate: item.dueDate,
    client: item.client?.name ?? null,
    overdue: Number.isFinite(dueTime) && dueTime !== 0 && dueTime < now.getTime(),
  };
}

export async function tool_alerts(input: {
  kind?: string;
  threshold?: number;
} = {}): Promise<AIToolResult> {
  try {
    const rawKind = String(input.kind ?? "").trim().toLowerCase();
    const kind = ALERT_KIND_ALIASES[rawKind] ?? rawKind;
    const threshold =
      typeof input.threshold === "number" && input.threshold >= 0
        ? input.threshold
        : undefined;

    if (kind === "low_stock") {
      const qtyThreshold = threshold ?? 5;
      const products = await productsDb.getAllProducts();
      const matched = products.filter(
        (product) => product.quantity > 0 && product.quantity <= qtyThreshold
      );
      const listed = capList(
        matched.slice().sort((a, b) => a.quantity - b.quantity).map(slimProduct),
        SAMPLE_LIMIT
      );
      return ok({
        kind,
        threshold: qtyThreshold,
        totals: {
          matchCount: matched.length,
          totalQuantity: matched.reduce((sum, product) => sum + product.quantity, 0),
        },
        matches: listed.items,
        ...listMeta(listed),
        rule: "Copy totals.matchCount. Each match includes sellingPrice and boughtPrice. Do not count matches.",
      });
    }

    if (kind === "out_of_stock") {
      const products = await productsDb.getAllProducts();
      const matched = products.filter((product) => product.quantity === 0);
      const listed = capList(matched.map(slimProduct), SAMPLE_LIMIT);
      return ok({
        kind,
        totals: { matchCount: matched.length, totalQuantity: 0 },
        matches: listed.items,
        ...listMeta(listed),
        rule: "Copy totals.matchCount. Each match includes sellingPrice and boughtPrice.",
      });
    }

    const paymentAlert = PAYMENT_ALERTS[kind];
    if (paymentAlert) {
      const dueDays = threshold && threshold > 0 ? threshold : 2;
      const payments = (await paymentsDb.getAllPaymentsWithClientInfo()) as any[];
      const now = new Date();
      const matched = payments.filter((payment) => {
        if (payment.paidDate) return false;
        if (payment.type !== paymentAlert.type) return false;
        if (paymentAlert.timing === "overdue") {
          return paymentIsOverdue(payment.dueDate, now);
        }
        if (paymentAlert.timing === "due_soon") {
          return paymentIsDueSoon(payment.dueDate, now, dueDays);
        }
        return true;
      });
      const isCredit = paymentAlert.type === "CREDIT";
      const amount = matched.reduce((sum, payment) => {
        const value = isCredit
          ? Number(payment.remainingAmount ?? payment.givenAmount ?? 0)
          : Number(payment.givenAmount || 0);
        return sum + value;
      }, 0);
      const listed = capList(
        matched.map((payment) => ({
          id: payment.id,
          type: payment.type,
          meaning: isCredit ? "client_owes_you" : "you_hold_deposit",
          client: payment.client?.name ?? null,
          amount: isCredit
            ? payment.remainingAmount ?? payment.givenAmount
            : payment.givenAmount,
          dueDate: payment.dueDate,
        })),
        SAMPLE_LIMIT
      );
      const overdueCount = matched.filter((payment) =>
        paymentIsOverdue(payment.dueDate, now)
      ).length;
      const moneyField = isCredit ? "clientsOweYou" : "youOweClients";
      return ok({
        kind,
        days: paymentAlert.timing === "due_soon" ? dueDays : undefined,
        totals: {
          matchCount: matched.length,
          overdueCount,
          [moneyField]: amount,
          amount,
        },
        matches: listed.items,
        ...listMeta(listed),
        rule: isCredit
          ? paymentAlert.timing === "due"
            ? "All unpaid CREDIT, including overdue. Copy totals.matchCount and totals.overdueCount. clientsOweYou is money."
            : "CREDIT only: they owe you. Copy totals.matchCount and totals.clientsOweYou. Do not mix with VERSEMENT."
          : paymentAlert.timing === "due"
            ? "All unpaid VERSEMENT, including overdue. Copy totals.matchCount and totals.overdueCount. youOweClients is money."
            : "VERSEMENT only: deposit you hold. Copy totals.matchCount and totals.youOweClients. Do not mix with CREDIT.",
      });
    }

    if (
      kind === "bills_due" ||
      kind === "bills_due_soon" ||
      kind === "bills_overdue"
    ) {
      const days =
        kind === "bills_due_soon" && threshold && threshold > 0
          ? threshold
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
        if (kind === "bills_due_soon") return due >= today && due <= soon;
        return true;
      });

      const amount = matched.reduce(
        (sum, bill) => sum + centimesToDA(bill.amount),
        0
      );
      const listed = capList(
        matched
          .slice()
          .sort(
            (a, b) =>
              new Date(a.nextBillDate).getTime() - new Date(b.nextBillDate).getTime()
          )
          .map((bill) => ({
            title: bill.title,
            type: bill.type,
            duration: bill.duration,
            amount: centimesToDA(bill.amount),
            nextBillDate: localYmdFromDate(new Date(bill.nextBillDate)),
            billKind: isSalaryType(bill.type) ? "salary" : "expense",
          })),
        SAMPLE_LIMIT
      );
      const overdueCount = matched.filter((bill) => {
        const due = new Date(bill.nextBillDate);
        due.setHours(0, 0, 0, 0);
        return due < today;
      }).length;
      return ok({
        kind,
        days: kind === "bills_due_soon" ? days : undefined,
        totals: {
          matchCount: matched.length,
          overdueCount,
          amount: roundDA(amount),
          salaryCount: matched.filter((bill) => isSalaryType(bill.type)).length,
          expenseCount: matched.filter((bill) => !isSalaryType(bill.type)).length,
        },
        matches: listed.items,
        ...listMeta(listed),
        rule:
          kind === "bills_due"
            ? "All outstanding store bills (next date set), including overdue. Copy totals.matchCount and totals.overdueCount. Not client debts."
            : "These are store bills (rent, salary, expenses), not client debts. amount is already DA. Copy totals. Do not add matches.",
      });
    }

    if (
      kind === "services_due" ||
      kind === "services_due_soon" ||
      kind === "services_overdue"
    ) {
      const days = threshold && threshold > 0 ? threshold : 7;
      const now = new Date();
      const rows =
        kind === "services_overdue"
          ? await serviceAppointmentsDb.getOverdueServiceAppointments()
          : kind === "services_due_soon"
            ? await serviceAppointmentsDb.getUpcomingServiceAppointments(days)
            : await serviceAppointmentsDb.getPendingServiceAppointments();
      const listed = capList(
        (rows as any[]).map((row) => slimServiceAppointment(row, now)),
        SAMPLE_LIMIT
      );
      const overdueCount = (rows as any[]).filter((row) => {
        const dueTime = paymentDueTime(row.dueDate);
        return Number.isFinite(dueTime) && dueTime !== 0 && dueTime < now.getTime();
      }).length;
      return ok({
        kind,
        days: kind === "services_due_soon" ? days : undefined,
        totals: { matchCount: rows.length, overdueCount },
        matches: listed.items,
        ...listMeta(listed),
        rule:
          kind === "services_overdue"
            ? "Unfinished appointments already late. Copy totals.matchCount. Not client credits, not store bills, not cashier sales."
            : kind === "services_due_soon"
              ? "Unfinished appointments due soon, not late. Copy totals.matchCount. Not overdue."
              : "All unfinished appointments, including overdue. Copy totals.matchCount and totals.overdueCount. What's left to repair is this kind, not due_soon.",
      });
    }

    return fail(`kind is required: ${ALERT_KIND_LIST}`);
  } catch (error) {
    return fail(`alerts failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function tool_restock(input: {
  budget?: unknown;
  q?: string;
  days?: number;
} = {}): Promise<AIToolResult> {
  try {
    const budget = Number(input.budget);
    if (!Number.isFinite(budget) || budget <= 0) {
      return fail("budget is required (DA, a number greater than 0). If the user gave no budget, ask. Do not guess.");
    }

    const daysRaw = typeof input.days === "number" ? input.days : 30;
    const days = Math.min(365, Math.max(1, Math.floor(daysRaw)));
    const q = String(input.q ?? "").trim();

    const thresholdRaw = Number(await getOption("lowStockThreshold"));
    const lowStock =
      Number.isFinite(thresholdRaw) && thresholdRaw >= 0 ? thresholdRaw : 5;

    const allProducts = await productsDb.getAllProducts();
    const categoryQ = q
      ? await resolveCategoryQ(
          q,
          allProducts.map((product) => product.categoryName)
        )
      : { categoryHit: false, matchedCategory: null, stockCategories: [] as string[] };
    const products = filterStockProducts(
      allProducts,
      q || undefined,
      categoryQ.categoryHit
    );
    if (q && products.length === 0) {
      return ok({
        budget: roundDA(budget),
        spent: 0,
        leftover: roundDA(budget),
        days,
        q,
        ...(categoryQ.categoryHit
          ? { matchedCategory: categoryQ.matchedCategory }
          : {
              matchedCategory: null,
              stockCategories: categoryQ.stockCategories.slice(0, 40),
            }),
        lowStockThreshold: lowStock,
        totals: { lineCount: 0, buyQty: 0, catalogCount: 0 },
        matches: [],
        ...listMetaFromTotal(0, 0),
        rule: "q matched no stock category or product. If they meant a category, retry with q set to the closest stockCategories name. Copy leftover = budget. Do not invent a buy list.",
      });
    }

    const range = parseLocalDateRange(localYmdDaysAgo(days - 1), todayYmd());
    if (range.ok === false) return fail(range.error);
    const sales = (await salesDb.getSalesByDateRange(
      range.startDate,
      range.endDate
    )) as any[];

    const soldById = new Map<string, number>();
    for (const sale of sales) {
      for (const item of sale.saleItems ?? []) {
        if (saleItemKind(item) !== "product") continue;
        const id = String(item.productId ?? item.product?.id ?? "");
        if (!id) continue;
        soldById.set(id, (soldById.get(id) ?? 0) + Number(item.quantity || 0));
      }
    }

    type RestockNeed = {
      id: string;
      name: string;
      category: string;
      onHand: number;
      soldInPeriod: number;
      unitCost: number;
      need: number;
    };

    const needs: RestockNeed[] = [];
    for (const product of products) {
      const unitCost = Number(product.boughtPrice || 0);
      if (!(unitCost > 0)) continue;
      const onHand = Number(product.quantity || 0);
      const soldInPeriod = soldById.get(product.id) ?? 0;
      const target = Math.max(lowStock, soldInPeriod);
      const need = Math.max(0, target - onHand);
      if (need < 1) continue;
      needs.push({
        id: product.id,
        name: product.name,
        category: String(product.categoryName ?? "").trim() || "Uncategorized",
        onHand,
        soldInPeriod,
        unitCost,
        need,
      });
    }

    needs.sort((a, b) => {
      if ((a.onHand === 0) !== (b.onHand === 0)) return a.onHand === 0 ? -1 : 1;
      const aLow = a.onHand > 0 && a.onHand <= lowStock;
      const bLow = b.onHand > 0 && b.onHand <= lowStock;
      if (aLow !== bLow) return aLow ? -1 : 1;
      if (b.soldInPeriod !== a.soldInPeriod) return b.soldInPeriod - a.soldInPeriod;
      return a.name.localeCompare(b.name);
    });

    let remaining = budget;
    const lines: Array<{
      name: string;
      category: string;
      buyQty: number;
      unitCost: number;
      lineCost: number;
      onHand: number;
      soldInPeriod: number;
    }> = [];

    for (const item of needs) {
      const canBuy = Math.min(item.need, Math.floor(remaining / item.unitCost));
      if (canBuy < 1) continue;
      const lineCost = roundDA(canBuy * item.unitCost);
      remaining = roundDA(remaining - lineCost);
      lines.push({
        name: item.name,
        category: item.category,
        buyQty: canBuy,
        unitCost: roundDA(item.unitCost),
        lineCost,
        onHand: item.onHand,
        soldInPeriod: item.soldInPeriod,
      });
    }

    const spent = roundDA(budget - remaining);
    const listed = capList(lines, SAMPLE_LIMIT);
    return ok({
      budget: roundDA(budget),
      spent,
      leftover: remaining,
      days,
      q: q || null,
      ...(categoryQ.categoryHit
        ? { matchedCategory: categoryQ.matchedCategory }
        : {}),
      lowStockThreshold: lowStock,
      totals: {
        lineCount: lines.length,
        buyQty: lines.reduce((sum, line) => sum + line.buyQty, 0),
        catalogCount: products.length,
      },
      matches: listed.items,
      ...listMeta(listed),
      rule: "A table of matches is shown (buyQty, name, unitCost, lineCost). Copy leftover. Do not retype every row. Suggestion from on-hand qty, sales in `days`, and last boughtPrice — not a supplier quote. Do not invent extra products. This does not create a purchase.",
    });
  } catch (error) {
    return fail(`restock failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const AI_TOOLS_REGISTRY: Record<string, ToolDef> = {
  report: {
    name: "report",
    description:
      "Store numbers with server-side totals. Use for today/month/year, month-by-month, rankings (best/most/top/who/which), stock (incl. by category), payments, purchases/suppliers, services, bills/expenses/salaries, activity. Ranking: groupBy=product/client/seller → copy top. Use rankBy=revenue (default), profit, quantity, amount, or sellingPrice — do not treat top as profit unless rankBy=profit. One most expensive sale/repair/bill/product → copy topMatch. If the user gave no period for a ranking, use all-time (first stored day through today), not this year. For zakat on stock only: entity=stock, q=zakat → totals.zakatOnStock. Sales totals include profit, billsPaid, and netProfit (profit minus bills paid when q is omitted, same as History; with q, billsPaid is 0 and netProfit equals profit). Pass local YYYY-MM-DD from the system prompt. Bills amounts are already DA. Copy totals, ranking, top, topMatch, and breakdown; never add rows.",
    fn: tool_report,
    input_schema: {
      entity: {
        type: "string",
        description: "sales | payments | purchases | stock | services | bills | activity",
        required: true,
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
        description:
          "Local store date YYYY-MM-DD. If endDate is omitted, the range is startDate through today. For one day, pass the same date as endDate.",
        required: false,
      },
      endDate: {
        type: "string",
        description:
          "Local store date YYYY-MM-DD, inclusive full local day. Omit only when the period runs through today. For one day, copy startDate.",
        required: false,
      },
      groupBy: {
        type: "string",
        description:
          "none = one total (plus topMatch for the single biggest ticket). month = by month. day = by day. product = best sellers / service names, or for bills = by bill/employee name. client/seller = by customer/supplier, or for bills = by bill type. Rankings without a period are all-time.",
        required: false,
        enum: ["none", "day", "month", "year", "product", "client", "seller"],
      },
      q: {
        type: "string",
        description:
          "Optional filter: stock category, name, brand, barcode, employee, bill-type, supplier, or service-type (e.g. samsung, phones, cable, abdellah, SALARY, repair). Pass the user's word as typed — plurals and accents are resolved to a stock category in this tool. Do not list categories first. If q matches a category, only that category's product lines (not names that merely contain those letters). Use q=zakat only when the user asked about zakat. For purchases, q can be a supplier name even with groupBy=product.",
        required: false,
      },
      rankBy: {
        type: "string",
        description:
          "How to pick top: revenue (default, same as best/most/top), profit, quantity (units sold), amount (purchases/payments), sellingPrice. Omit unless the user asked for profit, units, or price.",
        required: false,
        enum: [...RANK_BY_VALUES],
      },
    },
  },
  find: {
    name: "find",
    description:
      "Look up products, clients, suppliers (sellers), or sales by name/brand/barcode/category. Not for best/most/top/who rankings — use report and copy top or topMatch. For products, returns in-stock rows to list (name, quantity, sellingPrice, boughtPrice). If q matches a stock category, only that category — not names that merely contain those letters. type=client status=all = ALL clients (totals.matchCount). type=client status=owes_you = CREDIT only — only if they named CREDIT / who owes them. A status or amount with no domain, in any language, is not CREDIT. type=client status=deposits = VERSEMENT only. q=name looks up one client. Omit q for type=seller to list all suppliers. Copy totals; for type=product list the matches array. If truncated is true, say returnedCount of totalCount.",
    fn: tool_find,
    input_schema: {
      type: {
        type: "string",
        description: "product | client | seller (supplier) | sale",
        required: true,
        enum: ["product", "client", "seller", "sale"],
      },
      q: {
        type: "string",
        description:
          "Name, brand, barcode, category, client phone, sale text, or supplier. For type=client: name/phone only — use status for CREDIT vs deposits. For products, a matching stock category is used instead of substring names. Omit for a full supplier list when type=seller.",
        required: false,
      },
      status: {
        type: "string",
        description:
          "type=client only. all = every client. owes_you = CREDIT (they owe you) — only when they named CREDIT / who owes me, not a status or amount with no domain. deposits = VERSEMENT (you hold their deposit). Never put credit or versement in q.",
        required: false,
        enum: ["all", "owes_you", "deposits"],
      },
    },
  },
  alerts: {
    name: "alerts",
    description:
      "Stock, client payments, store bills, or service appointments. kind MUST name the domain. *_due = all still outstanding, including overdue. *_due_soon = coming up, not late. *_overdue = already late. What's left to repair → services_due. A status with no domain, in any language, is not enough — do not call. Never guess credits. Returns server totals plus a sample.",
    fn: tool_alerts,
    input_schema: {
      kind: {
        type: "string",
        description: ALERT_KIND_LIST,
        required: true,
        enum: [...ALERT_KINDS],
      },
      threshold: {
        type: "number",
        description:
          "low_stock: quantity threshold (default 5). credits_due_soon/versements_due_soon: days ahead (default 2). bills_due_soon/services_due_soon: days ahead (default 7).",
        required: false,
      },
    },
  },
  restock: {
    name: "restock",
    description:
      "Restock buy list for a DA budget only. Requires budget. Optional q = stock category or product name (if q matches a category, only that category). Fills out-of-stock then low stock then what sold, using last boughtPrice. A results table is shown — do not retype every row. Copy leftover (and spent). Does not create a purchase. NEVER for what a client bought, supplier purchases, stock counts, or best sellers.",
    fn: tool_restock,
    input_schema: {
      budget: {
        type: "number",
        description: "Money to spend in DA. Required. Do not call this tool without it.",
        required: true,
      },
      q: {
        type: "string",
        description:
          "Optional stock category or product name. A matching category wins over names that only contain those letters — same as stock.",
        required: false,
      },
      days: {
        type: "number",
        description: "Sales lookback days to size restock (default 30, max 365).",
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
