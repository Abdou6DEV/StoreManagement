import "./index.css";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { ThemeProvider } from "./lib/contexts/themeContext";
import App from "./pages/app";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ThemeProvider>
    <HashRouter>
      <App />
    </HashRouter>
  </ThemeProvider>,
);
