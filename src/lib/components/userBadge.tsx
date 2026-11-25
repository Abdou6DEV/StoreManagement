import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Crown, Sparkles, CheckCircle, Info, Calendar, Clock, PackageSearch, Users, FileText, Wrench, ShoppingCart, CheckCircle2, ClipboardList } from "lucide-react";
import { cn } from "../utils";
import { useAuth } from "../contexts/authContext";
import { useBadgeMessage } from "../contexts/badgeMessageContext";
import { useTranslation } from "react-i18next";
import { UserBadgeAvatar } from "./sharedPresentation";
import {
  OPEN_SETUP_CHECKLIST_EVENT,
  SETUP_CHECKLIST_COMPLETED_KEY,
  SETUP_CHECKLIST_STATUS_EVENT,
  SETUP_CHECKLIST_STATUS_REQUEST_EVENT,
  SETUP_DATA_CHANGED_EVENT,
} from "../onboarding/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdownMenu";

const SHOW_TEXT_AFTER_NAV_MS = 4000;
const WELCOME_SHOW_MS = 6500;
const SLIDE_OUT_DURATION_MS = 400;
/** How long to show date/time in nav badge before cycling back to role (ms) */
const DATETIME_SHOW_MS = 60000;
/** How long role/username stays visible in the cycle after datetime (ms) */
const ROLE_CYCLE_SHOW_MS = 6000;

function capitalizeFirst(str: string): string {
  if (!str || str.length === 0) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Locale for date/time in badge: EN, FR, AR */
const BADGE_DATE_LOCALES: Record<string, string> = {
  en: "en-GB",
  fr: "fr-FR",
  ar: "ar",
};

function formatBadgeDate(date: Date, locale: string): string {
  const intlLocale = BADGE_DATE_LOCALES[locale] || "en-GB";
  return date.toLocaleDateString(intlLocale, {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface UserBadgeProps {
  className?: string;
  showRole?: boolean;
  size?: "sm" | "md" | "lg";
  setupProgressAnimationKey?: number;
}

export function UserBadge({
  className = "",
  showRole = true,
  size = "md",
  setupProgressAnimationKey,
}: UserBadgeProps) {
  const { user, userRole, isAdmin } = useAuth();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
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
  const [setupCounts, setSetupCounts] = useState({ products: 0, clients: 0, bills: 0, services: 0, sales: 0 });
  const [setupChecklistHidden, setSetupChecklistHidden] = useState(true);
  const [setupChecklistResolved, setSetupChecklistResolved] = useState(false);
  const [setupMenuOpen, setSetupMenuOpen] = useState(false);
  const [setupChecklistCelebrating, setSetupChecklistCelebrating] = useState(false);
  const completionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setupChecklistHiddenRef = useRef(true);
  const setupChecklistResolvedRef = useRef(false);
  const setupChecklistCelebratingRef = useRef(false);
  const pendingSetupNavigationRef = useRef<{ path: string; taskId: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refreshSetupCounts = async () => {
      if (typeof window === "undefined" || !window.api?.database) return;
      try {
        const [products, clients, bills, services, sales] = await Promise.all([
          window.api.database.products.getAll(),
          window.api.database.clients.getAll(),
          window.api.database.bills.getAll(),
          window.api.database.serviceAppointments.getAll(),
          window.api.database.sales.getAll(),
        ]);
        if (!cancelled) {
          const nextCounts = {
            products: Array.isArray(products) ? products.length : 0,
            clients: Array.isArray(clients) ? clients.length : 0,
            bills: Array.isArray(bills) ? bills.length : 0,
            services: Array.isArray(services) ? services.length : 0,
            sales: Array.isArray(sales) ? sales.length : 0,
          };
          setSetupCounts(nextCounts);

          const isComplete =
            nextCounts.products >= 3 &&
            nextCounts.clients >= 3 &&
            nextCounts.bills >= 1 &&
            nextCounts.services >= 1 &&
            nextCounts.sales >= 1;

          if (!isComplete) {
            if (completionTimerRef.current) {
              clearTimeout(completionTimerRef.current);
              completionTimerRef.current = null;
            }
            if (setupChecklistHiddenRef.current || setupChecklistCelebratingRef.current) {
              void window.api?.database?.options?.set?.(SETUP_CHECKLIST_COMPLETED_KEY, "0");
              setupChecklistHiddenRef.current = false;
              setupChecklistCelebratingRef.current = false;
              setSetupChecklistHidden(false);
              setSetupChecklistCelebrating(false);
            } else {
              setupChecklistHiddenRef.current = false;
              setSetupChecklistHidden(false);
            }
            setupChecklistResolvedRef.current = true;
            setSetupChecklistResolved(true);
          }

          if (isComplete && (!setupChecklistHiddenRef.current || !setupChecklistResolvedRef.current) && !setupChecklistCelebratingRef.current) {
            if (window.api?.database?.options?.get) {
              const persistedValue = await window.api.database.options.get(SETUP_CHECKLIST_COMPLETED_KEY).catch(() => null);
              if (cancelled) return;
              setupChecklistResolvedRef.current = true;
              setSetupChecklistResolved(true);
              if (persistedValue === "1") {
                setupChecklistHiddenRef.current = true;
                setSetupChecklistHidden(true);
                return;
              }
            }

            setupChecklistCelebratingRef.current = true;
            setSetupChecklistCelebrating(true);
            if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
            completionTimerRef.current = setTimeout(() => {
              void window.api?.database?.options?.set?.(SETUP_CHECKLIST_COMPLETED_KEY, "1");
              setupChecklistCelebratingRef.current = false;
              setupChecklistHiddenRef.current = true;
              setSetupChecklistCelebrating(false);
              setSetupChecklistHidden(true);
              completionTimerRef.current = null;
            }, 10000);
          }
        }
      } catch {
        // Keep the last known counts if a database refresh temporarily fails.
      }
    };

    void refreshSetupCounts();
    const interval = window.setInterval(refreshSetupCounts, 1500);
    window.addEventListener("focus", refreshSetupCounts);
    window.addEventListener(SETUP_DATA_CHANGED_EVENT, refreshSetupCounts);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshSetupCounts);
      window.removeEventListener(SETUP_DATA_CHANGED_EVENT, refreshSetupCounts);
    };
  }, [location.pathname]);

  useEffect(() => {
    const publishChecklistStatus = () => {
      const remainingCount = setupChecklistHidden
        ? 0
        : Number(setupCounts.products < 3) +
          Number(setupCounts.clients < 3) +
          Number(setupCounts.bills < 1) +
          Number(setupCounts.services < 1) +
          Number(setupCounts.sales < 1);
      window.dispatchEvent(
        new CustomEvent(SETUP_CHECKLIST_STATUS_EVENT, {
          detail: { remainingCount },
        }),
      );
    };

    window.addEventListener(SETUP_CHECKLIST_STATUS_REQUEST_EVENT, publishChecklistStatus);
    publishChecklistStatus();
    return () => {
      window.removeEventListener(SETUP_CHECKLIST_STATUS_REQUEST_EVENT, publishChecklistStatus);
    };
  }, [setupCounts, setupChecklistHidden]);

  useEffect(() => {
    const openChecklist = () => {
      if (!setupChecklistHiddenRef.current) setSetupMenuOpen(true);
    };
    window.addEventListener(OPEN_SETUP_CHECKLIST_EVENT, openChecklist);
    return () => window.removeEventListener(OPEN_SETUP_CHECKLIST_EVENT, openChecklist);
  }, []);

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
          name: capitalizeFirst(user.username || t("userBadge.user", "User")),
        }),
        durationMs: WELCOME_SHOW_MS,
        style: "welcome",
      });
    }
  }, [location.pathname, user, queue.length, t, showMessage, hasEnteredMainMenuBefore, setHasEnteredMainMenuBefore]);

  if (!user) return null;

  const sizeConfig = {
    sm: { name: "text-sm", gap: "gap-2", px: "px-2.5 py-1.5" },
    md: { name: "text-sm", gap: "gap-3", px: "px-3 py-2" },
    lg: { name: "text-base", gap: "gap-3", px: "px-4 py-2.5" },
  };

  const config = sizeConfig[size];

  const isAdminRole = isAdmin || userRole === "ADMIN";
  const roleLabel = isAdminRole
    ? t("userBadge.admin", "Admin")
    : t("userBadge.user", "User");

  const setupTasks = [
    {
      id: "stock",
      count: setupCounts.products,
      target: 3,
      path: "/stock",
      label: t("userBadge.setupTasks.stock", "Add your first 3 products"),
      progressLabel: t("userBadge.setupTasks.stockProgress", "{{count}} / 3", { count: Math.min(setupCounts.products, 3) }),
      icon: PackageSearch,
    },
    {
      id: "clients",
      count: setupCounts.clients,
      target: 3,
      path: "/clients",
      label: t("userBadge.setupTasks.clients", "Add your first 3 clients"),
      progressLabel: t("userBadge.setupTasks.clientsProgress", "{{count}} / 3", { count: Math.min(setupCounts.clients, 3) }),
      icon: Users,
    },
    {
      id: "bills",
      count: setupCounts.bills,
      target: 1,
      path: "/bills",
      label: t("userBadge.setupTasks.bill", "Create your first bill"),
      progressLabel: t("userBadge.setupTasks.billProgress", "{{count}} / 1", { count: Math.min(setupCounts.bills, 1) }),
      icon: FileText,
    },
    {
      id: "services",
      count: setupCounts.services,
      target: 1,
      path: "/services",
      label: t("userBadge.setupTasks.service", "Create your first service"),
      progressLabel: t("userBadge.setupTasks.serviceProgress", "{{count}} / 1", { count: Math.min(setupCounts.services, 1) }),
      icon: Wrench,
    },
    {
      id: "sales",
      count: setupCounts.sales,
      target: 1,
      path: "/cashier",
      label: t("userBadge.setupTasks.sale", "Make your first sale"),
      progressLabel: t("userBadge.setupTasks.saleProgress", "{{count}} / 1", { count: Math.min(setupCounts.sales, 1) }),
      icon: ShoppingCart,
    },
  ];

  const remainingSetupTasks = setupTasks.filter((task) => task.count < task.target);
  const sortedSetupTasks = [...remainingSetupTasks, ...setupTasks.filter((task) => task.count >= task.target)];
  const setupProgress = setupTasks.reduce((total, task) => {
    return total + (task.count >= task.target ? 20 : 0);
  }, 0);

  const renderMessageContent = () => {
    if (!currentMessage) return null;
    const { content, style = "default" } = currentMessage;
    const messageWrapClass =
      "flex items-start gap-1.5 w-[260px] min-w-[260px] font-semibold text-base text-left whitespace-normal break-words leading-tight";
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
        "flex items-center rounded-xl text-foreground",
        config.px,
        config.gap,
        className
      )}
    >
      {setupChecklistHidden || !setupChecklistResolved ? (
        <div className="rounded-full">
          <UserBadgeAvatar
            isAdmin={isAdminRole}
            username={user.username || ""}
            size={size}
            setupProgressAnimationKey={setupProgressAnimationKey}
          />
        </div>
      ) : (
      <DropdownMenu open={setupMenuOpen} onOpenChange={setSetupMenuOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            aria-label={t("userBadge.setupTasks.menuLabel", "Setup checklist: {{progress}} percent complete", { progress: Math.round(setupProgress) })}
          >
            <UserBadgeAvatar
              isAdmin={isAdminRole}
              username={user.username || ""}
              size={size}
              setupProgress={setupChecklistCelebrating ? 100 : setupProgress}
              setupProgressAnimationKey={setupProgressAnimationKey}
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={isRTL ? "end" : "start"}
          sideOffset={8}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const pendingNavigation = pendingSetupNavigationRef.current;
            pendingSetupNavigationRef.current = null;
            if (pendingNavigation) {
              navigate(pendingNavigation.path, {
                state: { setupTask: pendingNavigation.taskId },
              });
            }
          }}
          className={cn("w-[300px] p-2", isRTL && "text-right")}
        >
          <DropdownMenuLabel className="font-semibold text-base px-2 py-2.5">
            <span className="flex items-center gap-2">
              {remainingSetupTasks.length > 0 ? (
                <>
                  <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    {t("navigation.getStarted", "Get started")}
                    <span className="ml-2 text-sm text-muted-foreground font-normal">
                      ({remainingSetupTasks.length})
                    </span>
                  </span>
                </>
              ) : (
                <span>{t("userBadge.setupTasks.complete", "Setup complete")}</span>
              )}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sortedSetupTasks.length > 0 ? (
            sortedSetupTasks.map((task) => {
              const Icon = task.icon;
              const isCompleted = task.count >= task.target;
              return (
                <DropdownMenuItem
                  key={task.id}
                  disabled={isCompleted}
                  onSelect={(event) => {
                    event.preventDefault();
                    pendingSetupNavigationRef.current = {
                      path: task.path,
                      taskId: task.id,
                    };
                    setSetupMenuOpen(false);
                  }}
                  className={cn(
                    "min-h-14 cursor-pointer items-center gap-3 px-2 py-2",
                    isCompleted && "cursor-default opacity-100",
                  )}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                    <Icon className={cn("h-4 w-4", isCompleted && "text-green-600 dark:text-green-400")} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={cn("font-medium leading-tight", isCompleted && "text-green-600 dark:text-green-400")}>{task.label}</span>
                    <span className={cn("text-xs", isCompleted ? "font-semibold text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>{task.progressLabel}</span>
                  </span>
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="flex min-h-14 items-center gap-3 px-2 py-3 text-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
              <span>{t("userBadge.setupTasks.completeDescription", "You completed the essential setup tasks.")}</span>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      )}
      <div className="flex w-[261px] shrink-0 items-center overflow-hidden">
        <div
          className={cn(
            "w-px shrink-0 bg-border origin-center transition-transform duration-700 ease-in-out",
            size === "sm" && "h-8",
            size === "md" && "h-10",
            size === "lg" && "h-12",
            showLine
              ? "scale-y-100 delay-0"
              : "scale-y-0 delay-[400ms]"
          )}
          aria-hidden
        />
        <div
          className={cn(
            "w-[260px] shrink-0 overflow-hidden flex items-center",
            size === "sm" && "h-8",
            size === "md" && "h-10",
            size === "lg" && "h-12"
          )}
        >
          <div
            className={cn(
              "w-[260px] flex flex-col items-start justify-center gap-0.5 pl-3 flex-shrink-0",
              size === "sm" && "min-h-[2rem]",
              size === "md" && "min-h-[2.5rem]",
              size === "lg" && "min-h-[3rem]",
              "transition-transform duration-700 ease-in-out",
              showText
                ? isRTL
                  ? "-translate-x-3 delay-[400ms]"
                  : "translate-x-0 delay-[400ms]"
                : isRTL
                  ? "translate-x-[100%] delay-0"
                  : "translate-x-[-100%] delay-0"
            )}
          >
            {isMessageMode && currentMessage ? (
              renderMessageContent()
            ) : badgePhase === "datetime" ? (
              <span className="flex flex-col w-[260px] min-w-[260px] text-foreground [line-height:1.15] badge-datetime-alive">
                <div className="flex items-center gap-2 text-sm font-medium [line-height:1.15]">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <span>{formatBadgeDate(currentDateTime, i18n.language)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium [line-height:1.15] -mt-px mt-0.5">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>{currentDateTime.toLocaleTimeString(BADGE_DATE_LOCALES[i18n.language] || "en-GB", { hour12: false, hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </span>
            ) : (
              <>
                <span className={cn("font-medium truncate max-w-[220px]", config.name)}>
                  {capitalizeFirst(user.username || t("userBadge.user", "User"))}
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