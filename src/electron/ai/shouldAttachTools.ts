type ChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: unknown;
};

const STORE_INTENT =
  /\b(sale|sales|sold|sell|revenue|profit|stock|inventory|product|products|barcode|client|clients|customer|customers|payment|payments|credit|credits|debt|debts|purchase|purchases|supplier|suppliers|seller|bill|bills|expense|appointment|service|services|invoice|overdue|unpaid|versement|versements|best[- ]?sell)\b|vente|ventes|vendu|chiffre|produit|produits|paiement|paiements|cr[eé]dit|dette|dettes|achat|achats|fournisseur|facture|factures|rendez-vous|impay|caisse|مبيعات|مخزون|منتج|منتجات|زبون|زبائن|عميل|فاتورة|مشتريات|سلعة|chhal|ch7al|3andna|3anna/i;

const CHITCHAT =
  /^(hi|hello|hey|yo|test|ok|okay|thanks|thank you|merci|salut|bonjour|bonsoir|salutations|coucou|wesh|labas|ça va|ca va|cv|سلام|مرحبا|أهلا|اهلا|صباح الخير|مساء الخير|واش راك|كي راك|شكرا)[\s!?.]*$/i;

function isToolResultContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;

  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed &&
      typeof parsed === "object" &&
      ("toolName" in parsed || "result" in parsed)
    );
  } catch {
    return false;
  }
}

function latestRealUserMessage(messages: ChatMessage[]) {
  return [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "user" &&
        !isToolResultContent(message.content ?? "")
    );
}

/**
 * Small models call tools unsolicited if the 55 store tools are always attached.
 * Only send tools when the user is actually asking about store records.
 */
export function shouldAttachTools(messages: ChatMessage[]): boolean {
  if (
    messages.some(
      (message) =>
        message.role === "tool" ||
        Boolean(message.tool_calls) ||
        isToolResultContent(message.content ?? "")
    )
  ) {
    return true;
  }

  const latest = latestRealUserMessage(messages);
  if (!latest) return false;

  const text = latest.content?.trim() ?? "";
  if (!text || CHITCHAT.test(text)) return false;

  if (STORE_INTENT.test(text)) return true;

  const earlierStoreQuestion = messages.some(
    (message) =>
      message.role === "user" &&
      message !== latest &&
      !isToolResultContent(message.content ?? "") &&
      STORE_INTENT.test(message.content ?? "")
  );

  return earlierStoreQuestion && text.length < 80;
}
