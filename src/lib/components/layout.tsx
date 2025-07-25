import React, { useEffect, useState } from "react";
import Navigation from "./navigation";
import { useLocation } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );

  useEffect(() => {
    const checkSidebarState = () => {
      const collapsed = localStorage.getItem("sidebarCollapsed") === "true";
      setCollapsed(collapsed);
    };

    const interval = setInterval(checkSidebarState, 300);
    return () => clearInterval(interval);
  }, []);

  const location = useLocation();

  return (
    <>
      {/* === Sidebar === */}
      <Navigation />

      {/* === Main Content === */}
      <main
        className="transition-all duration-700 px-4 md:px-12 py-8 md:py-12 min-h-screen overflow-y-auto"
        style={{
          marginLeft:
            location.pathname === "/" ? 0 : collapsed ? "60px" : "200px",
        }}
      >
        {children}
      </main>
    </>
  );
}
