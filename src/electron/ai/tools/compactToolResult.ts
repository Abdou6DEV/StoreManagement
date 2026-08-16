const DROP_FIELDS = new Set(["photo", "createdAt", "updatedAt"]);

function slimValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(slimValue);
  }

  if (value && typeof value === "object") {
    const slim: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      if (nested == null) continue;
      if (DROP_FIELDS.has(key)) continue;
      slim[key] = slimValue(nested);
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

function capArrays(value: unknown, maxItems: number): unknown {
  if (Array.isArray(value)) {
    const items = value.slice(0, maxItems).map((item) => capArrays(item, maxItems));

    if (value.length <= maxItems) {
      return items;
    }

    return {
      total: value.length,
      showing: items.length,
      truncated: true,
      hint: "Result truncated. Use a more specific tool (name, barcode, date range, low stock) instead of listing everything.",
      ...quantityStats(value),
      items,
    };
  }

  if (value && typeof value === "object") {
    const capped: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      capped[key] = capArrays(nested, maxItems);
    }
    return capped;
  }

  return value;
}

/**
 * Groq 8B only allows ~6k tokens per request. Full inventory dumps blow that limit.
 */
export function compactToolResult(data: unknown, maxChars: number): unknown {
  const slim = slimValue(data);
  let maxItems = 25;

  while (maxItems >= 5) {
    const compacted = capArrays(slim, maxItems);
    if (JSON.stringify(compacted).length <= maxChars) {
      return compacted;
    }
    maxItems = Math.floor(maxItems / 2);
  }

  const fallback = capArrays(slim, 5);
  const json = JSON.stringify(fallback);

  if (json.length <= maxChars) {
    return fallback;
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
