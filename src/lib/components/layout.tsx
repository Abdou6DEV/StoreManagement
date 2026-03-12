import React, { useEffect, useState } from "react";
import Navigation from "./navigation";
import { useLocation } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    localStorage.getItem("sidebarCollapsed") === "true",
  );

  // Run daily backup once when user reaches main app (after login). Toast only when a backup was actually created.
  useEffect(() => {
    if (typeof window === "undefined" || !window.api?.backup?.ensureDailyBackup) return;
    const timer = setTimeout(() => {
      window.api.backup.ensureDailyBackup().then((result) => {
        if (result?.created) {
          window.dispatchEvent(new CustomEvent("backup:created"));
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

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
        className="transition-[margin-left] duration-500 ease-in-out px-2 md:px-4 py-8 md:py-12 min-h-screen overflow-y-auto"
        style={{
          marginLeft:
            location.pathname === "/" ? 0 : collapsed ? "50px" : "190px",
        }}
      >
        {children}
      </main>
    </>
  );
}
