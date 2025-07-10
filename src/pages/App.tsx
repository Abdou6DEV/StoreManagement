import { Routes, Route, Outlet } from "react-router-dom";
import Layout from "../lib/components/Layout";
import MainMenu from "./MainMenu";
import Dashboard from "./Dashboard";
import Customers from "./Customers";
import Sidebar from "../lib/components/Sidebar";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route
          element={
            <div className="flex flex-1">
              <Sidebar />
              <Outlet />
            </div>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Customers />} />
          <Route path="/*" element={<h1 className="">to be implemented</h1>} />
        </Route>
      </Routes>
    </Layout>
  );
}
