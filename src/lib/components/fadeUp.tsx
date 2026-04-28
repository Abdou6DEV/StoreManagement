import React from "react";
import { cn } from "../utils";

/**
 * Simple keyed wrapper to animate tab/content switches.
 * Uses tailwindcss-animate classes already used across the app.
 */
export function FadeUp({
  contentKey,
  className,
  children,
}: {
  contentKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      key={contentKey}
      className={cn(
        "animate-in fade-in slide-in-from-bottom-2 duration-200",
        className,
      )}
    >
      {children}
    </div>
  );
}

