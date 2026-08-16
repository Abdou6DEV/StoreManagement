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

  try {
    // Execute the tool function
    const result = (await tool.fn(input)) as AIToolResult;

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

/**
 * Get tools available to AI in format for function calling
 */
export function getToolsForAI() {
  return Object.values(AI_TOOLS_REGISTRY).map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: "object",
      properties: Object.entries(tool.input_schema).reduce(
        (acc, [key, value]: [string, any]) => {
          acc[key] = {
            type: typeof value.type === "string" ? value.type : "string",
            description: value.description || "",
          };
          return acc;
        },
        {} as Record<string, any>
      ),
      required: Object.keys(tool.input_schema),
    },
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

  // Check required inputs
  const requiredInputs = Object.keys(tool.input_schema);
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
