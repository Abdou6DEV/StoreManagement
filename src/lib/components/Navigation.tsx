import { useLocation, Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Home,
  ChartLine,
  Users,
  ShoppingCart,
  CreditCard,
  PackageSearch,
  Calculator,
  Search,
  Settings as AdminIcon,
} from "lucide-react";
import { Settings } from "lucide-react";
import { ThemeToggleButton } from "./ui/ThemeToggleButton";
import { useState } from 'react';
import { useTranslation } from "react-i18next";

export default function Navigation() {
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t, i18n } = useTranslation();


  return (
    <div className="flex items-center gap-4 w-full -ml-3">
      <Link to="/">
        <img src="/logo.png" alt="Store Logo" className="w-50 p-5" />
      </Link>

      <nav className="px-8 py-3 rounded-xl border-1 border-gray-500 flex-1 flex items-center justify-between select-none">
        <div className="w-40"></div>

        <h1 className="text-2xl font-bold mr-30 flex items-center gap-2">
          {location.pathname === "/" ? (
            <>
              <Home className="w-8 h-8 text-primary" />
              {t("mainMenu.title")}
            </>
          ) : (() => {
            const path = location.pathname.slice(1).split("/")[0];
        
            const iconMap: Record<string, React.ReactNode> = {
              dashboard: <ChartLine className="w-8 h-8 text-green-500" />,
              clients: <Users className="w-8 h-8 text-red-500" />,
              cashier: <ShoppingCart className="w-8 h-8 text-yellow-500" />,
              finance: <CreditCard className="w-8 h-8 text-emerald-500" />,
              stock: <PackageSearch className="w-8 h-8 text-blue-500" />,
              zakat: <Calculator className="w-8 h-8 text-green-300" />,
              administrator: <AdminIcon className= "w-8 h-8 text-orange-500" />,
              history: <Search className="w-8 h-8 text-cyan-500" />,
            };
        
            return (
              <>
                {iconMap[path] || null}
                {t(`mainMenu.${path}`)}
              </>
            );
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
                {t("navigation.language")}
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