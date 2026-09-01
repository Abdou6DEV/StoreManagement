import React, { lazy, Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Sparkles } from "lucide-react";
import { NebulaBackground } from "../../lib/components/backgrounds/NebulaBackground";
import { Button } from "../../lib/components/button";
import { cn } from "../../lib/utils";
import { WELCOME_PREMIUM_FEATURE_DEFS } from "../../lib/welcome/premiumFeatureDefinitions";

const Orb = lazy(() => import("../../lib/components/assistant-ui/orb"));

/** Idle ring → brief “alive” pulse → idle (loops). */
const ORB_IDLE_MS = 10000;
const ORB_ACTIVE_MS = 10000;

type WelcomePremiumSectionProps = {
  isRTL: boolean;
  reduceMotion: boolean;
  nebulaActive: boolean;
  onScrollToPricing: () => void;
};

function PremiumOrb({
  reduceMotion,
  pulseEnabled,
}: {
  reduceMotion: boolean;
  pulseEnabled: boolean;
}) {
  const [orbActive, setOrbActive] = useState(false);

  useEffect(() => {
    if (reduceMotion || !pulseEnabled) {
      setOrbActive(false);
      return;
    }

    let cancelled = false;
    let timeoutId = 0;

    const runIdle = () => {
      if (cancelled) return;
      setOrbActive(false);
      timeoutId = window.setTimeout(runActive, ORB_IDLE_MS);
    };

    const runActive = () => {
      if (cancelled) return;
      setOrbActive(true);
      timeoutId = window.setTimeout(runIdle, ORB_ACTIVE_MS);
    };

    runIdle();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [reduceMotion, pulseEnabled]);

  if (reduceMotion) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="welcome-premium-ai-fallback">AI</span>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="h-full w-full animate-pulse rounded-full bg-violet-950/50" aria-hidden />
      }
    >
      <Orb
        hue={0}
        hoverIntensity={0.85}
        rotateOnHover
        forceHoverState={orbActive}
        backgroundColor="#000000"
        labelFontSize="2.75rem"
      />
    </Suspense>
  );
}

export function WelcomePremiumSection({
  isRTL,
  reduceMotion,
  nebulaActive,
  onScrollToPricing,
}: WelcomePremiumSectionProps) {
  const { t } = useTranslation();

  return (
    <div
      className="welcome-premium-shell relative min-h-[32rem] text-white"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <NebulaBackground paused={!nebulaActive || reduceMotion} />

      {/* Edge vignette — keeps nebula vivid while anchoring content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_45%,transparent_0%,rgba(3,4,12,0.35)_55%,rgba(3,4,12,0.82)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#030712]/90 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#030712]/95 to-transparent"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        {/*
          Rely on dir=rtl for row mirroring — do not also apply flex-row-reverse
          (that double-flips and leaves Arabic looking LTR).
        */}
        <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-14">
          <div aria-hidden className="relative shrink-0">
            <span className="welcome-premium-orb-glow pointer-events-none absolute -inset-8 rounded-full" />
            <span className="pointer-events-none absolute -inset-1 rounded-full border border-violet-400/25" />
            <div className="relative h-36 w-36 rounded-full border border-violet-300/20 bg-black shadow-[0_0_60px_-12px_rgba(139,92,246,0.75)] sm:h-40 sm:w-40">
              <div className="absolute inset-0 overflow-hidden rounded-full" dir="ltr">
                <PremiumOrb reduceMotion={reduceMotion} pulseEnabled={nebulaActive} />
              </div>
            </div>
          </div>

          <div className="max-w-xl text-center lg:text-start">
            <span className="welcome-premium-badge mb-5 inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-200" aria-hidden />
              {t("pricing.premiumBadge", "Premium")}
            </span>

            <h2 className="welcome-premium-title py-2 text-[1.85rem] font-bold leading-[1.15] tracking-tight sm:text-[2.15rem] lg:text-[2.35rem]">
              {t("welcome.premium.title", "Work smarter with REDA AI")}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-violet-100/88 sm:text-lg">
              {t(
                "welcome.premium.subtitle",
                "Premium adds an AI shop assistant, receipt scanning, product photo search, and cloud backup — on top of the full desktop POS.",
              )}
            </p>

            <div className="mt-8 flex justify-center lg:justify-start">
              <Button
                type="button"
                onClick={onScrollToPricing}
                className={cn(
                  "welcome-premium-cta h-11 rounded-xl border-0 px-6 text-sm font-semibold shadow-lg",
                  "text-white hover:opacity-95",
                )}
              >
                {t("welcome.premium.seePlans", "See Premium plans")}
                <ArrowRight
                  className={cn("h-4 w-4 shrink-0", isRTL && "rotate-180")}
                  aria-hidden
                />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-5">
          {WELCOME_PREMIUM_FEATURE_DEFS.map(({ icon: Icon, titleKey, descKey}) => (
            <article key={titleKey} className="welcome-premium-card group p-5 text-start sm:p-6">
              <div className="welcome-premium-card-icon mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
                <Icon className="h-5 w-5 text-violet-100" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white">{t(titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-violet-100/72">{t(descKey)}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
