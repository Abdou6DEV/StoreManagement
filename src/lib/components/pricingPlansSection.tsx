import React from "react";
import { useTranslation } from "react-i18next";
import { Calendar, CalendarRange, Infinity, Check, MessageCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "../utils";

const SUPPLIER_PHONE_DISPLAY = "0793 42 07 45";
const SUPPLIER_PHONE = "+213793420745";
const handleContactSupplier = () => {
  const url = `https://wa.me/${SUPPLIER_PHONE}`;

  if (window.api?.app?.openExternal) {
    // Electron
    window.api.app.openExternal(url);
  } else {
    // Website
    window.open(url, "_blank", "noopener,noreferrer");
  }
};

/** Must match `priceAmount` figures in locale files (DA); amounts are formatted here for stable first paint. */
const MONTHLY_PRICE_DZD = 1900;
const YEARLY_PRICE_DZD = 15000;
const LIFETIME_PRICE_DZD = 35000;

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

export function PricingPlansSection({
  id,
  className,
}: {
  id?: string;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  const monthlyAnnualDzd = MONTHLY_PRICE_DZD * 12;
  const yearlySaveDzd = monthlyAnnualDzd - YEARLY_PRICE_DZD;
  const yearlySavePercent =
    monthlyAnnualDzd > 0 ? Math.round((yearlySaveDzd / monthlyAnnualDzd) * 100) : 0;
  const yearlySaveAmountFormatted = formatGroupedDzdAmount(yearlySaveDzd);

  const planPriceText: Record<PlanId, string> = {
    monthly: `${formatGroupedDzdAmount(MONTHLY_PRICE_DZD)}\u00a0DA`,
    yearly: `${formatGroupedDzdAmount(YEARLY_PRICE_DZD)}\u00a0DA`,
    lifetime: `${formatGroupedDzdAmount(LIFETIME_PRICE_DZD)}\u00a0DA`,
  };

  return (
    <section
      id={id}
      className={cn(
        "pricing-plans-section relative mb-8 overflow-hidden rounded-2xl border-2 border-red-200/50 dark:border-red-950/40 sm:mb-10 sm:rounded-3xl",
        "bg-gradient-to-br from-card via-red-50/25 to-muted/20 dark:from-card dark:via-red-950/15 dark:to-muted/10",
        "p-3 shadow-md shadow-red-100/20 sm:p-4 md:p-6 md:p-8 lg:p-10 short:lg:p-6 short:md:p-6 short:p-4 dark:shadow-black/20",
        className,
      )}
      aria-labelledby="pricing-heading"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-12 h-36 w-36 rounded-full bg-red-400/12 blur-3xl dark:bg-red-600/12 sm:-right-20 sm:-top-16 sm:h-48 sm:w-48 lg:h-60 lg:w-60 lg:h-72 lg:w-72"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-12 h-36 w-36 rounded-full bg-rose-300/10 blur-3xl dark:bg-red-900/10 sm:-bottom-24 sm:-left-16 sm:h-48 sm:w-48 lg:h-56 lg:w-56 lg:h-64 lg:w-64"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-28 w-28 -translate-x-1/2 rounded-full bg-muted/35 blur-3xl dark:bg-muted/15 sm:h-32 sm:w-32 lg:h-40 lg:w-40 lg:h-48 lg:w-48"
        aria-hidden
      />

      <div className="relative mb-4 text-center sm:mb-5 md:mb-6 md:mb-8 lg:mb-10 short:lg:mb-5 short:md:mb-6 short:mb-4">
        <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-red-700/70 dark:text-red-400/75 sm:mb-1.5 sm:text-[0.65rem] sm:tracking-[0.18em] lg:mb-2 lg:text-xs">
          {t("pricing.kicker", "Licensing")}
        </p>
        <h2
          id="pricing-heading"
          className="text-lg font-bold tracking-tight text-foreground sm:text-xl lg:text-2xl lg:text-3xl short:lg:text-2xl"
        >
          {t("pricing.title", "Choose your license")}
        </h2>
        <p className="mx-auto mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:mt-1.5 sm:text-sm lg:mt-2 lg:text-base short:lg:text-sm">
          {t(
            "pricing.subtitle",
            "Monthly, yearly, or lifetime — all plans include the full app. Contact your supplier for a quote and activation.",
          )}
        </p>
      </div>

      <div className="relative grid gap-3 [contain:layout] sm:gap-4 md:gap-5 md:gap-6 lg:grid-cols-3 lg:items-stretch short:lg:gap-4">
        {PLANS.map(({ id, icon: Icon, featured }) => {
          const f1 = t(`pricing.plans.${id}.feature1`);
          const f2 = t(`pricing.plans.${id}.feature2`);
          const f3 = t(`pricing.plans.${id}.feature3`);
          return (
            <div
              key={id}
              className={cn(
                "group flex flex-col rounded-xl border-2 border-red-200/40 bg-gradient-to-b from-card/95 to-red-50/20 backdrop-blur-[2px] p-3 transition-all duration-300 ease-out sm:p-4 md:rounded-2xl md:p-5 lg:p-6 lg:p-7 short:lg:p-5",
                "dark:border-red-950/35 dark:from-card/95 dark:to-red-950/12",
                "hover:-translate-y-0.5 hover:shadow-md hover:border-red-300/50 hover:shadow-red-100/15 dark:hover:border-red-900/45 dark:hover:shadow-black/25",
                featured &&
                  "relative overflow-visible ring-2 ring-red-300/35 shadow-md shadow-red-100/15 lg:z-[1] lg:scale-[1.015] short:lg:scale-100 dark:ring-red-800/30 dark:shadow-black/20",
              )}
            >
              {featured && id === "yearly" ? (
                <div
                  className={cn("pricing-yearly-ribbon", isRTL && "pricing-yearly-ribbon--rtl")}
                  role="status"
                  aria-label={t("pricing.popular", "Recommended")}
                >
                  {t("pricing.popular", "Recommended")}
                </div>
              ) : null}

              <div className="mb-2 -mt-1 flex min-h-[2.5rem] flex-col items-center justify-center gap-1 sm:mb-3 sm:min-h-[3.25rem] md:mb-4 md:min-h-[4rem] lg:min-h-[4.5rem] lg:gap-2 short:lg:min-h-[3.5rem] short:lg:gap-1.5">
                {featured && id === "yearly" ? (
                  <p
                    className="max-w-[min(100%,16rem)] px-1 pt-6 text-center text-[9px] font-semibold leading-snug text-red-800 tabular-nums dark:text-red-200 sm:pt-8 sm:text-[10px] md:pt-9 md:text-[11px] lg:pt-10 lg:text-xs short:lg:pt-8 short:lg:text-[10px]"
                    aria-label={t("pricing.plans.yearly.saveVsMonthly", {
                      amount: yearlySaveAmountFormatted,
                      percent: yearlySavePercent,
                    })}
                  >
                    {t("pricing.plans.yearly.saveVsMonthly", {
                      amount: yearlySaveAmountFormatted,
                      percent: yearlySavePercent,
                    })}
                  </p>
                ) : null}
              </div>

              <div className="mb-2 flex justify-center sm:mb-3 md:mb-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-800 transition-transform duration-300 group-hover:scale-105 dark:bg-red-500/15 dark:text-red-200 sm:h-11 sm:w-11 sm:rounded-2xl md:h-12 md:w-12 lg:h-14 lg:w-14 short:lg:h-11 short:lg:w-11">
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 short:lg:h-6 short:lg:w-6" strokeWidth={1.75} aria-hidden />
                </div>
              </div>

              <h3 className="text-center text-sm font-bold text-foreground sm:text-base lg:text-lg short:lg:text-base">{t(`pricing.plans.${id}.name`)}</h3>
              <p className="mt-1 min-h-[1.75rem] text-center text-xs leading-snug text-muted-foreground sm:min-h-[2rem] sm:text-sm lg:min-h-[2.5rem]">
                {t(`pricing.plans.${id}.tagline`)}
              </p>

              <div className="mt-3 mb-3 flex justify-center px-0.5 sm:mt-4 sm:mb-4 md:mb-5 lg:mt-5 lg:mb-6 short:lg:mt-4 short:lg:mb-4">
                <div
                  dir="ltr"
                  className={cn(
                    "group/price relative flex max-w-full flex-col items-center gap-0.5 overflow-hidden rounded-xl border px-2 py-1.5 sm:gap-1 sm:rounded-2xl sm:px-3 sm:py-2.5 md:px-4 md:py-3 lg:px-5 lg:py-4 short:lg:px-4 short:lg:py-3",
                    "border-red-200/55 bg-gradient-to-br from-card/95 via-card/90 to-red-50/35",
                    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.5),0_8px_20px_-12px_rgba(185,28,28,0.12)]",
                    "dark:border-red-900/40 dark:from-card/90 dark:via-card/80 dark:to-red-950/20",
                    "dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-12px_rgba(0,0,0,0.35)]",
                    "transition-[transform,box-shadow] duration-300 ease-out",
                    "hover:scale-[1.02] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.55),0_10px_24px_-12px_rgba(185,28,28,0.15)]",
                    featured && "ring-1 ring-red-300/25 dark:ring-red-800/25",
                  )}
                  aria-label={`${planPriceText[id]}, ${t(`pricing.plans.${id}.pricePeriod`)}`}
                >
                  <span
                    className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-tr from-white/15 via-transparent to-transparent opacity-70 dark:from-white/[0.04] sm:rounded-2xl"
                    aria-hidden
                  />
                  <span className="relative text-lg font-black tabular-nums tracking-tight text-foreground sm:text-xl lg:text-2xl lg:text-3xl short:lg:text-2xl">
                    {planPriceText[id]}
                  </span>
                  <span className="relative w-full max-w-[12rem] text-center text-[0.6rem] font-bold uppercase leading-snug tracking-[0.12em] text-red-800/90 sm:max-w-none sm:text-[0.65rem] sm:tracking-[0.14em] md:text-xs dark:text-red-300/90">
                    {t(`pricing.plans.${id}.pricePeriod`)}
                  </span>
                </div>
              </div>

              <ul className="mb-3 flex-1 space-y-1.5 text-xs text-muted-foreground sm:mb-4 sm:space-y-2 sm:text-sm md:mb-5 lg:mb-6 short:lg:mb-4 short:lg:space-y-2">
                {[f1, f2, f3].map((line, i) => (
                  <li key={i} className="flex gap-1.5 sm:gap-2 sm:gap-2.5">
                    <Check
                      className="mt-0.5 h-3 w-3 shrink-0 text-red-600/75 dark:text-red-500/80 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    <span className="text-xs sm:text-sm">{line}</span>
                  </li>
                ))}
              </ul>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleContactSupplier}
                className={cn(
                  "h-auto min-h-8 w-full whitespace-normal rounded-lg py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.99] sm:min-h-9 sm:rounded-xl sm:py-2.5 sm:text-sm md:min-h-10 md:py-3 short:lg:min-h-9 short:lg:py-2.5",
                  featured &&
                    "border-transparent bg-red-600 text-white shadow-none hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500",
                  !featured &&
                    "border-2 border-border bg-card/90 shadow-none hover:bg-red-50/60 hover:text-foreground dark:hover:bg-red-950/25",
                )}
              >
                <MessageCircle className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                <span className="flex flex-col items-center gap-0.5 leading-tight">
                  <span>{t("pricing.contactSupplier", "Contact supplier")}</span>
                  <span className="text-[10px] font-medium tabular-nums tracking-wide opacity-90 sm:text-xs">
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