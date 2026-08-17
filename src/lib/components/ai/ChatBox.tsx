import { useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Minus, Move, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Thread } from "../assistant-ui/thread";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { useAIRuntime } from "./AIRuntimeProvider";
import Orb from "../assistant-ui/orb";
import { useAuth } from "../../contexts/authContext";

const spring = {
  type: "spring" as const,
  stiffness: 460,
  damping: 38,
  mass: 0.7,
};

const SIDEBAR_EXPANDED = 200;
const SIDEBAR_COLLAPSED = 56;
const SIDEBAR_TOP = 130;
const PANEL_GAP = 8;
const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 600;
const EDGE = 8;
const POSITION_KEY = "aiChatPosition";
const WELCOME_DELAY_MS = 700;
const WELCOME_DURATION_MS = 8000;

function capitalizeName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

type PanelPos = { x: number; y: number };

function clampPos(x: number, y: number): PanelPos {
  const maxX = Math.max(EDGE, window.innerWidth - PANEL_WIDTH - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - PANEL_HEIGHT - EDGE);
  return {
    x: Math.min(Math.max(EDGE, x), maxX),
    y: Math.min(Math.max(EDGE, y), maxY),
  };
}

function defaultPos(isMainMenu: boolean, sidebarCollapsed: boolean): PanelPos {
  if (isMainMenu) {
    return clampPos(
      window.innerWidth - PANEL_WIDTH - 24,
      window.innerHeight - PANEL_HEIGHT - 24,
    );
  }

  return clampPos(
    (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) + PANEL_GAP,
    SIDEBAR_TOP,
  );
}

function loadSavedPos(): PanelPos | null {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PanelPos;
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export default function ChatBox() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeShownRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const runtime = useAIRuntime();
  const move = reduceMotion ? { duration: 0 } : spring;
  const isMainMenu = useLocation().pathname === "/";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );
  const [savedPos, setSavedPos] = useState<PanelPos | null>(loadSavedPos);
  const [pos, setPos] = useState<PanelPos>({ x: 24, y: 130 });
  const [dragging, setDragging] = useState(false);
  const posRef = useRef(pos);
  posRef.current = pos;
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await window.api.ai.getAvailableModels();
      } catch (error) {
        console.error("Failed to load AI models:", error);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    const onToggle = () => setOpen((current) => !current);
    window.addEventListener("ai-chat-toggle", onToggle);
    return () => window.removeEventListener("ai-chat-toggle", onToggle);
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("ai-chat-open-change", { detail: { open } }),
    );
  }, [open]);

  useEffect(() => {
    const onSidebarChange = (event: Event) => {
      const collapsed = (event as CustomEvent<{ collapsed?: boolean }>).detail
        ?.collapsed;
      if (typeof collapsed === "boolean") setSidebarCollapsed(collapsed);
    };

    window.addEventListener("sidebarStateChanged", onSidebarChange);
    return () =>
      window.removeEventListener("sidebarStateChanged", onSidebarChange);
  }, []);

  useEffect(() => {
    if (!open) return;
    const next = savedPos ?? defaultPos(isMainMenu, sidebarCollapsed);
    setPos(clampPos(next.x, next.y));
  }, [open, isMainMenu, sidebarCollapsed, savedPos]);

  useEffect(() => {
    const onResize = () => setPos((current) => clampPos(current.x, current.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (open) {
      setShowWelcome(false);
      welcomeShownRef.current = true;
      return;
    }

    if (!isMainMenu || welcomeShownRef.current) return;

    const showTimer = window.setTimeout(() => {
      welcomeShownRef.current = true;
      setShowWelcome(true);
    }, WELCOME_DELAY_MS);
    const hideTimer = window.setTimeout(
      () => setShowWelcome(false),
      WELCOME_DELAY_MS + WELCOME_DURATION_MS,
    );

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isMainMenu, open]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleClearChat = async () => {
    try {
      runtime.thread.reset();
      await window.api.ai.clearChat();
    } catch (error) {
      console.error("AI clear chat error:", error);
    }
  };

  const handleDragStart = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: pos.x,
      originY: pos.y,
    };
    setDragging(true);
  };

  const handleDragMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current) return;
    setPos(
      clampPos(
        dragRef.current.originX + event.clientX - dragRef.current.pointerX,
        dragRef.current.originY + event.clientY - dragRef.current.pointerY,
      ),
    );
  };

  const handleDragEnd = () => {
    if (!dragRef.current) return;
    const originX = dragRef.current.originX;
    const originY = dragRef.current.originY;
    dragRef.current = null;
    setDragging(false);

    const current = posRef.current;
    const moved =
      Math.hypot(current.x - originX, current.y - originY) > 4;
    if (!moved) {
      setPos({ x: originX, y: originY });
      return;
    }

    localStorage.setItem(POSITION_KEY, JSON.stringify(current));
    setSavedPos(current);
  };

  const handleResetPosition = () => {
    dragRef.current = null;
    setDragging(false);
    localStorage.removeItem(POSITION_KEY);
    setSavedPos(null);
    setPos(defaultPos(isMainMenu, sidebarCollapsed));
  };

  return (
    <>
      {isMainMenu && (
        <motion.div
          className="fixed right-6 bottom-6 z-[100]"
          initial={false}
          animate={{
            opacity: open ? 0 : 1,
            y: open ? 12 : 0,
            scale: open ? 0.72 : 1,
          }}
          transition={move}
          style={{ pointerEvents: open ? "none" : "auto" }}
        >
          <AnimatePresence>
            {showWelcome && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                transition={move}
                className="absolute right-full bottom-1 mr-3 w-[230px] rounded-2xl bg-foreground px-3.5 py-3 text-start text-background shadow-lg"
              >
                <p className="text-sm font-semibold tracking-tight">
                  {t("ai.loginWelcome", "Welcome, {{name}}.", {
                    name: capitalizeName(
                      user?.username?.trim() || t("userBadge.user", "User"),
                    ),
                  })}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-background/70">
                  {t(
                    "ai.loginAssist",
                    "I'm here if you need assistance with your store.",
                  )}
                </p>
                <span
                  aria-hidden
                  className="absolute top-1/2 -right-1.5 size-3 -translate-y-1/2 rotate-45 bg-foreground"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <TooltipProvider delayDuration={0}>
            <Tooltip open={showWelcome ? false : undefined}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setOpen(true)}
                  aria-label={t("ai.open", "Open REDA AI")}
                  tabIndex={open ? -1 : 0}
                  className="group relative h-16 w-16 overflow-hidden rounded-full border border-border/50 bg-black shadow-xl shadow-primary/20 transition-all duration-500 ease-out hover:scale-105 hover:shadow-2xl hover:shadow-primary/30"
                >
                  <div className="absolute inset-0">
                    <Orb
                      hue={0}
                      hoverIntensity={0.8}
                      rotateOnHover
                      forceHoverState={showWelcome}
                      backgroundColor="#000000"
                    />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {t("ai.open", "Open REDA AI")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      )}

      <motion.div
        className="fixed z-[100] flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl"
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          scale: open ? 1 : 0.96,
        }}
        transition={move}
        style={{
          top: pos.y,
          left: pos.x,
          transformOrigin: isMainMenu ? "bottom right" : "left center",
          pointerEvents: open ? "auto" : "none",
        }}
        aria-hidden={!open}
        inert={!open || undefined}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-10 w-10 shrink-0">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-[3px] rounded-[14px] bg-primary/20 blur-[6px] animate-pulse"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-px rounded-[13px] border border-primary/40"
              />
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-border/50 bg-black shadow-sm">
                <Orb
                  hue={0}
                  hoverIntensity={0.5}
                  rotateOnHover
                  forceHoverState={false}
                  backgroundColor="#000000"
                />
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="truncate text-sm font-semibold tracking-tight">
                  {t("ai.title", "REDA AI")}
                </h3>
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-primary uppercase">
                  {t("ai.badge", "AI")}
                </span>
              </div>
              <p className="truncate text-[11px] text-muted-foreground">
                {t("ai.subtitle", "Your store assistant")}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <TooltipIconButton
              tooltip={t("ai.moveHint", "Move chat · Double-click to reset")}
              side="bottom"
              className={`touch-none size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground ${
                dragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              onPointerDown={handleDragStart}
              onPointerMove={handleDragMove}
              onPointerUp={handleDragEnd}
              onPointerCancel={handleDragEnd}
              onDoubleClick={handleResetPosition}
            >
              <Move className="h-4 w-4" />
            </TooltipIconButton>

            <TooltipIconButton
              tooltip={t("ai.newChat", "New chat")}
              side="bottom"
              className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleClearChat}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </TooltipIconButton>

            <TooltipIconButton
              tooltip={t("ai.minimize", "Minimize")}
              side="bottom"
              className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={handleClose}
            >
              <Minus className="h-4 w-4" />
            </TooltipIconButton>
          </div>
        </div>

        <div className="min-h-0 flex-1">
          <Thread />
        </div>
      </motion.div>
    </>
  );
}
