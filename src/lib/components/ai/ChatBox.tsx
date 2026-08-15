import { useEffect, useState } from "react";
import {
  Minus,
  RotateCcw,
} from "lucide-react";

import { Button } from "../ui/button";
import { Thread } from "../assistant-ui/thread";
import { useAIRuntime } from "./AIRuntimeProvider";
import Orb from "../assistant-ui/orb";

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Added: keeps the chat mounted while closing animation plays
  const [showChat, setShowChat] = useState(false);

  const runtime = useAIRuntime();

  useEffect(() => {
    // Load available models once so the AI backend is initialized.
    const loadModels = async () => {
      try {
        await window.api.ai.getAvailableModels();
      } catch (error) {
        console.error("Failed to load AI models:", error);
      }
    };

    loadModels();
  }, []);

  /*
   * Hide the floating AI button after 3 seconds
   * of inactivity.
   */
  useEffect(() => {
    if (open || hovered) {
      setIdle(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setIdle(true);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [open, hovered]);

  const handleOpen = () => {
    setHovered(false);
    setIdle(false);

    // Mount the chat first
    setShowChat(true);

    // Then trigger the opening animation
    requestAnimationFrame(() => {
      setOpen(true);
    });
  };

  const handleClose = () => {
    // Start closing animation
    setOpen(false);

    // Remove from DOM only after animation finishes
    window.setTimeout(() => {
      setShowChat(false);
    }, 500);

    setIdle(false);
    setHovered(false);
  };

  const handleClearChat = async () => {
    try {
      runtime.thread.reset();
      await window.api.ai.clearChat();
    } catch (error) {
      console.error("AI clear chat error:", error);
    }
  };

  /* ─────────────────────────────
     Floating AI button
  ───────────────────────────── */

  return (
    <>
      {/* Floating AI button */}
      {!showChat && (
        <div className="fixed bottom-6 right-6 z-[100]">
          <button
            onClick={handleOpen}
            aria-label="Open REDA AI"
            onMouseEnter={() => {
              setHovered(true);
              setIdle(false);
            }}
            onMouseLeave={() => {
              setHovered(false);
            }}
            className={`
              group relative h-16 w-16 overflow-hidden rounded-full
              border border-border/50 bg-black
              shadow-xl shadow-primary/20
              transition-all duration-500 ease-out
              hover:scale-105
              hover:shadow-2xl hover:shadow-primary/30
              ${
                idle && !hovered
                  ? "translate-y-[52px] opacity-30"
                  : "translate-y-0 opacity-100"
              }
            `}
          >
            <div className="absolute inset-0">
              <Orb
                hue={0}
                hoverIntensity={0.8}
                rotateOnHover
                forceHoverState={false}
                backgroundColor="#000000"
              />
            </div>
          </button>
        </div>
      )}

      {/* Chat */}
      {showChat && (
        <div
          className={`
            fixed bottom-6 right-6 z-[100]
            flex h-[600px] w-[380px]
            flex-col overflow-hidden
            rounded-2xl border border-border/60
            bg-background shadow-2xl
            transition-all duration-500 ease-out
            ${
              open
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-8 scale-95 opacity-0"
            }
          `}
        >

          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">

            <div className="flex min-w-0 items-center gap-3">

              {/* REDA AI Orb Avatar */}
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border/50 bg-black shadow-sm">
                <Orb
                  hue={0}
                  hoverIntensity={0.5}
                  rotateOnHover
                  forceHoverState={false}
                  backgroundColor="#000000"
                />

                {/* Online indicator */}
                <span className="absolute bottom-0.5 right-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
              </div>

              {/* Title */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="truncate text-sm font-semibold tracking-tight">
                    REDA AI
                  </h3>

                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-primary">
                    AI
                  </span>
                </div>

                <p className="truncate text-[11px] text-muted-foreground">
                  Your store assistant
                </p>
              </div>
            </div>

            {/* Header actions */}
            <div className="flex shrink-0 items-center gap-0.5">

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={handleClearChat}
                aria-label="New chat"
                title="New chat"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={handleClose}
                aria-label="Minimize"
                title="Minimize"
              >
                <Minus className="h-4 w-4" />
              </Button>

            </div>
          </div>

          {/* Assistant UI */}
          <div className="min-h-0 flex-1">
            <Thread />
          </div>

        </div>
      )}
    </>
  );
}