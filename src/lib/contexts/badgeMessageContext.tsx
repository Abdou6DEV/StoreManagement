import React, { createContext, useCallback, useContext, useRef, useState } from "react";

export type BadgeMessageStyle = "default" | "welcome" | "success" | "info";

export interface BadgeMessage {
  /** Text to show (can be already translated or pass key and use in component) */
  content: string;
  /** How long to show the message in ms */
  durationMs: number;
  /** Optional style for different looks (welcome = primary + sparkles, success = green, etc.) */
  style?: BadgeMessageStyle;
}

interface BadgeMessageContextType {
  queue: BadgeMessage[];
  showMessage: (message: BadgeMessage) => void;
  shiftQueue: () => void;
  /** Append all messages for a page (only once per page per session); used when entering a page */
  pushPageMessages: (pageId: string, messages: BadgeMessage[]) => void;
  /** Clear pushed-page tracking (e.g. when user goes to login) */
  clearPushedPages: () => void;
  /** Shared across all UserBadge instances: has the welcome message been shown this session (main menu) */
  hasEnteredMainMenuBefore: boolean;
  setHasEnteredMainMenuBefore: (value: boolean) => void;
}

const BadgeMessageContext = createContext<BadgeMessageContextType | undefined>(undefined);

export function useBadgeMessage() {
  const ctx = useContext(BadgeMessageContext);
  if (ctx === undefined) {
    throw new Error("useBadgeMessage must be used within a BadgeMessageProvider");
  }
  return ctx;
}

interface BadgeMessageProviderProps {
  children: React.ReactNode;
}

export function BadgeMessageProvider({ children }: BadgeMessageProviderProps) {
  const [queue, setQueue] = useState<BadgeMessage[]>([]);
  const [hasEnteredMainMenuBefore, setHasEnteredMainMenuBefore] = useState(false);
  const pushedPagesRef = useRef<Set<string>>(new Set());

  const showMessage = useCallback((message: BadgeMessage) => {
    setQueue((prev) => [...prev, { durationMs: 4000, style: "default", ...message }]);
  }, []);

  const shiftQueue = useCallback(() => {
    setQueue((prev) => (prev.length <= 1 ? [] : prev.slice(1)));
  }, []);

  const pushPageMessages = useCallback((pageId: string, messages: BadgeMessage[]) => {
    if (pushedPagesRef.current.has(pageId) || messages.length === 0) return;
    pushedPagesRef.current.add(pageId);
    setQueue((prev) => [...prev, ...messages.map((m) => ({ durationMs: 4000, style: "default" as const, ...m }))]);
  }, []);

  const clearPushedPages = useCallback(() => {
    pushedPagesRef.current.clear();
  }, []);

  const value: BadgeMessageContextType = {
    queue,
    showMessage,
    shiftQueue,
    pushPageMessages,
    clearPushedPages,
    hasEnteredMainMenuBefore,
    setHasEnteredMainMenuBefore,
  };

  return (
    <BadgeMessageContext.Provider value={value}>
      {children}
    </BadgeMessageContext.Provider>
  );
}
