import { ipcRenderer } from "electron";
import type { AiChatResponse } from "../../lib/ai/aiChatTypes";
import type { AiQuotaSnapshot } from "../../lib/ai/aiQuota";
import type { ScanReceiptResult } from "../../lib/ai/scanReceiptTypes";
import type {
  DownloadProductImageRequest,
  DownloadProductImageResult,
  FindProductImageRequest,
  FindProductImageResult,
} from "../../lib/ai/findImageTypes";

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

  scanReceipt: (localPath: string): Promise<ScanReceiptResult> =>
    ipcRenderer.invoke("ai:scan-receipt", localPath) as Promise<ScanReceiptResult>,

  findProductImage: (
    request: FindProductImageRequest,
  ): Promise<FindProductImageResult> =>
    ipcRenderer.invoke("ai:find-product-image", request) as Promise<FindProductImageResult>,

  downloadProductImage: (
    request: DownloadProductImageRequest,
  ): Promise<DownloadProductImageResult> =>
    ipcRenderer.invoke(
      "ai:download-product-image",
      request,
    ) as Promise<DownloadProductImageResult>,

  clearChat: (): Promise<void> => ipcRenderer.invoke("ai:clear"),
  cancelChat: (): Promise<void> => ipcRenderer.invoke("ai:cancel"),

  getQuota: (): Promise<AiQuotaSnapshot | null> =>
    ipcRenderer.invoke("ai:getQuota"),

  refreshQuota: (): Promise<AiQuotaSnapshot | null> =>
    ipcRenderer.invoke("ai:refreshQuota"),

  onQuota: (callback: (quota: AiQuotaSnapshot) => void): (() => void) => {
    const handler = (_event: unknown, quota: AiQuotaSnapshot) => callback(quota);
    ipcRenderer.on("ai:quota", handler);
    return () => {
      ipcRenderer.removeListener("ai:quota", handler);
    };
  },

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

  setWebSearch: (
    enabled: boolean
  ): Promise<{ success: boolean; webSearch: boolean }> =>
    ipcRenderer.invoke("ai:set-web-search", enabled),

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
