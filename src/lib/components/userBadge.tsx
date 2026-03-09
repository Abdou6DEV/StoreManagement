import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { User, Crown, Sparkles, CheckCircle, Info, Calendar, Clock } from "lucide-react";
import { cn } from "../utils";
import { useAuth } from "../contexts/authContext";
import { useBadgeMessage } from "../contexts/badgeMessageContext";
import { useTranslation } from "react-i18next";

const SHOW_TEXT_AFTER_NAV_MS = 4000;
const WELCOME_SHOW_MS = 6500;
const SLIDE_OUT_DURATION_MS = 400;
/** How long to show date/time in nav badge before cycling back to role (ms) */
const DATETIME_SHOW_MS = 60000;
/** How long role/username stays visible in the cycle after datetime (ms) */
const ROLE_CYCLE_SHOW_MS = 6000;

interface UserBadgeProps {
  className?: string;
  showRole?: boolean;
  size?: "sm" | "md" | "lg";
}

export function UserBadge({
  className = "",
  showRole = true,
  size = "md",
}: UserBadgeProps) {
  const { user, userRole, isAdmin } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isRTL = i18n.language === "ar";
  const { queue, shiftQueue, showMessage, hasEnteredMainMenuBefore, setHasEnteredMainMenuBefore } = useBadgeMessage();
  const [showText, setShowText] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [badgePhase, setBadgePhase] = useState<"role" | "datetime">("role");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swapContentRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showAgainRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasStartedCycleRef = useRef(false);
  const datetimeCycleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMessage = queue[0] ?? null;
  const isMessageMode = queue.length > 0;
  /** Bar extends when text visible or when in role/datetime cycle so it doesn't shrink between them. */
  const showLine =
    showText ||
    queue.length > 0 ||
    badgePhase === "datetime" ||
    hasStartedCycleRef.current;

  useEffect(() => {
    if (location.pathname === "/login") {
      setHasEnteredMainMenuBefore(false);
    }
  }, [location.pathname, setHasEnteredMainMenuBefore]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Message queue: show current message for its duration; pathname does NOT reset this (no pathname in deps)
  useEffect(() => {
    if (!isMessageMode || !currentMessage) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (swapContentRef.current) clearTimeout(swapContentRef.current);
    if (showAgainRef.current) clearTimeout(showAgainRef.current);
    setShowText(false);
    showAgainRef.current = setTimeout(() => {
      setShowText(true);
      showAgainRef.current = null;
    }, 50);
    timeoutRef.current = setTimeout(() => {
      setShowText(false);
      timeoutRef.current = null;
      swapContentRef.current = setTimeout(() => {
        shiftQueue();
        swapContentRef.current = null;
      }, SLIDE_OUT_DURATION_MS);
    }, currentMessage.durationMs);
    return () => {
      if (showAgainRef.current) clearTimeout(showAgainRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (swapContentRef.current) clearTimeout(swapContentRef.current);
    };
  }, [isMessageMode, currentMessage?.content, currentMessage?.durationMs, shiftQueue]);

  const scheduleDateTimeCycle = () => {
    if (datetimeCycleRef.current) clearTimeout(datetimeCycleRef.current);
    datetimeCycleRef.current = setTimeout(() => {
      setShowText(false);
      datetimeCycleRef.current = null;
      swapContentRef.current = setTimeout(() => {
        setBadgePhase("role");
        setShowText(true);
        swapContentRef.current = null;
        timeoutRef.current = setTimeout(() => {
          setShowText(false);
          timeoutRef.current = null;
          swapContentRef.current = setTimeout(() => {
            setBadgePhase("datetime");
            setShowText(true);
            swapContentRef.current = null;
            scheduleDateTimeCycle();
          }, SLIDE_OUT_DURATION_MS);
        }, ROLE_CYCLE_SHOW_MS);
      }, SLIDE_OUT_DURATION_MS);
    }, DATETIME_SHOW_MS);
  };

  // Normal badge (role ↔ date/time cycle): only when queue empty. Do NOT reset on pathname change – keep current phase until it transitions.
  useEffect(() => {
    if (queue.length > 0) return;
    const isMainMenu = location.pathname === "/";
    if (isMainMenu && !hasEnteredMainMenuBefore) {
      setShowText(false);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (swapContentRef.current) clearTimeout(swapContentRef.current);
    if (showAgainRef.current) clearTimeout(showAgainRef.current);
    if (datetimeCycleRef.current) {
      clearTimeout(datetimeCycleRef.current);
      datetimeCycleRef.current = null;
    }
    setBadgePhase("role");
    hasStartedCycleRef.current = false;
    setShowText(false);
    showAgainRef.current = setTimeout(() => {
      setShowText(true);
      showAgainRef.current = null;
      timeoutRef.current = setTimeout(() => {
        setShowText(false);
        timeoutRef.current = null;
        swapContentRef.current = setTimeout(() => {
          hasStartedCycleRef.current = true;
          setBadgePhase("datetime");
          setShowText(true);
          swapContentRef.current = null;
          scheduleDateTimeCycle();
        }, SLIDE_OUT_DURATION_MS);
      }, SHOW_TEXT_AFTER_NAV_MS);
    }, 50);
    return () => {
      if (showAgainRef.current) clearTimeout(showAgainRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (swapContentRef.current) clearTimeout(swapContentRef.current);
      if (datetimeCycleRef.current) {
        clearTimeout(datetimeCycleRef.current);
        datetimeCycleRef.current = null;
      }
    };
  }, [queue.length, hasEnteredMainMenuBefore]);

  useEffect(() => {
    if (!user || queue.length > 0) return;
    const isMainMenu = location.pathname === "/";
    if (isMainMenu && !hasEnteredMainMenuBefore) {
      setHasEnteredMainMenuBefore(true);
      showMessage({
        content: t("userBadge.welcomeUser", "Welcome, {{name}}!", {
          name: user.username || t("userBadge.user", "User"),
        }),
        durationMs: WELCOME_SHOW_MS,
        style: "welcome",
      });
    }
  }, [location.pathname, user, queue.length, t, showMessage, hasEnteredMainMenuBefore, setHasEnteredMainMenuBefore]);

  if (!user) return null;

  const sizeConfig = {
    sm: { avatar: "w-9 h-19", icon: "w-6 h-6", name: "text-sm", gap: "gap-2", px: "px-2.5 py-1.5" },
    md: { avatar: "w-11 h-11", icon: "w-8 h-8", name: "text-sm", gap: "gap-3", px: "px-3 py-2" },
    lg: { avatar: "w-12 h-12", icon: "w-8 h-8", name: "text-base", gap: "gap-3", px: "px-4 py-2.5" },
  };

  const config = sizeConfig[size];

  const isAdminRole = isAdmin || userRole === "ADMIN";
  const roleLabel = isAdminRole
    ? t("userBadge.admin", "Admin")
    : t("userBadge.user", "User");

  const avatarColors = isAdminRole
    ? "bg-orange-500/15 dark:bg-orange-500/20"
    : "bg-primary/15 text-primary";

  const iconColors = isAdminRole
    ? "text-orange-500 dark:text-orange-400"
    : "text-primary";

  const renderMessageContent = () => {
    if (!currentMessage) return null;
    const { content, style = "default" } = currentMessage;
    const messageWrapClass =
      "flex items-start gap-1.5 w-[180px] min-w-[180px] font-semibold text-base text-left whitespace-normal break-words leading-tight";
    const textClass = "min-w-0 flex-1 line-clamp-2";
    if (style === "welcome") {
      return (
        <span
        className={cn(messageWrapClass, "text-primary dark:text-primary", size === "lg" && "text-lg", isRTL && "flex-row-reverse translate-x-15")}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <Sparkles className={cn("w-4 h-4 shrink-0 mt-0.5 text-amber-500 dark:text-amber-400", isRTL && "order-first")} strokeWidth={2} aria-hidden />
          <span className={cn(textClass, isRTL && "order-last")}>{content}</span>
        </span>
      );
    }
    if (style === "success") {
      return (
        <span className={cn(messageWrapClass, "text-green-600 dark:text-green-400", size === "lg" && "text-lg")}>
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
          <span className={textClass}>{content}</span>
        </span>
      );
    }
    if (style === "info") {
      return (
        <span className={cn(messageWrapClass, "text-blue-600 dark:text-blue-400", size === "lg" && "text-lg")}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={2} aria-hidden />
          <span className={textClass}>{content}</span>
        </span>
      );
    }
    return (
      <span className={cn(messageWrapClass, size === "lg" && "text-lg")}>
        <span className={textClass}>{content}</span>
      </span>
    );
  };

  return (
    <div
      className={cn(
        "group/badge flex items-center rounded-xl text-foreground",
        config.px,
        config.gap,
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full",
          avatarColors,
          config.avatar
        )}
      >
        <User className={cn("shrink-0", config.icon, iconColors)} strokeWidth={2} />
      </div>
      <div className="flex w-[181px] shrink-0 items-center overflow-hidden">
        <div
          className={cn(
            "w-px shrink-0 bg-border origin-center transition-transform duration-700 ease-in-out",
            size === "sm" && "h-8",
            size === "md" && "h-10",
            size === "lg" && "h-12",
            showLine
              ? "scale-y-100 delay-0"
              : "scale-y-0 delay-[400ms] group-hover/badge:scale-y-100 group-hover/badge:delay-0"
          )}
          aria-hidden
        />
        <div
          className={cn(
            "w-[180px] shrink-0 overflow-hidden flex items-center",
            size === "sm" && "h-8",
            size === "md" && "h-10",
            size === "lg" && "h-12"
          )}
        >
          <div
            className={cn(
              "w-[180px] flex flex-col items-start justify-center gap-0.5 pl-3 flex-shrink-0",
              size === "sm" && "min-h-[2rem]",
              size === "md" && "min-h-[2.5rem]",
              size === "lg" && "min-h-[3rem]",
              "transition-transform duration-700 ease-in-out",
              showText
                ? isRTL
                  ? "-translate-x-3 delay-[400ms] group-hover/badge:translate-x-0"
                  : "translate-x-0 delay-[400ms]"
                : isRTL
                  ? "translate-x-[100%] delay-0 group-hover/badge:-translate-x-3 group-hover/badge:delay-[400ms]"
                  : "translate-x-[-100%] delay-0 group-hover/badge:translate-x-0 group-hover/badge:delay-[400ms]"
            )}
          >
            {isMessageMode && currentMessage ? (
              renderMessageContent()
            ) : badgePhase === "datetime" ? (
              <span className="flex flex-col w-[180px] min-w-[180px] text-foreground [line-height:1.15] badge-datetime-alive">
                <div className="flex items-center gap-2 text-sm font-medium [line-height:1.15]">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span>{currentDateTime.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium [line-height:1.15] -mt-px mt-0.5">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>{currentDateTime.toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </span>
            ) : (
              <>
                <span className={cn("font-medium truncate max-w-[140px]", config.name)}>
                  {user.username || t("userBadge.user", "User")}
                </span>
                {showRole && (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium antialiased",
                      isAdminRole ? "text-orange-500 dark:text-orange-400" : "text-muted-foreground"
                    )}
                  >
                    {isAdminRole && <Crown className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />}
                    {roleLabel}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserBadge;