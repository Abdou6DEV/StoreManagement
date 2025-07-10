import {
  ChartLine,
  Users,
  ShoppingCart,
  CreditCard,
  Calculator,
  Settings as AdminIcon,
  Home,
  ChevronsLeft,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";
import { useState } from "react";

const menuItems = [
  {
    key: "title",
    path: "/",
    icon: Home,
    color: "text-primary",
  },
  {
    key: "dashboard",
    path: "/dashboard",
    icon: ChartLine,
    color: "text-green-500",
  },
  {
    key: "cashier",
    path: "/cashier",
    icon: CreditCard,
    color: "text-yellow-500",
  },
  {
    key: "stock",
    path: "/stock",
    icon: ShoppingCart,
    color: "text-blue-500",
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

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", String(newState));
  };
  return (
    <nav
      data-collapsed={collapsed}
      className="flex-1 max-w-64 data-[collapsed=true]:max-w-14 bg-card border-r shadow-md flex flex-col relative overflow-hidden transition-all duration-300"
    >
      {menuItems.map((item) => (
        <Link
          data-is-active={location.pathname === item.path}
          to={item.path}
          key={item.key}
          className="max-w-full flex gap-4 items-center rounded-xl m-2 p-2 capitalize hover:bg-secondary data-[is-active=true]:bg-secondary font-semibold data-[is-active=true]:font-bold"
        >
          <item.icon className={`${item.color}`} />
          {!collapsed && <span>{t(`mainMenu.${item.key}`)}</span>}
        </Link>
      ))}
      <button
        className="absolute flex bottom-0 right-0 m-2 p-2 hover:bg-secondary rounded-xl"
        onClick={() => handleToggleCollapse()}
      >
        <ChevronsLeft
          data-collapsed={collapsed}
          className="data-[collapsed=true]:rotate-180 transition-all duration-300"
        />
      </button>
    </nav>
  );
}
