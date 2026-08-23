"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AiQuotaSnapshot } from "../ai/aiQuota";
import { useAiChatGate } from "../hooks/useAiChatGate";

type AiQuotaContextValue = {
  quota: AiQuotaSnapshot | null;
  refreshQuota: () => Promise<void>;
};

const AiQuotaContext = createContext<AiQuotaContextValue | null>(null);

export function AiQuotaProvider({ children }: { children: ReactNode }) {
  const [quota, setQuota] = useState<AiQuotaSnapshot | null>(null);
  const { canUseAi } = useAiChatGate();

  const refreshQuota = useCallback(async () => {
    try {
      const next = await window.api.ai.refreshQuota();
      if (next) setQuota(next);
    } catch (error) {
      console.error("AI quota refresh failed:", error);
    }
  }, []);

  useEffect(() => {
    void window.api.ai.getQuota().then((cached) => {
      if (cached) setQuota(cached);
    });
    const stop = window.api.ai.onQuota((next) => setQuota(next));
    return stop;
  }, []);

  useEffect(() => {
    if (!canUseAi) return;
    void refreshQuota();
  }, [canUseAi, refreshQuota]);

  const value = useMemo(
    () => ({ quota, refreshQuota }),
    [quota, refreshQuota],
  );

  return (
    <AiQuotaContext.Provider value={value}>{children}</AiQuotaContext.Provider>
  );
}

export function useAiQuota() {
  return useContext(AiQuotaContext);
}
