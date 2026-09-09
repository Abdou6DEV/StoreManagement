export type FuzzyCandidate = {
  id: string;
  name: string;
  score: number;
};

/** Ignore tiny fragments like "1" from "1+" that falsely match inside "J102A". */
const MIN_TOKEN_LEN = 2;
const MIN_CONTAINS_LEN = 3;
const MIN_PARTIAL_TOKEN_LEN = 4;
/** Drop weak one-token / partial noise from suggestions. */
const MIN_SCORE = 220;
/**
 * Exact (1000) and whole-phrase contains (~700+) count as “really strong”.
 * When the best hit is this strong, weaker suggestions are hidden.
 */
const STRONG_MATCH_SCORE = 700;
/** Keep other strong peers only if they are this close to the best score. */
const STRONG_MATCH_GAP = 80;

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
    .filter((t) => t.length >= MIN_TOKEN_LEN);
}

/** True only when the shorter string is a whole word/phrase inside the longer one. */
function isPhraseOrTokenContains(a: string, b: string): boolean {
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < MIN_CONTAINS_LEN) return false;
  if (longer === shorter) return true;
  // Word-boundary style: "samsung" in "samsung a14", not "1" in "j102a"
  return ` ${longer} `.includes(` ${shorter} `);
}

function tokenPartialHit(queryToken: string, nameTokens: string[]): boolean {
  if (queryToken.length < MIN_PARTIAL_TOKEN_LEN) return false;
  return nameTokens.some(
    (nt) =>
      nt.length >= MIN_PARTIAL_TOKEN_LEN &&
      (nt === queryToken || nt.startsWith(queryToken) || queryToken.startsWith(nt)),
  );
}

/**
 * Local lookalike scoring: exact → whole-phrase contains → token overlap.
 * Higher score is better. Returns top N above a minimum score.
 */
export function rankNameMatches<T extends { id: string; name: string }>(
  query: string | null | undefined,
  pool: T[],
  limit = 5,
): Array<T & { score: number }> {
  const q = (query ?? "").trim();
  if (!q || pool.length === 0) return [];

  const nq = normalize(q);
  if (!nq) return [];
  const qTokens = tokens(q);
  const scored: Array<T & { score: number }> = [];

  for (const item of pool) {
    const nn = normalize(item.name);
    if (!nn) continue;

    let score = 0;
    if (nn === nq) {
      score = 1000;
    } else if (isPhraseOrTokenContains(nn, nq)) {
      score = 700 + Math.min(nn.length, nq.length);
    } else if (qTokens.length > 0) {
      const nameTokenList = tokens(item.name);
      if (nameTokenList.length === 0) continue;
      const nameTokenSet = new Set(nameTokenList);

      let exactHits = 0;
      let partialHits = 0;
      for (const t of qTokens) {
        if (nameTokenSet.has(t)) exactHits += 1;
        else if (tokenPartialHit(t, nameTokenList)) partialHits += 1;
      }

      const hit = exactHits + partialHits * 0.5;
      // Need a real shared token, not a single fuzzy stub
      if (exactHits === 0 && partialHits < 2) continue;
      if (hit <= 0) continue;

      const coverage = hit / qTokens.length;
      // One shared word on a long query is OK only if that word is substantial
      // (e.g. brand "hoco"), not a short stub.
      const strongExactCount = qTokens.filter(
        (t) => t.length >= 4 && nameTokenSet.has(t),
      ).length;
      if (qTokens.length >= 3 && exactHits < 2 && coverage < 0.5) {
        if (strongExactCount === 0) continue;
      }

      score = Math.round(
        400 * coverage + exactHits * 40 + partialHits * 10 + strongExactCount * 50,
      );
    }

    if (score >= MIN_SCORE) scored.push({ ...item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  const best = scored[0];
  if (best && best.score >= STRONG_MATCH_SCORE) {
    const floor = Math.max(STRONG_MATCH_SCORE, best.score - STRONG_MATCH_GAP);
    return scored.filter((s) => s.score >= floor).slice(0, limit);
  }

  return scored.slice(0, limit);
}
