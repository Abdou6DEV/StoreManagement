import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Settings, ShieldAlert, User } from "lucide-react";
import { useAuth } from "../lib/contexts/authContext";
import { useTheme } from "../lib/hooks/useTheme";
import { ThemeToggleButton } from "../lib/components/themeToggleButton";
import { FullscreenToggleButton } from "../lib/components/fullscreenToggleButton";
import { TooltipToggleButton } from "../lib/components/tooltipToggleButton";
import { Button } from "../lib/components/button";
import { PricingPlansSection } from "../lib/components/pricingPlansSection";
import { LOGO_ICON, LOGO_ICON_DARK } from "../lib/assets";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../lib/components/dropdownMenu";
import { cn } from "../lib/utils";

export default function LicenseValidation() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isRTL = i18n.language === "ar";

  const fadeUp = (delayMs: number, durationSec = 0.5) =>
    ({
      animation: `licenseGateFadeUp ${durationSec}s ease-out ${delayMs}ms both`,
    }) as React.CSSProperties;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="flex min-h-screen flex-col bg-background text-foreground"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      <style>{`
        @keyframes licenseGateFadeUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .license-gate-anim {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <div
        className={cn("license-gate-anim fixed top-4 z-50", isRTL ? "left-4" : "right-4")}
        style={fadeUp(0, 0.45)}
      >
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
              <User className="h-4 w-4 shrink-0" />
              {user?.username
                ? t("licenseGate.signedInAs", { name: user.username })
                : t("navigation.welcomeToStoreManagement", "Welcome to Store Management")}
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
            <DropdownMenuLabel className="font-semibold text-md">{t("navigation.language", "Language")}</DropdownMenuLabel>
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

      {/* Brand, license copy, and pricing centered together in the main area */}
      <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
        <header className="mx-auto mb-6 max-w-xl shrink-0 text-center sm:mb-8">
          <div className="license-gate-anim" style={fadeUp(80)}>
            <img
              src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
              alt=""
              className="mx-auto mb-4 h-30 w-30 object-contain select-none sm:mb-5 sm:h-40 sm:w-40"
            />
          </div>
          <h1
            className="license-gate-anim flex items-center justify-center gap-2 text-2xl font-bold tracking-tight text-foreground sm:gap-3 sm:text-3xl"
            style={fadeUp(160)}
          >
            <ShieldAlert
              className="h-7 w-7 shrink-0 text-amber-600 dark:text-amber-500 sm:h-8 sm:w-8"
              aria-hidden
            />
            <span>{t("licenseGate.title")}</span>
          </h1>
          <p
            className="license-gate-anim mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base"
            style={fadeUp(240)}
          >
            {t("licenseGate.subtitle")}
          </p>
        </header>
        <div className="license-gate-anim w-full" style={fadeUp(320)}>
          <PricingPlansSection className="!mb-0 mx-auto w-full max-w-6xl shadow-sm" />
        </div>
      </div>

      <footer className="license-gate-anim shrink-0 px-4 pb-10 pt-6 text-center" style={fadeUp(400)}>
        <Button type="button" variant="outline" size="lg" className="min-w-[200px]" onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          {t("licenseGate.signOut")}
        </Button>
      </footer>
    </div>
  );
}
