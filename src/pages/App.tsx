import { Routes, Route } from "react-router-dom";
import Layout from "../lib/components/Layout";
import MainMenu from "./MainMenu";
import Dashboard from "./Dashboard";
import Customers from "./Customers";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
      </Routes>
    </Layout>
  );
}
