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
import { ThemeToggleButton } from "./ui/ThemeToggleButton";
import { useState } from 'react';
import { useTranslation } from "react-i18next";

export default function Navigation() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();


  return (
    <div className="flex items-center gap-4 w-full">
      <Link to="/">
        <img src="/logo.png" alt="Store Logo" className="w-50 p-5" />
      </Link>

      <nav className="px-8 py-3 rounded-xl border-1 border-gray-500 flex-1 flex items-center justify-between select-none">
        <div className="w-40"></div>

        <h1 className="text-2xl font-bold mr-30">
          {location.pathname === "/"
            ? t("mainMenu.title")
            : (() => {
                const path = location.pathname.slice(1).split("/")[0];
                const knownKeys = ["dashboard", "clients", "cashier", "stock", "zakat", "administrator","Finance","History"];
                if (knownKeys.includes(path)) {
                  return t(`mainMenu.${path}`);
                }
                return path.charAt(0).toUpperCase() + path.slice(1);
              })()}
        </h1>

        <div className="flex items-center gap-4 w-40 justify-end">
          <DropdownMenu onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="rounded-xl outline-none ring-0 hover:text-red-400 transition-all duration-300 p-1">
                <Settings className={`
                  transition-transform duration-400
                  ${dropdownOpen ? 'rotate-360 scale-110' : ''}
                  hover:text-red-400
                `} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mx-4 my-2 w-56">
              <DropdownMenuLabel className="font-semibold text-md">
                Preferences
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <ThemeToggleButton variant="ghost" showText={true} />
              </DropdownMenuItem>
              
              {/* Language Selection */}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-md">
                {t("mainMenu.language")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage('en')}
                disabled={i18n.language === 'en'}
              >
                <span className="mr-2">🇬🇧</span> English
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => i18n.changeLanguage('fr')}
                disabled={i18n.language === 'fr'}
              >
                <span className="mr-2">🇫🇷</span> Français
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}