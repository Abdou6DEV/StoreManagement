const LATIN_DARIJA =
  /\b(wesh|wach|wash|labas|ch7al|chhal|9adeh|9adach|qdash|qadech|lyoum|lyum|bghit|3and|3ndi|3andek|wrili|wrini|sahbi|khoya|raki|rakom|dirli|goli|golia|winah|inchallah|inshallah)\b/i;

type ReplyLang = "ar" | "fr" | "en";

const AMOUNT_KEYS = [
  "revenue",
  "profit",
  "netProfit",
  "amount",
  "paid",
  "givenAmount",
  "expensePaid",
  "salaryPaid",
  "serviceRevenue",
  "serviceProfit",
  "productProfit",
  "inventoryCost",
  "inventoryRetail",
  "clientsOweYou",
  "youOweClients",
  "zakatOnStock",
] as const;

const COUNT_KEYS = [
  "count",
  "matchCount",
  "soldCount",
  "totalQuantity",
  "inStockCount",
] as const;

const LABELS: Record<ReplyLang, Record<string, string>> = {
  en: {
    revenue: "Revenue",
    profit: "Profit",
    netProfit: "Net profit",
    amount: "Amount",
    paid: "Paid",
    givenAmount: "Paid",
    expensePaid: "Expenses",
    salaryPaid: "Salaries",
    serviceRevenue: "Service revenue",
    serviceProfit: "Service profit",
    productProfit: "Product profit",
    inventoryCost: "Inventory cost",
    inventoryRetail: "Inventory retail",
    clientsOweYou: "Clients owe you",
    youOweClients: "You hold (deposits)",
    zakatOnStock: "Zakat on stock",
    count: "Count",
    matchCount: "Matches",
    soldCount: "Sales",
    totalQuantity: "Quantity",
    inStockCount: "In stock",
    top: "Top",
  },
  fr: {
    revenue: "Recette",
    profit: "Profit",
    netProfit: "Profit net",
    amount: "Montant",
    paid: "Payé",
    givenAmount: "Payé",
    expensePaid: "Dépenses",
    salaryPaid: "Salaires",
    serviceRevenue: "Recette services",
    serviceProfit: "Profit services",
    productProfit: "Profit produits",
    inventoryCost: "Coût stock",
    inventoryRetail: "Valeur vente stock",
    clientsOweYou: "Les clients vous doivent",
    youOweClients: "Dépôts que vous détenez",
    zakatOnStock: "Zakat sur le stock",
    count: "Nombre",
    matchCount: "Correspondances",
    soldCount: "Ventes",
    totalQuantity: "Quantité",
    inStockCount: "En stock",
    top: "Premier",
  },
  ar: {
    revenue: "المداخيل",
    profit: "الربح",
    netProfit: "الربح الصافي",
    amount: "المبلغ",
    paid: "المدفوع",
    givenAmount: "المدفوع",
    expensePaid: "المصاريف",
    salaryPaid: "الرواتب",
    serviceRevenue: "مداخيل الخدمات",
    serviceProfit: "ربح الخدمات",
    productProfit: "ربح المنتجات",
    inventoryCost: "تكلفة المخزون",
    inventoryRetail: "قيمة البيع للمخزون",
    clientsOweYou: "الزبائن يدينوا لك",
    youOweClients: "الودائع عندك",
    zakatOnStock: "زكاة المخزون",
    count: "العدد",
    matchCount: "النتائج",
    soldCount: "المبيعات",
    totalQuantity: "الكمية",
    inStockCount: "في المخزون",
    top: "الأول",
  },
};

function detectLang(userMessage: string): ReplyLang {
  if (/[\u0600-\u06FF]/.test(userMessage) || LATIN_DARIJA.test(userMessage)) {
    return "ar";
  }
  if (
    /[àâäéèêëïîôùûüç]/i.test(userMessage) ||
    /\b(bonjour|salut|merci|combien|s'il|est-ce|aujourd|vente|ventes|client|clients)\b/i.test(
      userMessage
    )
  ) {
    return "fr";
  }
  return "en";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function formatAmount(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} DA`;
}

function failedMessage(lang: ReplyLang): string {
  if (lang === "ar") {
    return "جبت بيانات المحل، وما قدرتش نكتب الجواب صح. عاود حاول.";
  }
  if (lang === "fr") {
    return "J'ai récupéré les données du magasin, mais je n'ai pas pu formuler la réponse correctement. Réessayez.";
  }
  return "I retrieved the store data, but I couldn't generate the answer correctly. Please try again.";
}

export function formatToolFallback(
  data: unknown,
  userMessage = ""
): string {
  const lang = detectLang(userMessage);
  const record = asRecord(data);
  if (!record || record.error) {
    return failedMessage(lang);
  }

  const labels = LABELS[lang];
  const lines: string[] = [];
  const totals = asRecord(record.totals) ?? record;

  for (const key of AMOUNT_KEYS) {
    const value = asFiniteNumber(totals[key]);
    if (value == null) continue;
    lines.push(`${labels[key]}: ${formatAmount(value)}`);
  }
  for (const key of COUNT_KEYS) {
    const value = asFiniteNumber(totals[key]);
    if (value == null) continue;
    lines.push(`${labels[key]}: ${value}`);
  }

  const ranking = asRecord(record.ranking);
  const top = asRecord(record.top);
  const topName =
    top &&
    (typeof top.key === "string"
      ? top.key
      : typeof top.name === "string"
        ? top.name
        : typeof top.client === "string"
          ? top.client
          : typeof top.seller === "string"
            ? top.seller
            : null);
  if (topName && topName !== "no-client" && topName !== "unknown") {
    const rankBy =
      typeof ranking?.rankBy === "string" ? ranking.rankBy : "revenue";
    lines.push(`${labels.top} (${rankBy}): ${topName}`);
  }

  if (lines.length === 0) {
    return failedMessage(lang);
  }

  return lines.join("\n");
}
