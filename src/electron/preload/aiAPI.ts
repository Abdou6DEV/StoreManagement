import { ipcRenderer } from "electron";
import type { AiChatResponse } from "../../lib/ai/aiChatTypes";

export type AiWorkStatus = {
  phase: "thinking" | "tool" | "writing";
  toolName?: string;
};

export const aiAPI = {
  chat: (
    message: string,
    userName?: string,
    userId?: string
  ): Promise<AiChatResponse> =>
    ipcRenderer.invoke("ai:chat", message, userName, userId),

  clearChat: (): Promise<void> => ipcRenderer.invoke("ai:clear"),
  cancelChat: (): Promise<void> => ipcRenderer.invoke("ai:cancel"),
  listModels: () =>
    ipcRenderer.invoke("ai:list-models"),
  listMistralModels: () =>
    ipcRenderer.invoke("ai:list-mistral-models"),
  getAvailableModels: (): Promise<
    {
      id: string;
      provider: string;
      capabilities: {
        toolCalling: boolean;
        webSearch: boolean;
        generalChat: boolean;
        storeData: boolean;
        listWriter?: boolean;
      };
      priority: number;
    }[]
  > => ipcRenderer.invoke("ai:get-available-models"),

  setModel: (
    modelId: string | null
  ): Promise<{
    success: boolean;
    model: string;
    provider?: string;
  }> => ipcRenderer.invoke("ai:set-model", modelId),

  onStatus: (callback: (status: AiWorkStatus) => void): (() => void) => {
    const handler = (_event: unknown, status: AiWorkStatus) => callback(status);
    ipcRenderer.on("ai:status", handler);
    return () => {
      ipcRenderer.removeListener("ai:status", handler);
    };
  },

  onChunk: (callback: (text: string) => void): (() => void) => {
    const handler = (_event: unknown, text: string) => {
      if (typeof text === "string") callback(text);
    };
    ipcRenderer.on("ai:chat-chunk", handler);
    return () => {
      ipcRenderer.removeListener("ai:chat-chunk", handler);
    };
  },
};
