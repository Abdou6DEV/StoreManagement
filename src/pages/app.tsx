import React, { Suspense, useEffect } from "react";
import { Routes, Route, Outlet, useLocation } from "react-router-dom";
import Layout from "../lib/components/layout";
import ScrollToTop from "../lib/components/scrollToTop";
import Sidebar from "../lib/components/sidebar";
import { StockProvider } from "../lib/contexts/stockContext";
import { useTranslation } from "react-i18next";
import { ToastProvider } from "../lib/contexts/toastContext";
import rendererLogger from "../lib/logger/rendererLogger";

const MainMenu = React.lazy(() => import("./mainMenu"));
const Dashboard = React.lazy(() => import("./dashboard"));
const Clients = React.lazy(() => import("./clients"));
const Cashier = React.lazy(() => import("./cashier"));
const Stock = React.lazy(() => import("./stock"));
const History = React.lazy(() => import("./history"));
const Administrator = React.lazy(() => import("./administrator"));

export default function App() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const dir = i18n.language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    rendererLogger.info("Application initialized", "App");
  }, []);

  useEffect(() => {
    rendererLogger.debug(`Route changed to: ${location.pathname}`, "App");
  }, [location.pathname]);

  return (
    <div dir={dir} style={{ direction: dir, width: "100%", height: "100%" }}>
      <ToastProvider>
        <Layout>
          <ScrollToTop />
          <Suspense fallback={<div>Loading...</div>}>
            <StockProvider>
              <Routes>
                <Route path="/" element={<MainMenu />} />
                <Route
                  element={
                    <main className="flex flex-1">
                      <Sidebar />
                      <div className="flex-1 p-4">
                        <Outlet />
                      </div>
                    </main>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/cashier" element={<Cashier />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/administrator" element={<Administrator />} />
                  <Route path="/*" element={<h1 className="">Soon..</h1>} />
                </Route>
              </Routes>
            </StockProvider>
          </Suspense>
        </Layout>
      </ToastProvider>
    </div>
  );
}
