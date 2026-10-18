import React from "react";
import { createRoot } from "react-dom/client";
import { MobilePairingApp } from "./mobilePairingApp";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MobilePairingApp />
  </React.StrictMode>,
);
