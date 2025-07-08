import { Routes, Route } from "react-router-dom";
import Navigation from "./lib/components/Navigation";
import MainMenu from "./MainMenu";
import Dashboard from "./Dashboard";
import Customers from "./Customers";

export default function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
      </Routes>
    </>
  );
}
