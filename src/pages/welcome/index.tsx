import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Code,
  FileText,
  Mail,
  MapPin,
  Phone,
  Settings,
  Shield,
  Sparkles,
  Star,
  User,
  WifiOff,
  KeyRound,
  LifeBuoy,
  Rocket,
} from "lucide-react";
import { useTheme } from "../../lib/hooks/useTheme";
import { cn } from "../../lib/utils";
import {
  ABOUT_MAIN_FEATURE_DEFS,
  ABOUT_TECHNICAL_FEATURE_DEFS,
} from "../../lib/about/featureDefinitions";
import { ABOUT_PRIVACY_POINT_KEYS, ABOUT_TERMS_POINT_KEYS } from "../../lib/about/legalCopy";
import { LOGO_ICON, LOGO_ICON_DARK } from "../../lib/assets";
import { Button } from "../../lib/components/button";
import { Input } from "../../lib/components/input";
import { Checkbox } from "../../lib/components/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../lib/components/dropdownMenu";
import { ThemeToggleButton } from "../../lib/components/themeToggleButton";
import { FullscreenToggleButton } from "../../lib/components/fullscreenToggleButton";
import { TooltipToggleButton } from "../../lib/components/tooltipToggleButton";
import { useToast } from "../../lib/contexts/toastContext";
import { FeaturesCarousel } from "../../lib/components/featuresCarousel";
import { WelcomeSectionNav } from "../../lib/components/welcomeSectionNav";
import { WelcomeJourneyNav } from "../../lib/components/welcomeJourneyNav";
import { PricingPlansSection } from "../../lib/components/pricingPlansSection";
import {
  INITIAL_WELCOME_DONE_EVENT,
  ONBOARDING_INITIAL_WELCOME_DONE_KEY,
  ONLINE_CUSTOMER_ID_OPTION_KEY,
} from "../../lib/onboarding/constants";
import type { DeviceRequestResult } from "../../electron/types/deviceRequest";

/** Welcome-only highlights before the technical carousel (not duplicated in the carousel). */
const WELCOME_TECHNOLOGY_BRIDGE_HIGHLIGHTS = [
  {
    icon: Rocket,
    titleKey: "welcome.technologyBridge.highlights.quickSetup.title",
    descKey: "welcome.technologyBridge.highlights.quickSetup.description",
  },
  {
    icon: KeyRound,
    titleKey: "welcome.technologyBridge.highlights.licensedDevice.title",
    descKey: "welcome.technologyBridge.highlights.licensedDevice.description",
  },
  {
    icon: LifeBuoy,
    titleKey: "welcome.technologyBridge.highlights.supplierSupport.title",
    descKey: "welcome.technologyBridge.highlights.supplierSupport.description",
  },
] as const;

const WELCOME_SECTION_NAV_ITEMS = [
  { id: "get-started", labelKey: "welcome.sectionNav.getStarted", defaultLabel: "Get started" },
  { id: "welcome-key-features", labelKey: "welcome.sectionNav.keyFeatures", defaultLabel: "Key features" },
  {
    id: "welcome-technical-features",
    labelKey: "welcome.sectionNav.technical",
    defaultLabel: "Technical features",
  },
  { id: "welcome-pricing", labelKey: "welcome.sectionNav.pricing", defaultLabel: "Pricing" },
  { id: "welcome-developer", labelKey: "welcome.sectionNav.developer", defaultLabel: "Developer" },
  { id: "welcome-legal", labelKey: "welcome.sectionNav.legal", defaultLabel: "Legal" },
] as const;

type WelcomeSectionId = (typeof WELCOME_SECTION_NAV_ITEMS)[number]["id"];

const WELCOME_SECTION_SCROLL_MARGIN = "scroll-mt-20 lg:scroll-mt-24";
const WELCOME_SECTION_NAV_ANCHOR_PX = 96;
const WELCOME_PRICING_SCROLL_EXTRA_UP_PX = 20;
const WELCOME_TECHNICAL_SCROLL_EXTRA_DOWN_PX = 110;
const WELCOME_LEGAL_SCROLL_EXTRA_DOWN_PX = 90;

function isConnectivityErrorText(message: string): boolean {
  const s = message.toLowerCase();
  return (
    s.includes("fetch") ||
    s.includes("network") ||
    s.includes("econnrefused") ||
    s.includes("enotfound") ||
    s.includes("econnreset") ||
    s.includes("etimedout") ||
    s.includes("getaddrinfo") ||
    s.includes("socket") ||
    s.includes("internet") ||
    s.includes("offline")
  );
}

function deviceRequestErrorToastMessage(
  result: Extract<DeviceRequestResult, { success: false }>,
  t: (key: string, defaultValue: string) => string,
): string {
  if (result.code === "missing_env") {
    return t(
      "welcome.onlineNotConfigured",
      "Online setup is not configured on this PC. Ask your administrator to set STORE_ONLINE_* environment variables.",
    );
  }
  if (result.code === "network" || isConnectivityErrorText(result.error)) {
    return t(
      "welcome.serverUnreachable",
      "We could not reach our servers. Check your internet connection and try again. If this continues, wait a few minutes or contact support.",
    );
  }
  return result.error;
}

/** Allow only digits and an optional leading + (country code). */
function sanitizeWelcomePhoneInput(raw: string): string {
  const stripped = raw.replace(/[^\d+]/g, "");
  if (!stripped) return "";
  if (stripped[0] === "+") {
    return "+" + stripped.slice(1).replace(/\D/g, "");
  }
  return stripped.replace(/\D/g, "");
}

/** Let the success toast render before leaving the welcome shell (ToastProvider unmounts with it). */
const WELCOME_SUCCESS_TOAST_VISIBLE_MS = 2500;

export default function WelcomeSetup() {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const isRTL = i18n.language === "ar";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [existingShopNewPc, setExistingShopNewPc] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [appVersion, setAppVersion] = useState<string>("1.0.0");
  const [online, setOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );
  const [activeNavSectionId, setActiveNavSectionId] = useState<WelcomeSectionId>(
    WELCOME_SECTION_NAV_ITEMS[0].id,
  );
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const warmPricingLayout = () => {
      const el = document.getElementById("welcome-pricing");
      if (el) {
        void el.getBoundingClientRect();
      }
    };
    const frame = window.requestAnimationFrame(() => {
      warmPricingLayout();
      window.requestAnimationFrame(warmPricingLayout);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const scrollToWelcomeSection = useCallback(
    (sectionId: WelcomeSectionId) => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      if (sectionId === "get-started") {
        const rect = element.getBoundingClientRect();
        const top = window.scrollY + rect.top - WELCOME_SECTION_NAV_ANCHOR_PX;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: reduceMotion ? "auto" : "smooth",
        });
        return;
      }

      if (sectionId === "welcome-pricing") {
        const rect = element.getBoundingClientRect();
        const top =
          window.scrollY +
          rect.top +
          rect.height / 2 -
          window.innerHeight / 2 -
          WELCOME_PRICING_SCROLL_EXTRA_UP_PX;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: reduceMotion ? "auto" : "smooth",
        });
        return;
      }

      if (sectionId === "welcome-technical-features") {
        const rect = element.getBoundingClientRect();
        const top =
          window.scrollY +
          rect.top -
          WELCOME_SECTION_NAV_ANCHOR_PX +
          WELCOME_TECHNICAL_SCROLL_EXTRA_DOWN_PX;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: reduceMotion ? "auto" : "smooth",
        });
        return;
      }

      if (sectionId === "welcome-legal") {
        const rect = element.getBoundingClientRect();
        const top =
          window.scrollY +
          rect.top -
          WELCOME_SECTION_NAV_ANCHOR_PX +
          WELCOME_LEGAL_SCROLL_EXTRA_DOWN_PX;

        window.scrollTo({
          top: Math.max(0, top),
          behavior: reduceMotion ? "auto" : "smooth",
        });
        return;
      }

      element.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [reduceMotion],
  );

  const scrollToWelcomeTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [reduceMotion]);

  useEffect(() => {
    const sectionIds = WELCOME_SECTION_NAV_ITEMS.map((item) => item.id);

    const updateActiveSection = () => {
      let bestId: WelcomeSectionId = sectionIds[0];
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) continue;

        const distance = Math.abs(rect.top - WELCOME_SECTION_NAV_ANCHOR_PX);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestId = id;
        }
      }

      setActiveNavSectionId(bestId);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await window.api?.app?.getVersion();
        if (!cancelled && v) setAppVersion(v);
      } catch {
        /* keep default */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finishWelcomeAfterProvisioning = async (customerIdFromServer?: string | null) => {
    await window.api.database.options.set(ONBOARDING_INITIAL_WELCOME_DONE_KEY, "1");
    if (customerIdFromServer) {
      await window.api.database.options.set(ONLINE_CUSTOMER_ID_OPTION_KEY, customerIdFromServer);
    }
    window.dispatchEvent(new Event(INITIAL_WELCOME_DONE_EVENT));
  };

  const handleStartTrial = async () => {
    const name = fullName.trim();
    const ph = sanitizeWelcomePhoneInput(phone).trim();
    if (!name || !ph) {
      showToast(t("welcome.fillNamePhone", "Please enter your full name and phone number."), "error");
      return;
    }
    if (!/\d/.test(ph)) {
      showToast(
        t(
          "welcome.phoneInvalid",
          "Enter a phone number using digits only. You may add a single + at the beginning for a country code.",
        ),
        "error",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await window.api.online.deviceRequest({ name, phone: ph });
      if (result.success === false) {
        showToast(deviceRequestErrorToastMessage(result, t), "error");
        return;
      }
      showToast(
        t("welcome.provisioningSuccessTrial", "This device is registered. Continue to log in."),
        "success",
      );
      await new Promise((r) => setTimeout(r, WELCOME_SUCCESS_TOAST_VISIBLE_MS));
      await finishWelcomeAfterProvisioning(result.customerId ?? undefined);
    } catch {
      showToast(
        t(
          "welcome.serverUnreachable",
          "We could not reach our servers. Check your internet connection and try again. If this continues, wait a few minutes or contact support.",
        ),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    const name = fullName.trim();
    const ph = sanitizeWelcomePhoneInput(phone).trim();
    const cid = customerId.trim();
    if (!name || !ph) {
      showToast(t("welcome.fillNamePhone", "Please enter your full name and phone number."), "error");
      return;
    }
    if (!/\d/.test(ph)) {
      showToast(
        t(
          "welcome.phoneInvalid",
          "Enter a phone number using digits only. You may add a single + at the beginning for a country code.",
        ),
        "error",
      );
      return;
    }
    if (!cid) {
      showToast(t("welcome.customerIdRequired", "Enter the customer ID your supplier sent you."), "error");
      return;
    }
    setBusy(true);
    try {
      const result = await window.api.online.deviceRequest({ name, phone: ph, customerId: cid });
      if (result.success === false) {
        showToast(deviceRequestErrorToastMessage(result, t), "error");
        return;
      }
      showToast(
        t(
          "welcome.provisioningSuccessRestore",
          "This device is linked. Continue to log in to finish restore.",
        ),
        "success",
      );
      await new Promise((r) => setTimeout(r, WELCOME_SUCCESS_TOAST_VISIBLE_MS));
      await finishWelcomeAfterProvisioning(result.customerId ?? cid);
    } catch {
      showToast(
        t(
          "welcome.serverUnreachable",
          "We could not reach our servers. Check your internet connection and try again. If this continues, wait a few minutes or contact support.",
        ),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={cn(
        "min-h-screen bg-background pb-16 text-foreground xl:pt-24",
        "animate-in fade-in duration-500 motion-reduce:animate-none motion-reduce:opacity-100",
      )}
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <WelcomeSectionNav
        items={WELCOME_SECTION_NAV_ITEMS}
        activeId={activeNavSectionId}
        onNavigate={scrollToWelcomeSection}
        isRTL={isRTL}
      />
      <WelcomeJourneyNav
        items={WELCOME_SECTION_NAV_ITEMS}
        activeId={activeNavSectionId}
        onNavigate={scrollToWelcomeSection}
        onBackToTop={scrollToWelcomeTop}
        isRTL={isRTL}
      />
      <div className={cn("fixed top-4 z-50", isRTL ? "left-4" : "right-4")}>
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-xl p-1 outline-none ring-0 transition-all duration-300 hover:text-primary"
              aria-label={t("navigation.preferences", "Preferences")}
            >
              <Settings
                className={cn(
                  "transition-transform duration-300",
                  dropdownOpen ? "rotate-90 scale-110" : "",
                  "hover:text-primary",
                )}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={cn("mx-4 my-2 w-56", isRTL && "text-right")}>
            <DropdownMenuLabel className="flex items-center gap-2 font-semibold text-md">
              <User className="h-4 w-4" />
              {t("navigation.welcomeToStoreManagement", "Welcome to Store Management")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.preferences", "Preferences")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <ThemeToggleButton variant="ghost" showText />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TooltipToggleButton variant="ghost" showText />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <FullscreenToggleButton variant="ghost" showText />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.language", "Language")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("en");
              }}
              disabled={i18n.language === "en"}
            >
              {t("navigation.english", "English")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("fr");
              }}
              disabled={i18n.language === "fr"}
            >
              {t("navigation.french", "French")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("ar");
              }}
              disabled={i18n.language === "ar"}
            >
              {t("navigation.arabic", "Arabic")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <section
        id="welcome-hero"
        className={cn("relative overflow-hidden border-b border-border/60", WELCOME_SECTION_SCROLL_MARGIN)}
      >
        <div
          className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12 lg:pb-20 lg:pt-20">
          <div className="text-center lg:text-start">
            <img
              src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
              alt=""
              className="mx-auto mb-6 h-28 w-28 object-contain select-none sm:h-32 sm:w-32 lg:mx-0"
            />
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
              {t("welcome.title", "Welcome to REDA TECH Store Management")}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              {t(
                "welcome.subtitle",
                "Set up this computer for the first time. Choose a new shop trial or restore your data if you already use the app elsewhere.",
              )}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground/90 lg:mx-0">
              {t(
                "about.subtitle",
                "A comprehensive store management solution designed to streamline your business operations with modern technology and intuitive design.",
              )}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
              <span className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                {t("about.version", "Version")} v{appVersion}
              </span>
              <span className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                {t("about.platform", "Platform")}: Desktop
              </span>
              <span className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                Electron + React + TypeScript
              </span>
              <span className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                {t("about.database", "Database")}: SQLite
              </span>
            </div>
          </div>

          <div className="relative isolate mt-10 lg:mt-0">
            <div
              className="pointer-events-none absolute -right-14 -top-14 z-0 h-52 w-52 rounded-full bg-green-500/22 blur-3xl sm:h-60 sm:w-60 sm:-right-16 sm:-top-16"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-12 z-0 h-28 w-28 rounded-full bg-green-500/16 blur-2xl sm:h-32 sm:w-32 sm:-bottom-12 sm:-left-14"
              aria-hidden
            />
            <section
              id="get-started"
              className={cn(
                "relative z-[1] overflow-visible rounded-3xl border bg-card/90 p-5 shadow-xl shadow-black/5 backdrop-blur-sm sm:p-7",
                online ? "border-border/80" : "border-amber-500/45 dark:border-amber-500/35",
              )}
              aria-busy={busy}
            >
            <div
              className={cn("welcome-trial-ribbon", isRTL && "welcome-trial-ribbon--rtl")}
              role="status"
              aria-label={t("welcome.trialBadge", "7-day free trial")}
            >
              {t("welcome.trialBadge", "7-day free trial!")}
            </div>

            {!online ? (
              <div
                className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-start dark:bg-amber-500/15 sm:gap-4 sm:px-5 sm:py-4"
                role="alert"
              >
                <WifiOff
                  className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400 sm:h-6 sm:w-6"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t("welcome.offlineSetupTitle", "Internet connection required")}
                  </p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(
                      "welcome.offlineSetupDescription",
                      "Registering this device and starting your free trial (or linking an existing shop) requires an active internet connection. Connect to Wi‑Fi or Ethernet, then continue below when you are back online.",
                    )}
                  </p>
                </div>
              </div>
            ) : null}

            <div
              className={cn(
                "space-y-6 transition-opacity",
                !online && "pointer-events-none select-none opacity-50",
              )}
            >
              <header className="space-y-3 pt-6 text-center sm:pt-5">
                <h2 className="flex flex-wrap items-center justify-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
                  <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                  {t("welcome.setupTitle", "Get started with us")}
                </h2>
                <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {t(
                    "welcome.setupDescription",
                    "Tell us who you are so we can set up your shop on this computer. Add your full name and phone — we use them to start your trial or restore your data, connect this device to your account, and reach you if you need help. It only takes a moment. Your details stay separate from your login password and are handled as described in the privacy section above.",
                  )}
                </p>
              </header>

              <div className="space-y-6 text-start">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="welcome-full-name" className="text-sm font-medium">
                      {t("welcome.fullName", "Full name")}
                    </label>
                    <Input
                      id="welcome-full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                      placeholder={t("welcome.fullNamePlaceholder", "First and last name")}
                      disabled={!online || busy}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="welcome-phone" className="text-sm font-medium">
                      {t("welcome.phone", "Phone number")}
                    </label>
                    <Input
                      id="welcome-phone"
                      value={phone}
                      onChange={(e) => setPhone(sanitizeWelcomePhoneInput(e.target.value))}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder={t("welcome.phonePlaceholder", "Your phone number")}
                      disabled={!online || busy}
                    />
                  </div>
                </div>

                <Checkbox
                  checked={existingShopNewPc}
                  onChange={setExistingShopNewPc}
                  label={t(
                    "welcome.existingShopNewPc",
                    "This is a new PC for my existing shop (I already use Store Management)",
                  )}
                  color="blue"
                  disabled={!online || busy}
                />

                {existingShopNewPc ? (
                  <div className="space-y-2">
                    <label htmlFor="welcome-customer-id" className="text-sm font-medium">
                      {t("welcome.customerId", "Customer ID")}
                    </label>
                    <Input
                      id="welcome-customer-id"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      placeholder={t("welcome.customerIdPlaceholder", "UUID from your supplier")}
                      className="font-mono text-sm"
                      disabled={!online || busy}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("welcome.customerIdHint", "Must match the phone number we have on file for this ID.")}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 pt-1">
                  {!existingShopNewPc ? (
                    <Button
                      type="button"
                      className="min-h-[3rem] w-full border-transparent bg-green-600 text-white shadow-xs hover:bg-green-700 focus-visible:ring-green-500/35 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                      disabled={!online || busy}
                      onClick={handleStartTrial}
                    >
                      {busy && !existingShopNewPc ? (
                        <span className="flex items-center justify-center">
                          <span
                            className="mr-2 h-5 w-5 shrink-0 animate-spin rounded-full border-b-2 border-white"
                            aria-hidden
                          />
                          {t("welcome.startingTrial", "Registering device…")}
                        </span>
                      ) : (
                        t("welcome.startTrial", "Start free 7-day trial")
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="min-h-[3rem] w-full border-transparent bg-blue-600 text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500/35 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                      disabled={!online || busy}
                      onClick={handleRestore}
                    >
                      {busy && existingShopNewPc ? (
                        <span className="flex items-center justify-center">
                          <span
                            className="mr-2 h-5 w-5 shrink-0 animate-spin rounded-full border-b-2 border-white"
                            aria-hidden
                          />
                          {t("welcome.linkingDevice", "Linking device…")}
                        </span>
                      ) : (
                        t("welcome.restoreFromCloud", "Restore data from cloud")
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
          </div>
        </div>
      </section>

      <section id="welcome-key-features" className={cn("mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16", WELCOME_SECTION_SCROLL_MARGIN)}>
        <div className="mx-auto mb-11 max-w-2xl text-center sm:mb-12">
          <h2 className="flex items-center justify-center gap-3 text-[1.75rem] font-bold text-foreground sm:text-3xl">
            <Star className="h-8 w-8 shrink-0 text-primary" aria-hidden />
            {t("about.features.title", "Key Features")}
          </h2>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t(
              "about.subtitle",
              "A comprehensive store management solution designed to streamline your business operations with modern technology and intuitive design.",
            )}
          </p>
        </div>
        <FeaturesCarousel items={ABOUT_MAIN_FEATURE_DEFS} isRTL={isRTL} />
      </section>

      <section
        id="welcome-technical-features"
        className={cn("border-y border-border/60 bg-muted/15", WELCOME_SECTION_SCROLL_MARGIN)}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="flex items-center justify-center gap-3 text-2xl font-bold text-foreground sm:text-3xl">
              <Shield className="h-7 w-7 shrink-0 text-primary" aria-hidden />
              {t("about.technical.title", "Technical Features")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t(
                "welcome.technologyBridge.description",
                "The features above cover day-to-day sales, stock, and clients. This is a desktop application: your shop data stays on this PC, keeps working when the connection is weak, and access stays controlled for each staff member.",
              )}
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            {WELCOME_TECHNOLOGY_BRIDGE_HIGHLIGHTS.map(({ icon: Icon, titleKey, descKey }) => (
              <article
                key={titleKey}
                className="rounded-2xl border border-border/60 bg-card/80 p-5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
              </article>
            ))}
          </div>

          <div className="mt-12 sm:mt-14">
            <FeaturesCarousel
              items={ABOUT_TECHNICAL_FEATURE_DEFS}
              isRTL={isRTL}
              tabListAriaLabel={t("about.technical.title", "Technical Features")}
            />
          </div>
        </div>
      </section>

      <section className={cn("border-y border-border/60", WELCOME_SECTION_SCROLL_MARGIN)}>
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pb-16 sm:pt-6 short:pb-8 short:pt-4 short:sm:pb-10 short:sm:pt-5">
          <PricingPlansSection id="welcome-pricing" className="!mb-0" />
        </div>
      </section>

      <section
        id="welcome-developer"
        className={cn("mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16", WELCOME_SECTION_SCROLL_MARGIN)}
      >
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-lg">
          <div className="border-b border-border/60 bg-muted/25 px-6 py-8 sm:px-8">
            <h2 className="flex items-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
              <Code className="h-6 w-6 shrink-0 text-primary" aria-hidden />
              {t("about.developer.title", "Developer Information")}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80">
                  <span className="text-lg font-bold text-white dark:text-black">AK</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Abdellah Kahia</h3>
                  <p className="text-muted-foreground">{t("about.developer.role", "Lead Developer & Founder")}</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="break-all text-foreground">abdoukahia853@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-foreground">+213 793 420 745</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span className="text-foreground">Annaba, Algeria</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-muted/30 p-6">
              <h4 className="mb-3 font-semibold text-foreground">
                {t("about.developer.bio", "About the Developer")}
              </h4>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(
                  "about.developer.bioText",
                  "Passionate software developer with expertise in modern web technologies and desktop application development. Dedicated to creating efficient, user-friendly solutions that help businesses streamline their operations and achieve their goals.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="welcome-legal"
        className={cn("border-t border-border/60 bg-muted/15", WELCOME_SECTION_SCROLL_MARGIN)}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
              {t("welcome.sectionNav.legal", "Legal")}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
              <h3 className="mb-4 flex items-center gap-3 text-xl font-bold text-foreground">
                <Shield className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                {t("about.privacy.title", "Privacy Policy")}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t("about.privacy.intro")}</p>
              <ul className="list-disc space-y-3 ps-5 text-sm leading-relaxed text-muted-foreground">
                {ABOUT_PRIVACY_POINT_KEYS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
              <h3 className="mb-4 flex items-center gap-3 text-xl font-bold text-foreground">
                <FileText className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                {t("about.terms.title", "Terms of Service")}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{t("about.terms.intro")}</p>
              <ul className="list-disc space-y-3 ps-5 text-sm leading-relaxed text-muted-foreground">
                {ABOUT_TERMS_POINT_KEYS.map((key) => (
                  <li key={key}>{t(key)}</li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 px-4 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {t("about.footer", "© 2024 REDA TECH. All rights reserved. Built with ❤️ in Algeria.")}
        </p>
      </footer>
    </div>
  );
}
