const SKIP = new Set(
  [
    "the",
    "a",
    "an",
    "of",
    "for",
    "to",
    "my",
    "me",
    "is",
    "are",
    "was",
    "his",
    "her",
    "sale",
    "sales",
    "sold",
    "buy",
    "bought",
    "client",
    "clients",
    "customer",
    "find",
    "show",
    "list",
    "give",
    "what",
    "who",
    "which",
    "how",
    "many",
    "much",
    "did",
    "does",
    "this",
    "that",
    "one",
    "them",
    "last",
    "same",
    "thing",
    "again",
    "today",
    "yesterday",
    "month",
    "year",
    "week",
    "product",
    "best",
    "most",
    "top",
    "please",
    "about",
    "from",
    "with",
    "and",
    "le",
    "la",
    "les",
    "de",
    "du",
    "des",
    "un",
    "une",
    "est",
    "qui",
    "vente",
    "ventes",
    "cette",
    "cliente",
    "pareil",
    "hier",
    "produit",
    "afficher",
    "montre",
    "voir",
    "chno",
    "wesh",
    "wach",
    "wrili",
    "wrini",
    "ta3",
    "nta3",
    "dial",
    "dyal",
    "diyal",
    "chhal",
    "ch7al",
    "chahal",
    "9adeh",
    "9adach",
    "9adech",
    "qadach",
    "qadech",
    "combien",
    "total",
    "revenue",
    "profit",
    "bzaf",
    "bezaf",
    "bezzaf",
  ].map((word) => word.toLowerCase())
);

export function isTranslatedScript(q: string) {
  if (/[\u0600-\u06FF]/.test(q)) return true;
  if (/[\u2500-\u257F]/.test(q)) return true;
  return !/[a-zA-Z]{3,}/.test(q) && /[^\w\s'\-.,]/u.test(q);
}

export function latinNameFromUser(userText: string): string | null {
  const tokens = userText
    .toLowerCase()
    .match(/[a-z]{2,}/gi)
    ?.map((token) => token.toLowerCase())
    .filter((token) => token.length >= 3 && !SKIP.has(token));
  if (!tokens?.length) return null;
  // Store lookup is includes(q). A joined phrase ("chhal samsung", "karim samsung")
  // is not a substring of any one name, so restore a single leftover token.
  return tokens.reduce((best, token) =>
    token.length > best.length ? token : best
  );
}

/**
 * Models often translate a Latin client/product name into Arabic for q.
 * The store keeps the typed spelling, so that search returns nothing.
 *
 * Only names typed in this userText are restored. An Arabic q with no Latin
 * tokens is a real client/product name, not a previous-turn filter.
 */
export function keepUserSpellingQ(q: string, userText: string): string {
  const trimmed = q.trim();
  if (!trimmed || !isTranslatedScript(trimmed)) return trimmed;
  return latinNameFromUser(userText) || trimmed;
}
