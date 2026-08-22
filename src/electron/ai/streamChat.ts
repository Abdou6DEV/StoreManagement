import {
  AiCancelledError,
  aiRequest,
  currentAbortSignal,
  isAiCancelled,
} from "./aiSession";

export function emitChatChunk(text: string) {
  if (!text || isAiCancelled()) return;
  aiRequest()?.chunkSink?.(text);
}

export function streamEventIsFinished(value: unknown): boolean {
  const record = value as {
    choices?: {
      finish_reason?: string | null;
      finishReason?: string | null;
      delta?: unknown;
    }[];
    candidates?: { finishReason?: string | null }[];
  };
  const choice = record.choices?.[0];
  const openAiReason = choice?.finish_reason ?? choice?.finishReason;
  // OpenAI-compatible streams send finish_reason only on the terminal chunk.
  if (typeof openAiReason === "string" && openAiReason.length > 0) return true;

  const geminiReason = record.candidates?.[0]?.finishReason;
  // Gemini uses STOP / MAX_TOKENS / etc. Ignore empty / unspecified.
  if (
    typeof geminiReason === "string" &&
    geminiReason.length > 0 &&
    geminiReason !== "FINISH_REASON_UNSPECIFIED" &&
    geminiReason !== "UNSPECIFIED"
  ) {
    return true;
  }
  return false;
}

export async function readSseJsonLines(
  response: Response,
  onJson: (value: unknown) => void
) {
  if (!response.body) {
    throw new Error("Model stream had no body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const signal = currentAbortSignal();
  let buffer = "";
  let stop = false;

  const abortRead = () => {
    stop = true;
    void reader.cancel();
  };
  if (signal?.aborted) {
    abortRead();
    throw new AiCancelledError();
  }
  signal?.addEventListener("abort", abortRead, { once: true });

  const consumeLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const data = trimmed.slice(5).trim();
    if (data === "[DONE]") {
      stop = true;
      return;
    }
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      onJson(parsed);
      if (streamEventIsFinished(parsed)) stop = true;
    } catch {
      // Partial JSON can appear at chunk boundaries; skip.
    }
  };

  try {
    while (!stop) {
      if (signal?.aborted) throw new AiCancelledError();
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        consumeLine(line);
        if (stop) break;
      }
    }

    if (signal?.aborted) throw new AiCancelledError();
    if (!stop && buffer.trim()) consumeLine(buffer);
  } catch (error) {
    if (signal?.aborted || isAiCancelled()) throw new AiCancelledError();
    throw error;
  } finally {
    signal?.removeEventListener("abort", abortRead);
    try {
      await reader.cancel();
    } catch {
      // Stream already closed.
    }
  }
}

export function isEventStream(response: Response) {
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("application/json") && !type.includes("event-stream")) {
    return false;
  }
  return true;
}
