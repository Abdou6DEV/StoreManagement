import {
  ChartLine,
  Users,
  ShoppingCart,
  PackageSearch,
  Settings as AdminIcon,
  History,
  FileText,
  Wrench,
  Info,
  Calculator,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/contexts/authContext";
import { useLowStock } from "../../lib/contexts/lowStockContext";
import { useOutOfStock } from "../../lib/contexts/outOfStockContext";
import { useOverduePayments } from "../../lib/contexts/overduePaymentsContext";
import { useDueSoonPayments } from "../../lib/contexts/dueSoonPaymentsContext";
import { useOverdueBills } from "../../lib/contexts/overdueBillsContext";
import { useDueSoonBills } from "../../lib/contexts/dueSoonBillsContext";
import { useOverdueServices } from "../../lib/contexts/overdueServicesContext";
import { useDueSoonServices } from "../../lib/contexts/dueSoonServicesContext";
import { useCompletedServices } from "../../lib/contexts/completedServicesContext";
import { useUpdateContext } from "../../lib/contexts/updateContext";
import { UpdateModal } from "./components/updateModal";
import "../../lib/i18n";

export default function MainMenu() {
  const { t } = useTranslation();
  const { isAdmin, canAccessPage } = useAuth();
  const { unseenLowStockCount } = useLowStock();
  const { unseenOutOfStockCount } = useOutOfStock();
  const { unseenOverdueCreditsCount, unseenOverdueVersementsCount } = useOverduePayments();
  const { unseenDueSoonCreditsCount, unseenDueSoonVersementsCount } = useDueSoonPayments();
  const { unseenOverdueBillsCount } = useOverdueBills();
  const { unseenDueSoonBillsCount } = useDueSoonBills();
  const { unseenOverdueServicesCount, enableBadge: enableOverdueServicesBadge, badgeLoaded: overdueServicesBadgeLoaded } = useOverdueServices();
  const { unseenDueSoonServicesCount, enableBadge: enableDueSoonServicesBadge, badgeLoaded: dueSoonServicesBadgeLoaded } = useDueSoonServices();
  const { completedServicesCount } = useCompletedServices();
  const { state: updateState } = useUpdateContext();
  const [enableBadge, setEnableBadge] = useState(false); // Start as false to prevent flash
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const [enableOutOfStockBadge, setEnableOutOfStockBadge] = useState(false); // Start as false to prevent flash
  const [outOfStockBadgeLoaded, setOutOfStockBadgeLoaded] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const loadBadgeSetting = () => {
      Promise.all([
        window.api.database.options.get("enableLowStockBadge"),
        window.api.database.options.get("enableOutOfStockBadge"),
      ]).then(([lowStockVal, outOfStockVal]) => {
        setEnableBadge(lowStockVal !== "false"); // Default to true if not set
        setBadgeLoaded(true); // Mark as loaded
        setEnableOutOfStockBadge(outOfStockVal !== "false"); // Default to true if not set
        setOutOfStockBadgeLoaded(true); // Mark as loaded
      });
    };

    // Load initial setting
    loadBadgeSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadBadgeSetting, 1000);

    return () => clearInterval(interval);
  }, []);

  // Trigger animation after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldAnimate(true);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  // Show update modal once per login session when entering main menu and update is available
  useEffect(() => {
    if (updateState.updateInfo?.available && updateState.updateInfo?.latestVersion) {
      // Check if we've already shown the modal in this session
      const shownVersionKey = `updateModalShown_${updateState.updateInfo.latestVersion}`;
      const hasBeenShown = sessionStorage.getItem(shownVersionKey);
      
      if (!hasBeenShown) {
        // Small delay to let the page load first
        const timer = setTimeout(() => {
          setShowUpdateModal(true);
          // Mark this version as shown for this session
          sessionStorage.setItem(shownVersionKey, "true");
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [updateState.updateInfo?.available, updateState.updateInfo?.latestVersion]);

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
      key: "bills",
      icon: FileText,
      color: "text-purple-500",
      adminOnly: true,
    },
    {
      key: "services",
      icon: Wrench,
      color: "text-cyan-500",
      adminOnly: true,
    },
    {
      key: "zakat",
      icon: Calculator,
      color: "text-emerald-500",
      adminOnly: true,
    },
    {
      key: "administrator",
      icon: AdminIcon,
      color: "text-orange-500",
      adminOnly: true,
    },
    {
      key: "about",
      icon: Info,
      color: "text-blue-500",
      adminOnly: false,
    },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter((item) => {
    if (item.key === "cashier") {
      return canAccessPage("cashier");
    }
    if (item.key === "administrator") {
      return canAccessPage("administrator");
    }
    // For other pages, check specific permissions
    return canAccessPage(item.key);
  });

  return (
    <>
      <UpdateModal 
        open={showUpdateModal} 
        onOpenChange={setShowUpdateModal} 
      />
      <main className="py-4 px-4 md:px-12 ml-20 flex-1 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {menuItems.map((item) => (
          <Link
            to={`/${item.key}`}
            className="group p-6 border rounded-xl bg-card transition-all duration-300 flex flex-col h-full
                      hover:border-red-400 hover:-translate-y-1 hover:shadow-md relative overflow-hidden"
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
              {/* Stock Badges - Positioned inside container with border sharing */}
              {item.key === "stock" && ((unseenLowStockCount > 0 && enableBadge && badgeLoaded) || (unseenOutOfStockCount > 0 && enableOutOfStockBadge && outOfStockBadgeLoaded)) && (
                <div className={`absolute top-0 right-0 rtl:right-auto rtl:left-0 flex flex-col transition-transform duration-500 ease-out ${shouldAnimate ? 'translate-y-0' : '-translate-y-[150%]'}`}>
                   {/* Out of Stock Badge (Red) */}
                   {unseenOutOfStockCount > 0 && enableOutOfStockBadge && outOfStockBadgeLoaded && (
                     <div className={`bg-red-600 text-white text-xs font-bold px-3 py-1 border-2 border-red-600 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       (unseenLowStockCount > 0 && enableBadge && badgeLoaded) 
                         ? 'rounded-tr-lg rtl:rounded-tl-lg rtl:rounded-tr-none' // Only top-right rounded when low stock exists below
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only out of stock exists
                     }`}>
                       {unseenOutOfStockCount === 1 
                         ? t("mainMenu.oneProductOutOfStock", "1 product is out of stock")
                         : t("mainMenu.productsOutOfStock", "{{count}} products are out of stock", { count: unseenOutOfStockCount })
                       }
                     </div>
                   )}
                   {/* Low Stock Badge (Orange) */}
                   {unseenLowStockCount > 0 && enableBadge && badgeLoaded && (
                     <div className={`bg-orange-500 text-white text-xs font-bold px-3 py-1 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       (unseenOutOfStockCount > 0 && enableOutOfStockBadge && outOfStockBadgeLoaded)
                         ? 'rounded-bl-lg rtl:rounded-br-lg rtl:rounded-bl-none' // Only bottom-left rounded when out of stock exists above
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only low stock exists
                     }`}>
                       {unseenLowStockCount === 1 
                         ? t("mainMenu.oneProductLowStock", "1 product is low on stock")
                         : t("mainMenu.productsLowStock", "{{count}} products are low on stock", { count: unseenLowStockCount })
                       }
                     </div>
                   )}
                </div>
              )}
              {item.key === "cashier" && completedServicesCount > 0 && (
                <div className={`absolute top-0 right-0 rtl:right-auto rtl:left-0 transition-transform duration-500 ease-out ${shouldAnimate ? 'translate-y-0' : '-translate-y-[150%]'}`}>
                  <div className="bg-green-600 text-white text-xs font-bold px-3 py-1 border-2 border-green-600 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none">
                    {completedServicesCount === 1 
                      ? t("mainMenu.oneServiceCompleted", "1 service is completed")
                      : t("mainMenu.servicesCompleted", "{{count}} services are completed", { count: completedServicesCount })
                    }
                  </div>
                </div>
              )}
              {/* Payment Badges - Positioned inside container with border sharing */}
              {item.key === "clients" && ((unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) || (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0)) && (
                <div className={`absolute top-0 right-0 rtl:right-auto rtl:left-0 flex flex-col transition-transform duration-500 ease-out ${shouldAnimate ? 'translate-y-0' : '-translate-y-[150%]'}`}>
                   {/* Overdue Badge */}
                   {(unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) && (
                     <div className={`bg-red-600 text-white text-xs font-bold px-3 py-1 border-2 border-red-600 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
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
              {/* Bills Badges - Positioned inside container with border sharing */}
              {item.key === "bills" && (unseenOverdueBillsCount > 0 || unseenDueSoonBillsCount > 0) && (
                <div className={`absolute top-0 right-0 rtl:right-auto rtl:left-0 flex flex-col transition-transform duration-500 ease-out ${shouldAnimate ? 'translate-y-0' : '-translate-y-[150%]'}`}>
                   {/* Overdue Badge */}
                   {unseenOverdueBillsCount > 0 && (
                     <div className={`bg-red-600 text-white text-xs font-bold px-3 py-1 border-2 border-red-600 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       unseenDueSoonBillsCount > 0 
                         ? 'rounded-tr-lg rtl:rounded-tl-lg rtl:rounded-tr-none' // Only top-right rounded when due soon exists below
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only overdue exists
                     }`}>
                       {unseenOverdueBillsCount === 1 
                         ? t("mainMenu.oneOverdueBill", "1 overdue bill")
                         : t("mainMenu.overdueBills", "{{count}} overdue bills", { count: unseenOverdueBillsCount })
                       }
                     </div>
                   )}
                   {/* Due Soon Badge */}
                   {unseenDueSoonBillsCount > 0 && (
                     <div className={`bg-orange-500 text-white text-xs font-bold px-3 py-1 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       unseenOverdueBillsCount > 0 
                         ? 'rounded-bl-lg rtl:rounded-br-lg rtl:rounded-bl-none' // Only bottom-left rounded when overdue exists above
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only due soon exists
                     }`}>
                       {unseenDueSoonBillsCount === 1 
                         ? t("mainMenu.oneDueSoonBill", "1 due soon bill")
                         : t("mainMenu.dueSoonBills", "{{count}} due soon bills", { count: unseenDueSoonBillsCount })
                       }
                     </div>
                   )}
                </div>
              )}
              {/* Services Badges - Positioned inside container with border sharing */}
              {item.key === "services" && ((unseenOverdueServicesCount > 0 && enableOverdueServicesBadge && overdueServicesBadgeLoaded) || (unseenDueSoonServicesCount > 0 && enableDueSoonServicesBadge && dueSoonServicesBadgeLoaded)) && (
                <div className={`absolute top-0 right-0 rtl:right-auto rtl:left-0 flex flex-col transition-transform duration-500 ease-out ${shouldAnimate ? 'translate-y-0' : '-translate-y-[150%]'}`}>
                   {/* Overdue Services Badge */}
                   {unseenOverdueServicesCount > 0 && enableOverdueServicesBadge && overdueServicesBadgeLoaded && (
                     <div className={`bg-red-600 text-white text-xs font-bold px-3 py-1 border-2 border-red-600 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       unseenDueSoonServicesCount > 0 
                         ? 'rounded-tr-lg rtl:rounded-tl-lg rtl:rounded-tr-none' // Only top-right rounded when due soon exists below
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only overdue exists
                     }`}>
                       {unseenOverdueServicesCount === 1 
                         ? t("mainMenu.oneOverdueService", "1 overdue service")
                         : t("mainMenu.overdueServices", "{{count}} overdue services", { count: unseenOverdueServicesCount })
                       }
                     </div>
                   )}
                   {/* Due Soon Services Badge */}
                   {unseenDueSoonServicesCount > 0 && enableDueSoonServicesBadge && dueSoonServicesBadgeLoaded && (
                     <div className={`bg-orange-500 text-white text-xs font-bold px-3 py-1 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] ${
                       unseenOverdueServicesCount > 0 
                         ? 'rounded-bl-lg rtl:rounded-br-lg rtl:rounded-bl-none' // Only bottom-left rounded when overdue exists above
                         : 'rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none' // Top-right rounded, bottom-left rounded when only due soon exists
                     }`}>
                       {unseenDueSoonServicesCount === 1 
                         ? t("mainMenu.oneDueSoonService", "1 due soon service")
                         : t("mainMenu.dueSoonServices", "{{count}} due soon services", { count: unseenDueSoonServicesCount })
                       }
                     </div>
                   )}
                </div>
              )}
              {/* Update Badge for Administrator */}
              {item.key === "administrator" && updateState.updateInfo?.available && (
                <div className={`absolute top-0 right-0 rtl:right-auto rtl:left-0 transition-transform duration-500 ease-out ${shouldAnimate ? 'translate-y-0' : '-translate-y-[150%]'}`}>
                  <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1 border-2 border-orange-500 shadow-lg transition-all duration-300 ease-in-out h-[20px] flex items-center justify-center min-w-[60px] rounded-tr-lg rounded-bl-lg rtl:rounded-tl-lg rtl:rounded-br-lg rtl:rounded-tr-none rtl:rounded-bl-none">
                    {t("mainMenu.newUpdateAvailable", "New update is available")}
                  </div>
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
    </>
  );
}
