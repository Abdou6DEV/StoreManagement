import "./index.css";
import "./lib/i18n"; // Initialize i18n configuration with local storage
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "./lib/contexts/themeContext";
import { TooltipProvider } from "./lib/contexts/tooltipContext";
import { AuthProvider } from "./lib/contexts/authContext";
import { LicenseProvider } from "./lib/contexts/licenseContext";
import { ToastProvider } from "./lib/contexts/toastContext";
import { AIRuntimeProvider } from "./lib/components/ai/AIRuntimeProvider";
import App from "./pages/app";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <TooltipProvider>
      <LicenseProvider>
        <AuthProvider>
          <ToastProvider>
            <HashRouter>
              <AIRuntimeProvider>
                <App />
              </AIRuntimeProvider>
            </HashRouter>
          </ToastProvider>
        </AuthProvider>
      </LicenseProvider>
    </TooltipProvider>
  </ThemeProvider>,
);
