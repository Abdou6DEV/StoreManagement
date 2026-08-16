import { ipcMain } from "electron";
import { buildSystemInstruction } from "../ai/systemInstructions";
import { shouldAttachTools } from "../ai/shouldAttachTools";
import { AI_MODELS } from "../../lib/ai/aiModels";
import { executeToolCall, getToolsForAI } from "../ai/tools/toolExecutor";
import {
  compactToolResult,
  getToolResultCharBudget,
} from "../ai/tools/compactToolResult";
import type { AIToolCall } from "../ai/tools/toolExecutor";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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

let conversationHistory: ChatMessage[] = [];
let currentUserName: string | undefined;
let selectedModelId: string | undefined;

function modelTpm(modelId: string) {
  return AI_MODELS.find((model) => model.id === modelId)?.tpm ?? null;
}

function modelSupportsToolCalling(modelId: string) {
  return (
    AI_MODELS.find((model) => model.id === modelId)?.capabilities.toolCalling ??
    false
  );
}

function systemInstructionForModel(modelId: string, userName?: string) {
  return buildSystemInstruction(userName, {
    canUseStoreTools: modelSupportsToolCalling(modelId),
  });
}

function openAIToolOptions(messages: OpenAIChatMessage[], modelId: string) {
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

function parseToolArguments(raw: string) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
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

function toGeminiContents(messages: ChatMessage[]) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

// Convert tools to Gemini format
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

// Handle Gemini tool calls
async function handleGeminiToolCalls(
  responseParts: any[],
  messages: ChatMessage[],
  maxResultChars: number
): Promise<{ hasToolCalls: boolean; finalText: string; updatedMessages: ChatMessage[] }> {
  let hasToolCalls = false;
  const assistantMessage = { role: "assistant" as const, content: "" };
  const updatedMessages = [...messages, assistantMessage];

  for (const part of responseParts) {
    if (part.functionCall) {
      hasToolCalls = true;
      const toolName = part.functionCall.name;
      let toolInput = part.functionCall.args || {};

      // Gemini sometimes sends the entire schema object instead of just parameters
      // If the args has "properties" and "required" and "type", extract just "properties"
      if (toolInput.properties && toolInput.required && toolInput.type === "object") {
        console.log(
          `[AI] Extracting properties from Gemini schema object`
        );
        toolInput = toolInput.properties;
      }

      console.log(`[AI] Tool call requested: ${toolName}`);

      try {
        const toolResult = await executeToolCall({
          toolName,
          input: toolInput,
        });

        const compacted = toolResult.success
          ? compactToolResult(toolResult.result, maxResultChars)
          : undefined;

        console.log(
          `[AI] Tool ${toolName} ${toolResult.success ? "succeeded" : "failed"}`
        );

        updatedMessages.push({
          role: "user",
          content: JSON.stringify(
            toolResult.success
              ? { toolName, result: compacted }
              : { toolName, error: toolResult.error }
          ),
        });
      } catch (error) {
        console.error(`[AI] Tool execution error: ${error}`);
        updatedMessages.push({
          role: "user",
          content: JSON.stringify({
            toolName,
            error: String(error),
          }),
        });
      }
    } else if (part.text) {
      assistantMessage.content = part.text;
    }
  }

  return {
    hasToolCalls,
    finalText: assistantMessage.content,
    updatedMessages,
  };
}

async function callGemini(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string
) {
  let currentMessages: ChatMessage[] = messages;
  let maxRetries = 5;

  while (maxRetries > 0) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstructionForModel(modelId, userName) }],
          },
          contents: toGeminiContents(currentMessages),
          ...(modelSupportsToolCalling(modelId) &&
          shouldAttachTools(currentMessages)
            ? { tools: [toGeminiTools()] }
            : {}),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      const error = new Error(
        `Gemini API error (${response.status}): ${errorText}`
      );

      // Mark quota errors so the router can switch models.
      (error as Error & { status?: number }).status = response.status;

      throw error;
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    // Check if there are any text parts
    const textPart = parts.find((p: any) => p.text);
    if (textPart) {
      return textPart.text;
    }

    // Handle tool calls
    const { hasToolCalls, finalText, updatedMessages } = await handleGeminiToolCalls(
      parts,
      currentMessages,
      getToolResultCharBudget(modelTpm(modelId))
    );

    if (!hasToolCalls) {
      return finalText || "";
    }

    // Tool was called, continue with updated messages
    currentMessages = updatedMessages;
    maxRetries--;
  }

  return "";
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
}> {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return {
      hasToolCalls: false,
      finalText: message.content ?? "",
      updatedMessages: messages,
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

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    const toolInput = parseToolArguments(toolCall.function.arguments);

    console.log(`[AI] Tool call requested: ${toolName}`);

    try {
      const toolResult = await executeToolCall({
        toolName,
        input: toolInput,
      });

      const compacted = toolResult.success
        ? compactToolResult(toolResult.result, maxResultChars)
        : undefined;

      console.log(
        `[AI] Tool ${toolName} ${toolResult.success ? "succeeded" : "failed"}`
      );

      updatedMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolName,
        content: JSON.stringify(
          toolResult.success
            ? { toolName, result: compacted }
            : { toolName, error: toolResult.error }
        ),
      });
    } catch (error) {
      console.error(`[AI] Tool execution error: ${error}`);
      updatedMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        name: toolName,
        content: JSON.stringify({
          toolName,
          error: String(error),
        }),
      });
    }
  }

  return {
    hasToolCalls: true,
    finalText: "",
    updatedMessages,
  };
}

async function callOpenRouter(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string
) {
  let currentMessages: OpenAIChatMessage[] = messages;
  let maxRetries = 5;

  while (maxRetries > 0) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": "https://redatechpos.com",
        "X-Title": "REDA AI",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: "system",
            content: systemInstructionForModel(modelId, userName),
          },
          ...toOpenAIApiMessages(currentMessages),
        ],
        ...openAIToolOptions(currentMessages, modelId),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      const error = new Error(
        `OpenRouter API error (${response.status}): ${errorText}`
      );

      (error as Error & { status?: number }).status = response.status;

      throw error;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      return "";
    }

    // Check for regular text response
    if (!message.tool_calls?.length) {
      return message.content ?? "";
    }

    // Handle tool calls
    const { hasToolCalls, updatedMessages } = await handleOpenAIToolCalls(
      message,
      currentMessages,
      getToolResultCharBudget(modelTpm(modelId))
    );

    if (!hasToolCalls) {
      return message.content ?? "";
    }

    // Tool was called, continue with updated messages
    currentMessages = updatedMessages;
    maxRetries--;
  }

  return "";
}
async function callMistral(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string
) {
  let currentMessages: OpenAIChatMessage[] = messages;
  let maxRetries = 5;

  while (maxRetries > 0) {
    const response = await fetch(
      "https://api.mistral.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: "system",
              content: systemInstructionForModel(modelId, userName),
            },
            ...toOpenAIApiMessages(currentMessages),
          ],
          ...openAIToolOptions(currentMessages, modelId),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      const error = new Error(
        `Mistral API error (${response.status}): ${errorText}`
      );

      (error as Error & { status?: number }).status = response.status;

      throw error;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      return "";
    }

    // Check for regular text response
    if (!message.tool_calls?.length) {
      return message.content ?? "";
    }

    // Handle tool calls
    const { hasToolCalls, updatedMessages } = await handleOpenAIToolCalls(
      message,
      currentMessages,
      getToolResultCharBudget(modelTpm(modelId))
    );

    if (!hasToolCalls) {
      return message.content ?? "";
    }

    // Tool was called, continue with updated messages
    currentMessages = updatedMessages;
    maxRetries--;
  }

  return "";
}
async function callGroq(
  modelId: string,
  messages: ChatMessage[],
  apiKey: string,
  userName?: string
) {
  let currentMessages: OpenAIChatMessage[] = messages;
  let maxRetries = 5;

  while (maxRetries > 0) {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: "system",
              content: systemInstructionForModel(modelId, userName),
            },
            ...toOpenAIApiMessages(currentMessages),
          ],
          ...openAIToolOptions(currentMessages, modelId),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      const error = new Error(
        `Groq API error (${response.status}): ${errorText}`
      );

      (error as Error & { status?: number }).status = response.status;

      throw error;
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      return "";
    }

    // Check for regular text response
    if (!message.tool_calls?.length) {
      return message.content ?? "";
    }

    // Handle tool calls
    const { hasToolCalls, updatedMessages } = await handleOpenAIToolCalls(
      message,
      currentMessages,
      getToolResultCharBudget(modelTpm(modelId))
    );

    if (!hasToolCalls) {
      return message.content ?? "";
    }

    // Tool was called, continue with updated messages
    currentMessages = updatedMessages;
    maxRetries--;
  }

  return "";
}
function unavailableReply(userMessage: string): string {
  if (/[\u0600-\u06FF]/.test(userMessage)) {
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

  if (!selectedModelId) {
    return eligible;
  }

  const selected = eligible.find((model) => model.id === selectedModelId);
  const rest = eligible.filter((model) => model.id !== selectedModelId);

  return selected ? [selected, ...rest] : rest;
}

async function callModel(
  model: (typeof AI_MODELS)[number],
  messages: ChatMessage[],
  userName?: string
) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (model.provider === "google") {
    if (!geminiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }
    return callGemini(model.id, messages, geminiKey, userName);
  }

  if (model.provider === "mistral") {
    if (!mistralKey) {
      throw new Error("MISTRAL_API_KEY is not configured");
    }
    return callMistral(model.id, messages, mistralKey, userName);
  }

  if (model.provider === "openrouter") {
    if (!openRouterKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }
    return callOpenRouter(model.id, messages, openRouterKey, userName);
  }

  if (model.provider === "groq") {
    if (!groqKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    return callGroq(model.id, messages, groqKey, userName);
  }

  throw new Error(`Unknown provider: ${model.provider}`);
}

async function callWithAutomaticModelSwitch(
  messages: ChatMessage[],
  userName?: string
) {
  const models = modelsToTry(messages);
  const latestUserText =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "";

  for (const model of models) {
    try {
      console.log(`[AI] TRYING MODEL: ${model.provider}/${model.id}`);

      const reply = await callModel(model, messages, userName);

      if (!reply?.trim()) {
        console.warn(
          `[AI] ${model.provider}/${model.id} returned an empty reply. Switching...`
        );
        continue;
      }

      console.log(`[AI] ${model.provider}/${model.id} succeeded`);
      return reply;
    } catch (error) {
      console.warn(
        `[AI] ${model.provider}/${model.id} failed. Switching...`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.error("[AI] All models failed");
  return unavailableReply(latestUserText);
}

export function setupAIHandlers() {
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
  
  ipcMain.handle("ai:set-model", async (_event, modelId: string | null) => {
    if (modelId === null) {
      selectedModelId = undefined;
      console.log("[AI] Model selection: automatic");
      return { success: true, model: "automatic" };
    }
  
    const model = AI_MODELS.find((model) => model.id === modelId);
  
    if (!model) {
      throw new Error(`Unknown AI model: ${modelId}`);
    }
  
    selectedModelId = modelId;
  
    console.log(`[AI] Model selection: ${model.provider}/${model.id}`);
  
    return {
      success: true,
      model: model.id,
      provider: model.provider,
    };
  });
  ipcMain.handle(
    "ai:chat",
    async (_event, message: string, userName?: string) => {
      if (!message || typeof message !== "string") {
        throw new Error("Invalid message");
      }

      if (typeof userName === "string" && userName.trim()) {
        currentUserName = userName.trim();
      }

      conversationHistory.push({
        role: "user",
        content: message,
      });

      try {
        const assistantReply = await callWithAutomaticModelSwitch(
          conversationHistory,
          currentUserName
        );

        conversationHistory.push({
          role: "assistant",
          content: assistantReply,
        });

        return assistantReply;
      } catch (error) {
        console.error("[AI] Chat failed after all models:", error);
        const fallback = unavailableReply(message);
        conversationHistory.push({
          role: "assistant",
          content: fallback,
        });
        return fallback;
      }
    }
  );

  ipcMain.handle("ai:clear", async () => {
    conversationHistory = [];
    currentUserName = undefined;
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

  // ============================================================================
  // AI TOOLS - READ-ONLY DATABASE QUERIES
  // ============================================================================

  ipcMain.handle("ai:get-available-tools", async () => {
    return getToolsForAI();
  });

  ipcMain.handle("ai:execute-tool", async (_event, toolCall: AIToolCall) => {
    if (!toolCall || !toolCall.toolName) {
      throw new Error("Invalid tool call: missing toolName");
    }

    const result = await executeToolCall(toolCall);

    if (!result.success) {
      console.warn(`[AI] Tool execution failed: ${result.error}`);
    }

    return result;
  });
}