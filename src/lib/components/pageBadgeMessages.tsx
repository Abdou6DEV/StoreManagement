import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useBadgeMessage } from "../contexts/badgeMessageContext";

/**
 * Placeholder for per-page badge messages. Mount this in Layout when you want
 * to push tips/reminders to the user badge on page enter. Use pushPageMessages(pageId, messages)
 * with translated content; messages will queue and play in order without clearing on navigation.
 */
export function PageBadgeMessages(): null {
  useLocation();
  useBadgeMessage();

  useEffect(() => {
    // Add per-page messages here when needed. Use pushPageMessages(pageId, messages) with
    // pageId = pathname === "/" ? "main" : pathname.slice(1). Messages need content, durationMs, style.
  }, []);

  return null;
}
