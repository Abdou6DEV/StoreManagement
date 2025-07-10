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
    <div className="fixed top-0 left-0 w-full z-50 flex items-center gap-8 bg-card border-b shadow-md px-8 py-4 min-h-[80px]">
      <Link to="/" className="flex items-center mr-8">
        <img
          src="./logo.png"
          alt="Store Logo"
          className="w-20 h-20 object-contain p-2"
        />
      </Link>

      <nav className="flex-1 flex items-center justify-between">
        <div className="w-40"></div>

        <h1 className="text-3xl font-extrabold tracking-tight mx-auto text-primary drop-shadow-sm">
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

        <div className="flex items-center gap-4 ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Settings size={24} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-lg font-bold">
                {t("mainMenu.preferences") || "Preferences"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-lg font-semibold">
                {t("mainMenu.theme") || "Theme"}
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="pl-4"
                onClick={() => {
                  if (theme !== "light") setLightTheme();
                }}
                disabled={theme === "light"}
              >
                {t("mainMenu.light") || "Light"}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="pl-4"
                onClick={() => {
                  if (theme !== "dark") setDarkTheme();
                }}
                disabled={theme === "dark"}
              >
                {t("mainMenu.dark") || "Dark"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-lg font-semibold">
                {t("mainMenu.language") || "Language"}
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
        </div>
      </nav>
    </div>
  );
}
