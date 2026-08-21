import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/authContext";
import { createContext, useContext } from "react";
import { formatStoreTableMarkdown } from "../../ai/formatStoreTable";
import type { TFunction } from "i18next";
import type { AiChatResponse } from "../../ai/aiChatTypes";

type AdapterEvent =
  | { type: "chunk"; text: string }
  | { type: "done"; payload: AiChatResponse | string }
  | { type: "error"; error: unknown };

function textContent(
  text: string,
  status: "running" | "complete" | "error" | "cancelled",
) {
  const partStatus =
    status === "running"
      ? ({ type: "running" } as const)
      : ({ type: "complete" } as const);

  return {
    content: [{ type: "text" as const, text, status: partStatus }],
    status:
      status === "running"
        ? { type: "running" as const }
        : status === "complete"
          ? { type: "complete" as const, reason: "stop" as const }
          : {
              type: "incomplete" as const,
              reason:
                status === "cancelled"
                  ? ("cancelled" as const)
                  : ("error" as const),
            },
  };
}

function formatPayload(
  payload: AiChatResponse | string,
  fallbackText: string,
  t: TFunction,
) {
  const data =
    typeof payload === "string"
      ? { text: payload }
      : (payload ?? { text: fallbackText });
  const tableMarkdown = data.table
    ? formatStoreTableMarkdown(data.table, t)
    : "";
  const body = data.text || fallbackText;
  return tableMarkdown ? `${body}\n\n${tableMarkdown}` : body;
}

function paintFrame() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 16);
    }
  });
}

const AIAdapter = (
  userName: string | undefined,
  unavailableMessage: string,
  noMessage: string,
  t: TFunction
): ChatModelAdapter => ({
  async *run({ messages, abortSignal }) {
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      yield textContent(noMessage, "complete");
      return;
    }

    const text = latestUserMessage.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    if (!text.trim()) {
      yield textContent(noMessage, "complete");
      return;
    }

    const queue: AdapterEvent[] = [];
    let wake: (() => void) | null = null;
    let finished = false;

    const push = (event: AdapterEvent) => {
      if (finished) return;
      queue.push(event);
      wake?.();
    };

    const stopChunk = window.api.ai.onChunk?.((chunk) => {
      push({ type: "chunk", text: chunk });
    });

    const onAbort = () => wake?.();
    abortSignal.addEventListener("abort", onAbort);

    window.api.ai.chat(text, userName).then(
      (payload) => push({ type: "done", payload }),
      (error) => push({ type: "error", error }),
    );

    let latestText = "";

    try {
      while (!finished) {
        if (queue.length === 0) {
          if (abortSignal.aborted) {
            finished = true;
            yield textContent(latestText, "cancelled");
            return;
          }
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          wake = null;
          continue;
        }

        const event = queue.shift()!;

        if (event.type === "chunk") {
          if (event.text && event.text !== latestText) {
            latestText = event.text;
            yield textContent(latestText, "running");
            // Let React paint before draining the next IPC event / done.
            await paintFrame();
          }
          continue;
        }

        finished = true;

        if (event.type === "error") {
          console.error("AI chat error:", event.error);
          yield textContent(unavailableMessage, "error");
          return;
        }

        while (queue.length > 0) queue.shift();

        const finalText = formatPayload(event.payload, latestText, t);
        // One last running frame if the final payload grew (e.g. table).
        if (finalText !== latestText) {
          latestText = finalText;
          yield textContent(latestText, "running");
          await paintFrame();
        }
        yield textContent(finalText, "complete");
        return;
      }
    } finally {
      finished = true;
      abortSignal.removeEventListener("abort", onAbort);
      stopChunk?.();
    }
  },
});

const AIRuntimeContext = createContext<ReturnType<
  typeof useLocalRuntime
> | null>(null);

export function useAIRuntime() {
  return useContext(AIRuntimeContext);
}

export function AIRuntimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const runtime = useLocalRuntime(
    AIAdapter(
      user?.username,
      t(
        "ai.requestUnavailable",
        "I can't complete this request right now. Please try again later."
      ),
      t("ai.noMessage", "No message provided."),
      t
    ),
    {
      unstable_enableMessageQueue: true,
    }
  );

  return (
    <AIRuntimeContext.Provider value={runtime}>
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    </AIRuntimeContext.Provider>
  );
}
