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
  "rule",
  "type",
  "count",
  "amountsAreDA",
  "currency",
  "period",
]);

function capArrays(value: unknown, maxItems: number, key?: string): unknown {
  if (Array.isArray(value)) {
    if (key === "matches") {
      return value.slice(0, maxItems).map((item) => capArrays(item, maxItems));
    }

    const keepAll =
      (key === "breakdown" || key === "byType" || key === "byCategory") &&
      value.length <= 40;
    const items = (keepAll ? value : value.slice(0, maxItems)).map((item) =>
      capArrays(item, maxItems)
    );

    if (keepAll || value.length <= maxItems) {
      return items;
    }

    return {
      total: value.length,
      showing: items.length,
      truncated: true,
      hint: "Sample only. Use totals from this result, do not add these rows.",
      ...quantityStats(value),
      items,
    };
  }

  if (value && typeof value === "object") {
    const capped: Record<string, unknown> = {};
    for (const [nestedKey, nested] of Object.entries(value)) {
      capped[nestedKey] = capArrays(nested, maxItems, nestedKey);
    }
    return capped;
  }

  return value;
}

function preservedCore(
  value: unknown,
  matchLimit = 3,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const core: Record<string, unknown> = {};
  for (const key of PRESERVE_KEYS) {
    if (!(key in source)) continue;
    if (key === "matches" && Array.isArray(source.matches)) {
      core.matches = source.matches.slice(0, matchLimit);
      continue;
    }
    core[key] = source[key];
  }
  return Object.keys(core).length > 0 ? core : null;
}

/**
 * Groq 8B only allows ~6k tokens per request. Full inventory dumps blow that limit.
 * Totals / breakdown are never dropped. Lists cap at 70, then shrink if still too large.
 */
export function compactToolResult(data: unknown, maxChars: number): unknown {
  const slim = slimValue(data);
  const core = preservedCore(slim);
  let maxItems = 70;

  while (maxItems >= 3) {
    const compacted = capArrays(slim, maxItems);
    if (JSON.stringify(compacted).length <= maxChars) {
      return compacted;
    }
    maxItems = Math.floor(maxItems / 2);
  }

  const fallback = capArrays(slim, 3);
  const json = JSON.stringify(fallback);

  if (json.length <= maxChars) {
    return fallback;
  }

  if (core) {
    const hasMatches = Array.isArray(core.matches) && core.matches.length > 0;
    return {
      ...core,
      truncated: true,
      hint: hasMatches
        ? "List these matches rows. More were omitted because the result was too large. Copy totals for counts."
        : "Sample omitted because it was too large. Use totals and breakdown only.",
    };
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
