/** Same rules for stock tool totals and AI page-access gating. */
export function isZakatQuery(q?: unknown): boolean {
  const text = String(q ?? "").trim().toLowerCase();
  return text === "zakat" || text === "zakaat" || text.includes("زكاة");
}
