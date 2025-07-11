import { Routes, Route, Outlet } from "react-router-dom";
import Layout from "../lib/components/Layout";
import MainMenu from "./MainMenu";
import Dashboard from "./Dashboard";
import Customers from "./Customers";
import Stock from "./Stock";
import Sidebar from "../lib/components/Sidebar";

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
          <Route path="/*" element={<h1 className="">to be implemented</h1>} />
        </Route>
      </Routes>
    </Layout>
  );
}
