import {
  ChartLine,
  Users,
  ShoppingCart,
  PackageSearch,
  Settings as AdminIcon,
  Home,
  ChevronsLeft,
  History,
  LogOut,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";
import { useState, useRef } from "react";
import { cn } from "../utils";
import { useAuth } from "../contexts/authContext";
import { useLowStock } from "../contexts/lowStockContext";
import { BadgeNotification } from "./badgeNotification";

const menuItems = [
  { key: "title", path: "/", icon: Home, color: "text-primary" },
  {
    key: "cashier",
    path: "/cashier",
    icon: ShoppingCart,
    color: "text-yellow-500",
  },
  {
    key: "dashboard",
    path: "/dashboard",
    icon: ChartLine,
    color: "text-green-500",
  },
  {
    key: "stock",
    path: "/stock",
    icon: PackageSearch,
    color: "text-green-600",
  },
  { key: "clients", path: "/clients", icon: Users, color: "text-red-500" },
  {
    key: "history",
    path: "/history",
    icon: History,
    color: "text-blue-500",
  },
  {
    key: "administrator",
    path: "/administrator",
    icon: AdminIcon,
    color: "text-orange-500",
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout, isAdmin } = useAuth();
  const { unseenLowStockCount } = useLowStock();
  const savedCollapsedState = localStorage.getItem("sidebarCollapsed");
  const [collapsed, setCollapsed] = useState(savedCollapsedState === "true");
  const [showText, setShowText] = useState(!collapsed);
  const [isDisabled, setIsDisabled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.key === "title" || item.key === "cashier") {
      return true; // Always show home and cashier
    }
    return isAdmin; // Only show other items for admins
  });

  const handleToggleCollapse = () => {
    // Prevent rapid clicks during transition
    if (isDisabled) return;

    // Clear any existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (textTimeoutRef.current) {
      clearTimeout(textTimeoutRef.current);
      textTimeoutRef.current = null;
    }

    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));

    // Dispatch custom event to notify layout with state data
    window.dispatchEvent(
      new CustomEvent("sidebarStateChanged", {
        detail: { collapsed: newState },
      }),
    );

    if (newState === false) {
      // Expanding: show text after animation completes
      textTimeoutRef.current = setTimeout(() => {
        setShowText(true);
      }, 500);
    } else {
      // Collapsing: hide text immediately
      setShowText(false);
    }

    // Disable button for 0.5 seconds
    setIsDisabled(true);
    timeoutRef.current = setTimeout(() => {
      setIsDisabled(false);
    }, 500);
  };

  return (
    <nav
      data-collapsed={collapsed}
      className={cn(
        "fixed top-0 left-0 z-50 flex flex-col bg-card border-r rounded-xl shadow-md transition-[width] duration-500 ease-in-out",
        collapsed ? "w-14" : "w-[200px]",
      )}
      style={{
        height: "80vh", // ✅ screen height only
        position: "fixed", // ✅ not fixed, scrolls with page
        overflow: "hidden", // to hide animation overflow
        top: "130px",
        flexShrink: 0,
      }}
    >
      <div
        className="flex flex-col overflow-y-auto py-2"
        style={{ height: "100%" }}
      >
        {filteredMenuItems.map((item) => (
          <Link
            data-is-active={location.pathname === item.path}
            to={item.path}
            key={item.key}
            className="max-w-full gap-4 flex items-center rounded-xl m-2 p-2 -mt-1 capitalize hover:bg-secondary data-[is-active=true]:bg-secondary font-semibold data-[is-active=true]:font-bold relative"
          >
            <div className="relative">
              <item.icon className={`${item.color}`} />
              {item.key === "stock" && unseenLowStockCount > 0 && (
                <BadgeNotification count={unseenLowStockCount} />
              )}
            </div>
            {showText && <span>{t(`mainMenu.${item.key}`)}</span>}
          </Link>
        ))}

        {/* Logout Button */}
        <button
          className="max-w-full flex gap-4 items-center rounded-xl m-2 p-2 hover:bg-red-100 hover:text-red-600 font-semibold transition-all duration-300 mt-auto"
          onClick={logout}
        >
          <LogOut className="text-red-500" />
          {showText && <span>Logout</span>}
        </button>

        <button
          className="max-w-full flex gap-4 items-center rounded-xl self-end m-2 p-2 hover:bg-secondary font-semibold transition-all duration-300"
          onClick={handleToggleCollapse}
          disabled={isDisabled}
        >
          <ChevronsLeft
            data-collapsed={collapsed}
            className="data-[collapsed=true]:rotate-180 transition-transform duration-300 ease-in-out"
          />
        </button>
      </div>
    </nav>
  );
}
