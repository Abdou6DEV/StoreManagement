import type { StoreResultTable } from "../../lib/ai/aiChatTypes";
import {
  isExplicitListQuestion,
  shouldHideRankingTable,
} from "./rankingIntent";

const MAX_ROWS = 40;

const COLUMN_ORDER = [
  "key",
  "name",
  "title",
  "client",
  "type",
  "category",
  "count",
  "soldCount",
  "buyQty",
  "onHand",
  "soldInPeriod",
  "quantity",
  "totalQuantity",
  "unitCost",
  "lineCost",
  "revenue",
  "profit",
  "amount",
  "paid",
  "serviceRevenue",
  "serviceProfit",
  "sellingPrice",
  "boughtPrice",
  "clientsOweYou",
  "youOweClients",
];

const TOTALS_ONLY =
  /\b(how many|how much|combien|total|revenue|profit|شحال|قداش|كم)\b/i;

function isTotalsOnlyQuestion(text: string) {
  if (isExplicitListQuestion(text)) return false;
  return TOTALS_ONLY.test(text);
}

function unwrapList(value: unknown): unknown[] | null {
  if (Array.isArray(value) && value.length > 0) return value;
  if (
    value &&
    typeof value === "object" &&
    Array.isArray((value as { items?: unknown[] }).items)
  ) {
    return (value as { items: unknown[] }).items;
  }
  return null;
}

function isRestockPlan(result: Record<string, unknown>): boolean {
  const matches = unwrapList(result.matches);
  if (!matches || matches.length === 0) return false;
  return matches.some(
    (row) =>
      row &&
      typeof row === "object" &&
      !Array.isArray(row) &&
      "buyQty" in (row as object)
  );
}

function pickList(
  result: Record<string, unknown>
): { rows: unknown[]; source: string } | null {
  const ranked = unwrapList(result.breakdown);
  if (ranked && ranked.length >= 2) return { rows: ranked, source: "breakdown" };

  const byType = unwrapList(result.byType);
  if (byType && byType.length >= 2) return { rows: byType, source: "byType" };

  const byCategory = unwrapList(result.byCategory);
  if (byCategory && byCategory.length >= 2) {
    return { rows: byCategory, source: "byCategory" };
  }

  const matches = unwrapList(result.matches);
  if (matches && matches.length >= 2) {
    return { rows: matches, source: "matches" };
  }

  return null;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number.isInteger(value)
      ? String(value)
      : String(Math.round(value * 100) / 100);
  }
  return String(value);
}

function columnsForRows(rows: Record<string, unknown>[]): string[] {
  const present = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (row[key] != null && row[key] !== "") present.add(key);
    }
  }
  const ordered = COLUMN_ORDER.filter((key) => present.has(key));
  return ordered.length > 0 ? ordered : [...present].slice(0, 4);
}

function tableFromRows(
  rows: unknown[],
  minRows: number
): StoreResultTable | null {
  const objectRows = rows.filter(
    (row): row is Record<string, unknown> =>
      !!row && typeof row === "object" && !Array.isArray(row)
  );
  if (objectRows.length < minRows) return null;

  const columns = columnsForRows(objectRows);
  if (columns.length === 0) return null;

  const totalRows = objectRows.length;
  const sliced = objectRows.slice(0, MAX_ROWS);
  return {
    columns,
    rows: sliced.map((row) => columns.map((column) => cellText(row[column]))),
    truncated: totalRows > MAX_ROWS,
    totalRows,
  };
}

export function buildResultTable(
  toolResults: unknown[],
  userText: string
): StoreResultTable | null {
  for (const result of toolResults) {
    if (!result || typeof result !== "object" || Array.isArray(result)) continue;
    const record = result as Record<string, unknown>;
    if (record.error) continue;
    if (!isRestockPlan(record)) continue;
    const table = tableFromRows(unwrapList(record.matches) ?? [], 1);
    if (table) return table;
  }

  if (!isExplicitListQuestion(userText)) return null;
  if (shouldHideRankingTable(userText)) return null;
  if (isTotalsOnlyQuestion(userText)) return null;

  for (const result of toolResults) {
    if (!result || typeof result !== "object" || Array.isArray(result)) continue;
    const record = result as Record<string, unknown>;
    if (record.error) continue;
    if (isRestockPlan(record)) continue;

    const picked = pickList(record);
    if (!picked) continue;

    const table = tableFromRows(picked.rows, 2);
    if (table) return table;
  }

  return null;
}
