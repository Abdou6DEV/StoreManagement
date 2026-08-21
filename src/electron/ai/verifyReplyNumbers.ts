const COUNT_KEYS = new Set([
  "matchCount",
  "totalQuantity",
  "soldCount",
  "count",
  "inStockCount",
  "jobsCompletedInPeriodCount",
  "upcomingCount",
  "overdueCount",
  "creditCount",
  "versementCount",
  "paymentCount",
  "purchaseCount",
  "buyQty",
  "onHand",
  "soldInPeriod",
  "lineCount",
]);

const AMOUNT_KEYS = new Set([
  "revenue",
  "profit",
  "netProfit",
  "paid",
  "expensePaid",
  "salaryPaid",
  "amount",
  "total",
  "givenAmount",
  "clientsOweYou",
  "youOweClients",
  "serviceProfit",
  "serviceRevenue",
  "productProfit",
  "inventoryCost",
  "inventoryRetail",
  "zakatOnStock",
  "sellingPrice",
  "boughtPrice",
  "amountDA",
  "budget",
  "spent",
  "leftover",
  "unitCost",
  "lineCost",
]);

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toLatinDigits(text: string) {
  return text.replace(/[٠-٩]/g, (digit) =>
    String(ARABIC_DIGITS.indexOf(digit))
  );
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

function collectFromRecord(
  record: Record<string, unknown>,
  counts: number[],
  amounts: number[]
) {
  for (const [key, value] of Object.entries(record)) {
    const number = asFiniteNumber(value);
    if (number == null) continue;
    if (COUNT_KEYS.has(key)) counts.push(number);
    if (AMOUNT_KEYS.has(key)) amounts.push(Math.round(number * 100) / 100);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function listRows(result: Record<string, unknown>): Record<string, unknown>[] {
  for (const key of ["breakdown", "byType", "byCategory", "matches"]) {
    const value = result[key];
    const list = Array.isArray(value)
      ? value
      : value &&
          typeof value === "object" &&
          Array.isArray((value as { items?: unknown[] }).items)
        ? (value as { items: unknown[] }).items
        : null;
    if (list) {
      return list.filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row)
      );
    }
  }
  return [];
}

function rankingRows(result: Record<string, unknown>): Record<string, unknown>[] {
  return ["top", "topMatch"]
    .map((key) => asRecord(result[key]))
    .filter((row): row is Record<string, unknown> => row != null);
}

export function collectAuthoritativeNumbers(toolResults: unknown[]): {
  primaryCount: number | null;
  counts: number[];
  amounts: number[];
} {
  const counts: number[] = [];
  const amounts: number[] = [];
  let primaryCount: number | null = null;

  for (const result of toolResults) {
    if (!result || typeof result !== "object" || Array.isArray(result)) continue;
    const record = result as Record<string, unknown>;
    if (record.error) continue;

    if (record.totals && typeof record.totals === "object") {
      collectFromRecord(record.totals as Record<string, unknown>, counts, amounts);
    }
    collectFromRecord(record, counts, amounts);

    const rows = [...listRows(record), ...rankingRows(record)];
    let maxCount: number | null = null;
    for (const row of rows) {
      collectFromRecord(row, counts, amounts);
      const rowCount = asFiniteNumber(row.count ?? row.soldCount ?? row.totalQuantity);
      if (rowCount != null && (maxCount == null || rowCount > maxCount)) {
        maxCount = rowCount;
      }
    }
    if (maxCount != null) {
      primaryCount = maxCount;
    }
  }

  if (primaryCount == null) {
    const preferred = ["soldCount", "matchCount", "totalQuantity", "count"];
    for (const result of toolResults) {
      if (!result || typeof result !== "object") continue;
      const totals = (result as { totals?: Record<string, unknown> }).totals;
      if (!totals) continue;
      for (const key of preferred) {
        const value = asFiniteNumber(totals[key]);
        if (value != null) {
          primaryCount = value;
          break;
        }
      }
      if (primaryCount != null) break;
    }
  }

  return { primaryCount, counts, amounts };
}

function extractReplyNumbers(text: string): number[] {
  const normalized = toLatinDigits(text).replace(/\u00a0/g, " ");
  const found: number[] = [];
  const pattern = /\d{1,3}(?:[ \u202f.,]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(normalized))) {
    const raw = match[0];
    const year = /^(20[2-3]\d)$/.test(raw);
    if (year) continue;
    const compact = raw.replace(/[ \u202f]/g, "");
    const hasCommaDecimal = /,\d{1,2}$/.test(compact) && !/\.\d+$/.test(compact);
    const parsed = Number(
      hasCommaDecimal
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, "")
    );
    if (Number.isFinite(parsed)) found.push(parsed);
  }
  return found;
}

function almostEqual(a: number, b: number) {
  if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
  return Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.01);
}

export function replyConflictsWithTotals(
  text: string,
  toolResults: unknown[]
): boolean {
  if (!toolResults.length) return false;
  if (isNameLookup(toolResults)) return false;

  const { primaryCount, counts, amounts } = collectAuthoritativeNumbers(toolResults);
  if (primaryCount == null) return false;

  const mentioned = extractReplyNumbers(text);
  if (mentioned.length === 0) return false;

  const known = [...counts, ...amounts];
  const mentionsPrimary = mentioned.some((value) => almostEqual(value, primaryCount));
  if (mentionsPrimary) return false;

  const mentionsKnown = mentioned.some((value) =>
    known.some((auth) => almostEqual(value, auth))
  );
  if (mentionsKnown) return false;

  return mentioned.some(
    (value) =>
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 10_000 &&
      value !== primaryCount
  );
}

function isNameLookup(toolResults: unknown[]) {
  return toolResults.some((result) => {
    if (!result || typeof result !== "object" || Array.isArray(result)) {
      return false;
    }
    const type = String((result as { type?: unknown }).type ?? "");
    return (
      type === "sale" ||
      type === "client" ||
      type === "product" ||
      type === "seller"
    );
  });
}

export function formatCorrectionHint(toolResults: unknown[]): string {
  const { primaryCount, counts } = collectAuthoritativeNumbers(toolResults);
  const first = toolResults.find(
    (result) => result && typeof result === "object" && !Array.isArray(result)
  ) as Record<string, unknown> | undefined;

  return [
    "Your draft used the wrong numbers. Copy these authoritative values. Do not invent or recount.",
    primaryCount != null ? `PRIMARY_COUNT=${primaryCount}` : "",
    first?.totals ? `TOTALS=${JSON.stringify(first.totals)}` : "",
    first?.top ? `TOP=${JSON.stringify(first.top)}` : "",
    first?.topMatch ? `TOP_MATCH=${JSON.stringify(first.topMatch)}` : "",
    counts.length ? `KNOWN_COUNTS=${JSON.stringify(counts.slice(0, 12))}` : "",
    "Write the answer again in the same language as the user. If they wrote Algerian Darija, use Arabic script only.",
  ]
    .filter(Boolean)
    .join("\n");
}
