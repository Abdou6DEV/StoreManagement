import { useEffect, useMemo, useState } from "react";
import { resolveAiChatAccess, type AiChatBlockReason } from "../license/aiChatAccess";
import { useActiveTrial } from "./useActiveTrial";
import { useLicense } from "../contexts/licenseContext";

export function useAiChatGate() {
  const { isTrialActive } = useActiveTrial();
  const { lastDeviceCheckResult } = useLicense();
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

  const aiEnabled =
    lastDeviceCheckResult?.success === true
      ? lastDeviceCheckResult.aiEnabled
      : undefined;

  return useMemo(
    () => resolveAiChatAccess({ isOnline, isTrialActive, aiEnabled }),
    [isOnline, isTrialActive, aiEnabled],
  );
}

export type { AiChatBlockReason };
