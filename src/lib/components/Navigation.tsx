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

      <nav className="flex items-center justify-between px-4 py-2 bg-card border-b">
        <div className="w-40"></div>

        <h1 className="text-2xl font-bold mx-auto">
          {location.pathname === "/"
            ? t("mainMenu.title")
            : (() => {
                const path = location.pathname.slice(1).split("/")[0];
                // Try to use translation key for known pages
                const knownKeys = ["dashboard", "clients", "cashier", "stock", "zakat", "administrator"];
                if (knownKeys.includes(path)) {
                  return t(`mainMenu.${path}`);
                }
                // Fallback: Capitalize first letter
                return path.charAt(0).toUpperCase() + path.slice(1);
              })()}
        </h1>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            className="px-2 py-1 rounded text-sm border bg-background text-foreground hover:bg-accent"
            onClick={() => i18n.changeLanguage('en')}
            disabled={i18n.language === 'en'}
          >
            EN
          </button>
          <button
            className="px-2 py-1 rounded text-sm border bg-background text-foreground hover:bg-accent"
            onClick={() => i18n.changeLanguage('fr')}
            disabled={i18n.language === 'fr'}
          >
            FR
          </button>
        </div>
      </nav>
    </div>
  );
}