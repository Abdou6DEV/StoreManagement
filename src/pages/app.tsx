import React, { Suspense, useEffect } from "react";
import { Routes, Route, Outlet, useLocation, Navigate } from "react-router-dom";
import Layout from "../lib/components/layout";
import ScrollToTop from "../lib/components/scrollToTop";
import Sidebar from "../lib/components/sidebar";
import { StockProvider } from "../lib/contexts/stockContext";
import { LowStockProvider } from "../lib/contexts/lowStockContext";
import { OverduePaymentsProvider } from "../lib/contexts/overduePaymentsContext";
import { DueSoonPaymentsProvider } from "../lib/contexts/dueSoonPaymentsContext";
import { useTranslation } from "react-i18next";
import { ToastProvider } from "../lib/contexts/toastContext";
import rendererLogger from "../lib/logger/rendererLogger";
import ProtectedRoute from "../lib/components/protectedRoute";
import Login from "./login";
import { useAuth } from "../lib/contexts/authContext";

const MainMenu = React.lazy(() => import("./mainMenu"));
const Dashboard = React.lazy(() => import("./dashboard"));
const Clients = React.lazy(() => import("./clients"));
const Cashier = React.lazy(() => import("./cashier"));
const Stock = React.lazy(() => import("./stock"));
const History = React.lazy(() => import("./history"));
const Administrator = React.lazy(() => import("./administrator"));

export default function App() {
  const { i18n } = useTranslation();
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    rendererLogger.info("Application initialized", "App");
  }, []);

  useEffect(() => {
    rendererLogger.debug(`Route changed to: ${location.pathname}`, "App");
  }, [location.pathname]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                      <OverduePaymentsProvider>
                        <DueSoonPaymentsProvider>
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
                          {/* Admin-only routes */}
                          <Route
                            path="/dashboard"
                            element={
                              <ProtectedRoute requireAdmin>
                                <Dashboard />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/clients"
                            element={
                              <ProtectedRoute requireAdmin>
                                <Clients />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/stock"
                            element={
                              <ProtectedRoute requireAdmin>
                                <Stock />
                              </ProtectedRoute>
                            }
                          />
                          {/* User-accessible routes */}
                          <Route path="/cashier" element={<Cashier />} />
                          <Route
                            path="/history"
                            element={
                              <ProtectedRoute requireAdmin>
                                <History />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/administrator"
                            element={
                              <ProtectedRoute requireAdmin>
                                <Administrator />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/*"
                            element={<h1 className="">Soon..</h1>}
                          />
                        </Route>
                        </Routes>
                        </Layout>
                        </DueSoonPaymentsProvider>
                      </OverduePaymentsProvider>
                    </LowStockProvider>
                  </StockProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </ToastProvider>
    </div>
  );
}
