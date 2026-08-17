/**
 * AI TOOL EXECUTOR
 * 
 * Safely executes read-only database tools for the AI assistant.
 * This layer validates tool calls and prevents unauthorized access.
 */

import {
  AI_TOOLS_REGISTRY,
  AIToolResult,
  getToolByName,
} from "./readOnlyTools";

export interface AIToolCall {
  toolName: string;
  input?: any;
}

export interface AIToolExecutionResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Execute a single tool call safely
 */
export async function executeToolCall(
  toolCall: AIToolCall
): Promise<AIToolExecutionResult> {
  const { toolName, input } = toolCall;

  // Debug: Log incoming tool call
  console.log(
    `[TOOL EXECUTOR] Executing tool: ${toolName}, input: ${JSON.stringify(input)}`
  );

  // Validate tool name exists in registry
  const tool = getToolByName(toolName);
  if (!tool) {
    return {
      toolName,
      success: false,
      error: `Unknown tool: ${toolName}. Use only registered read-only tools.`,
    };
  }

  const validation = validateToolCall({ toolName, input });
  if (!validation.valid) {
    return {
      toolName,
      success: false,
      error: validation.errors.join("; "),
    };
  }

  try {
    const result = (await tool.fn(input ?? {})) as AIToolResult;

    if (!result.success) {
      console.log(
        `[TOOL EXECUTOR] Tool ${toolName} failed: ${result.error}`
      );
      return {
        toolName,
        success: false,
        error: result.error || "Tool execution failed",
      };
    }

    console.log(`[TOOL EXECUTOR] Tool ${toolName} succeeded`);
    return {
      toolName,
      success: true,
      result: result.data,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`[TOOL EXECUTOR] Tool ${toolName} error: ${errorMsg}`);
    return {
      toolName,
      success: false,
      error: `Tool execution error: ${errorMsg}`,
    };
  }
}

/**
 * Execute multiple tool calls in sequence
 */
export async function executeToolCalls(
  toolCalls: AIToolCall[]
): Promise<AIToolExecutionResult[]> {
  const results: AIToolExecutionResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall);
    results.push(result);
  }

  return results;
}

const JSON_SCHEMA_TYPES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array",
  "null",
]);

type ToolParamSchema = {
  type?: unknown;
  description?: string;
  required?: boolean;
  enum?: string[];
};

/**
 * Groq and Mistral reject anything outside JSON Schema types.
 * Registry values like "string | Date" or "any" must be mapped first.
 */
function toJsonSchemaType(rawType: unknown): string {
  if (typeof rawType !== "string" || !rawType.trim()) {
    return "string";
  }

  const normalized = rawType.trim().toLowerCase();

  if (JSON_SCHEMA_TYPES.has(normalized)) {
    return normalized;
  }

  if (normalized.includes("date") || normalized.includes("string")) {
    return "string";
  }

  if (normalized.includes("number") || normalized.includes("int")) {
    return "number";
  }

  if (
    normalized === "any" ||
    normalized === "record" ||
    normalized === "json" ||
    normalized === "object"
  ) {
    return "object";
  }

  return "string";
}

function isRequiredParam(param: ToolParamSchema): boolean {
  return param.required !== false;
}

function buildJsonSchema(inputSchema: Record<string, ToolParamSchema>) {
  const properties: Record<
    string,
    { type: string; description: string; enum?: string[] }
  > = {};
  const required: string[] = [];

  for (const [key, param] of Object.entries(inputSchema)) {
    properties[key] = {
      type: toJsonSchemaType(param.type),
      description: param.description || "",
    };

    if (Array.isArray(param.enum) && param.enum.length > 0) {
      properties[key].enum = param.enum;
    }

    if (isRequiredParam(param)) {
      required.push(key);
    }
  }

  return {
    type: "object" as const,
    properties,
    required,
  };
}

/**
 * Get tools available to AI in format for function calling
 */
export function getToolsForAI() {
  return Object.values(AI_TOOLS_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: buildJsonSchema(tool.input_schema),
  }));
}

/**
 * Validate tool call matches schema
 */
export function validateToolCall(toolCall: AIToolCall): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const tool = getToolByName(toolCall.toolName);

  if (!tool) {
    errors.push(`Unknown tool: ${toolCall.toolName}`);
    return { valid: false, errors };
  }

  const requiredInputs = Object.entries(tool.input_schema)
    .filter(([, param]) => (param as ToolParamSchema).required !== false)
    .map(([key]) => key);

  for (const required of requiredInputs) {
    if (
      toolCall.input === undefined ||
      toolCall.input[required] === undefined
    ) {
      errors.push(`Missing required input: ${required}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
