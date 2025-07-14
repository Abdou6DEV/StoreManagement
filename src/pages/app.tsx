import { Routes, Route, Outlet } from "react-router-dom";
import Layout from "../lib/components/layout";
import MainMenu from "./mainMenu";
import Dashboard from "./dashboard";
import Customers from "./customers";
import Cashier from "./cashier";
import Stock from "./stock";
import Sidebar from "../lib/components/sidebar";

export default function App() {
  return (
    <Layout>
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
          <Route path="/stock" element={<Stock />} />
          <Route path="/cashier" element={<Cashier />} />
          <Route path="/*" element={<h1 className="">Soon..</h1>} />
        </Route>
      </Routes>
    </Layout>
  );
}
