type ChatMessage = {
  role: string;
  content?: string | null;
  tool_calls?: unknown;
};

const CHITCHAT =
  /^(hi|hello|hey|yo|test|ok|okay|thanks|thank you|merci|salut|bonjour|bonsoir|salutations|coucou|wesh|labas|ça va|ca va|cv|سلام|مرحبا|أهلا|اهلا|صباح الخير|مساء الخير|واش راك|كي راك|شكرا)[\s!?.]*$/i;

const NO_STORE_TOOLS =
  /^(who are you|what can you do|what are you|comment tu t'appelles|qui es[- ]tu|واش نتا|من أنت)[\s!?.]*$/i;

function isToolResultContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return false;

  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed &&
      typeof parsed === "object" &&
      ("toolName" in parsed ||
        "result" in parsed ||
        "totals" in parsed ||
        "functionResponse" in parsed)
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
 * Attach store tools for any real store question.
 * Skip greetings and "who are you".
 */
export function shouldAttachTools(messages: ChatMessage[]): boolean {
  if (
    messages.some(
      (message) =>
        message.role === "tool" ||
        message.role === "model" ||
        Boolean(message.tool_calls) ||
        isToolResultContent(message.content ?? "")
    )
  ) {
    return true;
  }

  const latest = latestRealUserMessage(messages);
  if (!latest) return false;

  const text = latest.content?.trim() ?? "";
  if (!text || CHITCHAT.test(text) || NO_STORE_TOOLS.test(text)) {
    return false;
  }

  return true;
}
