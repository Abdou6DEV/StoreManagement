import { Settings, User } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdownMenu";
import { ThemeToggleButton } from "./themeToggleButton";
import { FullscreenToggleButton } from "./fullscreenToggleButton";
import { TooltipToggleButton } from "./tooltipToggleButton";

type PreferencesLanguage = "en" | "fr" | "ar";

type PreferencesMenuProps = {
  isRTL?: boolean;
  language?: PreferencesLanguage;
  onLanguageChange?: (language: PreferencesLanguage) => void;
  className?: string;
  forceRight?: boolean;
  placement?: "fixed" | "anchor";
  showTooltipToggle?: boolean;
  children?: ReactNode;
};

export function PreferencesMenu({
  isRTL: isRTLProp,
  language: languageProp,
  onLanguageChange,
  className,
  forceRight = false,
  placement = "fixed",
  showTooltipToggle = true,
  children,
}: PreferencesMenuProps) {
  const { t, i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const language = (languageProp ?? i18n.language.split("-")[0]) as PreferencesLanguage;
  const isRTL = isRTLProp ?? language === "ar";

  const changeLanguage = (next: PreferencesLanguage) => {
    if (i18n.language !== next) void i18n.changeLanguage(next);
    onLanguageChange?.(next);
  };

  return (
    <div
      className={cn(
        placement === "fixed"
          ? "fixed top-4 z-50"
          : "relative z-50",
        placement === "fixed" && (forceRight ? "right-4" : isRTL ? "left-4" : "right-4"),
        className,
      )}
    >
      <DropdownMenu modal={false} onOpenChange={setDropdownOpen}>
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
        <DropdownMenuContent
          align={placement === "anchor" ? (isRTL ? "start" : "end") : undefined}
          sideOffset={placement === "anchor" ? 8 : 4}
          collisionPadding={placement === "anchor" ? 8 : undefined}
          className={cn(
            "mx-4 my-2 w-56",
            placement === "anchor" && "mx-0 my-0 w-[min(20rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]",
            isRTL && "text-right",
          )}
        >
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
          {showTooltipToggle ? (
            <DropdownMenuItem asChild>
              <TooltipToggleButton variant="ghost" showText />
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem asChild>
            <FullscreenToggleButton variant="ghost" showText />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="font-semibold text-md">
            {t("navigation.language", "Language")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault();
              changeLanguage("en");
            }}
            disabled={language === "en"}
          >
            {t("navigation.english", "English")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault();
              changeLanguage("fr");
            }}
            disabled={language === "fr"}
          >
            {t("navigation.french", "French")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(event) => {
              event.preventDefault();
              changeLanguage("ar");
            }}
            disabled={language === "ar"}
          >
            {t("navigation.arabic", "Arabic")}
          </DropdownMenuItem>
          {children ? (
            <>
              <DropdownMenuSeparator />
              {children}
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
