import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MessageSquarePlus, Minus, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Thread } from "../assistant-ui/thread";
import { TooltipIconButton } from "../assistant-ui/tooltip-icon-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../dropdownMenu";
import { useAiQuota } from "../../contexts/aiQuotaContext";
import { useAIRuntime } from "./AIRuntimeProvider";
import { AI_CHAT_CLOSE_EVENT } from "./closeAiChat";
import Orb from "../assistant-ui/orb";
import { useAuth } from "../../contexts/authContext";
import { useAuiState } from "@assistant-ui/react";
import { BadgeNotification } from "../badgeNotification";
import { setAiUnreadReply } from "./aiUnread";
import { useAiChatGate } from "../../hooks/useAiChatGate";
import { AiChatBlockOverlay } from "./AiChatBlockOverlay";
import { Button } from "../button";
import { cn } from "../../utils";

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
const EDGE = 8;
const POSITION_KEY = "aiChatPosition";
const SIZE_KEY = "aiChatSize";
const WELCOME_DELAY_MS = 700;
const WELCOME_DURATION_MS = 8000;

type ChatSize = "default" | "large" | "half";
type PanelSize = { width: number; height: number };

function isChatSize(value: string): value is ChatSize {
  return value === "default" || value === "large" || value === "half";
}

function loadSavedSize(): ChatSize {
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (raw && isChatSize(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "default";
}

function grabHandleWidth(panelWidth: number): number {
  return Math.round(Math.min(Math.max(panelWidth * 0.18, 40), 152));
}

function computePanelSize(preset: ChatSize): PanelSize {
  const maxW = Math.max(320, window.innerWidth - EDGE * 2);
  const maxH = Math.max(360, window.innerHeight - EDGE * 2);
  if (preset === "half") {
    return {
      width: Math.min(Math.floor(window.innerWidth / 2), maxW),
      height: maxH,
    };
  }
  if (preset === "large") {
    return {
      width: Math.min(480, maxW),
      height: Math.min(720, maxH),
    };
  }
  return {
    width: Math.min(380, maxW),
    height: Math.min(600, maxH),
  };
}

function capitalizeName(name: string): string {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

type PanelPos = { x: number; y: number };

function clampPos(
  x: number,
  y: number,
  width: number,
  height: number,
): PanelPos {
  const maxX = Math.max(EDGE, window.innerWidth - width - EDGE);
  const maxY = Math.max(EDGE, window.innerHeight - height - EDGE);
  return {
    x: Math.min(Math.max(EDGE, x), maxX),
    y: Math.min(Math.max(EDGE, y), maxY),
  };
}

function defaultPos(
  isMainMenu: boolean,
  sidebarCollapsed: boolean,
  width: number,
  height: number,
): PanelPos {
  if (isMainMenu) {
    return clampPos(
      window.innerWidth - width - 24,
      window.innerHeight - height - 24,
      width,
      height,
    );
  }

  return clampPos(
    (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) + PANEL_GAP,
    SIDEBAR_TOP,
    width,
    height,
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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canUseAi, blockReason } = useAiChatGate();
  const chatGateActive = !canUseAi && blockReason != null;
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const welcomeShownRef = useRef(false);
  const wasRunningRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const runtime = useAIRuntime();
  const refreshQuota = useAiQuota()?.refreshQuota;
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const isWelcomeChat = useAuiState((s) => s.thread.messages.length === 0);
  const newChatDisabled = isRunning || isWelcomeChat || chatGateActive;
  const newChatTooltip = isRunning
    ? t("ai.working", "Assistant is working")
    : chatGateActive
      ? blockReason === "offline"
        ? t(
            "ai.offlineBlocked",
            "REDA AI requires an active internet connection. Connect to Wi‑Fi or Ethernet, then try again.",
          )
        : blockReason === "trial"
          ? t(
              "ai.trialBlocked",
              "REDA AI is included with a paid subscription. During the free trial, AI chat is not available. Open the License tab to see your status or contact your provider.",
            )
          : t(
              "ai.disabled",
              "This is a premium feature. Contact your provider to enable REDA AI.",
            )
      : isWelcomeChat
        ? t("ai.newChatAlready", "Already a new chat")
        : t("ai.newChat", "New chat");
  const move = reduceMotion ? { duration: 0 } : spring;
  const isMainMenu = useLocation().pathname === "/";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );
  const [savedPos, setSavedPos] = useState<PanelPos | null>(loadSavedPos);
  const [sizePreset, setSizePreset] = useState<ChatSize>(loadSavedSize);
  const [panel, setPanel] = useState<PanelSize>(() =>
    computePanelSize(loadSavedSize()),
  );
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
    if (!open || !canUseAi || !refreshQuota) return;
    void refreshQuota();
  }, [open, canUseAi, refreshQuota]);

  useEffect(() => {
    const onToggle = () => setOpen((current) => !current);
    const onClose = () => setOpen(false);
    window.addEventListener("ai-chat-toggle", onToggle);
    window.addEventListener(AI_CHAT_CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener("ai-chat-toggle", onToggle);
      window.removeEventListener(AI_CHAT_CLOSE_EVENT, onClose);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("ai-chat-open-change", { detail: { open } }),
    );
  }, [open]);

  useEffect(() => {
    if (open) {
      setUnread(false);
    } else if (wasRunningRef.current && !isRunning) {
      setUnread(true);
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, open]);

  useEffect(() => {
    setAiUnreadReply(unread);
    window.dispatchEvent(
      new CustomEvent("ai-chat-unread-change", { detail: { unread } }),
    );
  }, [unread]);

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
    const next = savedPos ?? defaultPos(
      isMainMenu,
      sidebarCollapsed,
      panel.width,
      panel.height,
    );
    setPos(clampPos(next.x, next.y, panel.width, panel.height));
  }, [open, isMainMenu, sidebarCollapsed, savedPos, panel.width, panel.height]);

  useEffect(() => {
    const syncPanel = () => {
      const next = computePanelSize(sizePreset);
      setPanel(next);
      setPos((current) => clampPos(current.x, current.y, next.width, next.height));
    };
    syncPanel();
    window.addEventListener("resize", syncPanel);
    return () => window.removeEventListener("resize", syncPanel);
  }, [sizePreset]);

  useEffect(() => {
    if (open || !isMainMenu) {
      setShowWelcome(false);
      if (open) welcomeShownRef.current = true;
      return;
    }

    if (welcomeShownRef.current) return;

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
    if (isRunning || isWelcomeChat || chatGateActive) return;
    try {
      runtime?.thread.reset();
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
        panel.width,
        panel.height,
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
    setPos(defaultPos(isMainMenu, sidebarCollapsed, panel.width, panel.height));
  };

  const handleSizeChange = (value: string) => {
    if (!isChatSize(value)) return;
    setSizePreset(value);
    localStorage.setItem(SIZE_KEY, value);
  };

  const openLicenseTab = useCallback(() => {
    navigate("/administrator?tab=license");
  }, [navigate]);

  const grabWidth = grabHandleWidth(panel.width);

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
                <p className="mt-1 text-[12px] font-medium leading-relaxed text-background/90">
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
                  aria-label={
                    isRunning
                      ? t("ai.working", "Assistant is working")
                      : t("ai.open", "Open REDA AI")
                  }
                  tabIndex={open ? -1 : 0}
                  className="group relative h-16 w-16 rounded-full border border-border/50 bg-black shadow-xl shadow-primary/20 transition-all duration-500 ease-out hover:scale-105 hover:shadow-2xl hover:shadow-primary/30"
                >
                  <div className="absolute inset-0 overflow-hidden rounded-full">
                    <Orb
                      hue={0}
                      hoverIntensity={0.8}
                      rotateOnHover
                      forceHoverState={showWelcome || isRunning}
                      backgroundColor="#000000"
                    />
                  </div>
                  <BadgeNotification
                    count={unread ? 1 : 0}
                    className="top-0.5 right-0.5 translate-x-1/4 -translate-y-1/4 rtl:left-0.5 rtl:right-auto rtl:translate-x-[-25%]"
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                {isRunning
                  ? t("ai.working", "Assistant is working")
                  : t("ai.open", "Open REDA AI")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </motion.div>
      )}

      <motion.div
        className="fixed z-[100] flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-background shadow-2xl"
        initial={false}
        animate={{
          opacity: open ? 1 : 0,
          scale: open ? 1 : 0.96,
          width: panel.width,
          height: panel.height,
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
        <div className="relative shrink-0 border-b border-border/60 bg-background/95 backdrop-blur">
          <TooltipProvider delayDuration={400}>
            <Tooltip open={dragging ? false : undefined}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={t(
                    "ai.moveHint",
                    "Move chat / Double-click to reset",
                  )}
                  className={`group/pad absolute top-1 left-1/2 z-10 flex h-5 shrink-0 -translate-x-1/2 touch-none items-start justify-center ${
                    dragging ? "cursor-grabbing" : "cursor-grab"
                  }`}
                  style={{ width: grabWidth }}
                  onPointerDown={handleDragStart}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                  onDoubleClick={handleResetPosition}
                >
                  <span
                    aria-hidden
                    className={`block h-1 w-full rounded-full transition-colors ${
                      dragging
                        ? "bg-muted-foreground/70"
                        : "bg-muted-foreground/35 group-hover/pad:bg-muted-foreground/55"
                    }`}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {t("ai.moveHint", "Move chat / Double-click to reset")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center justify-between px-4 pt-4 pb-3 top-0">
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
                    forceHoverState={isRunning}
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

            <div className="flex shrink-0 items-center justify-end gap-0.5">
              {newChatDisabled ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled
                          aria-disabled
                          aria-label={newChatTooltip}
                          className="size-8 rounded-lg text-muted-foreground opacity-40"
                          onClick={handleClearChat}
                        >
                          <MessageSquarePlus className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{newChatTooltip}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <TooltipIconButton
                  tooltip={newChatTooltip}
                  side="bottom"
                  className="size-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={handleClearChat}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                </TooltipIconButton>
              )}

              <DropdownMenu open={prefsOpen} onOpenChange={setPrefsOpen}>
                <TooltipProvider delayDuration={0}>
                  <Tooltip open={prefsOpen ? false : undefined}>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("ai.preferences", "Preferences")}
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <SlidersHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      {t("ai.preferences", "Preferences")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent
                  align="end"
                  className={`z-[120] w-48 ${i18n.language.startsWith("ar") ? "text-right" : ""}`}
                >
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t("ai.chatSize", "Chat size")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sizePreset}
                    onValueChange={handleSizeChange}
                  >
                    <DropdownMenuRadioItem value="default">
                      {t("ai.sizeDefault", "Default")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="large">
                      {t("ai.sizeLarge", "Large")}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="half">
                      {t("ai.sizeHalf", "Half screen")}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

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
        </div>

        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              "h-full",
              chatGateActive && "pointer-events-none select-none opacity-50",
            )}
            aria-hidden={chatGateActive ? true : undefined}
          >
            <Thread />
          </div>
          {chatGateActive && blockReason ? (
            <AiChatBlockOverlay
              blockReason={blockReason}
              onOpenLicenseTab={blockReason === "trial" ? openLicenseTab : undefined}
            />
          ) : null}
        </div>
      </motion.div>
    </>
  );
}
