import React, { useEffect, useState } from "react";
import Navigation from "./navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true"
  );

  useEffect(() => {
    const checkSidebarState = () => {
      const collapsed = localStorage.getItem("sidebarCollapsed") === "true";
      setCollapsed(collapsed);
    };

    const interval = setInterval(checkSidebarState, 300);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* === Sidebar === */}
      <Navigation />

      {/* === Main Content === */}
      <main
        className="transition-all duration-700 px-4 md:px-12 py-8 md:py-12"
        style={{
          marginLeft: collapsed ? "60px" : "200px",
        }}
      >
        {children}
      </main>
    </>
  );
}
