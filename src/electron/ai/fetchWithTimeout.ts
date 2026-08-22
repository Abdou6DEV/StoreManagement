import {
  AiCancelledError,
  currentAbortSignal,
  isAiCancelled,
} from "./aiSession";

export const MODEL_FETCH_TIMEOUT_MS = 90_000;

export class AiRequestTimeoutError extends Error {
  readonly code = "AI_TIMEOUT" as const;

  constructor(timeoutMs: number) {
    super(`AI request timed out after ${timeoutMs}ms`);
    this.name = "AiRequestTimeoutError";
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = MODEL_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const external = init.signal ?? currentAbortSignal();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onExternalAbort = () => controller.abort();

  if (external?.aborted) {
    clearTimeout(timer);
    throw new AiCancelledError();
  }
  external?.addEventListener("abort", onExternalAbort, { once: true });

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (isAiCancelled() || external?.aborted) {
        throw new AiCancelledError();
      }
      throw new AiRequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    external?.removeEventListener("abort", onExternalAbort);
  }
}
