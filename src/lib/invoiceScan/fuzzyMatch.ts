export type FuzzyCandidate = {
  id: string;
  name: string;
  score: number;
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return normalize(text)
    .split(/[\s/_-]+/)
    .filter((t) => t.length >= 2);
}

/**
 * Local lookalike scoring: exact → token overlap → contains.
 * Higher score is better. Returns top N.
 */
export function rankNameMatches<T extends { id: string; name: string }>(
  query: string | null | undefined,
  pool: T[],
  limit = 5,
): Array<T & { score: number }> {
  const q = (query ?? "").trim();
  if (!q || pool.length === 0) return [];

  const nq = normalize(q);
  const qTokens = tokens(q);
  const scored: Array<T & { score: number }> = [];

  for (const item of pool) {
    const nn = normalize(item.name);
    if (!nn) continue;

    let score = 0;
    if (nn === nq) {
      score = 1000;
    } else if (nn.includes(nq) || nq.includes(nn)) {
      score = 700 + Math.min(nn.length, nq.length);
    } else if (qTokens.length > 0) {
      const nameTokens = new Set(tokens(item.name));
      let hit = 0;
      for (const t of qTokens) {
        if (nameTokens.has(t)) hit += 1;
        else if ([...nameTokens].some((nt) => nt.includes(t) || t.includes(nt))) {
          hit += 0.5;
        }
      }
      if (hit > 0) {
        score = Math.round(400 * (hit / qTokens.length) + hit * 20);
      }
    }

    if (score > 0) scored.push({ ...item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit);
}
