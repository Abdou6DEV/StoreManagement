import React from "react";
import { createRoot } from "react-dom/client";
import { MobilePairingApp } from "./mobilePairingApp";
import "../../src/lib/i18n";
import { ThemeProvider } from "../../src/lib/contexts/themeContext";
import { TooltipProvider } from "../../src/lib/contexts/tooltipContext";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Mobile application root element is missing");

// Keep Android/Chrome's browser UI colors aligned with the PWA's active theme.
// Read the resolved CSS background so the system bars use the same surface color.
function syncMobileBrowserTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColor) return;

  const backgroundColor = getComputedStyle(document.documentElement).backgroundColor;
  themeColor.setAttribute(
    "content",
    backgroundColor || (isDark ? "#000000" : "#f8f8f8"),
  );
}

const themeObserver = new MutationObserver(syncMobileBrowserTheme);
themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
window.addEventListener("pageshow", syncMobileBrowserTheme);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) syncMobileBrowserTheme();
});

createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider>
      <TooltipProvider>
        <MobilePairingApp />
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

// Also synchronize after the initial styles and React theme have been applied.
requestAnimationFrame(syncMobileBrowserTheme);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  navigator.serviceWorker
    .register(new URL("sw.js", baseUrl), {
      scope: baseUrl.pathname,
    })
    .catch((error: unknown) => {
      console.error("Mobile service worker registration failed", error);
    });
}
