import {
  ChartLine,
  Users,
  ShoppingCart,
  CreditCard,
  PackageSearch,
  Search,
  Settings as AdminIcon,
  Home,
  ChevronsLeft,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";
import { useState } from "react";
import { cn } from "../utils";

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
    key: "administrator",
    path: "/administrator",
    icon: AdminIcon,
    color: "text-orange-500",
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const savedCollapsedState = localStorage.getItem("sidebarCollapsed");
  const [collapsed, setCollapsed] = useState(savedCollapsedState === "true");
  const [showText, setShowText] = useState(!collapsed);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));

    if (newState === false) {
      setTimeout(() => setShowText(true), 700);
    } else {
      setShowText(false);
    }
  };

  return (
    <nav
      data-collapsed={collapsed}
      className={cn(
        "fixed top-0 left-0 z-50 flex flex-col bg-card border-r rounded-xl shadow-md transition-all transition-colors duration-300 transition-[width] duration-1000 ease-in-out",
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
        {menuItems.map((item) => (
          <Link
            data-is-active={location.pathname === item.path}
            to={item.path}
            key={item.key}
            className="max-w-full gap-4 flex items-center rounded-xl m-2 p-2 -mt-1 capitalize hover:bg-secondary data-[is-active=true]:bg-secondary font-semibold data-[is-active=true]:font-bold"
          >
            <item.icon className={`${item.color}`} />
            {showText && <span>{t(`mainMenu.${item.key}`)}</span>}
          </Link>
        ))}

        <button
          className="max-w-full flex gap-4 items-center rounded-xl self-end m-2 p-2 hover:bg-secondary font-semibold transition-all duration-300 mt-auto"
          onClick={handleToggleCollapse}
        >
          <ChevronsLeft
            data-collapsed={collapsed}
            className="data-[collapsed=true]:rotate-180 transition-all duration-600"
          />
        </button>
      </div>
    </nav>
  );
}
