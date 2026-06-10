import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AboutFeatureDef } from "../about/featureDefinitions";
import { cn } from "../utils";

const DEFAULT_AUTO_ADVANCE_MS = 6500;

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
  const [slideShiftPx, setSlideShiftPx] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chargeElapsedRef = useRef(0);
  const lastTickAtRef = useRef(0);
  const interactionHoldRef = useRef(false);
  const attentionHoldRef = useRef(false);
  const inViewRef = useRef(true);
  const count = items.length;

  const updateSlideShift = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || count === 0) return;

    const viewportWidth = viewport.offsetWidth;
    const perView = 3;
    const slideWidth = viewportWidth / perView;
    const shift = slideWidth - index * slideWidth;

    setSlideShiftPx(isRTL ? -shift : shift);
  }, [count, index, isRTL]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
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
    attentionHoldRef.current =
      document.visibilityState === "hidden" || !inViewRef.current;
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

    const tick = (now: number) => {
      if (!interactionHoldRef.current && !attentionHoldRef.current) {
        const delta = now - lastTickAtRef.current;
        chargeElapsedRef.current = Math.min(autoAdvanceMs, chargeElapsedRef.current + delta);
      }
      lastTickAtRef.current = now;

      const progress = chargeElapsedRef.current / autoAdvanceMs;
      setChargeProgress(reduceMotion ? 1 : progress);

      if (progress >= 1) {
        setIndex((current) => (current + 1) % count);
        return;
      }

      frameId = requestAnimationFrame(tick);
    };

    setChargeProgress(reduceMotion ? 1 : 0);
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [reduceMotion, count, index, autoplayEpoch, autoAdvanceMs]);

  const setActiveFeatureHold = (held: boolean) => {
    interactionHoldRef.current = held;
  };

  const selectFeature = (featureIndex: number) => {
    setIndex(featureIndex);
    setAutoplayEpoch((epoch) => epoch + 1);
  };

  const tabListLabel = tabListAriaLabel ?? t("about.features.title", "Key Features");

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

            return (
              <article
                key={def.titleKey}
                className={cn(
                  "flex w-1/3 shrink-0 flex-col items-center px-2 text-center transition-all duration-500 ease-out motion-reduce:transition-none sm:px-3 lg:px-4",
                  isActive ? "scale-100 opacity-100" : "scale-90 opacity-40",
                  !isActive && count > 1 && "cursor-pointer hover:opacity-55",
                )}
                aria-hidden={!isActive}
                onMouseEnter={isActive ? () => setActiveFeatureHold(true) : undefined}
                onMouseLeave={isActive ? () => setActiveFeatureHold(false) : undefined}
                onFocus={isActive ? () => setActiveFeatureHold(true) : undefined}
                onBlur={isActive ? () => setActiveFeatureHold(false) : undefined}
                onClick={!isActive && count > 1 ? goToFeature : undefined}
                onKeyDown={
                  !isActive && count > 1
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToFeature();
                        }
                      }
                    : undefined
                }
                role={!isActive && count > 1 ? "button" : undefined}
                tabIndex={!isActive && count > 1 ? 0 : undefined}
              >
                <div
                  className={cn(
                    "mb-3 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-500 sm:mb-4 sm:h-14 sm:w-14 lg:mb-5",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground",
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
                {/* Mobile: better text handling with smaller font and controlled width */}
                <p
                  className={cn(
                    "mt-2 max-w-[90%] text-[11px] leading-snug transition-colors duration-500 sm:mt-2.5 sm:max-w-sm sm:text-sm sm:leading-relaxed lg:mt-3 lg:max-w-sm lg:text-base",
                    isActive ? "text-muted-foreground" : "text-muted-foreground/70",
                  )}
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t(def.descKey)}
                </p>
              </article>
            );
          })}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2"
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