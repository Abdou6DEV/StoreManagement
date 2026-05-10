import React, { Suspense, useEffect, useState } from "react";
import { Routes, Route, Outlet, useLocation, Navigate } from "react-router-dom";
import Layout from "../lib/components/layout";
import ScrollToTop from "../lib/components/scrollToTop";
import Sidebar from "../lib/components/sidebar";
import { StockProvider } from "../lib/contexts/stockContext";
import { LowStockProvider } from "../lib/contexts/lowStockContext";
import { OutOfStockProvider } from "../lib/contexts/outOfStockContext";
import { OverduePaymentsProvider } from "../lib/contexts/overduePaymentsContext";
import { DueSoonPaymentsProvider } from "../lib/contexts/dueSoonPaymentsContext";
import { OverdueBillsProvider } from "../lib/contexts/overdueBillsContext";
import { DueSoonBillsProvider } from "../lib/contexts/dueSoonBillsContext";
import { OverdueServicesProvider } from "../lib/contexts/overdueServicesContext";
import { DueSoonServicesProvider } from "../lib/contexts/dueSoonServicesContext";
import { CashierHistoryProvider } from "../lib/contexts/cashierHistoryContext";
import { CompletedServicesProvider } from "../lib/contexts/completedServicesContext";
import { useTranslation } from "react-i18next";
import { ToastProvider } from "../lib/contexts/toastContext";
import rendererLogger from "../lib/logger/rendererLogger";
import ProtectedRoute from "../lib/components/protectedRoute";
import PermissionRoute from "../lib/components/permissionRoute";
import Login from "./login";
import LicenseValidation from "./licenseValidation";
import LoginToPreloadTransition from "../lib/components/loginToPreloadTransition";
import PageTransition from "../lib/components/pageTransition";
import { UpdateProvider } from "../lib/contexts/updateContext";
import { useAuth } from "../lib/contexts/authContext";
import { useLicense } from "../lib/contexts/licenseContext";
import { BadgeMessageProvider } from "../lib/contexts/badgeMessageContext";
import {
  INITIAL_WELCOME_DONE_EVENT,
  ONBOARDING_INITIAL_WELCOME_DONE_KEY,
} from "../lib/onboarding/constants";

import {
  getLazyMainMenu,
  getLazyDashboard,
  getLazyClients,
  getLazyCashier,
  getLazyStock,
  getLazyHistory,
  getLazyBills,
  getLazyServices,
  getLazyAdministrator,
  getLazyZakatAlMal,
  getLazyAbout,
  getLazyWelcome,
} from "./lazyRoutes";

const MainMenu = React.lazy(getLazyMainMenu);
const Dashboard = React.lazy(getLazyDashboard);
const Clients = React.lazy(getLazyClients);
const Cashier = React.lazy(getLazyCashier);
const Stock = React.lazy(getLazyStock);
const History = React.lazy(getLazyHistory);
const Bills = React.lazy(getLazyBills);
const Services = React.lazy(getLazyServices);
const Administrator = React.lazy(getLazyAdministrator);
const ZakatAlMal = React.lazy(getLazyZakatAlMal);
const About = React.lazy(getLazyAbout);
const WelcomeSetup = React.lazy(getLazyWelcome);

export default function App() {
  const { i18n, t } = useTranslation();
  const { isAuthenticated, loading, preloadComplete, markPreloadComplete } = useAuth();
  const { isLicenseValid, isLoading: licenseLoading } = useLicense();
  const location = useLocation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";
  const [initialWelcome, setInitialWelcome] = useState<"loading" | "show" | "hide">("loading");

  // All hooks must be called in the same order every time
  useEffect(() => {
    rendererLogger.info("Application initialized", "App");
  }, []);

  useEffect(() => {
    rendererLogger.debug(`Route changed to: ${location.pathname}`, "App");
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (typeof window === "undefined" || !window.api?.onboarding?.isCoreDatabaseEmpty) {
          if (!cancelled) setInitialWelcome("hide");
          return;
        }
        const [emptyRes, doneVal] = await Promise.all([
          window.api.onboarding.isCoreDatabaseEmpty(),
          window.api.database.options.get(ONBOARDING_INITIAL_WELCOME_DONE_KEY),
        ]);
        if (cancelled) return;
        if (!emptyRes.success) {
          setInitialWelcome("hide");
          return;
        }
        const done = typeof doneVal === "string" && doneVal === "1";
        setInitialWelcome(emptyRes.isEmpty === true && !done ? "show" : "hide");
      } catch {
        if (!cancelled) setInitialWelcome("hide");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const leaveWelcomeOnlyShell = () => setInitialWelcome("hide");
    window.addEventListener(INITIAL_WELCOME_DONE_EVENT, leaveWelcomeOnlyShell);
    return () => window.removeEventListener(INITIAL_WELCOME_DONE_EVENT, leaveWelcomeOnlyShell);
  }, []);

  if (initialWelcome === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">{t("dashboard.loading", "Loading…")}</p>
        </div>
      </div>
    );
  }

  if (initialWelcome === "show") {
    return (
      <div dir={dir} className="min-h-screen w-full bg-background" style={{ direction: dir }}>
        <ToastProvider>
          <UpdateProvider>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-background">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              }
            >
              <Routes>
                <Route path="/welcome" element={<WelcomeSetup />} />
                <Route path="*" element={<Navigate to="/welcome" replace />} />
              </Routes>
            </Suspense>
          </UpdateProvider>
        </ToastProvider>
      </div>
    );
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show login→preload transition (logo down) then preloading – exit when preload bar reaches 100%
  // Wrapper has bg-background + min-h-screen so no flash when swapping Login → Transition
  if (isAuthenticated && !preloadComplete) {
    return (
      <div dir={dir} className="min-h-screen w-full h-full bg-background" style={{ direction: dir }}>
        <ToastProvider>
          <UpdateProvider>
            <LoginToPreloadTransition onPreloadComplete={markPreloadComplete} />
          </UpdateProvider>
        </ToastProvider>
      </div>
    );
  }

  // Redirect to login if not authenticated and trying to access protected routes
  if (!isAuthenticated && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }

  // Redirect to main app if authenticated and on login page
  if (isAuthenticated && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  // Main app zone only (§15): after login + preload, require device-check / license
  if (isAuthenticated && preloadComplete) {
    if (licenseLoading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">{t("license.checking", "Checking license…")}</p>
          </div>
        </div>
      );
    }
    if (!isLicenseValid) {
      return <LicenseValidation />;
    }
  }

  return (
    <div dir={dir} style={{ direction: dir, width: "100%", height: "100%" }}>
      <ToastProvider>
        <UpdateProvider>
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            }
          >
            <Routes>
              {/* Public route - Login */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes - Main app */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <BadgeMessageProvider>
                    <StockProvider>
                      <LowStockProvider>
                        <OutOfStockProvider>
                        <OverduePaymentsProvider>
                          <DueSoonPaymentsProvider>
                          <OverdueBillsProvider>
                          <DueSoonBillsProvider>
                          <OverdueServicesProvider>
                          <DueSoonServicesProvider>
                          <CashierHistoryProvider>
                          <CompletedServicesProvider>
                        <Layout>
                        <ScrollToTop />
                        <Routes>
                        <Route path="/" element={<MainMenu />} />
                        <Route
                          element={
                            <main className="flex flex-1">
                              <Sidebar />
                              <div className="flex-1 pt-4 min-w-0">
                                <PageTransition effect="fadeUp">
                                  <Outlet />
                                </PageTransition>
                              </div>
                            </main>
                          }
                        >
                          {/* Permission-based routes */}
                          <Route
                            path="/dashboard"
                            element={
                              <PermissionRoute requiredPermission="dashboard">
                                <Dashboard />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/clients"
                            element={
                              <PermissionRoute requiredPermission="clients">
                                <Clients />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/stock"
                            element={
                              <PermissionRoute requiredPermission="stock">
                                <Stock />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/cashier"
                            element={
                              <PermissionRoute requiredPermission="cashier">
                                <Cashier />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/history"
                            element={
                              <PermissionRoute requiredPermission="history">
                                <History />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/bills"
                            element={
                              <PermissionRoute requiredPermission="bills">
                                <Bills />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/services"
                            element={
                              <PermissionRoute requiredPermission="services">
                                <Services />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/administrator"
                            element={
                              <PermissionRoute requiredPermission="administrator">
                                <Administrator />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/zakat"
                            element={
                              <PermissionRoute requiredPermission="zakat">
                                <ZakatAlMal />
                              </PermissionRoute>
                            }
                          />
                          <Route
                            path="/about"
                            element={<About />}
                          />
                          <Route
                            path="/*"
                            element={<h1 className="">Soon..</h1>}
                          />
                        </Route>
                        </Routes>
                        </Layout>
                        </CompletedServicesProvider>
                        </CashierHistoryProvider>
                        </DueSoonServicesProvider>
                        </OverdueServicesProvider>
                        </DueSoonBillsProvider>
                        </OverdueBillsProvider>
                        </DueSoonPaymentsProvider>
                      </OverduePaymentsProvider>
                      </OutOfStockProvider>
                    </LowStockProvider>
                  </StockProvider>
                    </BadgeMessageProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
        </UpdateProvider>
      </ToastProvider>
    </div>
  );
}
