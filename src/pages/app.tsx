import React, { Suspense, useEffect } from "react";
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
import PreloadLoading from "../lib/components/preloadLoading";
import { UpdateProvider } from "../lib/contexts/updateContext";
import { useAuth } from "../lib/contexts/authContext";
import { useLicense } from "../lib/contexts/licenseContext";

const MainMenu = React.lazy(() => import("./mainMenu"));
const Dashboard = React.lazy(() => import("./dashboard"));
const Clients = React.lazy(() => import("./clients"));
const Cashier = React.lazy(() => import("./cashier"));
const Stock = React.lazy(() => import("./stock"));
const History = React.lazy(() => import("./history"));
const Bills = React.lazy(() => import("./bills"));
const Services = React.lazy(() => import("./services"));
const Administrator = React.lazy(() => import("./administrator"));
const ZakatAlMal = React.lazy(() => import("./zakat"));
const About = React.lazy(() => import("./about"));

export default function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated, loading, isPreloading, preloadComplete } = useAuth();
  const { isLicenseValid, isLoading: licenseLoading } = useLicense();
  const location = useLocation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  // All hooks must be called in the same order every time
  useEffect(() => {
    rendererLogger.info("Application initialized", "App");
  }, []);

  useEffect(() => {
    rendererLogger.debug(`Route changed to: ${location.pathname}`, "App");
  }, [location.pathname]);

  // Show license validation if license is not valid
  if (!licenseLoading && !isLicenseValid) {
    return <LicenseValidation />;
  }

  // Show loading while checking license
  if (licenseLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking license...</p>
        </div>
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

  // Show preloading screen after login
  if (isAuthenticated && (isPreloading || !preloadComplete)) {
    return (
      <div dir={dir} style={{ direction: dir, width: "100%", height: "100%" }}>
        <ToastProvider>
          <UpdateProvider>
            <PreloadLoading />
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

  return (
    <div dir={dir} style={{ direction: dir, width: "100%", height: "100%" }}>
      <ToastProvider>
        <UpdateProvider>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              {/* Public route - Login */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes - Main app */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
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
                              <div className="flex-1 pt-4">
                                <Outlet />
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
