import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/authContext";
import { createContext, useContext } from "react";

const AIAdapter = (
  userName: string | undefined,
  unavailableMessage: string
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
            text: "No message provided.",
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
            text: "No message provided.",
          },
        ],
      };
    }

    try {
      const response = await window.api.ai.chat(
        text,
        userName
      );

      return {
        content: [
          {
            type: "text",
            text: response,
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
      )
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