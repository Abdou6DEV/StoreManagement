import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, useReducedMotion } from "motion/react";
import {
  Calendar,
  CalendarRange,
  Infinity,
  Check,
  MessageCircle,
  Sparkles,
  XIcon,
} from "lucide-react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "./dialog";
import { cn } from "../utils";

const SUPPLIER_PHONE_DISPLAY = "0793 42 07 45";
const SUPPLIER_PHONE = "+213793420745";
const SUPPLIER_WHATSAPP_NUMBER = SUPPLIER_PHONE.replace(/\D/g, "");

/** Snappy ease — avoids the soft “float” that flickers on stacked mobile cards. */
const TIER_EASE = [0.22, 1, 0.36, 1] as const;

const handleContactSupplier = (message: string) => {
  const url = `https://wa.me/${SUPPLIER_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  if (window.api?.app?.openExternal) {
    window.api.app.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

/** Scroll target for Premium CTA — Premium is an add-on, not a standalone plan. */
export type PricingTierId = "standard" | "premium";

type PlanId = "monthly" | "yearly" | "lifetime";
type AddonPeriodId = "monthly" | "yearly";

const STANDARD_PRICES: Record<PlanId, number> = {
  monthly: 1000,
  yearly: 10000,
  lifetime: 20000,
};

/** Premium add-on amounts (on top of a Standard license). */
const PREMIUM_ADDON_PRICES: Record<AddonPeriodId, number> = {
  monthly: 1500,
  yearly: 10000,
};

const STANDARD_PLANS: { id: PlanId; icon: typeof Calendar }[] = [
  { id: "monthly", icon: Calendar },
  { id: "yearly", icon: CalendarRange },
  { id: "lifetime", icon: Infinity },
];

const ADDON_PERIODS: { id: AddonPeriodId; icon: typeof Calendar }[] = [
  { id: "monthly", icon: Calendar },
  { id: "yearly", icon: CalendarRange },
];

function formatGroupedDzdAmount(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

function planKey(plan: PlanId, suffix: string): string {
  return `pricing.plans.standard.${plan}.${suffix}`;
}

function addonKey(period: AddonPeriodId, suffix: string): string {
  return `pricing.addon.premium.${period}.${suffix}`;
}

const FEATURE_SUFFIXES = ["feature1", "feature2", "feature3", "feature4", "feature5"] as const;
const ADDON_FEATURE_SUFFIXES = ["feature1", "feature2", "feature3", "feature4", "feature5"] as const;

type FeatureVariant = "core" | "inherit" | "bonus" | "premium-extra" | "note";

function collectStandardFeatures(
  t: (key: string, options?: { defaultValue?: string }) => string,
  plan: PlanId,
): { text: string; variant: FeatureVariant }[] {
  const raw = FEATURE_SUFFIXES.map((suffix) => {
    const key = planKey(plan, suffix);
    const text = t(key, { defaultValue: "" });
    if (!text || text === key) return null;
    return text;
  }).filter((line): line is string => Boolean(line));

  return raw.map((text, index) => {
    if (plan === "monthly") {
      return { text, variant: index >= 2 ? "note" : "core" };
    }
    if (plan === "yearly") {
      if (index === 0) return { text, variant: "inherit" };
      return { text, variant: "bonus" };
    }
    if (index === 0) return { text, variant: "inherit" };
    if (index === raw.length - 1) return { text, variant: "note" };
    return { text, variant: "bonus" };
  });
}

function collectAddonFeatures(
  t: (key: string, options?: { defaultValue?: string }) => string,
): string[] {
  return ADDON_FEATURE_SUFFIXES.map((suffix) => {
    const key = `pricing.addon.premium.${suffix}`;
    const text = t(key, { defaultValue: "" });
    if (!text || text === key) return null;
    return text;
  }).filter((line): line is string => Boolean(line));
}

function PlanFeatureCheckIcon({ isPremium }: { isPremium?: boolean }) {
  return (
    <Check
      className={cn(
        "mt-0.5 h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4",
        isPremium ? "text-violet-600/80 dark:text-violet-400/85" : "text-foreground/55",
      )}
      strokeWidth={2.5}
      aria-hidden
    />
  );
}

function planFeatureTextClass(variant: FeatureVariant): string {
  switch (variant) {
    case "inherit":
      return "font-semibold text-foreground";
    case "premium-extra":
      return "font-medium text-foreground/90";
    case "bonus":
      return "text-foreground/90";
    default:
      return "";
  }
}

function ContactSupplierButton({
  className,
  premium,
  message,
}: {
  className?: string;
  premium?: boolean;
  message: string;
}) {
  const { t } = useTranslation();
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={() => handleContactSupplier(message)}
      className={cn(
        "h-auto min-h-8 w-full whitespace-normal rounded-lg py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.99] sm:min-h-9 sm:rounded-xl sm:py-2.5 sm:text-sm md:min-h-10 md:py-3",
        premium
          ? "border-2 border-border bg-card/90 shadow-none hover:bg-violet-50/60 hover:text-foreground dark:hover:bg-violet-950/25"
          : "border-2 border-border/80 bg-card/95 shadow-none hover:bg-muted/50 dark:hover:bg-muted/20",
        className,
      )}
    >
      <MessageCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
      <span className="flex flex-col items-center gap-0.5 leading-tight">
        <span>{t("pricing.contactSupplier", "Contact supplier")}</span>
        <span className="text-[10px] font-medium tracking-wide opacity-90 sm:text-xs">
          {t("pricing.supplierPhoneLabel", "Tel.")}{" "}
          <bdi dir="ltr" className="tabular-nums">
            {SUPPLIER_PHONE_DISPLAY}
          </bdi>
        </span>
      </span>
    </Button>
  );
}

function StandardPlanCard({
  planId,
  Icon,
  planIndex,
  modal,
  cardPadding,
  reduceMotion,
}: {
  planId: PlanId;
  Icon: typeof Calendar;
  planIndex: number;
  modal: boolean;
  cardPadding: string;
  reduceMotion: boolean | null;
}) {
  const { t } = useTranslation();
  const amount = STANDARD_PRICES[planId];
  const priceText = `${formatGroupedDzdAmount(amount)}\u00a0DA`;
  const planFeatures = collectStandardFeatures(t, planId);

  return (
    <motion.div
      className={cn(
        "group flex h-full flex-col rounded-xl border-2 transition-[border-color,background-color,box-shadow,transform] duration-500 ease-out",
        cardPadding,
        "border-border/70 bg-gradient-to-b from-card/95 to-foreground/[0.045] backdrop-blur-[2px]",
        "dark:border-border/55 dark:from-card/98 dark:to-muted/15",
        "hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md hover:shadow-black/[0.07] dark:hover:border-foreground/20 dark:hover:shadow-black/30",
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : planIndex * 0.07,
        ease: TIER_EASE,
      }}
    >
      <div className={cn("mb-2 flex justify-center sm:mb-3 md:mb-4", modal && "md:mb-3")}>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground/[0.06] text-foreground/70 transition-transform duration-300 group-hover:scale-105 dark:bg-foreground/[0.08] dark:text-foreground/75 sm:h-11 sm:w-11 sm:rounded-2xl md:h-12 md:w-12 lg:h-14 lg:w-14">
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" strokeWidth={1.75} aria-hidden />
        </div>
      </div>

      <h4 className="text-center text-sm font-bold text-foreground sm:text-base lg:text-lg">
        {t(planKey(planId, "name"))}
      </h4>

      <div className="mt-2 mb-3 flex justify-center px-0.5 sm:mt-3 sm:mb-4 md:mb-4 lg:mt-4 lg:mb-5">
        <div
          dir="ltr"
          className="standard-price-chip group/price relative flex max-w-full flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-2 py-1.5 transition-[transform,box-shadow,border-color] duration-500 ease-out hover:scale-[1.02] sm:gap-1 sm:rounded-2xl sm:px-3 sm:py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-4"
          aria-label={`${priceText}, ${t(planKey(planId, "pricePeriod"))}`}
        >
          <span
            className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-70 dark:from-white/[0.04] sm:rounded-2xl"
            aria-hidden
          />
          <motion.span
            key={priceText}
            className="relative text-lg font-black tabular-nums tracking-tight text-foreground sm:text-xl lg:text-2xl lg:text-3xl"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: TIER_EASE }}
          >
            {priceText}
          </motion.span>
          <span className="relative w-full max-w-[12rem] text-center text-[0.6rem] font-bold uppercase leading-snug tracking-[0.12em] text-foreground/60 dark:text-foreground/55 sm:max-w-none sm:text-[0.65rem] sm:tracking-[0.14em] md:text-xs">
            {t(planKey(planId, "pricePeriod"))}
          </span>
        </div>
      </div>

      <div className="mt-3 mb-2">
        <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 sm:text-[11px]">
          {t("pricing.whatsIncluded", "What's included")}
        </p>
      </div>

      <ul className="mb-3 flex-1 space-y-1.5 text-xs text-muted-foreground sm:mb-4 sm:space-y-2 sm:text-sm md:mb-5 lg:mb-6">
        {planFeatures.map(({ text, variant }, i) => {
          if (variant === "note") {
            return (
              <motion.li
                key={`std-${planId}-f${i}`}
                className="border-t border-border/60 pt-2 text-[11px] leading-snug text-muted-foreground/85 italic sm:text-xs"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.28, delay: reduceMotion ? 0 : 0.06 + i * 0.05 }}
              >
                {text}
              </motion.li>
            );
          }

          return (
            <motion.li
              key={`std-${planId}-f${i}`}
              className="flex gap-1.5 sm:gap-2"
              initial={reduceMotion ? false : { opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.28,
                delay: reduceMotion ? 0 : 0.06 + i * 0.05,
                ease: TIER_EASE,
              }}
            >
              <PlanFeatureCheckIcon />
              <span className={cn("text-xs leading-snug sm:text-sm", planFeatureTextClass(variant))}>
                {text}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <ContactSupplierButton
        className="mt-5 sm:mt-6"
        message={t(
          `pricing.whatsapp.standard.${planId}`,
          planId === "monthly"
            ? "Hello, I'm interested in the Reda Tech POS Standard Monthly license (1 000 DA/month). Please tell me how to purchase and activate it."
            : planId === "yearly"
              ? "Hello, I'm interested in the Reda Tech POS Standard Yearly license (10 000 DA/year). Please tell me how to purchase and activate it."
              : "Hello, I'm interested in the Reda Tech POS Standard Lifetime license (20 000 DA one-time). Please tell me how to purchase and activate it.",
        )}
      />
    </motion.div>
  );
}

function PremiumAddonBand({
  modal,
  reduceMotion,
  highlighted,
}: {
  modal: boolean;
  reduceMotion: boolean | null;
  highlighted: boolean;
}) {
  const { t } = useTranslation();
  const features = collectAddonFeatures(t);
  const bandPadding = modal ? "p-3 sm:p-4 md:p-5" : "p-4 sm:p-5 md:p-6 lg:p-7";

  return (
    <motion.div
      id="pricing-tier-premium"
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-[box-shadow,border-color] duration-300",
        "border-violet-300/30 shadow-md shadow-violet-500/10 dark:border-violet-800/35",
        bandPadding,
        highlighted && "ring-2 ring-[#8b5cf6]/45 shadow-lg shadow-violet-500/15",
      )}
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.45, delay: reduceMotion ? 0 : 0.15, ease: TIER_EASE }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
        <div className="pricing-section-premium premium-gradient-bg absolute inset-0" />
        <div className="absolute -right-16 -top-12 h-36 w-36 rounded-full bg-violet-400/12 blur-3xl dark:bg-violet-600/12 sm:h-48 sm:w-48" />
        <div className="absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-purple-300/10 blur-3xl dark:bg-violet-900/10 sm:h-48 sm:w-48" />
      </div>

      <div className="relative z-[1] grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-stretch lg:gap-6">
        <div className="flex flex-col">
          <div className="mb-3 inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-violet-700/80 dark:text-violet-400/85 sm:text-[0.7rem]">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#7c3aed] dark:text-[#c4b5fd]" aria-hidden />
            {t("pricing.addon.premium.badge", "Add-on")}
          </div>
          <h3 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            {t("pricing.tiers.premium.title", "Premium")}
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            {t(
              "pricing.tiers.premium.subtitle",
              "Add on top of any Standard license. Includes REDA AI, receipt scanner, product photo search, and cloud backup.",
            )}
          </p>

          <ul className="mt-4 flex-1 space-y-1.5 sm:space-y-2">
            {features.map((text, i) => (
              <li key={`addon-f${i}`} className="flex gap-1.5 sm:gap-2">
                <PlanFeatureCheckIcon isPremium />
                <span className="text-xs leading-snug text-foreground/90 sm:text-sm">{text}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 text-[11px] leading-snug text-muted-foreground/90 sm:text-xs">
            {t(
              "pricing.addon.premium.requiresStandard",
              "Available as an add-on to any Standard license.",
            )}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3.5">
            {ADDON_PERIODS.map(({ id: periodId, icon: Icon }) => {
              const addonAmount = PREMIUM_ADDON_PRICES[periodId];
              const priceText = `+\u00a0${formatGroupedDzdAmount(addonAmount)}\u00a0DA`;

              return (
                <div
                  key={periodId}
                  className={cn(
                    "flex flex-col rounded-xl border-2 border-violet-200/40 bg-gradient-to-b from-card/95 to-violet-50/20 p-3 backdrop-blur-[2px]",
                    "dark:border-violet-950/35 dark:from-card/95 dark:to-violet-950/12",
                    "sm:p-3.5 md:p-4",
                  )}
                >
                  <div className="mb-2 flex justify-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200 sm:h-10 sm:w-10">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                  </div>
                  <h4 className="text-center text-sm font-bold text-foreground">
                    {t(addonKey(periodId, "name"), periodId === "monthly" ? "Monthly" : "Yearly")}
                  </h4>
                  <div className="mt-2 flex justify-center">
                    <div
                      dir="ltr"
                      className="premium-price-chip relative flex flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-2.5 py-1.5 sm:rounded-2xl sm:px-3 sm:py-2"
                    >
                      <span className="relative text-base font-black tabular-nums tracking-tight text-foreground sm:text-lg md:text-xl">
                        {priceText}
                      </span>
                      <span className="relative text-[0.6rem] font-bold uppercase tracking-[0.12em] text-violet-800/90 dark:text-violet-300/90 sm:text-[0.65rem]">
                        {t(
                          addonKey(periodId, "pricePeriod"),
                          periodId === "monthly" ? "Add-on / month" : "Add-on / year",
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <ContactSupplierButton
            premium
            message={t(
              "pricing.whatsapp.addon.premium",
              "Hello, I'm interested in the Reda Tech POS Premium offer. Please tell me how to activate it.",
            )}
          />

          <p className="text-center text-[11px] leading-snug text-muted-foreground sm:text-xs">
            {t(
              "pricing.addon.premium.lifetimeNote",
              "With Standard Lifetime ({{base}} DA one-time): add a Premium monthly or yearly add-on.",
              { base: formatGroupedDzdAmount(STANDARD_PRICES.lifetime) },
            )}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function PricingPlansSection({
  id,
  className,
  modal = false,
  initialTier = "standard",
}: {
  id?: string;
  className?: string;
  modal?: boolean;
  /** Scrolls to Standard plans or Premium add-on band (e.g. from Premium CTA). */
  initialTier?: PricingTierId;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialTier !== "premium") return;
    const timer = window.setTimeout(() => {
      document.getElementById("pricing-tier-premium")?.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    }, modal ? 120 : 80);
    return () => window.clearTimeout(timer);
  }, [initialTier, reduceMotion, modal]);

  const sectionPadding = modal
    ? "p-4 sm:p-5 md:p-6 short:p-4"
    : "p-3 sm:p-4 md:p-6 lg:p-8 short:lg:p-6 short:p-4";

  const headerSpacing = modal
    ? "mb-4 text-center sm:mb-5"
    : "mb-5 text-center sm:mb-6 md:mb-8";

  const cardPadding = modal
    ? "p-3 sm:p-3.5 md:rounded-2xl md:p-4 lg:p-5"
    : "p-3 sm:p-4 md:rounded-2xl md:p-5 lg:p-6";

  return (
    <section
      id={id}
      ref={sectionRef}
      className={cn(
        "pricing-plans-section relative rounded-2xl sm:rounded-3xl",
        "border border-border/80 bg-card shadow-md shadow-black/[0.06] dark:shadow-black/25",
        !modal && cn("overflow-hidden", sectionPadding, "mb-8 sm:mb-10"),
        modal && "flex h-full min-h-0 w-full flex-col overflow-hidden !mb-0 !rounded-[inherit] border-0 shadow-none",
        className,
      )}
      aria-labelledby="pricing-heading"
    >
      {modal ? (
        <div className="flex shrink-0 justify-end bg-card px-3 pt-3 pb-1">
          <DialogClose className="rounded-md p-1.5 text-muted-foreground opacity-80 ring-offset-background transition-opacity hover:bg-muted/60 hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden">
            <XIcon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t("common.close", "Close")}</span>
          </DialogClose>
        </div>
      ) : null}

      <div
        className={cn(
          "relative z-[1] space-y-5 sm:space-y-6 md:space-y-7",
          modal &&
            cn(
              "scrollbar-themed min-h-0 flex-1 overflow-y-auto overscroll-contain",
              sectionPadding,
              "pt-1",
            ),
        )}
      >
        <div className={headerSpacing}>
          <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foreground/55 dark:text-foreground/45 sm:text-xs">
            {t("pricing.kicker", "Licensing")}
          </p>
          <h2
            id="pricing-heading"
            className="text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl"
          >
            {t("pricing.title", "Choose your license")}
          </h2>
        </div>

        <div id="pricing-tier-standard">
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border/70",
              modal ? "p-3 sm:p-4" : "p-3 sm:p-4 md:p-5",
            )}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
              <div className="pricing-section-standard absolute inset-0" />
              <div className="absolute -right-16 -top-12 h-36 w-36 rounded-full bg-foreground/[0.05] blur-3xl sm:h-48 sm:w-48" />
              <div className="absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-foreground/[0.07] blur-3xl sm:h-48 sm:w-48" />
            </div>

            <div className="relative z-[1]">
              <div className="mb-3 text-center sm:mb-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-foreground/55 dark:text-foreground/45 sm:text-[0.7rem]">
                  {t("pricing.tiers.standard.title", "Standard")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {t("pricing.tiers.standard.subtitle", "Full POS app and local backup.")}
                </p>
              </div>

              <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                {STANDARD_PLANS.map(({ id: planId, icon: Icon }, planIndex) => (
                  <StandardPlanCard
                    key={planId}
                    planId={planId}
                    Icon={Icon}
                    planIndex={planIndex}
                    modal={modal}
                    cardPadding={cardPadding}
                    reduceMotion={reduceMotion}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <PremiumAddonBand
          modal={modal}
          reduceMotion={reduceMotion}
          highlighted={initialTier === "premium"}
        />
      </div>
    </section>
  );
}

export function PricingPlansModal({
  open,
  onOpenChange,
  initialTier = "standard",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTier?: PricingTierId;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[min(92dvh,56rem)] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-card p-0 shadow-lg",
          "sm:max-w-6xl sm:rounded-3xl",
        )}
      >
        <DialogTitle className="sr-only">
          {t("pricing.modalTitle", "License plans")}
        </DialogTitle>
        {open ? (
          <PricingPlansSection
            modal
            initialTier={initialTier}
            className="min-h-0 flex-1"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
