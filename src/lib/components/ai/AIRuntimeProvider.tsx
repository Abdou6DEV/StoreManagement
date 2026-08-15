import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { useAuth } from "../../contexts/authContext";
import { createContext, useContext } from "react";

const AIAdapter = (userName?: string): ChatModelAdapter => ({
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
      throw error;
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

  const runtime = useLocalRuntime(
    AIAdapter(user?.username),
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