import { useLocation, Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../hooks/useTheme";

export default function Navigation() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { theme, setLightTheme, setDarkTheme } = useTheme();

  return (
    <nav className="sticky flex items-center justify-between gap-8 bg-card border-b shadow-md px-8 py-2">
      <Link to="/" className="flex items-center">
        <img
          src="./logo.png"
          alt="Store Logo"
          className="w-20 h-20 object-contain p-2"
        />
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight text-primary drop-shadow-sm">
        {location.pathname === "/"
          ? t("mainMenu.title")
          : (() => {
              const path = location.pathname.slice(1).split("/")[0];
              // Try to use translation key for known pages
              const knownKeys = [
                "dashboard",
                "clients",
                "cashier",
                "stock",
                "zakat",
                "administrator",
              ];
              if (knownKeys.includes(path)) {
                return t(`mainMenu.${path}`);
              }
              // Fallback: Capitalize first letter
              return path.charAt(0).toUpperCase() + path.slice(1);
            })()}
      </h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Settings size={24} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-lg font-bold">
            {t("navigation.preferences") || "Preferences"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-lg font-semibold">
            {t("navigation.theme") || "Theme"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="pl-4"
            onClick={() => {
              if (theme !== "light") setLightTheme();
            }}
            disabled={theme === "light"}
          >
            {t("navigation.light") || "Light"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="pl-4"
            onClick={() => {
              if (theme !== "dark") setDarkTheme();
            }}
            disabled={theme === "dark"}
          >
            {t("navigation.dark") || "Dark"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-lg font-semibold">
            {t("navigation.language") || "Language"}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="pl-4"
            onClick={() => i18n.changeLanguage("en")}
            disabled={i18n.language === "en"}
          >
            EN
          </DropdownMenuItem>
          <DropdownMenuItem
            className="pl-4"
            onClick={() => i18n.changeLanguage("fr")}
            disabled={i18n.language === "fr"}
          >
            FR
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
