import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

const MAIN_MENU_PATHS = new Set([
  "dashboard",
  "clients",
  "cashier",
  "stock",
  "history",
  "bills",
  "services",
  "zakat",
  "administrator",
  "about",
]);

function resolvePageTitle(pathname: string, t: TFunction): string {
  if (pathname === "/" || pathname === "") {
    return t("mainMenu.title");
  }

  const segment = pathname.slice(1).split("/")[0] ?? "";

  if (segment === "login") {
    return t("titleBar.login", "Sign In");
  }
  if (segment === "welcome") {
    return t("titleBar.welcome", "Welcome");
  }
  if (MAIN_MENU_PATHS.has(segment)) {
    return t(`mainMenu.${segment}`);
  }

  return t("mainMenu.title");
}

export default function ElectronTitleBarCenter() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();

  const appName = t("titleBar.appName", "Reda Tech POS");
  const pageTitle = resolvePageTitle(pathname, t);
  const dir = i18n.dir() === "rtl" ? "rtl" : "ltr";

  useEffect(() => {
    const setContent = window.api?.app?.setTitleBarContent;
    if (!setContent) return;
    void setContent({
      appName,
      pageTitle,
      dir,
    });
  }, [appName, pageTitle, dir]);

  return null;
}
