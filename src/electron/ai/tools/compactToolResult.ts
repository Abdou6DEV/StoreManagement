import { formatLocalDateTime } from "./parseLocalDateRange";

const DROP_FIELDS = new Set(["photo"]);
const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "paidDate",
  "dueDate",
  "completedAt",
  "lastSoldDate",
  "nextBillDate",
]);
const UTC_ISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

const RANKING_LIST_KEYS = new Set(["breakdown", "byType", "byCategory"]);
const RANKING_KEEP_ALL_MAX = 80;

function toLocalTimeline(value: unknown): unknown {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return formatLocalDateTime(value);
  }

  if (typeof value === "string" && UTC_ISO.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return formatLocalDateTime(date);
    }
  }

  return value;
}

function slimValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(slimValue);
  }

  if (value instanceof Date) {
    return toLocalTimeline(value);
  }

  if (value && typeof value === "object") {
    const slim: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      if (nested == null) continue;
      if (DROP_FIELDS.has(key)) continue;
      slim[key] = DATE_FIELDS.has(key)
        ? toLocalTimeline(nested)
        : slimValue(nested);
    }

    return slim;
  }

  return value;
}

function quantityStats(items: unknown[]) {
  const withQuantity = items.filter(
    (item) =>
      item &&
      typeof item === "object" &&
      "quantity" in item &&
      typeof (item as { quantity: unknown }).quantity === "number"
  );

  if (withQuantity.length === 0) return {};

  return {
    inStock: withQuantity.filter(
      (item) => (item as { quantity: number }).quantity > 0
    ).length,
    outOfStock: withQuantity.filter(
      (item) => (item as { quantity: number }).quantity === 0
    ).length,
  };
}

const PRESERVE_KEYS = new Set([
  "totals",
  "breakdown",
  "byType",
  "byCategory",
  "matches",
  "matchCount",
  "totalQuantity",
  "timezone",
  "timeline",
  "startLocal",
  "endLocal",
  "entity",
  "groupBy",
  "kind",
  "q",
  "matchedCategory",
  "stockCategories",
  "rule",
  "ranking",
  "top",
  "topMatch",
  "type",
  "count",
  "amountsAreDA",
  "currency",
  "period",
  "budget",
  "spent",
  "leftover",
  "days",
  "returnedCount",
  "totalCount",
  "truncated",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isRestockMatches(matches: unknown): boolean {
  if (!Array.isArray(matches) || matches.length === 0) return false;
  return matches.some(
    (row) => isRecord(row) && "buyQty" in row
  );
}

/** Restock buy lists and find type=product lists are the answer — never slice them. */
export function keepMatchesFull(
  data: unknown,
  toolName?: string
): boolean {
  const name = String(toolName ?? "").trim().toLowerCase();
  if (name === "restock") return true;
  if (!isRecord(data)) return false;
  if (name === "find" && data.type === "product") return true;
  if (data.type === "product" && Array.isArray(data.matches)) return true;
  return isRestockMatches(data.matches);
}

function wrapSample(
  items: unknown[],
  maxItems: number,
  capNested: (item: unknown) => unknown
): unknown {
  const showing = items.slice(0, maxItems).map(capNested);
  if (showing.length >= items.length) return showing;
  return {
    total: items.length,
    showing: showing.length,
    truncated: true,
    hint: "Sample only. Use totals from this result, do not add these rows. If truncated, say returnedCount of totalCount. Never say the list is complete.",
    ...quantityStats(items),
    items: showing,
  };
}

function capArrays(
  value: unknown,
  maxItems: number,
  key: string | undefined,
  keepFull: boolean
): unknown {
  if (Array.isArray(value)) {
    const capNested = (item: unknown) =>
      capArrays(item, maxItems, undefined, keepFull);

    if (key === "matches") {
      if (keepFull) return value.map(capNested);
      return wrapSample(value, maxItems, capNested);
    }

    if (RANKING_LIST_KEYS.has(key ?? "")) {
      if (value.length <= RANKING_KEEP_ALL_MAX) return value.map(capNested);
      return wrapSample(value, maxItems, capNested);
    }

    if (value.length <= maxItems) return value.map(capNested);
    return wrapSample(value, maxItems, capNested);
  }

  if (isRecord(value)) {
    const capped: Record<string, unknown> = {};
    for (const [nestedKey, nested] of Object.entries(value)) {
      capped[nestedKey] = capArrays(nested, maxItems, nestedKey, keepFull);
    }
    return capped;
  }

  return value;
}

function listTruncation(value: unknown): {
  truncated: boolean;
  returnedCount?: number;
  totalCount?: number;
} {
  if (
    isRecord(value) &&
    value.truncated === true &&
    Array.isArray(value.items)
  ) {
    return {
      truncated: true,
      returnedCount:
        typeof value.showing === "number" ? value.showing : value.items.length,
      totalCount:
        typeof value.total === "number" ? value.total : value.items.length,
    };
  }
  return { truncated: false };
}

function applyListMeta(compacted: unknown): unknown {
  if (!isRecord(compacted)) return compacted;
  const lifted = [
    listTruncation(compacted.matches),
    listTruncation(compacted.breakdown),
    listTruncation(compacted.byType),
    listTruncation(compacted.byCategory),
  ].filter((meta) => meta.truncated);
  const truncated = lifted.length > 0 || compacted.truncated === true;
  if (!truncated) return compacted;

  const existingTotal =
    typeof compacted.totalCount === "number" ? compacted.totalCount : undefined;
  const existingReturned =
    typeof compacted.returnedCount === "number"
      ? compacted.returnedCount
      : undefined;
  const liftedTotal = lifted.find((meta) => typeof meta.totalCount === "number")
    ?.totalCount;
  const liftedReturned = lifted.find(
    (meta) => typeof meta.returnedCount === "number"
  )?.returnedCount;

  const totalCount =
    existingTotal != null && liftedTotal != null
      ? Math.max(existingTotal, liftedTotal)
      : existingTotal ?? liftedTotal;
  const returnedCount = liftedReturned ?? existingReturned;

  return {
    ...compacted,
    truncated: true,
    ...(typeof totalCount === "number" ? { totalCount } : {}),
    ...(typeof returnedCount === "number" ? { returnedCount } : {}),
  };
}

function preservedCore(
  value: unknown,
  keepFull: boolean,
  matchLimit = 3
): Record<string, unknown> | null {
  if (!isRecord(value)) return null;

  const core: Record<string, unknown> = {};
  for (const key of PRESERVE_KEYS) {
    if (!(key in value)) continue;
    if (key === "matches" && Array.isArray(value.matches)) {
      core.matches = keepFull
        ? value.matches
        : wrapSample(value.matches, matchLimit, (item) => item);
      continue;
    }
    core[key] = value[key];
  }
  return Object.keys(core).length > 0 ? core : null;
}

/**
 * Shrink tool JSON for small context windows.
 * Totals / top / topMatch / ranking / leftover are never dropped.
 * Sample lists (report/alerts/client matches, huge breakdowns) cap with truncated + total.
 * Restock and find type=product matches stay whole so the buy/product list cannot lie.
 */
export function compactToolResult(
  data: unknown,
  maxChars: number,
  toolName?: string
): unknown {
  const slim = slimValue(data);
  const keepFull = keepMatchesFull(slim, toolName);
  const core = preservedCore(slim, keepFull);
  let maxItems = 150;

  while (maxItems >= 3) {
    const compacted = applyListMeta(capArrays(slim, maxItems, undefined, keepFull));
    if (JSON.stringify(compacted).length <= maxChars) {
      return compacted;
    }
    maxItems = Math.floor(maxItems / 2);
  }

  const fallback = applyListMeta(capArrays(slim, 3, undefined, keepFull));
  const json = JSON.stringify(fallback);

  if (json.length <= maxChars) {
    return fallback;
  }

  if (keepFull && isRecord(slim) && Array.isArray(slim.matches)) {
    return applyListMeta({
      ...core,
      matches: slim.matches,
    });
  }

  if (core) {
    const hasMatches =
      Array.isArray(core.matches) ||
      (isRecord(core.matches) && Array.isArray(core.matches.items));
    return applyListMeta({
      ...core,
      truncated: true,
      hint: hasMatches
        ? "Sample only. Copy totals. If truncated, say returnedCount of totalCount. Do not invent omitted rows."
        : "Sample omitted because it was too large. Use totals, top, and topMatch only.",
    });
  }

  return {
    truncated: true,
    hint: "Result was too large for this model. Ask a more specific question.",
    preview: json.slice(0, Math.max(0, maxChars - 120)),
  };
}

export function getToolResultCharBudget(tpm?: number | null): number {
  if (typeof tpm === "number" && tpm <= 6_000) return 1_500;
  if (typeof tpm === "number" && tpm <= 12_000) return 4_000;
  return 10_000;
}
