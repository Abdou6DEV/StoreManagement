import { app, ipcMain } from "electron";
import { buildSystemInstruction } from "../ai/systemInstructions";
import { shouldAttachTools } from "../ai/shouldAttachTools";
import { AI_MODELS } from "../../lib/ai/aiModels";
import { executeToolCall, getToolsForAI } from "../ai/tools/toolExecutor";
import {
  hasAnyAiStoreAccess,
  loadAiAccess,
  AI_ACCESS_NONE,
} from "../ai/aiAccess";
import {
  compactToolResult,
  getToolResultCharBudget,
} from "../ai/tools/compactToolResult";
import type { AiChatResponse } from "../../lib/ai/aiChatTypes";
import {
  AI_MESSAGE_TOO_LONG,
  MAX_AI_MESSAGE_CHARS,
} from "../../lib/ai/aiMessageLimits";
import { buildResultTable } from "../ai/buildResultTable";
import { shouldHideRankingTable } from "../ai/rankingIntent";
import {
  formatCorrectionHint,
  replyConflictsWithTotals,
} from "../ai/verifyReplyNumbers";
import {
  isFollowUp,
  mergeFollowUpInput,
  snapshotStoreQuery,
  unwrapFollowUpUserText,
  withFollowUpContext,
} from "../ai/storeQueryMemory";
import {
  isTranslatedScript,
  keepUserSpellingQ,
  latinNameFromUser,
} from "../ai/keepUserQuery";
import {
  abortSessionChat,
  AiCancelledError,
  beginSessionRequest,
  aiRequest,
  currentSession,
  dropSession,
  enqueueAiSession,
  getOrCreateSession,
  isAiCancelled,
  isAiCancelledError,
  resetSessionChat,
  runWithAiRequest,
  throwIfAiCancelled,
  type WorkStatus,
} from "../ai/aiSession";
import { formatToolFallback } from "../ai/formatToolFallback";
import {
  fetchWithTimeout,
  MODEL_FETCH_TIMEOUT_MS,
} from "../ai/fetchWithTimeout";
import { runAiConsumeInternal, runAiQuotaPeekInternal } from "./onlineHandlers";
import { AI_OFFLINE } from "../../lib/ai/aiMessageLimits";
import {
  applyAiQuotaFromConsume,
  getCachedAiQuota,
  setCachedAiQuota,
} from "../ai/aiQuotaBridge";
import { quotaFromConsumePayload } from "../../lib/ai/aiQuota";
import {
  emitChatChunk,
  isEventStream,
  readSseJsonLines,
} from "../ai/streamChat";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY_MESSAGES = 16;
const MAX_HISTORY_CHARS = 12_000;
const MAX_STORED_ASSISTANT_CHARS = 4_000;


function messageChars(messages: ChatMessage[]) {
  return messages.reduce((n, m) => n + m.content.length, 0);
}

function windowConversation(messages: ChatMessage[]): ChatMessage[] {
  const clipped = messages.map((m) =>
    m.role === "assistant" && m.content.length > MAX_STORED_ASSISTANT_CHARS
      ? { ...m, content: `${m.content.slice(0, MAX_STORED_ASSISTANT_CHARS)}\n…` }
      : m,
  );

  let windowed = clipped.slice(-MAX_HISTORY_MESSAGES);
  while (windowed.length > 1 && messageChars(windowed) > MAX_HISTORY_CHARS) {
    windowed = windowed.slice(1);
  }
  if (windowed[0]?.role === "assistant") {
    windowed = windowed.slice(1);
  }

  return windowed.length > 0 ? windowed : clipped.slice(-1);
}

type ModelTurn = {
  text: string;
  toolResults: unknown[];
};

type CallModelOptions = {
  disableTools?: boolean;
  /**
   * When false: no live UI chunks AND use non-streaming HTTP
   * (list writer / number rewrite — large payloads time out on SSE).
   */
  streamChunks?: boolean;
  /** Gemini Google Search grounding. Ignored when disableTools is true. */
  webSearch?: boolean;
};

const LIST_HANDOFF_MIN_ROWS = 8;

type OpenAIToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type OpenAIChatMessage =
  | ChatMessage
  | {
      role: "assistant";
      content: string | null;
      tool_calls: OpenAIToolCall[];
    }
  | {
      role: "tool";
      tool_call_id: string;
      content: string;
      name?: string;
    };

const skippedUntil = new Map<string, number>();
const watchedWebContents = new Set<number>();

function emitWorkStatus(status: WorkStatus) {
  if (isAiCancelled()) return;
  aiRequest()?.statusSink?.(status);
}

function emitWaitingOnModel(isFinalWrite = false) {
  emitWorkStatus({ phase: isFinalWrite ? "writing" : "thinking" });
}

function isModelSkipped(modelId: string) {
  const until = skippedUntil.get(modelId);
  if (until == null) return false;
  if (Date.now() >= until) {
    skippedUntil.delete(modelId);
    return false;
  }
  return true;
}

function isGoneStatus(status?: number) {
  return status === 404 || status === 410;
}

function shouldSkipModel(status?: number) {
  return status === 429 || isGoneStatus(status);
}

function skipModel(modelId: string, status?: number) {
  const ms = isGoneStatus(status) ? 24 * 60 * 60 * 1000 : 60 * 1000;
  skippedUntil.set(modelId, Date.now() + ms);
  console.log(
    `[AI] Skipping ${modelId} for ${Math.round(ms / 1000)}s (status ${status ?? "n/a"})`
  );
}

function modelTpm(modelId: string) {
  return AI_MODELS.find((model) => model.id === modelId)?.tpm ?? null;
}

function modelSupportsToolCalling(modelId: string) {
  return (
    AI_MODELS.find((model) => model.id === modelId)?.capabilities.toolCalling ??
    false
  );
}

function systemInstructionForModel(
  modelId: string,
  userName?: string,
  webSearch = false
) {
  const access = currentSession()?.access ?? null;
  return buildSystemInstruction(userName, {
    canUseStoreTools:
      modelSupportsToolCalling(modelId) && hasAnyAiStoreAccess(access),
    access,
    webSearch,
  });
}

function wantWebSearch(options?: CallModelOptions) {
  return options?.webSearch === true && options?.disableTools !== true;
}

function listedRowCount(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const record = data as Record<string, unknown>;
  let count = 0;

  const countList = (value: unknown) => {
    if (Array.isArray(value)) {
      count = Math.max(count, value.length);
      return;
    }
    if (!value || typeof value !== "object") return;
    const wrap = value as Record<string, unknown>;
    if (wrap.truncated === true && Array.isArray(wrap.items)) {
      const total =
        typeof wrap.total === "number" ? wrap.total : wrap.items.length;
      count = Math.max(count, total);
    }
  };

  for (const key of ["matches", "breakdown", "byCategory", "byType"]) {
    countList(record[key]);
  }
  for (const value of Object.values(record)) {
    countList(value);
  }
  return count;
}

function toolResultsNeedListWriter(results: unknown[]): boolean {
  return results.some((result) => listedRowCount(result) >= LIST_HANDOFF_MIN_ROWS);
}

function isListRequest(text: string): boolean {
  return (
    /\b(list|lists|listing|show( me)?( all)?|display|enumerate|names? of|which ones|what are they)\b/i.test(
      text
    ) ||
    /\b(liste|lister|affiche|afficher|montre|montrer|tous les|toutes les|lesquels|lesquelles)\b/i.test(
      text
    ) ||
    /(قائمة|عرض|ورّي|وريلي|وريني|ليستي|ليست|كاملهم|كلهم)/i.test(text)
  );
}

function isTotalsOnlyQuestion(text: string): boolean {
  if (isListRequest(text)) return false;
  return /\b(how many|how much|combien|total|revenue|profit|شحال|قداش|كم)\b/i.test(
    text
  );
}

function shouldHandoffList(
  userText: string,
  toolResults: unknown[],
  model: (typeof AI_MODELS)[number]
): boolean {
  if (model.capabilities.listWriter) return false;
  if (shouldHideRankingTable(userText)) return false;
  if (!toolResultsNeedListWriter(toolResults)) return false;
  if (isTotalsOnlyQuestion(userText)) return false;
  return true;
}

function openAIToolOptions(
  messages: OpenAIChatMessage[],
  modelId: string,
  options?: CallModelOptions
) {
  if (options?.disableTools) {
    return {};
  }
  if (!modelSupportsToolCalling(modelId)) {
    console.log(
      `[AI] Tools not attached: ${modelId} does not support tool calling`
    );
    return {};
  }

  if (!shouldAttachTools(messages)) {
    console.log("[AI] Tools not attached: message is not a store-data question");
    return {};
  }

  if (!hasAnyAiStoreAccess(currentSession()?.access)) {
    console.log("[AI] Tools not attached: user has no store page access");
    return {};
  }

  return {
    tools: toOpenAITools(),
    tool_choice: "auto" as const,
  };
}

function normalizeOpenAIToolCalls(toolCalls: any[]): OpenAIToolCall[] {
  return toolCalls.map((toolCall, index) => {
    const name = toolCall.function?.name ?? "unknown";
    const args = toolCall.function?.arguments;

    return {
      id: toolCall.id || `call_${index}_${name}`,
      type: "function",
      function: {
        name,
        arguments:
          typeof args === "string" ? args : JSON.stringify(args ?? {}),
      },
    };
  });
}

function looksLikeJsonSchema(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.type === "object" &&
    record.properties != null &&
    record.required != null
  );
}

function parseToolArguments(
  raw: string
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (looksLikeJsonSchema(parsed)) {
      return {
        ok: false,
        error: "Invalid tool arguments: received a schema instead of values.",
      };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Invalid tool arguments: expected an object." };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: "Invalid tool arguments JSON." };
  }
}

function toOpenAIApiMessages(messages: OpenAIChatMessage[]) {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool" as const,
        tool_call_id: message.tool_call_id,
        name: message.name,
        content: message.content,
      };
    }

    if (
      message.role === "assistant" &&
      "tool_calls" in message &&
      message.tool_calls
    ) {
      return {
        role: "assistant" as const,
        content: message.content,
        tool_calls: message.tool_calls,
      };
    }

    return {
      role: message.role,
      content: message.content ?? "",
    };
  });
}

type GeminiPart = {
  text?: string;
  thought?: boolean;
  thoughtSignature?: string;
  thought_signature?: string;
  functionCall?: {
    name: string;
    args?: Record<string, unknown>;
    thoughtSignature?: string;
    thought_signature?: string;
  };
  functionResponse?: { name: string; response: Record<string, unknown> };
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content ?? "" }],
  }));
}

function geminiInToolLoop(contents: GeminiContent[]) {
  return contents.some((content) =>
    content.parts.some(
      (part) => "functionCall" in part || "functionResponse" in part
    )
  );
}

function toGeminiTools() {
  const tools = getToolsForAI();
  return {
    functionDeclarations: tools.map((tool) => {
      const schema = tool.input_schema;
      const geminiProperties: Record<string, any> = {};

      Object.entries(schema.properties ?? {}).forEach(
        ([key, prop]: [string, any]) => {
          geminiProperties[key] = {
            type: (prop.type || "string").toUpperCase(),
            description: prop.description || "",
            ...(Array.isArray(prop.enum) ? { enum: prop.enum } : {}),
          };
        }
      );

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "OBJECT",
          properties: geminiProperties,
          required: schema.required ?? [],
        },
      };
    }),
  };
}

async function runOneTool(
  toolName: string,
  toolInput: unknown,
  maxResultChars: number
): Promise<{ name: string; response: Record<string, unknown> }> {
  throwIfAiCancelled();
  if (looksLikeJsonSchema(toolInput)) {
    return {
      name: toolName,
      response: {
        error: "Invalid tool arguments: received a schema instead of values.",
      },
    };
  }

  const rawInput =
    toolInput && typeof toolInput === "object" && !Array.isArray(toolInput)
      ? (toolInput as Record<string, unknown>)
      : {};
  const session = currentSession();
  const resolvedName = toolName;
  let input = session?.reuseLastQuery
    ? mergeFollowUpInput(toolName, rawInput, session.lastStoreQuery)
    : rawInput;

  if (typeof input.q === "string" && input.q.trim() && session) {
    const userText = [...session.conversationHistory]
      .reverse()
      .find((message) => message.role === "user")?.content;
    const latest = unwrapFollowUpUserText(userText ?? "");
    const fromUser = latinNameFromUser(latest);
    if (fromUser && !session.reuseLastQuery) session.lastLatinQ = fromUser;
    let kept = keepUserSpellingQ(input.q, latest);
    if (
      kept === input.q.trim() &&
      session.reuseLastQuery &&
      session.lastLatinQ &&
      isTranslatedScript(kept)
    ) {
      kept = session.lastLatinQ;
    }
    if (kept !== input.q.trim()) {
      console.log(`[AI] q kept user spelling: ${JSON.stringify(input.q)} → ${JSON.stringify(kept)}`);
      input = { ...input, q: kept };
    } else if (
      !session.reuseLastQuery &&
      /[a-zA-Z]{3,}/.test(kept) &&
      !/[\u0600-\u06FF]/.test(kept)
    ) {
      session.lastLatinQ = kept;
    }
  }

  console.log(`[AI] Tool call requested: ${resolvedName}`);
  emitWorkStatus({ phase: "tool", toolName: resolvedName });

  const toolResult = await executeToolCall({
    toolName: resolvedName,
    input,
  });

  const compacted = toolResult.success
    ? compactToolResult(toolResult.result, maxResultChars, resolvedName)
    : undefined;

  console.log(
    `[AI] Tool ${resolvedName} ${toolResult.success ? "succeeded" : "failed"}`
  );

  if (toolResult.success) {
    const response =
      compacted && typeof compacted === "object" && !Array.isArray(compacted)
        ? (compacted as Record<string, unknown>)
        : { result: compacted };
    if (session) {
      session.lastStoreQuery = snapshotStoreQuery(resolvedName, input, response);
    }
    return {
      name: toolName,
      response,
    };
  }

  return {
    name: toolName,
    response: { error: toolResult.error || "Tool execution failed" },
  };
}

async function handleGeminiToolCalls(
  candidateContent: GeminiContent | undefined,
  contents: GeminiContent[],
  maxResultChars: number
): Promise<{
  hasToolCalls: boolean;
  finalText: string;
  updatedContents: GeminiContent[];
  lastToolData: unknown;
  toolResults: unknown[];
}> {
  const responseParts = candidateContent?.parts ?? [];
  const functionCalls = responseParts.filter((part) => part.functionCall);
  const text = responseParts
    .filter((part) => part.text && !part.thought)
    .map((part) => part.text)
    .join("")
    .trim();

  if (functionCalls.length === 0) {
    return {
      hasToolCalls: false,
      finalText: text,
      updatedContents: contents,
      lastToolData: undefined,
      toolResults: [],
    };
  }

  const responsePartsOut: GeminiPart[] = [];
  const toolResults: unknown[] = [];
  let lastToolData: unknown;

  for (const part of functionCalls) {
    const toolName = part.functionCall?.name;
    if (!toolName) continue;
    const executed = await runOneTool(
      toolName,
      part.functionCall?.args || {},
      maxResultChars
    );
    lastToolData = executed.response;
    toolResults.push(executed.response);
    responsePartsOut.push({
      functionResponse: {
        name: executed.name,
        response: executed.response,
      },
    });
  }

  return {
    hasToolCalls: true,
    finalText: "",
    updatedContents: [
      ...contents,
      candidateContent as GeminiContent,
      { role: "user", parts: responsePartsOut },
    ],
    lastToolData,
    toolResults,
  };
}

async function streamGeminiCandidate(
  modelId: string,
  apiKey: string,
  currentContents: GeminiContent[],
  userName: string | undefined,
  attachTools: boolean,
  publishChunks: boolean,
  httpStream: boolean,
  webSearch: boolean
): Promise<GeminiContent | undefined> {
  const url = httpStream
    ? `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const tools: Record<string, unknown>[] = [];
  if (webSearch) tools.push({ googleSearch: {} });
  if (attachTools) tools.push(toGeminiTools());

  const response = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            { text: systemInstructionForModel(modelId, userName, webSearch) },
          ],
        },
        contents: currentContents,
        ...(tools.length > 0 ? { tools } : {}),
      }),
    },
    MODEL_FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(
      `Gemini API error (${response.status}): ${errorText}`
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const parts: GeminiPart[] = [];
  let text = "";
  let sawFunctionCall = false;

  const ingest = (data: unknown) => {
    const chunkParts =
      (data as { candidates?: { content?: GeminiContent }[] })
        .candidates?.[0]?.content?.parts ?? [];
    for (const part of chunkParts) {
      if (part.functionCall) {
        sawFunctionCall = true;
        parts.push(part);
      } else if (part.text && !part.thought) {
        text += part.text;
      } else if (part.thought || part.thoughtSignature || part.thought_signature) {
        parts.push(part);
      }
    }
    // Only stream visible answer text. Never stream tool-call turns —
    // those get replaced by a later write and look like a second reply.
    if (publishChunks && !sawFunctionCall && text) emitChatChunk(text);
  };

  if (httpStream && isEventStream(response)) {
    await readSseJsonLines(response, ingest);
  } else {
    ingest(await response.json());
  }

  const assembled: GeminiPart[] = [];
  if (text) assembled.push({ text });
  assembled.push(...parts);
  if (assembled.length === 0) return undefined;
  return { role: "model", parts: assembled };
}

async function callGemini(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  let currentContents = toGeminiContents(messages);
  let maxRetries = 6;
  let lastToolData: unknown;
  let usedTools = false;
  const toolResults: unknown[] = [];
  const maxResultChars = getToolResultCharBudget(modelTpm(modelId));
  const userText = unwrapFollowUpUserText(
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? ""
  );

  while (maxRetries > 0) {
    throwIfAiCancelled();
    emitWaitingOnModel(!!options?.disableTools);
    const attachTools =
      !options?.disableTools &&
      modelSupportsToolCalling(modelId) &&
      hasAnyAiStoreAccess(currentSession()?.access) &&
      (geminiInToolLoop(currentContents) || shouldAttachTools(messages));
    const webSearch = wantWebSearch(options);
    // Live UI chunks for normal replies. List writer / rewrite set streamChunks:false.
    // Do NOT gate on attachTools — store questions often answer in text without a
    // tool round, and that must still stream. Tool-call turns are filtered in ingest
    // via sawFunctionCall / toolAcc.
    const httpStream = options?.streamChunks !== false;
    const publishChunks =
      httpStream &&
      !options?.disableTools &&
      !(
        toolResults.length > 0 &&
        toolResultsNeedListWriter(toolResults) &&
        !isTotalsOnlyQuestion(userText)
      );

    if (webSearch || attachTools) {
      console.log(
        `[AI] Gemini tools: store=${attachTools} googleSearch=${webSearch}`
      );
    }

    const candidateContent = await streamGeminiCandidate(
      modelId,
      apiKey,
      currentContents,
      userName,
      attachTools,
      publishChunks,
      httpStream,
      webSearch
    );
    const {
      hasToolCalls,
      finalText,
      updatedContents,
      lastToolData: roundData,
      toolResults: roundResults,
    } = await handleGeminiToolCalls(
      candidateContent,
      currentContents,
      maxResultChars
    );

    if (hasToolCalls) {
      usedTools = true;
      lastToolData = roundData;
      toolResults.push(...roundResults);
      currentContents = updatedContents;
      maxRetries--;
      continue;
    }

    if (finalText) {
      return { text: finalText, toolResults };
    }

    if (usedTools && lastToolData) {
      currentContents = [
        ...currentContents,
        {
          role: "user",
          parts: [
            {
              text: "Answer the user using only the function results. Copy totals and breakdown. Do not invent numbers. If the user wrote Algerian Darija (including Latin/franco-arabe), reply in Algerian Darija using Arabic script only.",
            },
          ],
        },
      ];
      usedTools = false;
      maxRetries--;
      continue;
    }

    return { text: formatToolFallback(lastToolData, userText), toolResults };
  }

  return { text: formatToolFallback(lastToolData, userText), toolResults };
}

// Convert tools to OpenAI format (for Mistral, Groq, OpenRouter)
function toOpenAITools() {
  const tools = getToolsForAI();

  return tools.map((tool) => {
    const schema = tool.input_schema;

    return {
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties: schema.properties ?? {},
          required: schema.required ?? [],
        },
      },
    };
  });
}

// Handle OpenAI-style tool calls (Mistral, Groq, OpenRouter)
async function handleOpenAIToolCalls(
  message: any,
  messages: OpenAIChatMessage[],
  maxResultChars: number
): Promise<{
  hasToolCalls: boolean;
  finalText: string;
  updatedMessages: OpenAIChatMessage[];
  toolResults: unknown[];
}> {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return {
      hasToolCalls: false,
      finalText: message.content ?? "",
      updatedMessages: messages,
      toolResults: [],
    };
  }

  const toolCalls = normalizeOpenAIToolCalls(message.tool_calls);
  const updatedMessages: OpenAIChatMessage[] = [
    ...messages,
    {
      role: "assistant",
      content: message.content?.trim() ? message.content : null,
      tool_calls: toolCalls,
    },
  ];
  const toolResults: unknown[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    const parsed = parseToolArguments(toolCall.function.arguments);
    let executed: { name: string; response: Record<string, unknown> };
    if (parsed.ok === false) {
      executed = { name: toolName, response: { error: parsed.error } };
    } else {
      executed = await runOneTool(toolName, parsed.value, maxResultChars);
    }
    toolResults.push(executed.response);

    updatedMessages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      name: toolName,
      content: JSON.stringify(executed.response),
    });
  }

  return {
    hasToolCalls: true,
    finalText: "",
    updatedMessages,
    toolResults,
  };
}

type OpenAIStreamEndpoint = {
  url: string;
  errorName: string;
  headers: Record<string, string>;
  extraBody?: Record<string, unknown>;
  visibleText?: (raw: string) => string;
};

function applyOpenAIDelta(
  content: { value: string },
  toolAcc: Map<number, { id: string; name: string; arguments: string }>,
  delta: {
    content?: unknown;
    tool_calls?: Array<{
      index?: number;
      id?: string;
      function?: { name?: string; arguments?: string };
    }>;
  }
) {
  if (typeof delta.content === "string") {
    content.value += delta.content;
  }
  if (!Array.isArray(delta.tool_calls)) return;
  for (const toolCall of delta.tool_calls) {
    const index = typeof toolCall.index === "number" ? toolCall.index : 0;
    const current = toolAcc.get(index) ?? { id: "", name: "", arguments: "" };
    if (toolCall.id) current.id = toolCall.id;
    if (toolCall.function?.name) current.name += toolCall.function.name;
    if (toolCall.function?.arguments) {
      current.arguments += toolCall.function.arguments;
    }
    toolAcc.set(index, current);
  }
}

function openAIToolCallsFromAcc(
  toolAcc: Map<number, { id: string; name: string; arguments: string }>
): OpenAIToolCall[] {
  return [...toolAcc.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, toolCall], index) => ({
      id: toolCall.id || `call_${index}_${toolCall.name}`,
      type: "function" as const,
      function: {
        name: toolCall.name,
        arguments: toolCall.arguments,
      },
    }))
    .filter((toolCall) => toolCall.function.name);
}

async function streamOpenAIMessage(
  endpoint: OpenAIStreamEndpoint,
  modelId: string,
  currentMessages: OpenAIChatMessage[],
  userName: string | undefined,
  options?: CallModelOptions,
  publishChunks = false,
  httpStream = true
): Promise<{ content: string; tool_calls?: OpenAIToolCall[] }> {
  const visible = endpoint.visibleText ?? ((raw: string) => raw);
  const response = await fetchWithTimeout(
    endpoint.url,
    {
      method: "POST",
      headers: endpoint.headers,
      body: JSON.stringify({
        model: modelId,
        stream: httpStream,
        messages: [
          {
            role: "system",
            content: systemInstructionForModel(modelId, userName),
          },
          ...toOpenAIApiMessages(currentMessages),
        ],
        ...endpoint.extraBody,
        ...openAIToolOptions(currentMessages, modelId, options),
      }),
    },
    MODEL_FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(
      `${endpoint.errorName} API error (${response.status}): ${errorText}`
    );
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const content = { value: "" };
  const toolAcc = new Map<
    number,
    { id: string; name: string; arguments: string }
  >();

  const emitIfText = () => {
    if (!publishChunks || toolAcc.size > 0) return;
    const text = visible(content.value);
    if (text) emitChatChunk(text);
  };

  if (httpStream && isEventStream(response)) {
    await readSseJsonLines(response, (value) => {
      const delta = (
        value as {
          choices?: { delta?: Parameters<typeof applyOpenAIDelta>[2] }[];
        }
      ).choices?.[0]?.delta;
      if (!delta) return;
      applyOpenAIDelta(content, toolAcc, delta);
      emitIfText();
    });
  } else {
    const data = await response.json();
    const message = data.choices?.[0]?.message as
      | { content?: unknown; tool_calls?: OpenAIToolCall[] }
      | undefined;
    if (message) {
      content.value =
        typeof message.content === "string"
          ? message.content
          : nvidiaMessageText(message);
      if (message.tool_calls?.length) {
        message.tool_calls.forEach((toolCall, index) => {
          toolAcc.set(index, {
            id: toolCall.id,
            name: toolCall.function.name,
            arguments: toolCall.function.arguments,
          });
        });
      }
      emitIfText();
    }
  }

  const tool_calls = openAIToolCallsFromAcc(toolAcc);
  return {
    content: visible(content.value),
    tool_calls: tool_calls.length > 0 ? tool_calls : undefined,
  };
}

async function callOpenAICompatible(
  endpoint: OpenAIStreamEndpoint,
  modelId: string,
  messages: ChatMessage[],
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  let currentMessages: OpenAIChatMessage[] = messages;
  let maxRetries = 5;
  const toolResults: unknown[] = [];
  const userText = unwrapFollowUpUserText(
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? ""
  );

  while (maxRetries > 0) {
    throwIfAiCancelled();
    emitWaitingOnModel(!!options?.disableTools);
    const httpStream = options?.streamChunks !== false;
    // Same as Gemini: stream text whenever allowed; tool deltas skip emit via toolAcc.
    const publishChunks =
      httpStream &&
      !options?.disableTools &&
      !(
        toolResults.length > 0 &&
        toolResultsNeedListWriter(toolResults) &&
        !isTotalsOnlyQuestion(userText)
      );

    const message = await streamOpenAIMessage(
      endpoint,
      modelId,
      currentMessages,
      userName,
      options,
      publishChunks,
      httpStream
    );

    if (!message.tool_calls?.length) {
      return { text: message.content, toolResults };
    }

    const { hasToolCalls, updatedMessages, toolResults: roundResults } =
      await handleOpenAIToolCalls(
        {
          content: message.content,
          tool_calls: message.tool_calls,
        },
        currentMessages,
        getToolResultCharBudget(modelTpm(modelId))
      );

    if (!hasToolCalls) {
      return { text: message.content, toolResults };
    }

    toolResults.push(...roundResults);
    currentMessages = updatedMessages;
    maxRetries--;
  }

  return { text: "", toolResults };
}

async function callOpenRouter(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  return callOpenAICompatible(
    {
      url: "https://openrouter.ai/api/v1/chat/completions",
      errorName: "OpenRouter",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://redatechpos.com",
        "X-Title": "REDA AI",
      },
    },
    modelId,
    messages,
    userName,
    options
  );
}

async function callMistral(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  return callOpenAICompatible(
    {
      url: "https://api.mistral.ai/v1/chat/completions",
      errorName: "Mistral",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    },
    modelId,
    messages,
    userName,
    options
  );
}

async function callGroq(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  return callOpenAICompatible(
    {
      url: "https://api.groq.com/openai/v1/chat/completions",
      errorName: "Groq",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
    },
    modelId,
    messages,
    userName,
    options
  );
}

function nvidiaMessageText(message: {
  content?: unknown;
}): string {
  const raw = message.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw
      .map((part) => {
        if (typeof part === "string") return part;
        if (
          part &&
          typeof part === "object" &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }
        return "";
      })
      .join("");
  }
  return "";
}

function nvidiaVisibleText(raw: string) {
  return raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/i, "")
    .trim();
}

async function callNvidia(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  return callOpenAICompatible(
    {
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      errorName: "NVIDIA",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      extraBody: { max_tokens: 4096 },
      visibleText: nvidiaVisibleText,
    },
    modelId,
    messages,
    userName,
    options
  );
}

const LATIN_DARIJA =
  /\b(wesh|wach|wash|labas|ch7al|chhal|9adeh|9adach|qdash|qadech|lyoum|lyum|bghit|3and|3ndi|3andek|wrili|wrini|sahbi|khoya|raki|rakom|dirli|goli|golia|winah|inchallah|inshallah)\b/i;

function unavailableReply(userMessage: string): string {
  if (/[\u0600-\u06FF]/.test(userMessage) || LATIN_DARIJA.test(userMessage)) {
    return "ما قدرتش نكمّل الطلب دوكا. عاود حاول من بعد.";
  }

  if (
    /[àâäéèêëïîôùûüç]/i.test(userMessage) ||
    /\b(bonjour|salut|merci|combien|s'il|est-ce|aujourd|vente|ventes|client|clients)\b/i.test(
      userMessage
    )
  ) {
    return "Je ne peux pas traiter cette demande pour le moment. Réessayez plus tard.";
  }

  return "I can't complete this request right now. Please try again later.";
}

function modelsToTry(messages: ChatMessage[]) {
  const needsStoreTools = shouldAttachTools(messages);
  const byPriority = AI_MODELS.slice().sort((a, b) => a.priority - b.priority);
  const eligible = needsStoreTools
    ? byPriority.filter((model) => model.capabilities.toolCalling)
    : byPriority;
  let available = eligible.filter((model) => !isModelSkipped(model.id));
  const selectedModelId = currentSession()?.selectedModelId;
  const webSearch = currentSession()?.webSearchEnabled === true;

  if (webSearch) {
    const google = available.filter((model) => model.provider === "google");
    const rest = available.filter((model) => model.provider !== "google");
    const googleStrong = google.filter((model) => !model.id.includes("lite"));
    const googleLite = google.filter((model) => model.id.includes("lite"));
    available = [...googleStrong, ...googleLite, ...rest];
  }

  if (!selectedModelId) {
    return available;
  }

  const selected = available.find((model) => model.id === selectedModelId);
  const rest = available.filter((model) => model.id !== selectedModelId);

  return selected ? [selected, ...rest] : rest;
}

async function callModel(
  model: (typeof AI_MODELS)[number],
  messages: ChatMessage[],
  userName?: string,
  options?: CallModelOptions
): Promise<ModelTurn> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (model.provider === "google") {
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return callGemini(model.id, messages, geminiKey, userName, options);
  }

  if (model.provider === "mistral") {
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }
    return callMistral(model.id, messages, mistralKey, userName, options);
  }

  if (model.provider === "openrouter") {
    if (!openRouterKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    return callOpenRouter(model.id, messages, openRouterKey, userName, options);
  }

  if (model.provider === "groq") {
    if (!groqKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    return callGroq(model.id, messages, groqKey, userName, options);
  }

  if (model.provider === "nvidia") {
    if (!nvidiaKey) {
      throw new Error("NVIDIA_API_KEY is not configured");
    }
    return callNvidia(model.id, messages, nvidiaKey, userName, options);
  }

  throw new Error("Unknown AI provider");
}

async function writeListWithStrongerModel(
  userQuestion: string,
  toolResults: unknown[],
  skipModelId: string,
  userName?: string
): Promise<string | null> {
  const writers = AI_MODELS.filter(
    (model) =>
      model.capabilities.listWriter &&
      model.id !== skipModelId &&
      !isModelSkipped(model.id)
  ).sort((a, b) => a.priority - b.priority);

  const messages: ChatMessage[] = [
    { role: "user", content: userQuestion },
    {
      role: "user",
      content:
        "STORE_DATA below is already computed from the database. Amounts are DA. Write the user's answer as a clear list from STORE_DATA. Copy totals exactly. Do not invent or omit named rows that are present. At most 150 items. If truncated is true, say returnedCount of totalCount. Same language as the user. If they wrote Algerian Darija (Latin or Arabic script), write in Algerian Darija using Arabic script only — never Latin/franco-arabe, never فصحى.\n\n" +
        JSON.stringify(toolResults),
    },
  ];

  for (const model of writers) {
    try {
      throwIfAiCancelled();
      console.log(`[AI] List writer trying ${model.provider}/${model.id}`);
      const turn = await callModel(model, messages, userName, {
        disableTools: true,
        streamChunks: false,
      });
      if (turn.text?.trim()) {
        console.log(`[AI] List writer ${model.id} succeeded`);
        return turn.text;
      }
    } catch (error) {
      if (isAiCancelledError(error)) throw error;
      const status = (error as Error & { status?: number }).status;
      if (shouldSkipModel(status)) {
        skipModel(model.id, status);
      }
      console.warn(
        `[AI] List writer ${model.id} failed`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return null;
}

async function rewriteWrongNumbers(
  userText: string,
  draft: string,
  toolResults: unknown[],
  userName?: string
): Promise<string> {
  if (!replyConflictsWithTotals(draft, toolResults)) return draft;

  console.log("[AI] Reply numbers conflict with tool totals; rewriting once");
  const models = AI_MODELS.filter(
    (model) => !isModelSkipped(model.id)
  ).sort((a, b) => a.priority - b.priority);

  const messages: ChatMessage[] = [
    { role: "user", content: userText },
    { role: "user", content: formatCorrectionHint(toolResults) },
  ];

  for (const model of models) {
    try {
      throwIfAiCancelled();
      const turn = await callModel(model, messages, userName, {
        disableTools: true,
        streamChunks: false,
      });
      if (turn.text?.trim() && !replyConflictsWithTotals(turn.text, toolResults)) {
        console.log(`[AI] Number rewrite succeeded with ${model.id}`);
        return turn.text;
      }
    } catch (error) {
      if (isAiCancelledError(error)) throw error;
      const status = (error as Error & { status?: number }).status;
      if (shouldSkipModel(status)) {
        skipModel(model.id, status);
      }
      console.warn(
        `[AI] Number rewrite ${model.id} failed`,
        error instanceof Error ? error.message : error
      );
    }
  }

  return draft;
}

async function callWithAutomaticModelSwitch(
  messages: ChatMessage[],
  userName?: string
): Promise<{ text: string; toolResults: unknown[] }> {
  const models = modelsToTry(messages);
  const latestUserText = unwrapFollowUpUserText(
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? ""
  );

  for (const model of models) {
    try {
      throwIfAiCancelled();
      console.log(`[AI] TRYING MODEL: ${model.provider}/${model.id}`);

      const turn = await callModel(model, messages, userName, {
        webSearch: currentSession()?.webSearchEnabled === true,
      });

      if (!turn.text?.trim()) {
        console.warn(
          `[AI] ${model.provider}/${model.id} returned an empty reply. Switching...`
        );
        continue;
      }

      const table = buildResultTable(turn.toolResults, latestUserText);
      if (
        !table &&
        shouldHandoffList(latestUserText, turn.toolResults, model)
      ) {
        const rows = turn.toolResults.reduce(
          (max: number, result) => Math.max(max, listedRowCount(result)),
          0
        );
        console.log(
          `[AI] List handoff from ${model.id} (${rows} rows) to a stronger writer`
        );
        const written = await writeListWithStrongerModel(
          latestUserText,
          turn.toolResults,
          model.id,
          userName
        );
        if (written?.trim()) {
          return { text: written, toolResults: turn.toolResults };
        }
        console.warn(
          `[AI] List handoff failed; using ${model.id} reply`
        );
      }

      console.log(`[AI] ${model.provider}/${model.id} succeeded`);
      return { text: turn.text, toolResults: turn.toolResults };
    } catch (error) {
      if (isAiCancelledError(error)) throw error;
      const status = (error as Error & { status?: number }).status;
      if (shouldSkipModel(status)) {
        skipModel(model.id, status);
      }
      console.warn(
        `[AI] ${model.provider}/${model.id} failed. Switching...`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.error("[AI] All models failed");
  const fallback = unavailableReply(latestUserText);
  emitChatChunk(fallback);
  return { text: fallback, toolResults: [] };
}

import { registerAiScanReceiptHandler } from "./aiScanReceiptHandlers";

export function setupAIHandlers() {
  registerAiScanReceiptHandler();

  ipcMain.handle("ai:list-mistral-models", async () => {
    const apiKey = process.env.MISTRAL_API_KEY;
  
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }
  
    const response = await fetch(
      "https://api.mistral.ai/v1/models",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
  
    if (!response.ok) {
      throw new Error(await response.text());
    }
  
    return await response.json();
  });

  ipcMain.handle("ai:get-available-models", async () => {
    return AI_MODELS.map((model) => ({
      id: model.id,
      provider: model.provider,
      capabilities: model.capabilities,
      priority: model.priority,
    }));
  });
  
  ipcMain.handle("ai:set-model", async (event, modelId: string | null) => {
    if (app.isPackaged || process.env.NODE_ENV === "production") {
      throw new Error("Model selection is only available in developer mode");
    }

    const session = getOrCreateSession(event.sender.id);
    if (modelId === null) {
      session.selectedModelId = undefined;
      console.log("[AI] Model selection: automatic");
      return { success: true, model: "automatic" };
    }

    const model = AI_MODELS.find((entry) => entry.id === modelId);

    if (!model) {
      throw new Error(`Unknown AI model: ${modelId}`);
    }

    session.selectedModelId = modelId;
    console.log(`[AI] Model selection: ${model.provider}/${model.id}`);

    return {
      success: true,
      model: model.id,
      provider: model.provider,
    };
  });

  ipcMain.handle("ai:set-web-search", async (event, enabled: unknown) => {
    const session = getOrCreateSession(event.sender.id);
    session.webSearchEnabled = enabled === true;
    console.log(`[AI] Web search: ${session.webSearchEnabled ? "on" : "off"}`);
    return { success: true, webSearch: session.webSearchEnabled };
  });

  ipcMain.handle(
    "ai:chat",
    async (event, message: string, userName?: string) => {
      if (!message || typeof message !== "string") {
        throw new Error("Invalid message");
      }
      if (message.length > MAX_AI_MESSAGE_CHARS) {
        throw new Error(AI_MESSAGE_TOO_LONG);
      }

      const session = getOrCreateSession(event.sender.id);
      const sender = event.sender;

      return enqueueAiSession(session.webContentsId, async () => {
      const entitlement = await runAiConsumeInternal();
      if (!entitlement.success) {
        if (
          entitlement.entitlementError === "rate_limit_minute" ||
          entitlement.entitlementError === "rate_limit_day"
        ) {
          const peek = await runAiQuotaPeekInternal();
          if (peek.success) {
            applyAiQuotaFromConsume(sender, peek);
          }
        }
        if (
          entitlement.code === "network" ||
          entitlement.code === "missing_env"
        ) {
          throw new Error(AI_OFFLINE);
        }
        if (entitlement.entitlementError) {
          throw new Error(entitlement.entitlementError);
        }
        throw new Error(entitlement.error || "ai_consume_failed");
      }

      applyAiQuotaFromConsume(sender, entitlement);

      const previousQuery = session.lastStoreQuery;
      const previousLatin = session.lastLatinQ;
      beginSessionRequest(session);

      const followUp = isFollowUp(message);

      if (typeof userName === "string" && userName.trim()) {
        session.currentUserName = userName.trim();
      }

      if (session.currentUserId) {
        session.access = await loadAiAccess(session.currentUserId);
        if (session.access.username) {
          session.currentUserName = session.access.username;
        }
      } else {
        session.access = AI_ACCESS_NONE;
      }
      console.log(
        `[AI] Store access user=${session.access.username || "none"} admin=${session.access.isAdmin} id=${session.currentUserId || "none"}`
      );

      session.conversationHistory.push({
        role: "user",
        content: message,
      });
      session.conversationHistory = windowConversation(session.conversationHistory);
      if (!followUp) {
        session.lastStoreQuery = null;
        session.lastLatinQ = null;
      }
      session.reuseLastQuery = Boolean(session.lastStoreQuery && followUp);

      const statusSink = (status: WorkStatus) => {
        if (!sender.isDestroyed()) sender.send("ai:status", status);
      };
      const chunkSink = (text: string) => {
        if (!sender.isDestroyed()) sender.send("ai:chat-chunk", text);
      };

      if (!watchedWebContents.has(sender.id)) {
        watchedWebContents.add(sender.id);
        sender.once("destroyed", () => {
          dropSession(sender.id);
          watchedWebContents.delete(sender.id);
        });
      }

      const undoCancelledTurn = () => {
        const last = session.conversationHistory.at(-1);
        if (last?.role === "user" && last.content === message) {
          session.conversationHistory.pop();
        }
        session.lastStoreQuery = previousQuery;
        session.lastLatinQ = previousLatin;
      };

      return runWithAiRequest({ session, statusSink, chunkSink }, async () => {
        emitWorkStatus({ phase: "thinking" });

        try {
          throwIfAiCancelled();
          const modelMessages = withFollowUpContext(
            session.conversationHistory,
            session.lastStoreQuery,
            message
          );
          const outcome = await callWithAutomaticModelSwitch(
            modelMessages,
            session.currentUserName
          );
          throwIfAiCancelled();
          const assistantReply = await rewriteWrongNumbers(
            message,
            outcome.text,
            outcome.toolResults,
            session.currentUserName
          );
          throwIfAiCancelled();

          session.conversationHistory.push({
            role: "assistant",
            content: assistantReply,
          });
          session.conversationHistory = windowConversation(
            session.conversationHistory
          );

          const response: AiChatResponse = {
            text: assistantReply,
            table: buildResultTable(outcome.toolResults, message) ?? undefined,
          };
          return response;
        } catch (error) {
          if (isAiCancelledError(error) || isAiCancelled()) {
            undoCancelledTurn();
            console.log("[AI] Chat cancelled");
            throw isAiCancelledError(error) ? error : new AiCancelledError();
          }
          console.error("[AI] Chat failed after all models:", error);
          const fallback = unavailableReply(message);
          emitChatChunk(fallback);
          session.conversationHistory.push({
            role: "assistant",
            content: fallback,
          });
          session.conversationHistory = windowConversation(
            session.conversationHistory
          );
          return { text: fallback } satisfies AiChatResponse;
        } finally {
          session.reuseLastQuery = false;
          session.abortController = null;
        }
      });
      });
    }
  );

  ipcMain.handle("ai:clear", async (event) => {
    resetSessionChat(event.sender.id);
  });

  ipcMain.handle("ai:getQuota", async () => getCachedAiQuota());

  ipcMain.handle("ai:refreshQuota", async (event) => {
    const peek = await runAiQuotaPeekInternal();
    if (!peek.success) return getCachedAiQuota();
    const snapshot = quotaFromConsumePayload({
      remainingMinute: peek.remainingMinute,
      remainingDay: peek.remainingDay,
      limits: peek.limits,
    });
    return setCachedAiQuota(event.sender, snapshot);
  });

  ipcMain.handle("ai:cancel", async (event) => {
    abortSessionChat(event.sender.id);
  });

  ipcMain.handle("ai:list-models", async () => {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return await response.json();
  });
}
