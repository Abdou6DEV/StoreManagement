import { useLocation, Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdownMenu";
import {
  Home,
  ChartLine,
  Users,
  ShoppingCart,
  CreditCard,
  PackageSearch,
  Calculator,
  Search,
  Settings,
} from "lucide-react";
import { ThemeToggleButton } from "./ui/themeToggleButton";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function Navigation() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const isCashierPage = location.pathname.startsWith("/cashier");

  if (isCashierPage) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="rounded-xl outline-none ring-0 hover:text-red-400 transition-all duration-300 p-1">
              <Settings
                className={`transition-transform duration-400 ${
                  dropdownOpen ? "rotate-360 scale-110" : ""
                } hover:text-red-400`}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="mx-4 my-2 w-56">
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.preferences")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <ThemeToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.language")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("en")}
              disabled={i18n.language === "en"}
            >
              <span className="mr-2">🇬🇧</span> {t("navigation.english")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("fr")}
              disabled={i18n.language === "fr"}
            >
              <span className="mr-2">🇫🇷</span> {t("navigation.french")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => i18n.changeLanguage("ar")}
              disabled={i18n.language === "ar"}
            >
              <span className="mr-2">🇸🇦</span> {t("navigation.arabic")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }
  return (
    <div className="w-full px-4 pt-4">
      {/* Header Container with same border wrapping logo + nav */}
      <div className="flex items-center justify-between rounded-xl border border-border px-6 h-20 bg-card">
        <Link
          to="/"
          className="relative h-20 w-auto flex items-center justify-center"
        >
          <img
            src="/logolight.png"
            alt="Store Logo Light"
            className="h-20 object-contain dark:hidden"
          />
          <img
            src="/logodark.png"
            alt="Store Logo Dark"
            className="h-20 object-contain hidden dark:block"
          />
        </Link>
        {/* === Dynamic Page Title === */}
        <h1 className="text-3xl font-bold flex items-center gap-3">
          {location.pathname === "/" ? (
            <>
              <Home className="w-8 h-8 text-primary" />
              {t("mainMenu.title")}
            </>
          ) : (
            (() => {
              const path = location.pathname.slice(1).split("/")[0];
              const iconMap: Record<string, React.ReactNode> = {
                dashboard: <ChartLine className="w-8 h-8 text-green-500" />,
                clients: <Users className="w-8 h-8 text-red-500" />,
                cashier: <ShoppingCart className="w-8 h-8 text-yellow-500" />,
                finance: <CreditCard className="w-8 h-8 text-emerald-500" />,
                stock: <PackageSearch className="w-8 h-8 text-green-600" />,
                zakat: <Calculator className="w-8 h-8 text-green-300" />,
                administrator: <Settings className="w-8 h-8 text-orange-500" />,
                history: <Search className="w-8 h-8 text-cyan-500" />,
              };
              return (
                <>
                  {iconMap[path] || null}
                  {t(`mainMenu.${path}`)}
                </>
              );
            })()
          )}
        </h1>

        {/* === Settings Dropdown === */}
        <div className="flex items-center gap-4">
          <DropdownMenu onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="rounded-xl outline-none ring-0 hover:text-red-400 transition-all duration-300 p-1">
                <Settings
                  className={`transition-transform duration-400 ${
                    dropdownOpen ? "rotate-360 scale-110" : ""
                  } hover:text-red-400`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mx-4 my-2 w-56">
              <DropdownMenuLabel className="font-semibold text-md">
                {t("navigation.preferences")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <ThemeToggleButton variant="ghost" showText={true} />
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-md">
                {t("navigation.language")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage("en")}
                disabled={i18n.language === "en"}
              >
                <span className="mr-2">🇬🇧</span> {t("navigation.english")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage("fr")}
                disabled={i18n.language === "fr"}
              >
                <span className="mr-2">🇫🇷</span> {t("navigation.french")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage("ar")}
                disabled={i18n.language === "ar"}
              >
                <span className="mr-2">🇸🇦</span> {t("navigation.arabic")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
