import React, { useEffect, useState } from "react";
import Navigation from "./navigation";
import { useLocation } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );

  useEffect(() => {
    const handleSidebarChange = (event: CustomEvent) => {
      const newCollapsed = event.detail?.collapsed;
      if (newCollapsed !== undefined) {
        setCollapsed(newCollapsed);
      }
    };

    // Listen for custom sidebar change events
    window.addEventListener(
      "sidebarStateChanged",
      handleSidebarChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "sidebarStateChanged",
        handleSidebarChange as EventListener,
      );
    };
  }, []);

  const location = useLocation();

  return (
    <>
      {/* === Sidebar === */}
      <Navigation />

      {/* === Main Content === */}
      <main
        className="transition-[margin-left] duration-500 ease-in-out px-4 md:px-12 py-8 md:py-12 min-h-screen overflow-y-auto"
        style={{
          marginLeft:
            location.pathname === "/" ? 0 : collapsed ? "20px" : "140px",
        }}
      >
        {children}
      </main>
    </>
  );
}
