import {
  ChartLine,
  Users,
  ShoppingCart,
  CreditCard,
  PackageSearch,
  Calculator,
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
  {
    key: "title",
    path: "/",
    icon: Home,
    color: "text-primary",
  },
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
    color: "text-blue-500",
  },
  {
    key: "History",
    path: "/history",
    icon: Search,
    color: "text-cyan-500",
  },
  {
    key: "Finance",
    path: "/finance",
    icon: CreditCard,
    color: "text-emerald-500",
  },
  {
    key: "clients",
    path: "/clients",
    icon: Users,
    color: "text-red-500",
  },
  {
    key: "zakat",
    path: "/zakat",
    icon: Calculator,
    color: "text-green-300",
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
  const savedCollapsedState = localStorage.getItem("sidebarCollapsed");
  const [collapsed, setCollapsed] = useState(savedCollapsedState === "true");
  const [showText, setShowText] = useState(!collapsed);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));

    if (newState === false) {
      // Expanding
      setTimeout(() => setShowText(true), 500); // Match animation
    } else {
      // Collapsing
      setShowText(false);
    }
  };

  return (
    <nav
      data-collapsed={collapsed}
      className={cn(
        "flex flex-col max-h-fit bg-card border-r shadow-md overflow-hidden rounded-xl transition-all duration-700 ease-in-out",
        collapsed ? "w-14" : "w-[200px]"
      )}
    >
      {/* === Sidebar Links === */}
      <div className="flex flex-col">
        {menuItems.map((item) => (
          <Link
            data-is-active={location.pathname === item.path}
            to={item.path}
            key={item.key}
            className="max-w-full flex gap-4 items-center rounded-xl m-2 p-2 capitalize hover:bg-secondary data-[is-active=true]:bg-secondary font-semibold data-[is-active=true]:font-bold"
          >
            <item.icon className={`${item.color}`} />
            {showText && <span>{t(`mainMenu.${item.key}`)}</span>}
          </Link>
        ))}
      
        {/* === Collapse Button === */}
        <button
          className="max-w-full flex gap-4 items-center rounded-xl self-end m-2 p-2 hover:bg-secondary font-semibold transition-all duration-300"
          onClick={handleToggleCollapse}
          style={{ marginTop: "50px" }} // <== 🎯 ADJUST THIS VALUE for spacing
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
