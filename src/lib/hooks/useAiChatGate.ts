import { useEffect, useMemo, useState } from "react";
import { resolveAiChatAccess, type AiChatBlockReason } from "../license/aiChatAccess";
import { useActiveTrial } from "./useActiveTrial";

export function useAiChatGate() {
  const { isTrialActive } = useActiveTrial();
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  return useMemo(
    () => resolveAiChatAccess({ isOnline, isTrialActive }),
    [isOnline, isTrialActive],
  );
}

export type { AiChatBlockReason };
