import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../utils";
import type { WelcomeSectionNavItem } from "./welcomeSectionNav";

const PAGE_END_THRESHOLD_PX = 120;
const PAGE_TOP_THRESHOLD_PX = 120;
const POST_COMPLETE_DISMISS_MS = 8000;
const JOURNEY_SLIDE_OUT_MS = 1000;

export type WelcomeJourneyNavProps = {
  items: readonly WelcomeSectionNavItem[];
  activeId: string;
  onNavigate: (sectionId: string) => void;
  onBackToTop: () => void;
  isRTL?: boolean;
  className?: string;
};

export function WelcomeJourneyNav({
  items,
  activeId,
  onNavigate,
  onBackToTop,
  isRTL = false,
  className,
}: WelcomeJourneyNavProps) {
  const { t } = useTranslation();
  const [isNearPageEnd, setIsNearPageEnd] = useState(false);
  const [isNearPageTop, setIsNearPageTop] = useState(true);
  const [visitedSectionIds, setVisitedSectionIds] = useState<ReadonlySet<string>>(() => new Set());
  const [journeyCompleteLatched, setJourneyCompleteLatched] = useState(false);
  const [journeyExiting, setJourneyExiting] = useState(false);
  const [journeyDismissed, setJourneyDismissed] = useState(false);

  const activeIndex = useMemo(() => {
    const index = items.findIndex((item) => item.id === activeId);
    return index >= 0 ? index : 0;
  }, [activeId, items]);

  useEffect(() => {
    if (!activeId) {
      return;
    }

    setVisitedSectionIds((previous) => {
      if (previous.has(activeId)) {
        return previous;
      }

      const next = new Set(previous);
      next.add(activeId);
      return next;
    });
  }, [activeId]);

  const allSectionsVisited = useMemo(
    () => items.length > 0 && items.every((item) => visitedSectionIds.has(item.id)),
    [items, visitedSectionIds],
  );

  const nextItem = activeIndex < items.length - 1 ? items[activeIndex + 1] : null;

  useEffect(() => {
    if (journeyCompleteLatched || !allSectionsVisited || !isNearPageTop) {
      return;
    }
    setJourneyCompleteLatched(true);
  }, [allSectionsVisited, isNearPageTop, journeyCompleteLatched]);

  const isJourneyComplete = journeyCompleteLatched;
  const showBackToTop = !isJourneyComplete && (isNearPageEnd || activeIndex >= items.length - 1);
  const progressPercent =
    items.length > 0
      ? isJourneyComplete
        ? 100
        : (visitedSectionIds.size / items.length) * 100
      : 0;

  useEffect(() => {
    const updateScrollState = () => {
      const doc = document.documentElement;
      setIsNearPageTop(window.scrollY <= PAGE_TOP_THRESHOLD_PX);
      setIsNearPageEnd(
        window.scrollY + window.innerHeight >= doc.scrollHeight - PAGE_END_THRESHOLD_PX,
      );
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    if (!isJourneyComplete || journeyDismissed) {
      return;
    }

    const id = window.setTimeout(() => {
      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        setJourneyDismissed(true);
      } else {
        setJourneyExiting(true);
      }
    }, POST_COMPLETE_DISMISS_MS);

    return () => window.clearTimeout(id);
  }, [isJourneyComplete, journeyDismissed]);

  useEffect(() => {
    if (!journeyExiting || journeyDismissed) {
      return;
    }
    const id = window.setTimeout(() => setJourneyDismissed(true), JOURNEY_SLIDE_OUT_MS + 200);
    return () => window.clearTimeout(id);
  }, [journeyExiting, journeyDismissed]);

  const nextSectionLabel = nextItem
    ? t(nextItem.labelKey, nextItem.defaultLabel)
    : t("welcome.sectionNav.legal", "Legal");

  const handleJourneyExitAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !journeyExiting) {
      return;
    }
    const { animationName } = event;
    if (!animationName.includes("journey-nav-exit-slide")) {
      return;
    }
    setJourneyDismissed(true);
  };

  if (journeyDismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed bottom-6 z-40 sm:bottom-8",
        isRTL ? "right-4 sm:right-5" : "left-4 sm:left-5",
        className,
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-[10.75rem] overflow-hidden rounded-xl border bg-background/88 shadow-md shadow-black/10 backdrop-blur-md sm:w-[11.5rem]",
          "transition-[box-shadow,border-color] duration-300 ease-out motion-reduce:transition-none",
          isJourneyComplete
            ? "border-emerald-500/45 shadow-emerald-500/10"
            : "border-border/50 hover:border-border/70 hover:shadow-lg",
          journeyExiting && "pointer-events-none",
          journeyExiting && (isRTL ? "journey-nav-exit-slide-rtl" : "journey-nav-exit-slide-ltr"),
        )}
        onAnimationEnd={journeyExiting ? handleJourneyExitAnimationEnd : undefined}
      >
        <div
          className={cn("h-0.5", isJourneyComplete ? "bg-emerald-500/20" : "bg-primary/15")}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progressPercent)}
          aria-label={t("welcome.journey.progressAria", "Welcome page progress")}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
              isJourneyComplete ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {isJourneyComplete ? (
          <div
            role="status"
            className="flex w-full items-center gap-2 px-2.5 py-2 text-start sm:px-3 sm:py-2.5"
            aria-label={t("welcome.journey.completeAria", "Welcome page overview completed")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
              <Check className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight text-emerald-700 dark:text-emerald-300">
                {t("welcome.journey.completeTitle", "Overview complete")}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                {t("welcome.journey.completeHint", "You have viewed every section")}
              </span>
            </span>
          </div>
        ) : showBackToTop ? (
          <button
            type="button"
            onClick={onBackToTop}
            className={cn(
              "flex w-full items-center gap-2 px-2.5 py-2 text-start sm:px-3 sm:py-2.5",
              "transition-colors duration-200 ease-out motion-reduce:transition-none",
              "hover:bg-muted/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            )}
            aria-label={t("welcome.journey.backToTopAria", "Back to top of the welcome page")}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <ChevronUp className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight text-foreground">
                {t("welcome.journey.backToTop", "Back to top")}
              </span>
              <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                {t("welcome.journey.backToTopHint", "Return to the welcome overview")}
              </span>
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => nextItem && onNavigate(nextItem.id)}
            disabled={!nextItem}
            className={cn(
              "group flex w-full items-center gap-2 px-2.5 py-2 text-start sm:px-3 sm:py-2.5",
              "transition-colors duration-200 ease-out motion-reduce:transition-none",
              "hover:bg-muted/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
            aria-label={t("welcome.journey.exploreAria", {
              section: nextSectionLabel,
              defaultValue: "Discover next section: {{section}}",
            })}
          >
            <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
              <span
                aria-hidden
                className="journey-explore-ring pointer-events-none absolute inset-0 rounded-full border border-primary-foreground/25"
              />
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-shadow duration-200 group-hover:shadow-md">
                <ChevronDown className="journey-chevron-nudge h-4 w-4" aria-hidden />
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-tight text-foreground">
                {t("welcome.journey.exploreMore", "Discover More")}
              </span>
              <span className="mt-0.5 block truncate text-[10px] leading-snug text-muted-foreground">
                {t("welcome.journey.nextSection", {
                  section: nextSectionLabel,
                  defaultValue: "Next: {{section}}",
                })}
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
