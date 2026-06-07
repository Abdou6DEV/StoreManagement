import React, { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
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
  ArrowRight,
  ArrowLeft,
  Loader2,
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
import {
  persistOnlineCustomerProfile,
  persistOnlineCustomerProfileFromDeviceCheck,
} from "../../lib/onboarding/onlineCustomerProfile";
import type { DeviceRequestResult } from "../../electron/types/deviceRequest";
import type { DeviceLinkExistingResult } from "../../electron/types/deviceLinkExisting";
import type { CloudBackupTransferProgressPayload } from "../../electron/types/cloudBackup";
import { CloudBackupTransferProgressBar } from "../../lib/components/cloudBackupTransferProgress";
import { AnimatedHeight } from "../../lib/components/animatedHeight";
import { WelcomeMarketingDownloadCard } from "./WelcomeMarketingDownloadCard";

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

type WelcomeInKind = "fadeUp" | "slide";

type WelcomeDevicePrecheck = "loading" | "new_device" | "existing_device";

/** Strict top-to-bottom order: only one segment animates at a time (`introStep` advances on `animationend`). */
const SEQ = {
  logo: 0,
  title: 1,
  subtitle: 2,
  aboutLine: 3,
  badges: 4,
  card: 5,
  keyIntro: 6,
  keyCarousel: 7,
  techIntro: 8,
  techTiles: 9,
  techCarousel: 10,
  pricing: 11,
  devCard: 12,
  legal: 13,
  footer: 14,
} as const;

const INTRO_STEP_COUNT = 15;
const SEQ_ANIM_S = 0.38;
/** Delay before the get-started card green glow fades in (after the panel is on screen). */
const WELCOME_GLOW_DELAY_S = 0.7;
/** Duration of the green glow opacity fade-in. */
const WELCOME_GLOW_FADEIN_S = 0.48;
/** Top section nav: fade + slide down into place. Bottom journey nav: fade + slide up into place. */
const WELCOME_SECTION_NAV_IN_S = 0.45;
const WELCOME_IN_EASE = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";

function welcomeSeqStyle(reduceMotion: boolean, kind: WelcomeInKind, isRTL: boolean): React.CSSProperties {
  if (reduceMotion) return { opacity: 1 };
  const dur = `${SEQ_ANIM_S}s`;
  const name =
    kind === "fadeUp"
      ? "welcomeInFadeUp"
      : isRTL
        ? "welcomeInSlideRtl"
        : "welcomeInSlideLtr";
  return {
    opacity: 0,
    animation: `${name} ${dur} ${WELCOME_IN_EASE} 0s forwards`,
  };
}

type SequentialIntroSlotProps = {
  stepIndex: number;
  introStep: number;
  reduceMotion: boolean;
  isRTL: boolean;
  kind: WelcomeInKind;
  onStepComplete: () => void;
  /** Until this step: render nothing (saves heavy trees until needed). */
  defer?: boolean;
  className?: string;
  children: React.ReactNode;
  /**
   * When set, the slot does not run the outer entrance animation; `onStepComplete` runs after this delay
   * while the step is active (use when the visible entrance is handled inside `children`).
   */
  advanceIntroAfterMs?: number;
};

function SequentialIntroSlot({
  stepIndex,
  introStep,
  reduceMotion,
  isRTL,
  kind,
  onStepComplete,
  defer,
  className,
  children,
  advanceIntroAfterMs,
}: SequentialIntroSlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const done = stepIndex < introStep;
  const active = stepIndex === introStep && introStep < INTRO_STEP_COUNT;
  const waiting = stepIndex > introStep;

  useEffect(() => {
    if (reduceMotion || !active) {
      completedRef.current = false;
      return;
    }
    completedRef.current = false;

    if (advanceIntroAfterMs != null) {
      const id = window.setTimeout(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        onStepComplete();
      }, advanceIntroAfterMs);
      return () => {
        window.clearTimeout(id);
        completedRef.current = false;
      };
    }

    const node = ref.current;
    if (!node) return;
    const onEnd = (e: AnimationEvent) => {
      if (e.target !== node) return;
      if (!String(e.animationName || "").includes("welcomeIn")) return;
      if (completedRef.current) return;
      completedRef.current = true;
      onStepComplete();
    };
    node.addEventListener("animationend", onEnd);
    return () => node.removeEventListener("animationend", onEnd);
  }, [active, reduceMotion, onStepComplete, advanceIntroAfterMs]);

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  if (waiting && defer) {
    return null;
  }

  if (waiting) {
    return null;
  }

  if (done) {
    return <div className={className}>{children}</div>;
  }

  if (advanceIntroAfterMs != null) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={className} style={welcomeSeqStyle(false, kind, isRTL)}>
      {children}
    </div>
  );
}

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

type WelcomeRestorePhase = "idle" | "linking" | "downloading" | "restoring" | "ready";

function deviceLinkExistingErrorToastMessage(
  result: Extract<DeviceLinkExistingResult, { success: false }>,
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
  const err = result.error.trim().toLowerCase();
  if (err.includes("phone_mismatch")) {
    return t(
      "welcome.restorePhoneMismatch",
      "This phone number does not match the customer ID. Check your details or contact support.",
    );
  }
  if (err.includes("name_mismatch")) {
    return t(
      "welcome.restoreNameMismatch",
      "This name does not match the customer ID on file.",
    );
  }
  if (err.includes("customer_not_found")) {
    return t("welcome.restoreCustomerNotFound", "Customer ID was not found.");
  }
  if (err.includes("device_already_linked_other_customer")) {
    return t(
      "welcome.restoreDeviceLinkedElsewhere",
      "This computer is already linked to a different customer. Contact support.",
    );
  }
  if (err.includes("restore_requires_paid_license")) {
    return t(
      "welcome.restoreRequiresPaidLicense",
      "Cloud restore needs a valid paid license on your account. Contact your supplier to renew or activate, then try again.",
    );
  }
  return result.error;
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

type WelcomeSetupProps = {
  /** GitHub Pages landing: same welcome UI with a download card instead of onboarding. */
  marketingSite?: boolean;
};

export default function WelcomeSetup({ marketingSite = false }: WelcomeSetupProps) {
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { showToast } = useToast();
  const isRTL = i18n.language === "ar";

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [showRestoreFlow, setShowRestoreFlow] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restorePhase, setRestorePhase] = useState<WelcomeRestorePhase>("idle");
  /** Set after cloud restore + DB apply succeed; prevents switching to trial on the same screen. */
  const [restoreCompleted, setRestoreCompleted] = useState(false);
  const [linkedRestoreCustomerId, setLinkedRestoreCustomerId] = useState<string | null>(null);
  const [cloudTransferProgress, setCloudTransferProgress] =
    useState<CloudBackupTransferProgressPayload | null>(null);
  const [appVersion, setAppVersion] = useState<string>("1.0.0");
  const [online, setOnline] = useState(
    () => typeof navigator !== "undefined" && navigator.onLine,
  );
  const [activeNavSectionId, setActiveNavSectionId] = useState<WelcomeSectionId>(
    WELCOME_SECTION_NAV_ITEMS[0].id,
  );
  const [reduceMotion, setReduceMotion] = useState(false);
  const [introStep, setIntroStep] = useState(0);
  const [devicePrecheck, setDevicePrecheck] = useState<WelcomeDevicePrecheck>(
    marketingSite ? "new_device" : "loading",
  );
  const [precheckCustomerId, setPrecheckCustomerId] = useState<string | null>(null);
  const [precheckCustomerName, setPrecheckCustomerName] = useState<string | null>(null);
  const [precheckCustomerPhone, setPrecheckCustomerPhone] = useState<string | null>(null);

  const welcomeFullNameRef = useRef<HTMLInputElement>(null);
  const welcomePhoneRef = useRef<HTMLInputElement>(null);
  const welcomeCustomerIdRef = useRef<HTMLInputElement>(null);
  const welcomePrimaryActionRef = useRef<HTMLButtonElement>(null);

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

  const sectionNavItems = useMemo(() => {
    if (!marketingSite) return WELCOME_SECTION_NAV_ITEMS;
    return WELCOME_SECTION_NAV_ITEMS.map((item) =>
      item.id === "get-started"
        ? {
            ...item,
            labelKey: "welcome.sectionNav.download",
            defaultLabel: "Download",
          }
        : item,
    );
  }, [marketingSite]);

  useEffect(() => {
    if (marketingSite) return;

    let cancelled = false;

    const run = async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setDevicePrecheck("new_device");
        setPrecheckCustomerId(null);
        setPrecheckCustomerName(null);
        setPrecheckCustomerPhone(null);
        return;
      }

      setDevicePrecheck("loading");
      try {
        const r = await window.api.online.deviceCheck();
        if (cancelled || (typeof navigator !== "undefined" && !navigator.onLine)) {
          setDevicePrecheck("new_device");
          setPrecheckCustomerId(null);
          setPrecheckCustomerName(null);
          setPrecheckCustomerPhone(null);
          return;
        }

        if (r.success === false) {
          setDevicePrecheck("new_device");
          setPrecheckCustomerId(null);
          setPrecheckCustomerName(null);
          setPrecheckCustomerPhone(null);
          return;
        }

        const cid =
          typeof r.customerId === "string" && r.customerId.trim() ? r.customerId.trim() : null;
        if (cid) {
          setPrecheckCustomerId(cid);
          const nm =
            typeof r.customerName === "string" && r.customerName.trim() ? r.customerName.trim() : null;
          const ph =
            typeof r.customerPhone === "string" && r.customerPhone.trim() ? r.customerPhone.trim() : null;
          setPrecheckCustomerName(nm);
          setPrecheckCustomerPhone(ph);
          setDevicePrecheck("existing_device");
        } else {
          setPrecheckCustomerId(null);
          setPrecheckCustomerName(null);
          setPrecheckCustomerPhone(null);
          setDevicePrecheck("new_device");
        }
      } catch {
        if (!cancelled) {
          setDevicePrecheck("new_device");
          setPrecheckCustomerId(null);
          setPrecheckCustomerName(null);
          setPrecheckCustomerPhone(null);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [online, marketingSite]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const reduced = mq.matches;
      setReduceMotion(reduced);
      if (reduced) setIntroStep(INTRO_STEP_COUNT);
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const advanceIntro = useCallback(() => {
    setIntroStep((s) => Math.min(s + 1, INTRO_STEP_COUNT));
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
    const sectionIds = sectionNavItems.map((item) => item.id);

    const updateActiveSection = () => {
      const getStartedEl = document.getElementById("get-started");
      if (!getStartedEl) {
        setActiveNavSectionId(sectionIds[0]);
        return;
      }

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
  }, [introStep, sectionNavItems]);

  useEffect(() => {
    let cancelled = false;

    const loadVersionFromGitHub = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/repos/Abdou6DEV/StoreManagement/releases/latest",
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
              "User-Agent": "REDA-TECH-Store-Management-Landing",
            },
          },
        );
        if (!response.ok) return;
        const release = await response.json();
        const v = String(release.tag_name ?? "").replace(/^v/i, "");
        if (!cancelled && v) setAppVersion(v);
      } catch {
        /* keep default */
      }
    };

    if (marketingSite) {
      void loadVersionFromGitHub();
      return () => {
        cancelled = true;
      };
    }

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
  }, [marketingSite]);

  useEffect(() => {
    if (restorePhase !== "downloading") return;
    const cleanup = window.api.online.onCloudBackupTransferProgress((data) => {
      setCloudTransferProgress(data);
    });
    return cleanup;
  }, [restorePhase]);

  useEffect(() => {
    if (!showRestoreFlow && !restoreCompleted) {
      setRestorePhase("idle");
      setLinkedRestoreCustomerId(null);
      setCloudTransferProgress(null);
    }
  }, [showRestoreFlow, restoreCompleted]);

  const finishWelcomeAfterProvisioning = async (
    customerIdFromServer?: string | null,
    profile?: { name?: string | null; phone?: string | null },
  ) => {
    await window.api.database.options.set(ONBOARDING_INITIAL_WELCOME_DONE_KEY, "1");
    const cid = customerIdFromServer?.trim();
    if (cid) {
      await window.api.database.options.set(ONLINE_CUSTOMER_ID_OPTION_KEY, cid);
    }
    if (typeof navigator !== "undefined" && navigator.onLine) {
      const check = await window.api.online.deviceCheck();
      if (!cid && check.success === true && check.customerId?.trim()) {
        await window.api.database.options.set(ONLINE_CUSTOMER_ID_OPTION_KEY, check.customerId.trim());
      }
      await persistOnlineCustomerProfileFromDeviceCheck(check);
    }
    if (profile?.name != null || profile?.phone != null) {
      await persistOnlineCustomerProfile(profile.name, profile.phone);
    }
    window.dispatchEvent(new Event(INITIAL_WELCOME_DONE_EVENT));
  };

  const registeredIntroDescription = useMemo(() => {
    const highlight = <span className="font-semibold text-green-700 not-italic" />;
    if (precheckCustomerName && precheckCustomerPhone) {
      return (
        <Trans
          i18nKey="welcome.registeredDeviceDescriptionBoth"
          components={{ highlight }}
          values={{ name: precheckCustomerName, phone: precheckCustomerPhone }}
        />
      );
    }
    if (precheckCustomerName) {
      return (
        <Trans
          i18nKey="welcome.registeredDeviceDescriptionName"
          components={{ highlight }}
          values={{ name: precheckCustomerName }}
        />
      );
    }
    if (precheckCustomerPhone) {
      return t(
        "welcome.registeredDeviceDescriptionPhone",
        "This device is already registered with phone {{phone}}. You can continue to sign in.",
        { phone: precheckCustomerPhone },
      );
    }
    return t(
      "welcome.registeredDeviceDescriptionGeneric",
      "This device is already registered in our system. Continue to sign in. If you still need to start a new trial or restore from the cloud for another shop, use the options below.",
    );
  }, [precheckCustomerName, precheckCustomerPhone, t]);

  const handleContinueRegisteredDevice = async () => {
    const cid = precheckCustomerId?.trim();
    if (!cid) return;
    setBusy(true);
    try {
      showToast(
        t("welcome.continueToAppToast", "Continuing — you can sign in on the next screen."),
        "success",
      );
      await new Promise((r) => setTimeout(r, WELCOME_SUCCESS_TOAST_VISIBLE_MS));
      await finishWelcomeAfterProvisioning(cid, {
        name: precheckCustomerName,
        phone: precheckCustomerPhone,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleStartTrial = async () => {
    if (restoreCompleted) {
      showToast(
        t(
          "welcome.restoreAlreadyComplete",
          "Your shop data is already restored. Press Continue to sign in.",
        ),
        "error",
      );
      return;
    }
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
      await finishWelcomeAfterProvisioning(result.customerId ?? undefined, { name, phone: ph });
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

  const handleContinueAfterRestore = async () => {
    const cid = (linkedRestoreCustomerId ?? customerId).trim();
    if (!cid) return;
    setBusy(true);
    try {
      showToast(
        t("welcome.continueToAppToast", "Continuing — you can sign in on the next screen."),
        "success",
      );
      await new Promise((r) => setTimeout(r, WELCOME_SUCCESS_TOAST_VISIBLE_MS));
      await finishWelcomeAfterProvisioning(cid, {
        name: fullName.trim(),
        phone: sanitizeWelcomePhoneInput(phone).trim(),
      });
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
    setRestorePhase("linking");
    setCloudTransferProgress(null);
    try {
      const link = await window.api.online.deviceLinkExisting({
        customerId: cid,
        name,
        phone: ph,
      });
      if (link.success === false) {
        showToast(deviceLinkExistingErrorToastMessage(link, t), "error");
        setRestorePhase("idle");
        return;
      }

      const resolvedCustomerId = link.customerId ?? cid;
      setLinkedRestoreCustomerId(resolvedCustomerId);
      await window.api.database.options.set(ONLINE_CUSTOMER_ID_OPTION_KEY, resolvedCustomerId);

      showToast(
        t("welcome.restoreLinkSuccess", "Shop verified. Downloading your cloud backup…"),
        "success",
      );

      setRestorePhase("downloading");
      setCloudTransferProgress({
        phase: "download",
        progress: 0,
        downloaded: 0,
        total: 0,
        speed: 0,
      });

      const download = await window.api.online.backupDownloadLatestToLocal(resolvedCustomerId);
      if (download.success === false) {
        if (download.code === "not_found") {
          showToast(
            t("welcome.restoreNoCloudBackup", "No cloud backup was found for this customer yet."),
            "error",
          );
        } else if (download.code === "missing_env") {
          showToast(
            t(
              "welcome.onlineNotConfigured",
              "Online setup is not configured on this PC. Ask your administrator to set STORE_ONLINE_* environment variables.",
            ),
            "error",
          );
        } else if (download.code === "network") {
          showToast(
            t(
              "welcome.serverUnreachable",
              "We could not reach our servers. Check your internet connection and try again. If this continues, wait a few minutes or contact support.",
            ),
            "error",
          );
        } else if (download.code === "app_update_required") {
          showToast(
            t(
              "welcome.restoreAppUpdateRequired",
              "This cloud backup needs app version {{cloudVersion}} or newer. You have {{installedVersion}}. Update the app, then try restore again.",
              {
                cloudVersion: download.cloudAppVersion ?? "?",
                installedVersion: download.installedAppVersion ?? "?",
              },
            ),
            "error",
          );
        } else {
          const errMsg = download.error.trim().toLowerCase();
          if (errMsg.includes("device_inactive")) {
            showToast(
              t(
                "welcome.restoreDeviceInactive",
                "This device is not allowed to download backups yet. Check your license or contact support.",
              ),
              "error",
            );
          } else {
            showToast(
              t("welcome.restoreDownloadFailed", "Could not download your cloud backup: {{message}}", {
                message: download.error,
              }),
              "error",
            );
          }
        }
        setRestorePhase("idle");
        setCloudTransferProgress(null);
        return;
      }

      setRestorePhase("restoring");
      setCloudTransferProgress({
        phase: "download",
        progress: 100,
        downloaded: download.sizeBytes,
        total: download.sizeBytes,
        speed: 0,
      });

      const restored = await window.api.backup.restore(download.backupPath);
      if (!restored?.success) {
        showToast(
          t("welcome.restoreApplyFailed", "Download finished but restoring the database failed."),
          "error",
        );
        setRestorePhase("idle");
        setCloudTransferProgress(null);
        return;
      }

      setRestoreCompleted(true);
      setRestorePhase("ready");
      setShowRestoreFlow(true);
      showToast(
        t(
          "welcome.restoreComplete",
          "Your shop data was restored. Press Continue to sign in.",
        ),
        "success",
      );
    } catch {
      showToast(
        t(
          "welcome.serverUnreachable",
          "We could not reach our servers. Check your internet connection and try again. If this continues, wait a few minutes or contact support.",
        ),
        "error",
      );
      setRestorePhase("idle");
      setCloudTransferProgress(null);
    } finally {
      setBusy(false);
    }
  };

  /** Same moment the get-started green glow is in the tree: intro has reached the card and we are not in online-only loading. */
  const mountWelcomeNavChrome = marketingSite
    ? introStep >= SEQ.card
    : introStep >= SEQ.card && !(online && devicePrecheck === "loading");

  const restoreInProgress =
    restorePhase === "linking" ||
    restorePhase === "downloading" ||
    restorePhase === "restoring";

  const restoreFieldsLocked = busy || restoreCompleted || restoreInProgress;

  /** Block leaving restore while linking/downloading/applying, or after data is restored. */
  const restoreBackDisabled = restoreInProgress || restoreCompleted || busy;

  /** Blue corner glow only while restore is in progress; green when trial or after restore finishes. */
  const restoreGlowActive = showRestoreFlow && !restoreCompleted;

  const handleWelcomeFormKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!online || busy) return;
    if (showRestoreFlow && restoreInProgress) {
      return;
    }

    const primary = welcomePrimaryActionRef.current;
    if (!primary || primary.disabled) return;

    if (e.currentTarget === welcomeFullNameRef.current) {
      welcomePhoneRef.current?.focus();
      return;
    }

    if (e.currentTarget === welcomePhoneRef.current) {
      if (showRestoreFlow && welcomeCustomerIdRef.current && !restoreCompleted) {
        welcomeCustomerIdRef.current.focus();
        return;
      }
      primary.click();
      return;
    }

    if (e.currentTarget === welcomeCustomerIdRef.current) {
      primary.click();
    }
  };

  const exitRestoreFlow = () => {
    if (restoreCompleted) {
      showToast(
        t(
          "welcome.restoreFinishWithContinue",
          "Your data is already on this computer. Press Continue to finish setup.",
        ),
        "error",
      );
      return;
    }
    if (restoreBackDisabled) {
      return;
    }
    setShowRestoreFlow(false);
    setCustomerId("");
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="welcome-intro-scope min-h-screen bg-background pb-16 text-foreground xl:pt-24"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <style>{`
        @keyframes welcomeInFadeUp {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .welcome-intro-scope .welcome-gs-body-fadeup {
          animation: welcomeInFadeUp ${SEQ_ANIM_S}s ${WELCOME_IN_EASE} 0s both;
        }
        @keyframes welcomeGlowFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .welcome-intro-scope .welcome-gs-glow-fadein {
          opacity: 0;
          animation: welcomeGlowFadeIn ${WELCOME_GLOW_FADEIN_S}s ${WELCOME_IN_EASE} ${WELCOME_GLOW_DELAY_S}s both;
        }
        @keyframes welcomeSectionNavFadeDown {
          from {
            opacity: 0;
            transform: translate3d(0, -14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .welcome-intro-scope .welcome-section-nav-in {
          opacity: 0;
          animation: welcomeSectionNavFadeDown ${WELCOME_SECTION_NAV_IN_S}s ${WELCOME_IN_EASE} 0s both;
        }
        @keyframes welcomeJourneyNavFadeUp {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .welcome-intro-scope .welcome-journey-nav-in {
          opacity: 0;
          animation: welcomeJourneyNavFadeUp ${WELCOME_SECTION_NAV_IN_S}s ${WELCOME_IN_EASE} 0s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .welcome-intro-scope .welcome-gs-body-fadeup,
          .welcome-intro-scope .welcome-gs-glow-fadein,
          .welcome-intro-scope .welcome-section-nav-in,
          .welcome-intro-scope .welcome-journey-nav-in {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
        @keyframes welcomeInSlideLtr {
          from {
            opacity: 0;
            transform: translate3d(-22px, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes welcomeInSlideRtl {
          from {
            opacity: 0;
            transform: translate3d(22px, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
      `}</style>
      {mountWelcomeNavChrome ? (
        <>
          <WelcomeSectionNav
            items={sectionNavItems}
            activeId={activeNavSectionId}
            onNavigate={scrollToWelcomeSection}
            isRTL={isRTL}
            className={cn("welcome-section-nav-in")}
          />
          <WelcomeJourneyNav
            items={sectionNavItems}
            activeId={activeNavSectionId}
            onNavigate={scrollToWelcomeSection}
            onBackToTop={scrollToWelcomeTop}
            isRTL={isRTL}
            className={cn("welcome-journey-nav-in")}
          />
        </>
      ) : null}
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
        className={cn(
          "relative",
          introStep >= SEQ.keyIntro && "border-b border-border/60",
          WELCOME_SECTION_SCROLL_MARGIN,
        )}
      >
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12 lg:pb-20 lg:pt-20">
          <div className="text-center lg:text-start">
            <SequentialIntroSlot
              stepIndex={SEQ.logo}
              introStep={introStep}
              reduceMotion={reduceMotion}
              isRTL={isRTL}
              kind="slide"
              onStepComplete={advanceIntro}
            >
              <img
                src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
                alt=""
                className="mx-auto mb-6 h-28 w-28 object-contain select-none sm:h-32 sm:w-32 lg:mx-0"
              />
            </SequentialIntroSlot>
            <SequentialIntroSlot
              stepIndex={SEQ.title}
              introStep={introStep}
              reduceMotion={reduceMotion}
              isRTL={isRTL}
              kind="fadeUp"
              onStepComplete={advanceIntro}
            >
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
                {t("welcome.title", "Welcome to REDA TECH Store Management")}
              </h1>
            </SequentialIntroSlot>
            <SequentialIntroSlot
              stepIndex={SEQ.subtitle}
              introStep={introStep}
              reduceMotion={reduceMotion}
              isRTL={isRTL}
              kind="fadeUp"
              onStepComplete={advanceIntro}
            >
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
                {t(
                  "welcome.subtitle",
                  "Set up this computer for the first time. Choose a new shop trial or restore your data if you already use the app elsewhere.",
                )}
              </p>
            </SequentialIntroSlot>
            <SequentialIntroSlot
              stepIndex={SEQ.aboutLine}
              introStep={introStep}
              reduceMotion={reduceMotion}
              isRTL={isRTL}
              kind="fadeUp"
              onStepComplete={advanceIntro}
            >
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground/90 lg:mx-0">
                {t(
                  "about.subtitle",
                  "A comprehensive store management solution designed to streamline your business operations with modern technology and intuitive design.",
                )}
              </p>
            </SequentialIntroSlot>
            <SequentialIntroSlot
              stepIndex={SEQ.badges}
              introStep={introStep}
              reduceMotion={reduceMotion}
              isRTL={isRTL}
              kind="fadeUp"
              onStepComplete={advanceIntro}
            >
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
            </SequentialIntroSlot>
          </div>

          <SequentialIntroSlot
            stepIndex={SEQ.card}
            introStep={introStep}
            reduceMotion={reduceMotion}
            isRTL={isRTL}
            kind="fadeUp"
            onStepComplete={advanceIntro}
            className={cn(
              "relative isolate mt-10 overflow-visible",
              marketingSite
                ? "mx-auto w-full max-w-lg lg:mt-15 lg:justify-self-center xl:mt-18"
                : "lg:mt-0",
              !marketingSite &&
                online &&
                devicePrecheck === "existing_device" &&
                "mt-28 sm:mt-36 lg:mt-28 xl:mt-36 2xl:mt-40",
            )}
          >
            {marketingSite || !(online && devicePrecheck === "loading") ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0 bottom-0 top-0 z-0 overflow-visible",
                  !reduceMotion && devicePrecheck !== "loading" && "welcome-gs-glow-fadein",
                )}
                aria-hidden
              >
                <div
                  className={cn(
                    "absolute -right-14 -top-10 z-0 h-52 w-52 rounded-full blur-3xl transition-colors duration-300 ease-in-out sm:h-60 sm:w-60 sm:-right-16 sm:-top-12",
                    restoreGlowActive ? "bg-blue-500/30" : "bg-green-500/30",
                  )}
                />
                <div
                  className={cn(
                    "absolute -bottom-10 -left-12 z-0 h-28 w-28 rounded-full blur-2xl transition-colors duration-300 ease-in-out sm:h-32 sm:w-32 sm:-bottom-12 sm:-left-14",
                    restoreGlowActive ? "bg-blue-500/20" : "bg-green-500/20",
                  )}
                />
              </div>
            ) : null}
            <section
              id="get-started"
              className={cn(
                "relative z-[1] overflow-visible rounded-3xl border backdrop-blur-sm",
                !marketingSite && online && devicePrecheck === "loading"
                  ? "border-dashed border-border/70 bg-muted/20 p-8 shadow-none sm:p-10"
                  : cn(
                      "bg-card/90 p-5 shadow-xl shadow-black/5 sm:p-7",
                      online || marketingSite
                        ? "border-border/80"
                        : "border-amber-500/45 dark:border-amber-500/35",
                    ),
              )}
              aria-busy={!marketingSite && (busy || (online && devicePrecheck === "loading"))}
            >
            {(marketingSite || (devicePrecheck === "new_device" && !showRestoreFlow)) ? (
              <div
                className={cn("welcome-trial-ribbon", isRTL && "welcome-trial-ribbon--rtl")}
                role="status"
                aria-label={t("welcome.trialBadge", "7-day free trial")}
              >
                {t("welcome.trialBadge", "7-day free trial!")}
              </div>
            ) : null}
            {marketingSite ? (
              <WelcomeMarketingDownloadCard isRTL={isRTL} reduceMotion={reduceMotion} />
            ) : (
            <div
              key={`gs-${String(online)}-${devicePrecheck}`}
              className={cn(
                "min-h-0",
                !reduceMotion && devicePrecheck !== "loading" && "welcome-gs-body-fadeup",
              )}
            >
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
              {online && devicePrecheck === "loading" ? (
                <div className="flex min-h-[11rem] flex-col items-center justify-center gap-4 py-4 sm:min-h-[12rem]">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" aria-hidden />
                  <p className="max-w-sm text-center text-sm text-muted-foreground">
                    {t("welcome.devicePrecheckLoading", "Checking whether this device is already registered…")}
                  </p>
                </div>
              ) : online && devicePrecheck === "existing_device" ? (
                <div className="space-y-6 pt-6 text-center sm:pt-5">
                  <header className="space-y-3">
                    <h2 className="flex flex-wrap items-center justify-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
                      <Shield className="h-6 w-6 shrink-0 text-emerald-600" aria-hidden />
                      {t("welcome.registeredDeviceTitle", "This device is already registered")}
                    </h2>
                    <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {registeredIntroDescription}
                    </p>
                  </header>
                  <div className="flex flex-col gap-3 pt-1">
                    <Button
                      type="button"
                      className="min-h-[3rem] w-full border-transparent bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 focus-visible:ring-emerald-500/35 dark:bg-emerald-600 dark:text-white dark:hover:bg-emerald-500"
                      disabled={busy}
                      onClick={() => void handleContinueRegisteredDevice()}
                    >
                      {busy ? (
                        <span className="flex items-center justify-center">
                          <span
                            className="mr-2 h-5 w-5 shrink-0 animate-spin rounded-full border-b-2 border-white"
                            aria-hidden
                          />
                          {t("welcome.continuing", "Continuing…")}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {t("welcome.continueToApp", "Continue to the app")}
                          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <AnimatedHeight
                  innerClassName="px-2"
                  reduceMotion={reduceMotion}
                  deps={[
                    showRestoreFlow,
                    restorePhase,
                    restoreCompleted,
                    cloudTransferProgress?.progress,
                  ]}
                >
                  {showRestoreFlow ? (
                <>
                  <button
                    type="button"
                    onClick={exitRestoreFlow}
                    disabled={restoreBackDisabled}
                    className="mb-4 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50 sm:mb-5"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                    {t("welcome.backToNewShopSetup", "Back to new shop setup")}
                  </button>

                  <header className="space-y-3 text-center">
                    <h2 className="flex flex-wrap items-center justify-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
                      <LifeBuoy className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                      {t("welcome.restoreTitle", "Restore on a new computer")}
                    </h2>
                    <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {t(
                        "welcome.restoreDescription",
                        "Link this PC to your existing shop and download your latest cloud backup. This replaces data on this computer. A paid license is required.",
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
                      ref={welcomeFullNameRef}
                      id="welcome-full-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      onKeyDown={handleWelcomeFormKeyDown}
                      autoComplete="name"
                      placeholder={t("welcome.fullNamePlaceholder", "First and last name")}
                      disabled={!online || restoreFieldsLocked}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="welcome-phone" className="text-sm font-medium">
                      {t("welcome.phone", "Phone number")}
                    </label>
                    <Input
                      ref={welcomePhoneRef}
                      id="welcome-phone"
                      value={phone}
                      onChange={(e) => setPhone(sanitizeWelcomePhoneInput(e.target.value))}
                      onKeyDown={handleWelcomeFormKeyDown}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder={t("welcome.phonePlaceholder", "Your phone number")}
                      disabled={!online || restoreFieldsLocked}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                    <label htmlFor="welcome-customer-id" className="text-sm font-medium">
                      {t("welcome.customerId", "Customer ID")}
                    </label>
                    <Input
                      ref={welcomeCustomerIdRef}
                      id="welcome-customer-id"
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      onKeyDown={handleWelcomeFormKeyDown}
                      placeholder={t("welcome.customerIdPlaceholder", "UUID from your supplier")}
                      className="font-mono text-sm"
                      disabled={!online || restoreFieldsLocked}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("welcome.customerIdHint", "Must match the phone number we have on file for this ID.")}
                    </p>
                  </div>

                <div className="flex flex-col gap-3 pt-1">
                  {restoreCompleted || restorePhase === "ready" ? (
                    <Button
                      ref={welcomePrimaryActionRef}
                      type="button"
                      className="min-h-[3rem] w-full border-transparent bg-green-600 text-white shadow-xs hover:bg-green-700 focus-visible:ring-green-500/35 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                      disabled={!online || busy}
                      onClick={() => void handleContinueAfterRestore()}
                    >
                      {busy ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                          {t("welcome.continuing", "Continuing…")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center">
                          {t("welcome.restoreContinue", "Continue")}
                          <ArrowRight className="ms-2 h-4 w-4" aria-hidden />
                        </span>
                      )}
                    </Button>
                  ) : (
                    <Button
                      ref={welcomePrimaryActionRef}
                      type="button"
                      className="min-h-[3rem] w-full border-transparent bg-blue-600 text-white shadow-xs hover:bg-blue-700 focus-visible:ring-blue-500/35 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500"
                      disabled={!online || busy || restoreInProgress}
                      onClick={() => void handleRestore()}
                    >
                      {restorePhase === "linking" ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                          {t("welcome.linkingDevice", "Linking device…")}
                        </span>
                      ) : restorePhase === "downloading" ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                          {t("welcome.restoreDownloading", "Downloading backup…")}
                        </span>
                      ) : restorePhase === "restoring" ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" aria-hidden />
                          {t("welcome.restoreApplying", "Applying backup…")}
                        </span>
                      ) : (
                        t("welcome.restoreFromCloud", "Restore data from cloud")
                      )}
                    </Button>
                  )}
                  {(restorePhase === "downloading" || restorePhase === "restoring") &&
                  cloudTransferProgress ? (
                    <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                      <p className="mb-3 text-sm font-medium text-foreground">
                        {restorePhase === "restoring"
                          ? t("welcome.restoreApplyingHint", "Applying backup to this computer…")
                          : t("welcome.restoreDownloadingHint", "Downloading your latest cloud backup…")}
                      </p>
                      <CloudBackupTransferProgressBar progress={cloudTransferProgress} />
                    </div>
                  ) : null}
                </div>
                  </div>
                </>
              ) : (
                <>
                  <header className="space-y-3 pt-6 text-center sm:pt-5">
                    <h2 className="flex flex-wrap items-center justify-center gap-3 text-xl font-bold text-foreground sm:text-2xl">
                      <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                      {t("welcome.setupTitle", "Get started with us")}
                    </h2>
                    <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground">
                      {t(
                        "welcome.setupDescriptionTrial",
                        "Tell us who you are so we can start your free trial on this computer. Add your full name and phone — we use them to connect this device to your account. Your login password is separate and is set on the next screen.",
                      )}
                    </p>
                  </header>

                  <div className="space-y-6 text-start">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="welcome-full-name-trial" className="text-sm font-medium">
                          {t("welcome.fullName", "Full name")}
                        </label>
                        <Input
                          ref={welcomeFullNameRef}
                          id="welcome-full-name-trial"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          onKeyDown={handleWelcomeFormKeyDown}
                          autoComplete="name"
                          placeholder={t("welcome.fullNamePlaceholder", "First and last name")}
                          disabled={!online || busy}
                        />
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <label htmlFor="welcome-phone-trial" className="text-sm font-medium">
                          {t("welcome.phone", "Phone number")}
                        </label>
                        <Input
                          ref={welcomePhoneRef}
                          id="welcome-phone-trial"
                          value={phone}
                          onChange={(e) => setPhone(sanitizeWelcomePhoneInput(e.target.value))}
                          onKeyDown={handleWelcomeFormKeyDown}
                          autoComplete="tel"
                          inputMode="tel"
                          placeholder={t("welcome.phonePlaceholder", "Your phone number")}
                          disabled={!online || busy}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-1">
                      <Button
                        ref={welcomePrimaryActionRef}
                        type="button"
                        className="min-h-[3rem] w-full border-transparent bg-green-600 text-white shadow-xs hover:bg-green-700 focus-visible:ring-green-500/35 dark:bg-green-600 dark:text-white dark:hover:bg-green-500"
                        disabled={!online || busy}
                        onClick={handleStartTrial}
                      >
                        {busy ? (
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

                      <button
                        type="button"
                        onClick={() => setShowRestoreFlow(true)}
                        disabled={!online || busy}
                        className="w-full text-center text-sm text-muted-foreground underline transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
                      >
                        {t(
                          "welcome.restoreOnNewComputer",
                          "Restore shop on a new computer (existing account)",
                        )}
                      </button>
                    </div>
                  </div>
                </>
                  )}
                </AnimatedHeight>
              )}
            </div>
            </div>
            )}
          </section>
          </SequentialIntroSlot>
        </div>
      </section>

      <section
        id="welcome-key-features"
        className={cn("mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16", WELCOME_SECTION_SCROLL_MARGIN)}
      >
        <SequentialIntroSlot
          stepIndex={SEQ.keyIntro}
          introStep={introStep}
          reduceMotion={reduceMotion}
          isRTL={isRTL}
          kind="fadeUp"
          onStepComplete={advanceIntro}
          className="mx-auto mb-11 max-w-2xl text-center sm:mb-12"
        >
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
        </SequentialIntroSlot>
        <SequentialIntroSlot
          stepIndex={SEQ.keyCarousel}
          introStep={introStep}
          reduceMotion={reduceMotion}
          isRTL={isRTL}
          kind="fadeUp"
          onStepComplete={advanceIntro}
          defer
        >
          <FeaturesCarousel items={ABOUT_MAIN_FEATURE_DEFS} isRTL={isRTL} />
        </SequentialIntroSlot>
      </section>

      <section
        id="welcome-technical-features"
        className={cn(
          introStep >= SEQ.techIntro && "border-y border-border/60 bg-muted/15",
          WELCOME_SECTION_SCROLL_MARGIN,
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <SequentialIntroSlot
            stepIndex={SEQ.techIntro}
            introStep={introStep}
            reduceMotion={reduceMotion}
            isRTL={isRTL}
            kind="fadeUp"
            onStepComplete={advanceIntro}
            className="mx-auto max-w-3xl text-center"
          >
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
          </SequentialIntroSlot>

          <SequentialIntroSlot
            stepIndex={SEQ.techTiles}
            introStep={introStep}
            reduceMotion={reduceMotion}
            isRTL={isRTL}
            kind="fadeUp"
            onStepComplete={advanceIntro}
            className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            {WELCOME_TECHNOLOGY_BRIDGE_HIGHLIGHTS.map(({ icon: Icon, titleKey, descKey }) => (
              <article
                key={titleKey}
                className="h-full rounded-2xl border border-border/60 bg-card/80 p-5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <h3 className="font-semibold text-foreground">{t(titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(descKey)}</p>
              </article>
            ))}
          </SequentialIntroSlot>

          <SequentialIntroSlot
            stepIndex={SEQ.techCarousel}
            introStep={introStep}
            reduceMotion={reduceMotion}
            isRTL={isRTL}
            kind="fadeUp"
            onStepComplete={advanceIntro}
            defer
            className="mt-12 sm:mt-14"
          >
            <FeaturesCarousel
              items={ABOUT_TECHNICAL_FEATURE_DEFS}
              isRTL={isRTL}
              tabListAriaLabel={t("about.technical.title", "Technical Features")}
            />
          </SequentialIntroSlot>
        </div>
      </section>

      <section
        className={cn(
          introStep >= SEQ.pricing && "border-y border-border/60",
          WELCOME_SECTION_SCROLL_MARGIN,
        )}
      >
        <SequentialIntroSlot
          stepIndex={SEQ.pricing}
          introStep={introStep}
          reduceMotion={reduceMotion}
          isRTL={isRTL}
          kind="fadeUp"
          onStepComplete={advanceIntro}
          defer
          className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 sm:pb-16 sm:pt-6 short:pb-8 short:pt-4 short:sm:pb-10 short:sm:pt-5"
        >
          <PricingPlansSection id="welcome-pricing" className="!mb-0" />
        </SequentialIntroSlot>
      </section>

      <section
        id="welcome-developer"
        className={cn("mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16", WELCOME_SECTION_SCROLL_MARGIN)}
      >
        <SequentialIntroSlot
          stepIndex={SEQ.devCard}
          introStep={introStep}
          reduceMotion={reduceMotion}
          isRTL={isRTL}
          kind="fadeUp"
          onStepComplete={advanceIntro}
          defer
          className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-lg"
        >
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
        </SequentialIntroSlot>
      </section>

      <section
        id="welcome-legal"
        className={cn(
          introStep >= SEQ.legal && "border-t border-border/60 bg-muted/15",
          WELCOME_SECTION_SCROLL_MARGIN,
        )}
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <SequentialIntroSlot
            stepIndex={SEQ.legal}
            introStep={introStep}
            reduceMotion={reduceMotion}
            isRTL={isRTL}
            kind="fadeUp"
            onStepComplete={advanceIntro}
            defer
          >
            <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {t("welcome.sectionNav.legal", "Legal")}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
              <article className="h-full rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
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

              <article className="h-full rounded-2xl border border-border/70 bg-card/80 p-6 shadow-sm sm:p-8">
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
          </SequentialIntroSlot>
        </div>
      </section>

      <SequentialIntroSlot
        stepIndex={SEQ.footer}
        introStep={introStep}
        reduceMotion={reduceMotion}
        isRTL={isRTL}
        kind="fadeUp"
        onStepComplete={advanceIntro}
        defer
      >
        <footer className="border-t border-border/60 px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t("about.footer", "© 2026 REDA TECH. All rights reserved. Built with ❤️ in Algeria.")}
          </p>
        </footer>
      </SequentialIntroSlot>
    </div>
  );
}
