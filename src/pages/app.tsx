import React, { Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import Layout from "../lib/components/layout";
const MainMenu = React.lazy(() => import("./mainMenu"));
const Dashboard = React.lazy(() => import("./dashboard"));
const Customers = React.lazy(() => import("./customers"));
const Cashier = React.lazy(() => import("./cashier"));
const Stock = React.lazy(() => import("./stock"));
import Sidebar from "../lib/components/sidebar";
import { StockProvider } from "../lib/contexts/stockContext";

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<div>Loading...</div>}>
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
            <Route path="/clients" element={<Customers />} />
            <Route
              path="/stock"
              element={
                <StockProvider>
                  <Stock />
                </StockProvider>
              }
            />
            <Route path="/cashier" element={<Cashier />} />
            <Route path="/*" element={<h1 className="">Soon..</h1>} />
          </Route>
        </Routes>
      </Suspense>
    </Layout>
  );
}
