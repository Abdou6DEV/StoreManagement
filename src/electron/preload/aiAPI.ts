import { ipcRenderer } from "electron";

export const aiAPI = {
  chat: (message: string, userName?: string): Promise<string> =>
    ipcRenderer.invoke("ai:chat", message, userName),

  clearChat: (): Promise<void> => ipcRenderer.invoke("ai:clear"),
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

  // AI TOOLS - READ-ONLY DATABASE QUERIES
  getAvailableTools: () => ipcRenderer.invoke("ai:get-available-tools"),

  executeTool: (toolCall: {
    toolName: string;
    input?: any;
  }): Promise<{
    toolName: string;
    success: boolean;
    result?: any;
    error?: string;
  }> => ipcRenderer.invoke("ai:execute-tool", toolCall),
};