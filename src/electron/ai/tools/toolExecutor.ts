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
import { toLocalYmd } from "./parseLocalDateRange";
import { isClientStatus } from "./clientStatus";

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
  return param.required === true;
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

const REPORT_GROUPS: Record<string, string[]> = {
  sales: ["none", "day", "month", "year", "product", "client"],
  payments: ["none", "day", "month", "year", "client"],
  purchases: ["none", "day", "month", "year", "product", "seller"],
  stock: ["none"],
  services: ["none", "day", "month", "year", "product", "client", "seller"],
  bills: ["none", "day", "month", "year", "product", "client", "seller"],
  activity: ["none"],
};

function valueTypeOk(expected: string, value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (expected === "number" || expected === "integer") {
    return typeof value === "number" && Number.isFinite(value);
  }
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "array") return Array.isArray(value);
  if (expected === "object") {
    return typeof value === "object" && !Array.isArray(value);
  }
  return typeof value === "string";
}

export function validateAgainstSchema(
  toolName: string,
  input: Record<string, unknown> | undefined,
  inputSchema: Record<string, ToolParamSchema>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const raw = input ?? {};

  if (input != null && (typeof input !== "object" || Array.isArray(input))) {
    return { valid: false, errors: ["Tool input must be an object."] };
  }

  for (const [key, param] of Object.entries(inputSchema)) {
    const value = raw[key];
    if (isRequiredParam(param) && (value === undefined || value === null || value === "")) {
      errors.push(`Missing required input: ${key}`);
      continue;
    }
    if (value === undefined || value === null || value === "") continue;

    const expected = toJsonSchemaType(param.type);
    if (!valueTypeOk(expected, value)) {
      errors.push(`${key} must be a ${expected}.`);
      continue;
    }

    if (Array.isArray(param.enum) && param.enum.length > 0) {
      if (!param.enum.includes(String(value))) {
        errors.push(`${key} must be one of: ${param.enum.join(" | ")}`);
      }
    }
  }

  for (const key of Object.keys(raw)) {
    if (!(key in inputSchema)) {
      errors.push(`Unknown parameter: ${key}`);
    }
  }

  const start = raw.startDate;
  const end = raw.endDate;
  if (start != null && start !== "") {
    if (!toLocalYmd(start)) {
      errors.push("startDate must be YYYY-MM-DD.");
    }
  }
  if (end != null && end !== "") {
    if (!toLocalYmd(end)) {
      errors.push("endDate must be YYYY-MM-DD.");
    }
  }
  if (start && end) {
    const startYmd = toLocalYmd(start);
    const endYmd = toLocalYmd(end);
    if (startYmd && endYmd && startYmd > endYmd) {
      errors.push(`startDate (${startYmd}) is after endDate (${endYmd}).`);
    }
  }

  if (typeof raw.threshold === "number" && raw.threshold < 0) {
    errors.push("threshold must be >= 0.");
  }

  if (toolName === "report") {
    const entity = String(raw.entity ?? "").trim().toLowerCase();
    const groupBy =
      String(raw.groupBy ?? "none").trim().toLowerCase() || "none";
    const allowed = REPORT_GROUPS[entity];
    if (allowed && !allowed.includes(groupBy)) {
      errors.push(
        `groupBy=${groupBy} is not valid for ${entity}. Use ${allowed.join(" | ")}`
      );
    }
  }

  if (toolName === "find" && raw.status != null && raw.status !== "") {
    if (!isClientStatus(raw.status)) {
      errors.push("status must be all | owes_you | deposits.");
    } else if (String(raw.type ?? "").trim().toLowerCase() !== "client") {
      errors.push("status is only valid when type=client.");
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate tool call matches schema
 */
export function validateToolCall(toolCall: AIToolCall): {
  valid: boolean;
  errors: string[];
} {
  const tool = getToolByName(toolCall.toolName);

  if (!tool) {
    return {
      valid: false,
      errors: [`Unknown tool: ${toolCall.toolName}`],
    };
  }

  const input =
    toolCall.input &&
    typeof toolCall.input === "object" &&
    !Array.isArray(toolCall.input)
      ? (toolCall.input as Record<string, unknown>)
      : toolCall.input === undefined
        ? {}
        : undefined;

  return validateAgainstSchema(
    toolCall.toolName,
    input,
    tool.input_schema as Record<string, ToolParamSchema>
  );
}
