import { ipcMain } from "electron";
import { buildSystemInstruction } from "../ai/systemInstructions";
import { AI_MODELS } from "../../lib/ai/aiModels";
import { executeToolCall, getToolsForAI } from "../ai/tools/toolExecutor";
import type { AIToolCall } from "../ai/tools/toolExecutor";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

let conversationHistory: ChatMessage[] = [];
let currentUserName: string | undefined;
let selectedModelId: string | undefined;

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
      // Convert input_schema properties to Gemini format (uppercase types)
      const geminiProperties: Record<string, any> = {};
      Object.entries(tool.input_schema).forEach(([key, prop]: [string, any]) => {
        geminiProperties[key] = {
          type: (prop.type || "string").toUpperCase(),
          description: prop.description || "",
        };
      });

      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "OBJECT",
          properties: geminiProperties,
          required: Object.keys(tool.input_schema), // All parameters are required
        },
      };
    }),
  };
}

// Handle Gemini tool calls
async function handleGeminiToolCalls(
  responseParts: any[],
  messages: ChatMessage[]
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

        console.log(`[AI] Tool result: ${JSON.stringify(toolResult)}`);

        // Add tool result to messages
        updatedMessages.push({
          role: "user",
          content: JSON.stringify({
            toolName,
            result: toolResult,
          }),
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
  let currentMessages = messages;
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
            parts: [{ text: buildSystemInstruction(userName) }],
          },
          contents: toGeminiContents(currentMessages),
          tools: [toGeminiTools()],
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
      currentMessages
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
  messages: ChatMessage[]
): Promise<{ hasToolCalls: boolean; finalText: string; updatedMessages: ChatMessage[] }> {
  if (!message.tool_calls || message.tool_calls.length === 0) {
    return {
      hasToolCalls: false,
      finalText: message.content ?? "",
      updatedMessages: messages,
    };
  }

  const updatedMessages = [...messages, { role: "assistant" as const, content: message.content ?? "" }];

  for (const toolCall of message.tool_calls) {
    const toolName = toolCall.function.name;
    const toolInput = JSON.parse(toolCall.function.arguments || "{}");

    console.log(`[AI] Tool call requested: ${toolName}`);

    try {
      const toolResult = await executeToolCall({
        toolName,
        input: toolInput,
      });

      console.log(`[AI] Tool result: ${JSON.stringify(toolResult)}`);

      updatedMessages.push({
        role: "user",
        content: JSON.stringify({
          toolName,
          result: toolResult,
        }),
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
  let currentMessages = messages;
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
            content: buildSystemInstruction(userName),
          },
          ...currentMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
        tools: toOpenAITools(),
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
    if (!message.tool_calls) {
      return message.content ?? "";
    }

    // Handle tool calls
    const { hasToolCalls, updatedMessages } = await handleOpenAIToolCalls(
      message,
      currentMessages
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
  let currentMessages = messages;
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
              content: buildSystemInstruction(userName),
            },
            ...currentMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
          tools: toOpenAITools(),
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
    if (!message.tool_calls) {
      return message.content ?? "";
    }

    // Handle tool calls
    const { hasToolCalls, updatedMessages } = await handleOpenAIToolCalls(
      message,
      currentMessages
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
  let currentMessages = messages;
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
              content: buildSystemInstruction(userName),
            },
            ...currentMessages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
          ],
          tools: toOpenAITools(),
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
    if (!message.tool_calls) {
      return message.content ?? "";
    }

    // Handle tool calls
    const { hasToolCalls, updatedMessages } = await handleOpenAIToolCalls(
      message,
      currentMessages
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
function isRetryableModelError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const status = (error as Error & { status?: number }).status;

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

async function callWithAutomaticModelSwitch(
  messages: ChatMessage[],
  userName?: string
) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  const mistralKey = process.env.MISTRAL_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  const models = selectedModelId
  ? AI_MODELS.filter((model) => model.id === selectedModelId)
  : AI_MODELS.slice().sort((a, b) => a.priority - b.priority);

  let lastError: unknown;

  for (const model of models) {
    try {
      console.log(
        `[AI] 🔵 TRYING MODEL: ${model.provider}/${model.id}`
      );

      let reply: string;

      if (model.provider === "google") {
        if (!geminiKey) {
          console.warn("[AI] GEMINI_API_KEY not configured. Skipping Gemini.");
          continue;
        }

        reply = await callGemini(
          model.id,
          messages,
          geminiKey,
          userName
        );
      } else if (model.provider === "mistral") {
        if (!mistralKey) {
          console.warn("[AI] MISTRAL_API_KEY not configured. Skipping Mistral.");
          continue;
        }
      
        reply = await callMistral(
          model.id,
          messages,
          mistralKey,
          userName
        );
      } else if (model.provider === "openrouter") {
        if (!openRouterKey) {
          console.warn(
            "[AI] OPENROUTER_API_KEY not configured. Skipping OpenRouter."
          );
          continue;
        }

        reply = await callOpenRouter(
          model.id,
          messages,
          openRouterKey,
          userName
        );
      } else if (model.provider === "groq") {
        if (!groqKey) {
          console.warn(
            "[AI] GROQ_API_KEY not configured. Skipping Groq."
          );
          continue;
        }
      
        reply = await callGroq(
          model.id,
          messages,
          groqKey,
          userName
        );
      } else {
        console.warn(`[AI] Unknown provider:`);
        continue;
      }

      console.log(
        `[AI] ${model.provider}/${model.id} succeeded`
      );

      return reply;
    } catch (error) {
      lastError = error;

      if (isRetryableModelError(error)) {
        console.warn(
          `[AI] ${model.provider}/${model.id} unavailable. Switching...`
        );

        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("No AI model available");
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
        conversationHistory.pop();
        throw error;
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