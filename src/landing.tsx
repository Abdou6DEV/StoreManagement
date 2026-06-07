import "./index.css";
import "./lib/i18n";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "./lib/contexts/themeContext";
import { TooltipProvider } from "./lib/contexts/tooltipContext";
import { ToastProvider } from "./lib/contexts/toastContext";
import WelcomeSetup from "./pages/welcome";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <TooltipProvider>
      <ToastProvider>
        <WelcomeSetup marketingSite />
      </ToastProvider>
    </TooltipProvider>
  </ThemeProvider>,
);
