export function isExplicitListQuestion(text: string) {
  return (
    /\b(list|lists|listing|show( me)?( all)?|display|enumerate|names? of|which ones)\b/i.test(
      text
    ) ||
    /\b(liste|lister|affiche|afficher|montre|montrer|tous les|toutes les|wrili)\b/i.test(
      text
    ) ||
    /(قائمة|عرض|ورّي|وريلي|وريني|ليستي|ليست|كاملهم|كلهم)/.test(text)
  );
}

export function isRankingQuestion(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (
    /\b(owe|owes|owing|unpaid|credit|versement|deposit|dette|doit)\b/i.test(
      trimmed
    ) ||
    /(دين|يديني|يكريدي|فيرسون|قرض)/.test(trimmed)
  ) {
    return false;
  }
  return (
    /\b(best|most|top|biggest|expensive|cheapest|worst|least|meilleur(?:e|s)?|plus\s+cher|le\s+plus|lmli[7h]|mli[7h]|ahss?an|ahsen|akther|aghla)\b/i.test(
      trimmed
    ) || /(أحسن|افضل|أفضل|أكثر|اكثر|أغلى|اغلى|أحسن واحد)/.test(trimmed)
  );
}

export function shouldHideRankingTable(text: string) {
  return isRankingQuestion(text) && !isExplicitListQuestion(text);
}
