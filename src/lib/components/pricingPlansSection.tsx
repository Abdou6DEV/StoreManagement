import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { ToggleGroup, ToggleGroupItem } from "./toggleGroup";
import { cn } from "../utils";

const SUPPLIER_PHONE_DISPLAY = "0793 42 07 45";
const SUPPLIER_PHONE = "+213793420745";

/** Snappy ease — avoids the soft “float” that flickers on stacked mobile cards. */
const TIER_EASE = [0.22, 1, 0.36, 1] as const;

const handleContactSupplier = () => {
  const url = `https://wa.me/${SUPPLIER_PHONE}`;

  if (window.api?.app?.openExternal) {
    window.api.app.openExternal(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

export type PricingTierId = "standard" | "premium";
type PlanId = "monthly" | "yearly" | "lifetime";

const PRICES: Record<PricingTierId, Record<PlanId, number>> = {
  standard: { monthly: 1000, yearly: 10000, lifetime: 20000 },
  premium: { monthly: 1900, yearly: 15000, lifetime: 35000 },
};

const PLANS: { id: PlanId; icon: typeof Calendar }[] = [
  { id: "monthly", icon: Calendar },
  { id: "yearly", icon: CalendarRange },
  { id: "lifetime", icon: Infinity },
];

function formatGroupedDzdAmount(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

function planKey(tier: PricingTierId, plan: PlanId, suffix: string): string {
  return `pricing.plans.${tier}.${plan}.${suffix}`;
}

function tierKey(tier: PricingTierId, suffix: string): string {
  return `pricing.tiers.${tier}.${suffix}`;
}

const FEATURE_SUFFIXES = ["feature1", "feature2", "feature3", "feature4", "feature5"] as const;

type FeatureVariant = "core" | "inherit" | "bonus" | "premium-extra" | "note";

function collectPlanFeatures(
  t: (key: string, options?: { defaultValue?: string }) => string,
  tier: PricingTierId,
  plan: PlanId,
): { text: string; variant: FeatureVariant }[] {
  const raw = FEATURE_SUFFIXES.map((suffix) => {
    const key = planKey(tier, plan, suffix);
    const text = t(key, { defaultValue: "" });
    if (!text || text === key) return null;
    return text;
  }).filter((line): line is string => Boolean(line));

  return raw.map((text, index) => {
    if (plan === "monthly") {
      if (tier === "premium") {
        return { text, variant: index === 0 ? "inherit" : "premium-extra" };
      }
      return { text, variant: index >= 2 ? "note" : "core" };
    }

    if (plan === "yearly") {
      if (index === 0) return { text, variant: "inherit" };
      if (tier === "premium" && index >= 2) return { text, variant: "premium-extra" };
      return { text, variant: "bonus" };
    }

    if (index === 0) return { text, variant: "inherit" };
    if (index === raw.length - 1) return { text, variant: "note" };
    if (tier === "premium") return { text, variant: "premium-extra" };
    return { text, variant: "bonus" };
  });
}

function PlanFeatureCheckIcon({ isPremium }: { isPremium: boolean }) {
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

export function PricingPlansSection({
  id,
  className,
  modal = false,
  initialTier = "standard",
}: {
  id?: string;
  className?: string;
  modal?: boolean;
  initialTier?: PricingTierId;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [tierId, setTierId] = useState<PricingTierId>(initialTier);
  const isPremium = tierId === "premium";

  useEffect(() => {
    setTierId(initialTier);
  }, [initialTier]);

  const tierTransition = {
    duration: reduceMotion ? 0 : 0.22,
    ease: TIER_EASE,
  };

  const sectionPadding = modal
    ? "p-4 sm:p-5 md:p-5 lg:p-6 short:p-4"
    : "p-3 sm:p-4 md:p-6 md:p-8 lg:p-10 short:lg:p-6 short:md:p-6 short:p-4";

  const headerSpacing = modal
    ? "relative mb-3 text-center sm:mb-4 md:mb-5 short:mb-3"
    : "relative mb-4 text-center sm:mb-5 md:mb-6 md:mb-8 lg:mb-10 short:lg:mb-5 short:md:mb-6 short:mb-4";

  const toggleSpacing = modal
    ? "relative mb-3 flex flex-col items-center gap-2.5 sm:mb-4 short:mb-3"
    : "relative mb-4 flex flex-col items-center gap-2.5 sm:mb-5 md:mb-6";

  const gridSpacing = modal
    ? "relative grid gap-3 [contain:layout] sm:gap-3.5 md:gap-4 lg:grid-cols-3 lg:items-stretch lg:gap-5 short:gap-3"
    : "relative grid gap-3 [contain:layout] sm:gap-4 md:gap-5 md:gap-6 lg:grid-cols-3 lg:items-stretch short:lg:gap-4";

  const cardPadding = modal
    ? "p-3 sm:p-3.5 md:rounded-2xl md:p-4 lg:p-5 short:lg:p-4"
    : "p-3 sm:p-4 md:rounded-2xl md:p-5 lg:p-6 lg:p-7 short:lg:p-5";

  return (
    <section
      id={id}
      className={cn(
        "pricing-plans-section relative overflow-hidden rounded-2xl sm:rounded-3xl",
        "border",
        sectionPadding,
        "pricing-tier-surface transition-[border-color,box-shadow] duration-200",
        isPremium
          ? "border-violet-300/30 shadow-md shadow-violet-500/10 dark:border-violet-800/35"
          : "border-border/80 shadow-md shadow-black/[0.06] dark:shadow-black/25",
        !modal && "mb-8 sm:mb-10",
        modal && "!mb-0 w-full",
        className,
      )}
      aria-labelledby="pricing-heading"
    >
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
        aria-hidden
      >
        <motion.div
          className="pricing-section-standard absolute inset-0"
          initial={false}
          animate={{ opacity: isPremium ? 0 : 1 }}
          transition={tierTransition}
        />
        <motion.div
          className="pricing-section-premium premium-gradient-bg absolute inset-0"
          initial={false}
          animate={{ opacity: isPremium ? 1 : 0 }}
          transition={tierTransition}
        />

        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: isPremium ? 0 : 1 }}
          transition={tierTransition}
        >
          <div className="absolute -right-16 -top-12 h-36 w-36 rounded-full bg-foreground/[0.05] blur-3xl sm:-right-20 sm:-top-16 sm:h-48 sm:w-48 lg:h-60 lg:w-60 lg:h-72 lg:w-72" />
          <div className="absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-foreground/[0.07] blur-3xl sm:-bottom-24 sm:-left-16 sm:h-48 sm:w-48 lg:h-56 lg:w-56 lg:h-64 lg:w-64" />
          <div className="absolute left-1/2 top-1/3 h-28 w-28 -translate-x-1/2 rounded-full bg-foreground/[0.04] blur-3xl sm:h-32 sm:w-32 lg:h-40 lg:w-40 lg:h-48 lg:w-48" />
        </motion.div>

        <motion.div
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: isPremium ? 1 : 0 }}
          transition={tierTransition}
        >
          <div className="absolute -right-16 -top-12 h-36 w-36 rounded-full bg-violet-400/12 blur-3xl dark:bg-violet-600/12 sm:-right-20 sm:-top-16 sm:h-48 sm:w-48 lg:h-60 lg:w-60 lg:h-72 lg:w-72" />
          <div className="absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-purple-300/10 blur-3xl dark:bg-violet-900/10 sm:-bottom-24 sm:-left-16 sm:h-48 sm:w-48 lg:h-56 lg:w-56 lg:h-64 lg:w-64" />
          <div className="absolute left-1/2 top-1/3 h-28 w-28 -translate-x-1/2 rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-950/20 sm:h-32 sm:w-32 lg:h-40 lg:w-40 lg:h-48 lg:w-48" />
        </motion.div>

        <motion.div
          className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/[0.04] to-transparent dark:via-white/[0.06]"
          initial={{ x: "-120%", opacity: 0 }}
          animate={
            reduceMotion
              ? { x: "-120%", opacity: 0 }
              : { x: ["-120%", "220%"], opacity: [0, 0.4, 0] }
          }
          transition={{ duration: 0.42, ease: TIER_EASE }}
          key={tierId}
        />
      </div>

      {modal ? (
        <DialogClose className="absolute top-3 right-3 z-20 rounded-md p-1.5 text-muted-foreground opacity-80 ring-offset-background transition-opacity hover:bg-muted/60 hover:opacity-100 focus:ring-2 focus:ring-ring focus:outline-hidden rtl:right-auto rtl:left-3">
          <XIcon className="h-4 w-4" aria-hidden />
          <span className="sr-only">{t("common.close", "Close")}</span>
        </DialogClose>
      ) : null}

      <div className="relative z-[1]">
        <div className={headerSpacing}>
          <motion.p
            className={cn(
              "mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] sm:mb-1.5 sm:text-[0.65rem] sm:tracking-[0.18em] lg:mb-2 lg:text-xs",
              isPremium
                ? "text-violet-700/75 dark:text-violet-400/80"
                : "text-foreground/55 dark:text-foreground/45",
            )}
            animate={{ opacity: 1 }}
            transition={tierTransition}
          >
            {t("pricing.kicker", "Licensing")}
          </motion.p>
          <h2
            id="pricing-heading"
            className={cn(
              "text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl lg:text-3xl short:lg:text-2xl",
              modal && "lg:text-xl short:lg:text-xl",
            )}
          >
            {t("pricing.title", "Choose your license")}
          </h2>
        </div>

        <div className={toggleSpacing}>
          <ToggleGroup
            type="single"
            value={tierId}
            onValueChange={(value) => {
              if (value === "standard" || value === "premium") {
                setTierId(value);
              }
            }}
            variant="default"
            aria-label={t("pricing.tierToggleLabel", "License tier")}
            className="inline-flex gap-1.5 rounded-2xl border border-border/70 bg-muted/20 p-1.5 shadow-sm backdrop-blur-sm"
          >
            <ToggleGroupItem
              value="standard"
              className={cn(
                "min-w-[7rem] flex-none rounded-xl border-0 px-4 py-2.5 text-sm font-semibold shadow-none",
                "bg-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
                "data-[state=on]:!bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-border/70",
                "first:rounded-xl last:rounded-xl data-[variant=outline]:border-0",
              )}
            >
              {t("pricing.tierStandard", "Standard")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="premium"
              className={cn(
                "min-w-[7rem] flex-none gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-[border-color,box-shadow,color,background-color] duration-200",
                "!bg-transparent hover:!bg-transparent data-[state=on]:!bg-transparent data-[state=off]:!bg-transparent",
                "first:rounded-xl last:rounded-xl data-[variant=outline]:border-0",
                isPremium
                  ? cn(
                      "premium-gradient-bg border-[#8b5cf6]/50 text-[#7c3aed] shadow-md shadow-violet-500/20 ring-2 ring-[#8b5cf6]/40 dark:text-[#c4b5fd]",
                      "hover:shadow-md hover:shadow-violet-500/20",
                    )
                  : cn(
                      "border-violet-300/35 text-muted-foreground shadow-none dark:border-violet-800/40",
                      "hover:border-violet-400/45 hover:text-violet-700/85 dark:hover:text-violet-300/80",
                    ),
              )}
            >
              <Sparkles
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isPremium ? "text-[#7c3aed] dark:text-[#c4b5fd]" : "text-violet-500/55 dark:text-violet-400/50",
                )}
                aria-hidden
              />
              {t("pricing.tierPremium", "Premium")}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className={cn("relative w-full max-w-xl", modal ? "min-h-[2rem]" : "min-h-[2.5rem]")}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={tierId}
                className="absolute inset-x-0 top-0 text-center text-xs text-muted-foreground sm:text-sm"
                initial={reduceMotion ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: reduceMotion ? 0 : 0.35, ease: TIER_EASE }}
              >
                {t(
                  tierKey(tierId, "subtitle"),
                  isPremium
                    ? "Everything in Standard, plus REDA AI, receipt scanner, and cloud backup."
                    : "Full POS app and local backup.",
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          key={tierId}
          className={gridSpacing}
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.45, ease: TIER_EASE }}
        >
          {PLANS.map(({ id: planId, icon: Icon }, planIndex) => {
            const priceText = `${formatGroupedDzdAmount(PRICES[tierId][planId])}\u00a0DA`;
            const planFeatures = collectPlanFeatures(t, tierId, planId);

            return (
              <motion.div
                key={`${tierId}-${planId}`}
                className={cn(
                  "group flex flex-col rounded-xl border-2 transition-[border-color,background-color,box-shadow,transform] duration-500 ease-out",
                  cardPadding,
                  isPremium
                    ? cn(
                        "border-violet-200/40 bg-gradient-to-b from-card/95 to-violet-50/20 backdrop-blur-[2px]",
                        "dark:border-violet-950/35 dark:from-card/95 dark:to-violet-950/12",
                        "hover:-translate-y-0.5 hover:border-violet-300/50 hover:shadow-md hover:shadow-violet-100/15 dark:hover:border-violet-900/45 dark:hover:shadow-black/25",
                      )
                    : cn(
                        "border-border/70 bg-gradient-to-b from-card/95 to-foreground/[0.045] backdrop-blur-[2px]",
                        "dark:border-border/55 dark:from-card/98 dark:to-muted/15",
                        "hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md hover:shadow-black/[0.07] dark:hover:border-foreground/20 dark:hover:shadow-black/30",
                      ),
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
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11 sm:rounded-2xl md:h-12 md:w-12 lg:h-14 lg:w-14 short:lg:h-11 short:lg:w-11",
                      modal && "lg:h-12 lg:w-12",
                      isPremium
                        ? "bg-violet-500/10 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200"
                        : "bg-foreground/[0.06] text-foreground/70 dark:bg-foreground/[0.08] dark:text-foreground/75",
                    )}
                  >
                    <Icon
                      className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 short:lg:h-6 short:lg:w-6"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </div>
                </div>

                <h4 className="text-center text-sm font-bold text-foreground sm:text-base lg:text-lg short:lg:text-base">
                  {t(planKey(tierId, planId, "name"))}
                </h4>

                <div
                  className={cn(
                    "mt-2 mb-3 flex justify-center px-0.5 sm:mt-3 sm:mb-4 md:mb-4 lg:mt-4 lg:mb-5 short:lg:mt-3 short:lg:mb-4",
                    modal && "md:mb-4 lg:mt-4 lg:mb-5",
                  )}
                >
                  <div
                    dir="ltr"
                    className={cn(
                      "group/price relative flex max-w-full flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-2 py-1.5 sm:gap-1 sm:rounded-2xl sm:px-3 sm:py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-4 short:lg:px-4 short:lg:py-3",
                      modal && "md:py-2.5 lg:px-4 lg:py-3",
                      "transition-[transform,box-shadow,border-color] duration-500 ease-out hover:scale-[1.02]",
                      isPremium ? "premium-price-chip" : "standard-price-chip",
                    )}
                    aria-label={`${priceText}, ${t(planKey(tierId, planId, "pricePeriod"))}`}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-70 dark:from-white/[0.04] sm:rounded-2xl"
                      aria-hidden
                    />
                    <motion.span
                      key={priceText}
                      className={cn(
                        "relative text-lg font-black tabular-nums tracking-tight text-foreground sm:text-xl lg:text-2xl lg:text-3xl short:lg:text-2xl",
                        modal && "lg:text-2xl",
                      )}
                      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, ease: TIER_EASE }}
                    >
                      {priceText}
                    </motion.span>
                    <span
                      className={cn(
                        "relative w-full max-w-[12rem] text-center text-[0.6rem] font-bold uppercase leading-snug tracking-[0.12em] sm:max-w-none sm:text-[0.65rem] sm:tracking-[0.14em] md:text-xs",
                        isPremium
                          ? "text-violet-800/90 dark:text-violet-300/90"
                          : "text-foreground/60 dark:text-foreground/55",
                      )}
                    >
                      {t(planKey(tierId, planId, "pricePeriod"))}
                    </span>
                  </div>
                </div>

                <div className="mt-3 mb-2">
                  <p className="text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 sm:text-[11px]">
                    {t("pricing.whatsIncluded", "What's included")}
                  </p>
                </div>

                <ul
                  className={cn(
                    "mb-3 flex-1 space-y-1.5 text-xs text-muted-foreground sm:mb-4 sm:space-y-2 sm:text-sm md:mb-5 lg:mb-6 short:lg:mb-4",
                    modal && "md:mb-5 lg:mb-6",
                  )}
                >
                  {planFeatures.map(({ text, variant }, i) => {
                    if (variant === "note") {
                      return (
                        <motion.li
                          key={`${tierId}-${planId}-f${i}`}
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
                        key={`${tierId}-${planId}-f${i}`}
                        className="flex gap-1.5 sm:gap-2"
                        initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{
                          duration: 0.28,
                          delay: reduceMotion ? 0 : 0.06 + i * 0.05,
                          ease: TIER_EASE,
                        }}
                      >
                        <PlanFeatureCheckIcon isPremium={isPremium} />
                        <span className={cn("text-xs leading-snug sm:text-sm", planFeatureTextClass(variant))}>
                          {text}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={handleContactSupplier}
                  className={cn(
                    "h-auto min-h-8 w-full whitespace-normal rounded-lg py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.99] sm:min-h-9 sm:rounded-xl sm:py-2.5 sm:text-sm md:min-h-10 md:py-3 short:lg:min-h-9 short:lg:py-2.5",
                    "mt-5 sm:mt-6",
                    modal && "md:min-h-9 md:py-2.5",
                    isPremium
                      ? "border-2 border-border bg-card/90 shadow-none hover:bg-violet-50/60 hover:text-foreground dark:hover:bg-violet-950/25"
                      : "border-2 border-border/80 bg-card/95 shadow-none hover:bg-muted/50 dark:hover:bg-muted/20",
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
              </motion.div>
            );
          })}
        </motion.div>
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
        className="w-[calc(100%-2rem)] max-w-6xl gap-0 overflow-hidden rounded-2xl border-0 bg-card p-0 shadow-none sm:max-w-6xl sm:rounded-3xl"
      >
        <DialogTitle className="sr-only">
          {t("pricing.modalTitle", "License plans")}
        </DialogTitle>
        {open ? (
          <PricingPlansSection modal initialTier={initialTier} className="shadow-sm" />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
