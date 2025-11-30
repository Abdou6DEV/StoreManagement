import {
  ChartLine,
  Users,
  ShoppingCart,
  PackageSearch,
  Settings as AdminIcon,
  Home,
  ChevronsLeft,
  History,
  FileText,
  Wrench,
  LogOut,
  Info,
  Calculator,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../../lib/i18n";
import { useState, useRef, useEffect } from "react";
import { cn } from "../utils";
import { useAuth } from "../contexts/authContext";
import { useLowStock } from "../contexts/lowStockContext";
import { useOverduePayments } from "../contexts/overduePaymentsContext";
import { useDueSoonPayments } from "../contexts/dueSoonPaymentsContext";
import { useOverdueBills } from "../contexts/overdueBillsContext";
import { useDueSoonBills } from "../contexts/dueSoonBillsContext";
import { useOverdueServices } from "../contexts/overdueServicesContext";
import { useDueSoonServices } from "../contexts/dueSoonServicesContext";
import { useCompletedServices } from "../contexts/completedServicesContext";
import { useUpdateContext } from "../contexts/updateContext";
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
    key: "bills",
    path: "/bills",
    icon: FileText,
    color: "text-purple-500",
  },
  {
    key: "services",
    path: "/services",
    icon: Wrench,
    color: "text-cyan-500",
  },
  {
    key: "zakat",
    path: "/zakat",
    icon: Calculator,
    color: "text-emerald-500",
  },
  {
    key: "administrator",
    path: "/administrator",
    icon: AdminIcon,
    color: "text-orange-500",
  },
  {
    key: "about",
    path: "/about",
    icon: Info,
    color: "text-blue-500",
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { logout, isAdmin, canAccessPage } = useAuth();
  const { unseenLowStockCount } = useLowStock();
  const { unseenOverdueCreditsCount, unseenOverdueVersementsCount } = useOverduePayments();
  const { unseenDueSoonCreditsCount, unseenDueSoonVersementsCount } = useDueSoonPayments();
  const { unseenOverdueBillsCount } = useOverdueBills();
  const { unseenDueSoonBillsCount } = useDueSoonBills();
  const { unseenOverdueServicesCount, enableBadge: enableOverdueServicesBadge, badgeLoaded: overdueServicesBadgeLoaded } = useOverdueServices();
  const { unseenDueSoonServicesCount, enableBadge: enableDueSoonServicesBadge, badgeLoaded: dueSoonServicesBadgeLoaded } = useDueSoonServices();
  const { completedServicesCount, isBadgeEnabled: enableCompletedServicesBadge } = useCompletedServices();
  const { state: updateState } = useUpdateContext();
  const savedCollapsedState = localStorage.getItem("sidebarCollapsed");
  const [collapsed, setCollapsed] = useState(savedCollapsedState === "true");
  const [showText, setShowText] = useState(!collapsed);
  const [isDisabled, setIsDisabled] = useState(false);
  const [enableBadge, setEnableBadge] = useState(false); // Start as false to prevent flash
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const [showOverdueBadge, setShowOverdueBadge] = useState(true); // Start with overdue badge
  const [showOverdueBillsBadge, setShowOverdueBillsBadge] = useState(true); // Start with overdue bills badge
  const [showOverdueServicesBadge, setShowOverdueServicesBadge] = useState(true); // Start with overdue services badge
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const badgeCycleRef = useRef<NodeJS.Timeout | null>(null);
  const billsBadgeCycleRef = useRef<NodeJS.Timeout | null>(null);
  const servicesBadgeCycleRef = useRef<NodeJS.Timeout | null>(null);

  // Load badge setting and listen for changes
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

  // Cycling badge logic for clients - alternate between overdue and due soon every 10 seconds
  useEffect(() => {
    const hasOverdue = (unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0);
    const hasDueSoon = (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0);
    
    // Only cycle if both badges exist
    if (hasOverdue && hasDueSoon) {
      // Clear any existing cycle
      if (badgeCycleRef.current) {
        clearInterval(badgeCycleRef.current);
      }
      
      // Start cycling every 10 seconds
      badgeCycleRef.current = setInterval(() => {
        setShowOverdueBadge(prev => !prev);
      }, 10000);
      
      return () => {
        if (badgeCycleRef.current) {
          clearInterval(badgeCycleRef.current);
        }
      };
    } else {
      // If only one type exists, show that one and stop cycling
      setShowOverdueBadge(hasOverdue);
      if (badgeCycleRef.current) {
        clearInterval(badgeCycleRef.current);
      }
    }
  }, [unseenOverdueCreditsCount, unseenOverdueVersementsCount, unseenDueSoonCreditsCount, unseenDueSoonVersementsCount]);

  // Cycling badge logic for bills - alternate between overdue and due soon every 10 seconds
  useEffect(() => {
    const hasOverdueBills = unseenOverdueBillsCount > 0;
    const hasDueSoonBills = unseenDueSoonBillsCount > 0;
    
    // Only cycle if both badges exist
    if (hasOverdueBills && hasDueSoonBills) {
      // Clear any existing cycle
      if (billsBadgeCycleRef.current) {
        clearInterval(billsBadgeCycleRef.current);
      }
      
      // Start cycling every 10 seconds
      billsBadgeCycleRef.current = setInterval(() => {
        setShowOverdueBillsBadge(prev => !prev);
      }, 10000);
      
      return () => {
        if (billsBadgeCycleRef.current) {
          clearInterval(billsBadgeCycleRef.current);
        }
      };
    } else {
      // If only one type exists, show that one and stop cycling
      setShowOverdueBillsBadge(hasOverdueBills);
      if (billsBadgeCycleRef.current) {
        clearInterval(billsBadgeCycleRef.current);
      }
    }
  }, [unseenOverdueBillsCount, unseenDueSoonBillsCount]);

  // Cycling badge logic for services - alternate between overdue and due soon every 10 seconds
  useEffect(() => {
    const hasOverdueServices = unseenOverdueServicesCount > 0;
    const hasDueSoonServices = unseenDueSoonServicesCount > 0;
    
    // Only cycle if both badges exist
    if (hasOverdueServices && hasDueSoonServices) {
      // Clear any existing cycle
      if (servicesBadgeCycleRef.current) {
        clearInterval(servicesBadgeCycleRef.current);
      }
      
      // Start cycling every 10 seconds
      servicesBadgeCycleRef.current = setInterval(() => {
        setShowOverdueServicesBadge(prev => !prev);
      }, 10000);
      
      return () => {
        if (servicesBadgeCycleRef.current) {
          clearInterval(servicesBadgeCycleRef.current);
        }
      };
    } else {
      // If only one type exists, show that one and stop cycling
      setShowOverdueServicesBadge(hasOverdueServices);
      if (servicesBadgeCycleRef.current) {
        clearInterval(servicesBadgeCycleRef.current);
      }
    }
  }, [unseenOverdueServicesCount, unseenDueSoonServicesCount]);

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.key === "title") {
      return true; // Always show home
    }
    if (item.key === "cashier") {
      return canAccessPage("cashier"); // Check cashier permission
    }
    if (item.key === "administrator") {
      return canAccessPage("administrator"); // Check admin permission
    }
    // For other pages, check specific permissions
    return canAccessPage(item.key);
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
              {item.key === "stock" && unseenLowStockCount > 0 && enableBadge && badgeLoaded && (
                <BadgeNotification count={unseenLowStockCount} />
              )}
              {item.key === "cashier" && completedServicesCount > 0 && enableCompletedServicesBadge && (
                <BadgeNotification count={completedServicesCount} variant="green" />
              )}
              {item.key === "clients" && ((unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) || (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0)) && (
                <>
                  {/* Overdue Badge - Show when cycling to overdue or when only overdue exists */}
                  {showOverdueBadge && (unseenOverdueCreditsCount > 0 || unseenOverdueVersementsCount > 0) && (
                    <BadgeNotification 
                      count={unseenOverdueCreditsCount + unseenOverdueVersementsCount} 
                      variant="red"
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                  {/* Due Soon Badge - Show when cycling to due soon or when only due soon exists */}
                  {!showOverdueBadge && (unseenDueSoonCreditsCount > 0 || unseenDueSoonVersementsCount > 0) && (
                    <BadgeNotification 
                      count={unseenDueSoonCreditsCount + unseenDueSoonVersementsCount} 
                      variant="orange"
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                </>
              )}
              {item.key === "bills" && (unseenOverdueBillsCount > 0 || unseenDueSoonBillsCount > 0) && (
                <>
                  {/* Overdue Bills Badge - Show when cycling to overdue or when only overdue exists */}
                  {showOverdueBillsBadge && unseenOverdueBillsCount > 0 && (
                    <BadgeNotification 
                      count={unseenOverdueBillsCount} 
                      variant="red"
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                  {/* Due Soon Bills Badge - Show when cycling to due soon or when only due soon exists */}
                  {!showOverdueBillsBadge && unseenDueSoonBillsCount > 0 && (
                    <BadgeNotification 
                      count={unseenDueSoonBillsCount} 
                      variant="orange"
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                </>
              )}
              {item.key === "services" && ((unseenOverdueServicesCount > 0 && enableOverdueServicesBadge && overdueServicesBadgeLoaded) || (unseenDueSoonServicesCount > 0 && enableDueSoonServicesBadge && dueSoonServicesBadgeLoaded)) && (
                <>
                  {/* Overdue Services Badge - Show when cycling to overdue or when only overdue exists */}
                  {showOverdueServicesBadge && unseenOverdueServicesCount > 0 && enableOverdueServicesBadge && overdueServicesBadgeLoaded && (
                    <BadgeNotification 
                      count={unseenOverdueServicesCount} 
                      variant="red"
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                  {/* Due Soon Services Badge - Show when cycling to due soon or when only due soon exists */}
                  {!showOverdueServicesBadge && unseenDueSoonServicesCount > 0 && enableDueSoonServicesBadge && dueSoonServicesBadgeLoaded && (
                    <BadgeNotification 
                      count={unseenDueSoonServicesCount} 
                      variant="orange"
                      className="transition-all duration-500 ease-in-out"
                    />
                  )}
                </>
              )}
              {item.key === "administrator" && updateState.updateInfo?.available && (
                <BadgeNotification count={1} variant="orange" />
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
