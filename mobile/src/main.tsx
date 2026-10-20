import React from "react";
import { createRoot } from "react-dom/client";
import { MobilePairingApp } from "./mobilePairingApp";
import "./style.css";

const root = document.getElementById("root");
if (!root) throw new Error("Mobile application root element is missing");

createRoot(root).render(
  <React.StrictMode>
    <MobilePairingApp />
  </React.StrictMode>,
);

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
