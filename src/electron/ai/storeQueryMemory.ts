export type LastStoreQuery = {
  toolName: string;
  input: Record<string, unknown>;
  totals?: Record<string, unknown>;
  topRows?: unknown[];
  entity?: unknown;
  groupBy?: unknown;
  q?: unknown;
  kind?: unknown;
  type?: unknown;
};

const FOLLOW_UP =
  /\b((this|that)\b.{0,24}\bclient|this one|that one|the same|same thing|and yesterday|and today|last month|this month|by product|by client|by month|list them|show them|check|again|ce client|cette cliente|le m[eê]me|pareil|hier|par produit|v[eé]rifie|rev[eé]rifie)\b|(هذا|هاد|هذاك|نفس الشيء|تاني|عاود|تحقق|شيك|ورّيهم|وريهم|هاد الزبون|هذا الزبون|هادك)/i;

export function isFollowUp(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length <= 24 && FOLLOW_UP.test(trimmed)) return true;
  return FOLLOW_UP.test(trimmed);
}

function ymdFromLocal(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
  return match?.[1];
}

function listFromResult(result: Record<string, unknown>): unknown[] {
  for (const key of ["breakdown", "byType", "byCategory", "matches"]) {
    const value = result[key];
    if (Array.isArray(value) && value.length > 0) {
      return value.slice(0, 8);
    }
    if (
      value &&
      typeof value === "object" &&
      Array.isArray((value as { items?: unknown[] }).items)
    ) {
      return (value as { items: unknown[] }).items.slice(0, 8);
    }
  }
  return [];
}

export function snapshotStoreQuery(
  toolName: string,
  input: Record<string, unknown>,
  result: Record<string, unknown>
): LastStoreQuery {
  const startDate =
    input.startDate ?? ymdFromLocal(result.startLocal) ?? undefined;
  const endDate = input.endDate ?? ymdFromLocal(result.endLocal) ?? undefined;

  return {
    toolName,
    input: {
      ...input,
      ...(startDate ? { startDate } : {}),
      ...(endDate ? { endDate } : {}),
    },
    totals:
      result.totals && typeof result.totals === "object"
        ? (result.totals as Record<string, unknown>)
        : undefined,
    topRows: listFromResult(result),
    entity: result.entity ?? input.entity,
    groupBy: result.groupBy ?? input.groupBy,
    q: result.q ?? input.q,
    kind: result.kind ?? input.kind,
    type: result.type ?? input.type,
  };
}

export function mergeFollowUpInput(
  toolName: string,
  input: Record<string, unknown>,
  lastQuery: LastStoreQuery | null
): Record<string, unknown> {
  if (!lastQuery) return input;
  if (toolName !== lastQuery.toolName) return input;

  const merged = { ...lastQuery.input, ...input };
  if (input.startDate == null && lastQuery.input.startDate != null) {
    merged.startDate = lastQuery.input.startDate;
  }
  if (input.endDate == null && lastQuery.input.endDate != null) {
    merged.endDate = lastQuery.input.endDate;
  }
  return merged;
}

export function formatLastQueryForModel(query: LastStoreQuery): string {
  return [
    "STORE_CONTEXT from the previous store question. This looks like a follow-up.",
    `Previous tool: ${query.toolName}`,
    `Args: ${JSON.stringify(query.input)}`,
    query.totals ? `Authoritative totals: ${JSON.stringify(query.totals)}` : "",
    query.topRows?.length
      ? `Top rows (do not recount): ${JSON.stringify(query.topRows)}`
      : "",
    "Reuse these dates and filters. Do not default dates to today.",
    "Do not combine a client name into q with the previous filter. Keep the original q (type/product) and the same startDate/endDate.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function unwrapFollowUpUserText(content: string): string {
  if (!content.startsWith("STORE_CONTEXT")) return content;
  const parts = content.split("\n\n");
  return parts[parts.length - 1] ?? content;
}

export function withFollowUpContext<T extends { role: string; content: string }>(
  messages: T[],
  lastQuery: LastStoreQuery | null,
  userText: string
): T[] {
  if (!lastQuery || !isFollowUp(userText)) return messages;

  const wrapped = messages.slice();
  const last = wrapped[wrapped.length - 1];
  if (!last || last.role !== "user") return messages;

  wrapped[wrapped.length - 1] = {
    ...last,
    content: `${formatLastQueryForModel(lastQuery)}\n\n${last.content}`,
  };
  return wrapped;
}
