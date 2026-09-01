import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AboutFeatureDef } from "../about/featureDefinitions";
import { cn } from "../utils";

const DEFAULT_AUTO_ADVANCE_MS = 6500;
/** Tailwind `md` — below this, show one full-width feature (readable copy). */
const DESKTOP_CAROUSEL_MQ = "(min-width: 768px)";

export type FeaturesCarouselProps = {
  items: AboutFeatureDef[];
  isRTL: boolean;
  autoAdvanceMs?: number;
  tabListAriaLabel?: string;
  className?: string;
};

export function FeaturesCarousel({
  items,
  isRTL,
  autoAdvanceMs = DEFAULT_AUTO_ADVANCE_MS,
  tabListAriaLabel,
  className,
}: FeaturesCarouselProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [autoplayEpoch, setAutoplayEpoch] = useState(0);
  const [chargeProgress, setChargeProgress] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [perView, setPerView] = useState(1);
  const [slideShiftPx, setSlideShiftPx] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chargeElapsedRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const interactionHoldRef = useRef(false);
  const attentionHoldRef = useRef(false);
  const inViewRef = useRef(true);
  const tickControlRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const count = items.length;

  const updateSlideShift = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || count === 0) return;

    const viewportWidth = viewport.offsetWidth;
    const slideWidth = viewportWidth / perView;
    // 3-up: center active in the middle slot. 1-up: full-bleed active card.
    const shift =
      perView === 1 ? -index * slideWidth : slideWidth - index * slideWidth;

    setSlideShiftPx(isRTL ? -shift : shift);
  }, [count, index, isRTL, perView]);

  useEffect(() => {
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqDesktop = window.matchMedia(DESKTOP_CAROUSEL_MQ);

    const updateReduce = () => setReduceMotion(mqReduce.matches);
    const updatePerView = () => setPerView(mqDesktop.matches ? 3 : 1);

    updateReduce();
    updatePerView();
    mqReduce.addEventListener("change", updateReduce);
    mqDesktop.addEventListener("change", updatePerView);
    return () => {
      mqReduce.removeEventListener("change", updateReduce);
      mqDesktop.removeEventListener("change", updatePerView);
    };
  }, []);

  useEffect(() => {
    updateSlideShift();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const ro = new ResizeObserver(() => updateSlideShift());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [updateSlideShift]);

  const syncAttentionHold = useCallback(() => {
    const wasHeld = attentionHoldRef.current;
    attentionHoldRef.current =
      document.visibilityState === "hidden" || !inViewRef.current;
    if (!wasHeld && attentionHoldRef.current) {
      tickControlRef.current?.stop();
    } else if (wasHeld && !attentionHoldRef.current && !interactionHoldRef.current) {
      tickControlRef.current?.start();
    }
  }, []);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const onVisibilityChange = () => syncAttentionHold();
    document.addEventListener("visibilitychange", onVisibilityChange);

    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting && entry.intersectionRatio > 0;
        syncAttentionHold();
      },
      { threshold: [0, 0.01] },
    );
    observer.observe(node);
    syncAttentionHold();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      observer.disconnect();
    };
  }, [syncAttentionHold]);

  useEffect(() => {
    if (count <= 1) return;

    let frameId = 0;
    chargeElapsedRef.current = 0;
    lastTickAtRef.current = performance.now();

    const isHeld = () => interactionHoldRef.current || attentionHoldRef.current;

    const tick = (now: number) => {
      frameId = 0;
      if (isHeld()) {
        lastTickAtRef.current = now;
        return;
      }

      const delta = now - lastTickAtRef.current;
      chargeElapsedRef.current = Math.min(autoAdvanceMs, chargeElapsedRef.current + delta);
      lastTickAtRef.current = now;

      const progress = chargeElapsedRef.current / autoAdvanceMs;
      setChargeProgress(reduceMotion ? 1 : progress);

      if (progress >= 1) {
        setIndex((current) => (current + 1) % count);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    const startTick = () => {
      if (frameId !== 0 || isHeld()) return;
      lastTickAtRef.current = performance.now();
      frameId = requestAnimationFrame(tick);
    };

    const stopTick = () => {
      if (frameId === 0) return;
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    tickControlRef.current = { start: startTick, stop: stopTick };

    setChargeProgress(reduceMotion ? 1 : 0);
    startTick();

    return () => {
      stopTick();
      tickControlRef.current = null;
    };
  }, [reduceMotion, count, index, autoplayEpoch, autoAdvanceMs]);

  const setActiveFeatureHold = (held: boolean) => {
    const wasHeld = interactionHoldRef.current;
    interactionHoldRef.current = held;
    if (!wasHeld && held) {
      tickControlRef.current?.stop();
    } else if (wasHeld && !held && !attentionHoldRef.current) {
      tickControlRef.current?.start();
    }
  };

  const selectFeature = (featureIndex: number) => {
    setIndex(featureIndex);
    setAutoplayEpoch((epoch) => epoch + 1);
  };

  const tabListLabel = tabListAriaLabel ?? t("about.features.title", "Key Features");
  const singleSlide = perView === 1;

  return (
    <div className={cn("mx-auto w-full max-w-6xl", className)}>
      <div ref={viewportRef} className="overflow-hidden" aria-live="polite">
        <div
          className={cn(
            "flex",
            !reduceMotion && "transition-transform duration-700 ease-in-out motion-reduce:transition-none",
          )}
          style={{ transform: `translateX(${slideShiftPx}px)` }}
        >
          {items.map((def, featureIndex) => {
            const Icon = def.icon;
            const isActive = featureIndex === index;
            const goToFeature = () => selectFeature(featureIndex);
            const isPremium = Boolean(def.premium);

            return (
              <article
                key={def.titleKey}
                className={cn(
                  "flex shrink-0 flex-col items-center text-center transition-all duration-500 ease-out motion-reduce:transition-none",
                  singleSlide
                    ? "w-full px-4 sm:px-6"
                    : "w-1/3 px-2 sm:px-3 lg:px-4",
                  isActive
                    ? "scale-100 opacity-100"
                    : singleSlide
                      ? "scale-100 opacity-0"
                      : "scale-90 opacity-40",
                  !isActive && count > 1 && !singleSlide && "cursor-pointer hover:opacity-55",
                )}
                aria-hidden={!isActive}
                onMouseEnter={isActive ? () => setActiveFeatureHold(true) : undefined}
                onMouseLeave={isActive ? () => setActiveFeatureHold(false) : undefined}
                onFocus={isActive ? () => setActiveFeatureHold(true) : undefined}
                onBlur={isActive ? () => setActiveFeatureHold(false) : undefined}
                onClick={!isActive && count > 1 && !singleSlide ? goToFeature : undefined}
                onKeyDown={
                  !isActive && count > 1 && !singleSlide
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToFeature();
                        }
                      }
                    : undefined
                }
                role={!isActive && count > 1 && !singleSlide ? "button" : undefined}
                tabIndex={!isActive && count > 1 && !singleSlide ? 0 : undefined}
              >
                {isPremium ? (
                  <span
                    className={cn(
                      "mb-2 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] sm:text-[11px]",
                      isActive
                        ? "border-violet-400/45 bg-violet-500/15 text-violet-700 dark:border-violet-400/35 dark:text-violet-200"
                        : "border-violet-400/25 bg-violet-500/10 text-violet-600/80 dark:text-violet-300/75",
                    )}
                  >
                    {t("pricing.premiumBadge", "Premium")}
                  </span>
                ) : null}
                <div
                  className={cn(
                    "mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-500 sm:mb-4 sm:h-14 sm:w-14 lg:mb-5",
                    isPremium
                      ? isActive
                        ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        : "bg-violet-500/10 text-violet-600/70 dark:text-violet-400/65"
                      : isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-muted/50 text-muted-foreground",
                  )}
                >
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
                </div>
                <h3
                  className={cn(
                    "text-base font-semibold transition-colors duration-500 sm:text-lg lg:text-xl",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {t(def.titleKey)}
                </h3>
                <p
                  className={cn(
                    "mt-1.5 leading-relaxed transition-colors duration-500 sm:mt-2 lg:mt-3",
                    singleSlide
                      ? "max-w-md text-sm sm:text-base"
                      : "max-w-sm text-xs sm:text-sm lg:text-base",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/70",
                  )}
                >
                  {t(def.descKey)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
      <div
        className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
        role="tablist"
        aria-label={tabListLabel}
      >
        {items.map((def, i) => {
          const isActive = i === index;
          return (
            <button
              key={def.titleKey}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={t(def.titleKey)}
              onClick={() => selectFeature(i)}
              className={cn(
                "h-1.5 shrink-0 rounded-full transition-all duration-300 ease-out motion-reduce:transition-none sm:h-2",
                isActive
                  ? "relative w-8 overflow-hidden bg-muted-foreground/25 sm:w-10"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50 sm:w-2",
              )}
            >
              {isActive ? (
                <span
                  className={cn(
                    "absolute inset-0 rounded-full bg-primary will-change-transform",
                    isRTL ? "origin-right" : "origin-left",
                  )}
                  style={{ transform: `scaleX(${chargeProgress})` }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
