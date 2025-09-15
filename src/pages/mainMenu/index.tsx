import {
  ChartLine,
  Users,
  ShoppingCart,
  PackageSearch,
  Settings as AdminIcon,
  History,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/contexts/authContext";
import { useLowStock } from "../../lib/contexts/lowStockContext";
import { useOverduePayments } from "../../lib/contexts/overduePaymentsContext";
import { useDueSoonPayments } from "../../lib/contexts/dueSoonPaymentsContext";
import "../../lib/i18n";

export default function MainMenu() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const { unseenLowStockCount } = useLowStock();
  const { unseenOverdueCreditsCount, unseenOverdueVersementsCount } = useOverduePayments();
  const { unseenDueSoonCreditsCount, unseenDueSoonVersementsCount } = useDueSoonPayments();
  const [enableBadge, setEnableBadge] = useState(false); // Start as false to prevent flash
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  useEffect(() => {
    const loadBadgeSetting = () => {
      window.api.database.options
        .get("enableLowStockBadge")
        .then((val) => {
          setEnableBadge(val !== "false"); // Default to true if not set
          setBadgeLoaded(true); // Mark as loaded
        });
    };

    // Load initial setting
    loadBadgeSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadBadgeSetting, 1000);

    return () => clearInterval(interval);
  }, []);

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
  const menuItems = allMenuItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <main className="py-4 px-4 md:px-12 ml-20 flex-1 rounded-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {menuItems.map((item) => (
          <Link
            to={`/${item.key}`}
            className="group p-6 border rounded-xl bg-card transition-all duration-300 flex flex-col h-full
                      hover:border-red-400 hover:-translate-y-1 hover:shadow-md relative"
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
              {item.key === "stock" && unseenLowStockCount > 0 && enableBadge && badgeLoaded && (
                <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0">
                  <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 border-2 border-red-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none">
                    {unseenLowStockCount === 1 
                      ? t("mainMenu.oneProductOutOfStock", "1 product is out of stock")
                      : t("mainMenu.productsOutOfStock", "{{count}} products are out of stock", { count: unseenLowStockCount })
                    }
                  </div>
                </div>
              )}
              {/* Payment Badges - Positioned inside container with border sharing */}
              {item.key === "clients" && ((unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) || (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0)) && (
                <div className="absolute top-0 right-0 rtl:right-auto rtl:left-0 flex flex-col">
                   {/* Overdue Badge */}
                   {(unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) && (
                     <div className={`bg-red-500 text-white text-xs font-bold px-3 py-1 border-2 border-red-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0) 
                         ? 'rounded-tr-lg rtl:rounded-tl-lg rtl:rounded-tr-none' // Only top-right rounded when due soon exists below
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only overdue exists
                     }`}>
                       {unseenOverdueCreditsCount + unseenOverdueVersementsCount === 1 
                         ? t("mainMenu.oneOverduePayment", "1 overdue payment")
                         : t("mainMenu.overduePayments", "{{count}} overdue payments", { count: unseenOverdueCreditsCount + unseenOverdueVersementsCount })
                       }
                     </div>
                   )}
                   {/* Due Soon Badge */}
                   {(unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0) && (
                     <div className={`bg-orange-500 text-white text-xs font-bold px-3 py-1 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       (unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) 
                         ? 'rounded-bl-lg rtl:rounded-br-lg rtl:rounded-bl-none' // Only bottom-left rounded when overdue exists above
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only due soon exists
                     }`}>
                       {unseenDueSoonCreditsCount + unseenDueSoonVersementsCount === 1 
                         ? t("mainMenu.oneDueSoonPayment", "1 due soon payment")
                         : t("mainMenu.dueSoonPayments", "{{count}} due soon payments", { count: unseenDueSoonCreditsCount + unseenDueSoonVersementsCount })
                       }
                     </div>
                   )}
                </div>
              )}
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
