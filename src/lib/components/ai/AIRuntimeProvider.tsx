import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/authContext";
import { createContext, useContext, useEffect } from "react";
import { formatStoreTableMarkdown } from "../../ai/formatStoreTable";
import type { TFunction } from "i18next";
import type { AiChatResponse } from "../../ai/aiChatTypes";
import {
  MAX_AI_MESSAGE_CHARS,
  resolveAiChatErrorMessage,
} from "../../ai/aiMessageLimits";
import { useAiChatGate } from "../../hooks/useAiChatGate";
import { AiQuotaProvider } from "../../contexts/aiQuotaContext";

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
  noMessage: string,
  tooLongMessage: string,
  blockedMessage: string | null,
  chatErrorMessages: {
    unavailable: string;
    rateLimitMinute: string;
    rateLimitDay: string;
    disabled: string;
    notLicensed: string;
    offline: string;
    trialBlocked: string;
  },
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

    if (text.length > MAX_AI_MESSAGE_CHARS) {
      yield textContent(tooLongMessage, "error");
      return;
    }

    if (abortSignal.aborted) {
      yield textContent("", "cancelled");
      return;
    }

    if (blockedMessage) {
      yield textContent(blockedMessage, "error");
      return;
    }

    const queue: AdapterEvent[] = [];
    let wake: (() => void) | null = null;
    let finished = false;

    const push = (event: AdapterEvent) => {
      if (finished || abortSignal.aborted) return;
      queue.push(event);
      wake?.();
    };

    const stopChunk = window.api.ai.onChunk?.((chunk) => {
      if (abortSignal.aborted) return;
      push({ type: "chunk", text: chunk });
    });

    const onAbort = () => {
      void window.api.ai.cancelChat?.();
      wake?.();
    };
    abortSignal.addEventListener("abort", onAbort);

    window.api.ai.chat(text, userName).then(
      (payload) => push({ type: "done", payload }),
      (error) => push({ type: "error", error }),
    );

    try {
      while (!finished) {
        if (abortSignal.aborted) {
          finished = true;
          yield textContent("", "cancelled");
          return;
        }

        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          wake = null;
          continue;
        }

        const event = queue.shift()!;

        if (event.type === "chunk") {
          if (event.text) {
            yield textContent(event.text, "running");
            await paintFrame();
          }
          continue;
        }

        finished = true;

        if (event.type === "error") {
          console.error("AI chat error:", event.error);
          const errText =
            event.error instanceof Error
              ? event.error.message
              : String(event.error ?? "");
          yield textContent(
            resolveAiChatErrorMessage(errText, {
              tooLong: tooLongMessage,
              unavailable: chatErrorMessages.unavailable,
              rateLimitMinute: chatErrorMessages.rateLimitMinute,
              rateLimitDay: chatErrorMessages.rateLimitDay,
              disabled: chatErrorMessages.disabled,
              notLicensed: chatErrorMessages.notLicensed,
              offline: chatErrorMessages.offline,
              trialBlocked: chatErrorMessages.trialBlocked,
            }),
            "error",
          );
          return;
        }

        while (queue.length > 0) queue.shift();

        const finalText = formatPayload(event.payload, "", t);
        if (finalText) {
          yield textContent(finalText, "running");
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
  const { canUseAi, blockReason } = useAiChatGate();

  const blockedMessage =
    !canUseAi && blockReason === "trial"
      ? t(
          "ai.trialBlocked",
          "REDA AI is included with a paid subscription. During the free trial, AI chat is not available. Open the License tab to see your status or contact your provider.",
        )
      : !canUseAi && blockReason === "disabled"
        ? t(
            "ai.disabled",
            "This is a premium feature. Contact your provider to enable REDA AI.",
          )
        : !canUseAi && blockReason === "offline"
          ? t(
              "ai.offlineBlocked",
              "REDA AI requires an active internet connection. Connect to Wi‑Fi or Ethernet, then try again.",
            )
          : null;

  const runtime = useLocalRuntime(
    AIAdapter(
      user?.username,
      t("ai.noMessage", "No message provided."),
      t(
        "ai.messageTooLong",
        "Message is too long. Please keep it under {{max}} characters.",
        { max: MAX_AI_MESSAGE_CHARS },
      ),
      blockedMessage,
      {
        unavailable: t(
          "ai.requestUnavailable",
          "I can't complete this request right now. Please try again later.",
        ),
        rateLimitMinute: t(
          "ai.rateLimitMinute",
          "Too many AI requests. Please wait a minute and try again.",
        ),
        rateLimitDay: t(
          "ai.rateLimitDay",
          "Daily AI points limit reached. Try again tomorrow.",
        ),
        disabled: t(
          "ai.disabled",
          "This is a premium feature. Contact your provider to enable REDA AI.",
        ),
        notLicensed: t(
          "ai.notLicensed",
          "A valid paid subscription is required to use REDA AI.",
        ),
        offline: t(
          "ai.offlineBlocked",
          "REDA AI requires an active internet connection. Connect to Wi‑Fi or Ethernet, then try again.",
        ),
        trialBlocked: t(
          "ai.trialBlocked",
          "REDA AI is included with a paid subscription. During the free trial, AI chat is not available. Open the License tab to see your status or contact your provider.",
        ),
      },
      t
    ),
    {
      unstable_enableMessageQueue: false,
    }
  );

  useEffect(() => {
    runtime.thread.reset();
  }, [user?.id]);

  return (
    <AIRuntimeContext.Provider value={runtime}>
      <AssistantRuntimeProvider runtime={runtime}>
        <AiQuotaProvider>{children}</AiQuotaProvider>
      </AssistantRuntimeProvider>
    </AIRuntimeContext.Provider>
  );
}
