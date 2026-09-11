import "../index.css";
import { createRoot } from "react-dom/client";
import { TitleBarApp } from "./TitleBarApp";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<TitleBarApp />);
}
