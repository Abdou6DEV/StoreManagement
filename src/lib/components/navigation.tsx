import { useLocation, Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdownMenu";
import {
  Home,
  ChartLine,
  Users,
  ShoppingCart,
  PackageSearch,
  Settings,
  User,
  LogOut,
  History,
  FileText,
  Wrench,
  Info,
  Calculator,
  Bell,
  ExternalLink,
} from "lucide-react";
import { ThemeToggleButton } from "./themeToggleButton";
import { FullscreenToggleButton } from "./fullscreenToggleButton";
import { TooltipToggleButton } from "./tooltipToggleButton";
import { UserBadge } from "./userBadge";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/authContext";
import { useNotifications } from "../hooks/useNotifications";
import { useNavigate } from "react-router-dom";

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const { user, logout, loading } = useAuth();
  const { notifications, totalCount } = useNotifications();

  const isCashierPage = location.pathname.startsWith("/cashier");
  const isRTL = i18n.language === "ar";

  // Show loading while authentication is being checked
  if (loading) {
    return (
      <div className="w-full px-4 pt-4">
        <div className="flex items-center justify-between rounded-xl border border-border px-6 h-20 bg-card">
          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-20 w-40 rounded"></div>
          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-32 rounded"></div>
          <div className="animate-pulse bg-gray-300 dark:bg-gray-600 h-8 w-8 rounded"></div>
        </div>
      </div>
    );
  }

  if (isCashierPage) {
    return (
      <div className="fixed top-4 -left-0 right-4 z-50 flex items-center justify-between pl-2 pr-4">
        <UserBadge size="md" className="h-14" showRole={true} />
        <DropdownMenu onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="rounded-xl outline-none ring-0 hover:text-red-400 transition-all duration-300 p-1">
              <Settings
                className={`transition-transform duration-400 ${
                  dropdownOpen ? "rotate-360 scale-110" : ""
                } hover:text-red-400`}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={`mx-4 my-2 w-56 ${isRTL ? "text-right" : ""}`}
          >
            <DropdownMenuLabel className="font-semibold text-md flex items-center gap-2">
              <User className="w-4 h-4" />
              {t("navigation.welcome", "Welcome")}, {user?.username || t("navigation.user", "User")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.preferences")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <ThemeToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <FullscreenToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <TooltipToggleButton variant="ghost" showText={true} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="font-semibold text-md">
              {t("navigation.language")}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("en");
              }}
              disabled={i18n.language === "en"}
              className={isRTL ? "flex-row-reverse" : ""}
            >
              <span className={isRTL ? "ml-2" : "mr-2"}>🇬🇧</span>{" "}
              {t("navigation.english")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("fr");
              }}
              disabled={i18n.language === "fr"}
              className={isRTL ? "flex-row-reverse" : ""}
            >
              <span className={isRTL ? "ml-2" : "mr-2"}>🇫🇷</span>{" "}
              {t("navigation.french")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                i18n.changeLanguage("ar");
              }}
              disabled={i18n.language === "ar"}
              className={isRTL ? "flex-row-reverse" : ""}
            >
              <span className={isRTL ? "ml-2" : "mr-2"}>🇸🇦</span>{" "}
              {t("navigation.arabic")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className={`font-medium ${isRTL ? "flex-row-reverse" : ""}`}
            >
              <LogOut className={`w-4 h-4 ${isRTL ? "ml-2" : "mr-2"}`} />
              {t("navigation.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div className="w-full px-4 pt-4">
      <div className="flex items-center justify-between rounded-xl border border-border bg-card shadow-md px-8 h-20 hover:shadow-lg transition-shadow duration-300">
        <UserBadge size="md" className="h-16" />
        {/* === Dynamic Page Title === */}
        <h1 className="text-3xl font-bold flex items-center gap-3 py-6">
          {location.pathname === "/" ? (
            <>
              <Home className="w-8 h-8 text-primary" />
              {t("mainMenu.title")}
            </>
          ) : (
            (() => {
              const path = location.pathname.slice(1).split("/")[0];
              const iconMap: Record<string, React.ReactNode> = {
                dashboard: <ChartLine className="w-8 h-8 text-green-500" />,
                clients: <Users className="w-8 h-8 text-red-500" />,
                cashier: <ShoppingCart className="w-8 h-8 text-yellow-500" />,
                stock: <PackageSearch className="w-8 h-8 text-green-600" />,
                history: <History className="w-8 h-8 text-blue-500" />,
                bills: <FileText className="w-8 h-8 text-purple-500" />,
                services: <Wrench className="w-8 h-8 text-cyan-500" />,
                zakat: <Calculator className="w-8 h-8 text-emerald-500" />,
                administrator: <Settings className="w-8 h-8 text-orange-500" />,
                about: <Info className="w-8 h-8 text-blue-500" />,
              };
              return (
                <>
                  {iconMap[path] || null}
                  {t(`mainMenu.${path}`)}
                </>
              );
            })()
          )}
        </h1>

        {/* === Notifications and Settings === */}
        <div className="flex items-center gap-4">
          {/* Notifications Dropdown */}
          <DropdownMenu onOpenChange={setNotificationsOpen}>
            <DropdownMenuTrigger asChild>
              <button className="relative rounded-xl outline-none ring-0 hover:bg-primary/10 transition-all duration-300 p-2 group">
                <Bell
                  className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 ${
                    notificationsOpen ? "scale-110" : ""
                  } ${totalCount > 0 ? "bell-ring" : ""}`}
                />
                {totalCount > 0 && (
                  <span className={`absolute grid h-5 place-items-center rounded-full bg-red-500 font-bold text-white leading-none ${totalCount > 99 ? "-top-1 -right-2 w-7 text-xs" : "-top-1 -right-0.5 w-5.5 text-xs"}`}>
                    <span className="tabular-nums">{totalCount > 99 ? "99+" : totalCount}</span>
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={`ml-0 mr-20 my-0 min-w-80 w-max max-w-md max-h-96 overflow-y-auto p-1 ${isRTL ? "text-right" : ""}`}
            >
              <DropdownMenuLabel className="font-semibold text-base px-3 py-2.5">
                {t("navigation.notifications", "Notifications")}
                {totalCount > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground font-normal">
                    ({totalCount})
                  </span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-base text-muted-foreground">
                    {t("navigation.noNotifications", "No notifications")}
                  </p>
                </div>
              ) : (
                <div className="py-1">
                  {notifications.map((notification, index) => {
                    const Icon = notification.icon;
                    const isHighPriority = notification.importance === 'high';
                    const countColor = isHighPriority
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-orange-600 dark:text-orange-400';
                    const iconBgColor = isHighPriority
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-orange-100 dark:bg-orange-900/20';
                    
                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        onClick={(e) => {
                          e.preventDefault();
                          setNotificationsOpen(false);

                          // If we're already on the target page, don't navigate
                          if (location.pathname === notification.path) {
                            // Page is already active, just close the dropdown
                            return;
                          }

                          // Navigate with state to trigger filters
                          navigate(notification.path, {
                            state: { notificationAction: notification.action },
                          });
                        }}
                        className={`cursor-pointer px-3 py-2.5 my-0.5 rounded-sm group ${isRTL ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`flex items-center gap-3 w-full ${isRTL ? "flex-row-reverse" : ""}`}>
                          <div className={`p-1.5 rounded-md ${iconBgColor} flex-shrink-0`}>
                            <Icon className={`w-4 h-4 ${notification.iconColor}`} />
                          </div>
                          <span className="text-base flex-1 leading-relaxed">
                            {notification.message.split(/(\d+)/).map((part, i) => {
                              if (/^\d+$/.test(part)) {
                                return <span key={i} className={`${countColor} font-semibold`}>{part}</span>;
                              }
                              return <span key={i}>{part}</span>;
                            })}
                          </span>
                          <ExternalLink className={`w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0 ${isRTL ? "mr-auto" : "ml-auto"}`} />
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Dropdown */}
          <DropdownMenu onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button className="rounded-xl outline-none ring-0 hover:bg-primary/10 transition-all duration-300 p-2 group">
                <Settings
                  className={`w-5 h-5 transition-all duration-300 group-hover:scale-110 ${
                    dropdownOpen ? "rotate-180 scale-110" : ""
                  }`}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={`mx-4 my-2 w-56 ${isRTL ? "text-right" : ""}`}
            >
              {/* User Info */}
              <DropdownMenuLabel className="font-semibold text-md flex items-center gap-2">
                <User className="w-4 h-4" />
                Welcome, {user?.username || "User"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuLabel className="font-semibold text-md">
                {t("navigation.preferences")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <ThemeToggleButton variant="ghost" showText={true} />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <TooltipToggleButton variant="ghost" showText={true} />
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <FullscreenToggleButton variant="ghost" showText={true} />
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel className="font-semibold text-md">
                {t("navigation.language")}
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  i18n.changeLanguage("en");
                }}
                disabled={i18n.language === "en"}
                className={isRTL ? "flex-row-reverse" : ""}
              >
                <span className={isRTL ? "ml-2" : "mr-2"}>🇬🇧</span>{" "}
                {t("navigation.english")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  i18n.changeLanguage("fr");
                }}
                disabled={i18n.language === "fr"}
                className={isRTL ? "flex-row-reverse" : ""}
              >
                <span className={isRTL ? "ml-2" : "mr-2"}>🇫🇷</span>{" "}
                {t("navigation.french")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  i18n.changeLanguage("ar");
                }}
                disabled={i18n.language === "ar"}
                className={isRTL ? "flex-row-reverse" : ""}
              >
                <span className={isRTL ? "ml-2" : "mr-2"}>🇸🇦</span>{" "}
                {t("navigation.arabic")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  logout();
                }}
                className={`w-full font-medium justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                {t("navigation.logout")}
                <LogOut className={`w-4 h-4 text-red-500 ${isRTL ? "ml-0" : "mr-0"}`} />
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
