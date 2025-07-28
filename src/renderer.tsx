import "./index.css";
import "./lib/i18n"; // Initialize i18n configuration with local storage
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "./lib/contexts/themeContext";
import { TooltipProvider } from "./lib/contexts/tooltipContext";
import App from "./pages/app";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <TooltipProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </TooltipProvider>
  </ThemeProvider>,
);
