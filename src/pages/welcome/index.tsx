import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Sparkles, Star, Shield, Code, Mail, Phone, MapPin, FileText, User, WifiOff } from "lucide-react";
import { useTheme } from "../../lib/hooks/useTheme";
import { cn } from "../../lib/utils";
import {
  ABOUT_MAIN_FEATURE_DEFS,
  ABOUT_TECHNICAL_FEATURE_DEFS,
} from "../../lib/about/featureDefinitions";
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
import { PricingPlansSection } from "../../lib/components/pricingPlansSection";
import {
  INITIAL_WELCOME_DONE_EVENT,
  ONBOARDING_INITIAL_WELCOME_DONE_KEY,
  ONLINE_CUSTOMER_ID_OPTION_KEY,
} from "../../lib/onboarding/constants";
import type { DeviceRequestResult } from "../../electron/types/deviceRequest";

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
      className="min-h-screen bg-background text-foreground"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <div className={`fixed top-4 z-50 ${isRTL ? "left-4" : "right-4"}`}>
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-xl outline-none ring-0 hover:text-primary transition-all duration-300 p-1"
              aria-label={t("navigation.preferences", "Preferences")}
            >
              <Settings
                className={`transition-transform duration-400 ${
                  dropdownOpen ? "rotate-90 scale-110" : ""
                } hover:text-primary`}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={`mx-4 my-2 w-56 ${isRTL ? "text-right" : ""}`}>
            <DropdownMenuLabel className="font-semibold text-md flex items-center gap-2">
              <User className="w-4 h-4" />
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

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="text-center mb-10">
          <img
            src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
            alt=""
            className="mx-auto mb-4 h-36 w-36 object-contain select-none sm:h-48 sm:w-48 md:h-56 md:w-56"
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("welcome.title", "Welcome to REDA TECH Store Management")}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-3xl mx-auto">
            {t(
              "welcome.subtitle",
              "Set up this computer for the first time. Choose a new shop trial or restore your data if you already use the app elsewhere.",
            )}
          </p>
        </div>

        {/* Same blocks as About: app info, key features, technical, developer, legal */}
        <div className="bg-card rounded-2xl border border-border shadow-lg p-5 sm:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Code className="w-6 h-6 text-primary shrink-0" aria-hidden />
            {t("about.appInfo", "Application Information")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <span className="text-foreground font-medium">{t("about.appName", "Application Name")}:</span>
                <span className="text-muted-foreground">REDA TECH Store Management</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <span className="text-foreground font-medium">{t("about.version", "Version")}:</span>
                <span className="text-muted-foreground">v{appVersion}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <span className="text-foreground font-medium">{t("about.platform", "Platform")}:</span>
                <span className="text-muted-foreground">Desktop Application</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <span className="text-foreground font-medium">{t("about.technology", "Technology")}:</span>
                <span className="text-muted-foreground">Electron + React + TypeScript</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="w-2 h-2 bg-primary rounded-full shrink-0" />
                <span className="text-foreground font-medium">{t("about.database", "Database")}:</span>
                <span className="text-muted-foreground">SQLite</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-5 sm:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Star className="w-6 h-6 text-primary shrink-0" aria-hidden />
            {t("about.features.title", "Key Features")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ABOUT_MAIN_FEATURE_DEFS.map((def) => {
              const Icon = def.icon;
              return (
                <div
                  key={def.titleKey}
                  className="bg-muted/30 rounded-xl p-6 hover:bg-muted/50 transition-colors duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" aria-hidden />
                    </div>
                    <h3 className="font-semibold text-foreground">{t(def.titleKey)}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{t(def.descKey)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-5 sm:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary shrink-0" aria-hidden />
            {t("about.technical.title", "Technical Features")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ABOUT_TECHNICAL_FEATURE_DEFS.map((def) => {
              const Icon = def.icon;
              return (
                <div key={def.titleKey} className="flex items-start gap-4 p-4 bg-muted/20 rounded-xl">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground mb-1">{t(def.titleKey)}</h3>
                    <p className="text-sm text-muted-foreground">{t(def.descKey)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-lg p-5 sm:p-8 mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-3">
            <Code className="w-6 h-6 text-primary shrink-0" aria-hidden />
            {t("about.developer.title", "Developer Information")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white dark:text-black font-bold text-lg">AK</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg">Abdellah Kahia</h3>
                  <p className="text-muted-foreground">{t("about.developer.role", "Lead Developer & Founder")}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  <span className="text-foreground break-all">abdoukahia853@gmail.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  <span className="text-foreground">+213 793 420 745</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden />
                  <span className="text-foreground">Annaba, Algeria</span>
                </div>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-6">
              <h4 className="font-semibold text-foreground mb-3">{t("about.developer.bio", "About the Developer")}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t(
                  "about.developer.bioText",
                  "Passionate software developer with expertise in modern web technologies and desktop application development. Dedicated to creating efficient, user-friendly solutions that help businesses streamline their operations and achieve their goals.",
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary shrink-0" aria-hidden />
              {t("about.privacy.title", "Privacy Policy")}
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t("about.privacy.dataCollection", "• We collect only necessary business data for application functionality")}</p>
              <p>{t("about.privacy.dataStorage", "• All data is stored locally on your device")}</p>
              <p>{t("about.privacy.dataSharing", "• We do not share your data with third parties")}</p>
              <p>{t("about.privacy.dataSecurity", "• Your data is protected with encryption and secure storage")}</p>
              <p>{t("about.privacy.dataAccess", "• You have full control over your data and can export/backup anytime")}</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border shadow-lg p-5 sm:p-8">
            <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary shrink-0" aria-hidden />
              {t("about.terms.title", "Terms of Service")}
            </h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>{t("about.terms.license", "• This software is licensed for commercial use")}</p>
              <p>{t("about.terms.warranty", "• Software provided 'as is' without warranty")}</p>
              <p>{t("about.terms.liability", "• Developer not liable for data loss or business damages")}</p>
              <p>{t("about.terms.updates", "• Updates and support provided as available")}</p>
              <p>{t("about.terms.termination", "• License can be terminated at any time")}</p>
            </div>
          </div>
        </div>

        <PricingPlansSection className="mt-2" />

        <section
          className={cn(
            "relative overflow-visible bg-card rounded-2xl border shadow-lg p-5 sm:p-8 mb-8 mt-8 space-y-6",
            online ? "border-border" : "border-amber-500/45 dark:border-amber-500/35",
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
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/15 px-4 py-3 sm:px-5 sm:py-4 flex gap-3 sm:gap-4 text-start"
              role="alert"
            >
              <WifiOff
                className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5"
                aria-hidden
              />
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {t("welcome.offlineSetupTitle", "Internet connection required")}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
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
              !online && "pointer-events-none opacity-50 select-none",
            )}
          >
          <header className="mx-auto max-w-3xl space-y-3 text-center pt-8 sm:pt-7 md:pt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground flex flex-wrap items-center justify-center gap-3">
              <Sparkles className="w-6 h-6 text-primary shrink-0" aria-hidden />
              {t("welcome.setupTitle", "Get started with us")}
            </h2>
            <p className="mx-auto max-w-3xl text-sm text-muted-foreground leading-relaxed">
              {t(
                "welcome.setupDescription",
                "Tell us who you are so we can set up your shop on this computer. Add your full name and phone — we use them to start your trial or restore your data, connect this device to your account, and reach you if you need help. It only takes a moment. Your details stay separate from your login password and are handled as described in the privacy section above.",
              )}
            </p>
          </header>

          <div className="mx-auto w-full max-w-2xl space-y-6 text-start">
            <div className="flex flex-col gap-6">
              <div className="space-y-2">
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
              <div className="space-y-2">
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
              <div className="space-y-2 pt-1">
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

            <div className="flex flex-col gap-3 pt-2">
              {!existingShopNewPc ? (
                <Button
                  type="button"
                  className="w-full min-h-[3rem] border-transparent bg-green-600 text-white shadow-xs hover:bg-green-700 focus-visible:ring-green-500/35 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
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
                  className="w-full min-h-[3rem] border-transparent bg-blue-600 text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500/35 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
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
  );
}
