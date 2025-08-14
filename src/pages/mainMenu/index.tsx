import {
  ChartLine,
  Users,
  ShoppingCart,
  PackageSearch,
  Settings as AdminIcon,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/contexts/authContext";
import "../../lib/i18n";

export default function MainMenu() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  
  const allMenuItems = [
    {
      key: "cashier",
      icon: ShoppingCart,
      color: "text-yellow-500",
      adminOnly: false,
    },
    {
      key: "dashboard",
      icon: ChartLine,
      color: "text-green-500",
      adminOnly: true,
    },
    {
      key: "stock",
      icon: PackageSearch,
      color: "text-green-600",
      adminOnly: true,
    },
    {
      key: "clients",
      icon: Users,
      color: "text-red-500",
      adminOnly: true,
    },
    {
      key: "history",
      icon: History,
      color: "text-blue-500",
      adminOnly: true,
    },
    {
      key: "administrator",
      icon: AdminIcon,
      color: "text-orange-500",
      adminOnly: true,
    },
  ];

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <main className="py-4 px-4 md:px-12 ml-20 flex-1 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {menuItems.map((item) => (
          <Link
            to={`/${item.key}`}
            className="group p-6 border rounded-xl bg-card transition-all duration-300 flex flex-col h-full
                      hover:border-red-400 hover:-translate-y-1 hover:shadow-md"
            key={item.key}
          >
            <div className="flex items-center gap-4 mb-3">
              <item.icon
                size={40}
                className={`${item.color} transition-colors duration-300 group-hover:text-red-400`}
              />
              <h2 className="font-bold capitalize text-lg transition-colors duration-300 group-hover:text-primary">
                {t(`mainMenu.${item.key}`)}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm flex-grow transition-colors duration-300 group-hover:text-foreground">
              {t(`mainMenu.${item.key}Desc`)}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
