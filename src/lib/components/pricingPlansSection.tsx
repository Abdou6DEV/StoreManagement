import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, CalendarRange, Infinity, Check, MessageCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "../utils";

const SUPPLIER_EMAIL = "abdoukahia853@gmail.com";
const SUPPLIER_PHONE_DISPLAY = "0793420745";

/** Must match monthly/yearly `priceAmount` figures in locale files (DA). */
const MONTHLY_PRICE_DZD = 2500;
const YEARLY_PRICE_DZD = 15000;

function formatGroupedDzdAmount(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n);
}

type PlanId = "monthly" | "yearly" | "lifetime";

const PLANS: {
  id: PlanId;
  icon: typeof Calendar;
  featured?: boolean;
}[] = [
  { id: "monthly", icon: Calendar },
  { id: "yearly", icon: CalendarRange, featured: true },
  { id: "lifetime", icon: Infinity },
];

export function PricingPlansSection({ className }: { className?: string }) {
  const { t, i18n } = useTranslation();

  const monthlyAnnualDzd = MONTHLY_PRICE_DZD * 12;
  const yearlySaveDzd = monthlyAnnualDzd - YEARLY_PRICE_DZD;
  const yearlySavePercent =
    monthlyAnnualDzd > 0 ? Math.round((yearlySaveDzd / monthlyAnnualDzd) * 100) : 0;
  const yearlySaveAmountFormatted = formatGroupedDzdAmount(yearlySaveDzd);

  const contactSupplier = (planId: PlanId) => {
    const subject = t(`pricing.mailSubject.${planId}`);
    window.location.href = `mailto:${SUPPLIER_EMAIL}?subject=${encodeURIComponent(subject)}`;
  };

  return (
    <section
      className={cn(
        "relative mb-10 overflow-hidden rounded-3xl border-2 border-red-200/50 dark:border-red-950/40",
        "bg-gradient-to-br from-card via-red-50/25 to-muted/20 dark:from-card dark:via-red-950/15 dark:to-muted/10",
        "p-6 sm:p-8 md:p-10 shadow-md shadow-red-100/20 dark:shadow-black/20",
        className,
      )}
      aria-labelledby="pricing-heading"
    >
      <div
        className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-red-400/12 blur-3xl dark:bg-red-600/12"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-rose-300/10 blur-3xl dark:bg-red-900/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-muted/35 blur-3xl dark:bg-muted/15"
        aria-hidden
      />

      <div className="relative text-center mb-8 md:mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700/70 dark:text-red-400/75 mb-2">
          {t("pricing.kicker", "Licensing")}
        </p>
        <h2
          id="pricing-heading"
          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
        >
          {t("pricing.title", "Choose your license")}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t(
            "pricing.subtitle",
            "Monthly, yearly, or lifetime — all plans include the full app. Contact your supplier for a quote and activation.",
          )}
        </p>
      </div>

      <div className="relative grid gap-5 md:gap-6 lg:grid-cols-3 lg:items-stretch">
        {PLANS.map(({ id, icon: Icon, featured }) => {
          const f1 = t(`pricing.plans.${id}.feature1`);
          const f2 = t(`pricing.plans.${id}.feature2`);
          const f3 = t(`pricing.plans.${id}.feature3`);
          return (
            <div
              key={id}
              className={cn(
                "group flex flex-col rounded-2xl border-2 border-red-200/40 bg-gradient-to-b from-card/95 to-red-50/20 backdrop-blur-[2px] p-6 sm:p-7 transition-all duration-300 ease-out",
                "dark:border-red-950/35 dark:from-card/95 dark:to-red-950/12",
                "hover:-translate-y-0.5 hover:shadow-md hover:border-red-300/50 hover:shadow-red-100/15 dark:hover:border-red-900/45 dark:hover:shadow-black/25",
                featured && "ring-2 ring-red-300/35 shadow-md shadow-red-100/15 lg:z-[1] lg:scale-[1.015] dark:ring-red-800/30 dark:shadow-black/20",
              )}
            >
              <div className="mb-4 -mt-1 flex min-h-[4.5rem] flex-col items-center justify-center gap-2">
                {featured ? (
                  <>
                    <span className="inline-flex items-center rounded-full border border-red-200/70 bg-red-50/80 px-3 py-1 text-xs font-semibold text-red-900 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-100">
                      {t("pricing.popular", "Best value")}
                    </span>
                    {id === "yearly" && (
                      <span
                        className="inline-flex max-w-[min(100%,18rem)] items-center justify-center rounded-full border border-red-200/60 bg-card/90 px-3 py-1.5 text-center text-[11px] font-semibold leading-snug text-red-900 tabular-nums shadow-sm dark:border-red-800/35 dark:bg-card/80 dark:text-red-100 sm:text-xs"
                        aria-label={t("pricing.plans.yearly.saveVsMonthly", {
                          amount: yearlySaveAmountFormatted,
                          percent: yearlySavePercent,
                        })}
                      >
                        {t("pricing.plans.yearly.saveVsMonthly", {
                          amount: yearlySaveAmountFormatted,
                          percent: yearlySavePercent,
                        })}
                      </span>
                    )}
                  </>
                ) : null}
              </div>

              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-800 transition-transform duration-300 group-hover:scale-105 dark:bg-red-500/15 dark:text-red-200">
                  <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
                </div>
              </div>

              <h3 className="text-center text-lg font-bold text-foreground">{t(`pricing.plans.${id}.name`)}</h3>
              <p className="mt-1 text-center text-sm text-muted-foreground min-h-[2.5rem] leading-snug">
                {t(`pricing.plans.${id}.tagline`)}
              </p>

              <div className="mt-5 mb-6 flex justify-center px-0.5">
                <div
                  dir="ltr"
                  className={cn(
                    "group/price relative inline-flex max-w-full flex-wrap items-baseline justify-center gap-x-1.5 gap-y-0.5 overflow-hidden rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4",
                    "border-red-200/55 bg-gradient-to-br from-card/95 via-card/90 to-red-50/35",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_8px_20px_-12px_rgba(185,28,28,0.12)]",
                    "dark:border-red-900/40 dark:from-card/90 dark:via-card/80 dark:to-red-950/20",
                    "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-12px_rgba(0,0,0,0.35)]",
                    "transition-[transform,box-shadow] duration-300 ease-out",
                    "hover:scale-[1.02] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_10px_24px_-12px_rgba(185,28,28,0.15)]",
                    featured && "ring-1 ring-red-300/25 dark:ring-red-800/25",
                  )}
                  aria-label={`${t(`pricing.plans.${id}.priceAmount`)} / ${t(`pricing.plans.${id}.pricePeriod`)}`}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-70 dark:from-white/[0.04]"
                    aria-hidden
                  />
                  <span className="relative text-[1.35rem] font-black tabular-nums tracking-tight text-foreground sm:text-3xl">
                    {t(`pricing.plans.${id}.priceAmount`)}
                  </span>
                  <span
                    className="relative mx-0.5 select-none text-lg font-extralight text-muted-foreground sm:text-2xl"
                    aria-hidden
                  >
                    /
                  </span>
                  <span
                    className={cn(
                      "relative max-w-[14rem] text-left font-bold leading-snug text-red-800/90 sm:max-w-none dark:text-red-300/90",
                      id === "lifetime" || i18n.language === "ar"
                        ? "text-[0.7rem] tracking-wide normal-case sm:text-[0.8rem]"
                        : "text-[0.65rem] uppercase tracking-[0.14em] sm:text-xs",
                    )}
                  >
                    {t(`pricing.plans.${id}.pricePeriod`)}
                  </span>
                </div>
              </div>

              <ul className="space-y-2.5 mb-6 flex-1 text-sm text-muted-foreground">
                {[f1, f2, f3].map((line, i) => (
                  <li key={i} className="flex gap-2.5">
                    <Check
                      className="h-4 w-4 shrink-0 mt-0.5 text-red-600/75 dark:text-red-500/80"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className={cn(
                  "h-auto min-h-10 w-full whitespace-normal rounded-xl py-3 font-semibold transition-all duration-200 active:scale-[0.99]",
                  featured &&
                    "border-transparent bg-red-600 text-white shadow-none hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500",
                  !featured &&
                    "border-2 border-border bg-card/90 shadow-none hover:bg-red-50/60 hover:text-foreground dark:hover:bg-red-950/25",
                )}
                onClick={() => contactSupplier(id)}
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex flex-col items-center gap-0.5 leading-tight">
                  <span>{t("pricing.contactSupplier", "Contact supplier")}</span>
                  <span className="text-xs font-medium tabular-nums tracking-wide opacity-90">
                    {t("pricing.supplierPhoneLabel", { phone: SUPPLIER_PHONE_DISPLAY })}
                  </span>
                </span>
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
