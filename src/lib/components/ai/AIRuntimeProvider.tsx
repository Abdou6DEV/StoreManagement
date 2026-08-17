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

const AIAdapter = (
  userName: string | undefined,
  unavailableMessage: string,
  noMessage: string,
  t: TFunction
): ChatModelAdapter => ({
  async run({ messages }) {
    const latestUserMessage = [...messages]
      .reverse()
      .find((message) => message.role === "user");

    if (!latestUserMessage) {
      return {
        content: [
          {
            type: "text",
            text: noMessage,
          },
        ],
      };
    }

    const text = latestUserMessage.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    if (!text.trim()) {
      return {
        content: [
          {
            type: "text",
            text: noMessage,
          },
        ],
      };
    }

    try {
      const response = await window.api.ai.chat(
        text,
        userName
      );
      const payload =
        typeof response === "string" ? { text: response } : response;
      const tableMarkdown = payload.table
        ? formatStoreTableMarkdown(payload.table, t)
        : "";

      return {
        content: [
          {
            type: "text",
            text: tableMarkdown
              ? `${payload.text}\n\n${tableMarkdown}`
              : payload.text,
          },
        ],
      };
    } catch (error) {
      console.error("AI chat error:", error);
      return {
        content: [
          {
            type: "text",
            text: unavailableMessage,
          },
        ],
      };
    }
  },
});

const AIRuntimeContext = createContext<any>(null);

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