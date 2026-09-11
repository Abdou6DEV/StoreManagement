import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useAuth } from "../contexts/authContext";
import { useLicense } from "../contexts/licenseContext";
import { useActiveTrial } from "../hooks/useActiveTrial";
import { readLicenseGraceSnapshot } from "../license/offlineGrace";

function resolveAuthPageLabel(pathname: string, t: TFunction): string {
  const segment = pathname.slice(1).split("/")[0] ?? "";
  if (segment === "login") {
    return t("titleBar.login", "Sign In");
  }
  if (segment === "welcome") {
    return t("titleBar.welcome", "Get Started");
  }
  return "";
}

type LicenseKind = "trial" | "premium" | "standard" | "";

function resolveLicense(options: {
  isTrialActive: boolean;
  aiEnabled: boolean | undefined;
  isLicenseValid: boolean;
  t: TFunction;
}): { label: string; kind: LicenseKind } {
  const { isTrialActive, aiEnabled, isLicenseValid, t } = options;
  if (isTrialActive) {
    return {
      label: t("titleBar.freeTrial", "Free Trial"),
      kind: "trial",
    };
  }
  if (aiEnabled === true) {
    return {
      label: t("titleBar.premiumLicense", "Premium License"),
      kind: "premium",
    };
  }
  if (isLicenseValid) {
    return {
      label: t("titleBar.standardLicense", "Standard License"),
      kind: "standard",
    };
  }
  return { label: "", kind: "" };
}

export default function ElectronTitleBarCenter() {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { user, isAuthenticated, isAdmin, userRole } = useAuth();
  const { lastDeviceCheckResult, isLicenseValid } = useLicense();
  const { isTrialActive } = useActiveTrial();

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [snapshotAiEnabled, setSnapshotAiEnabled] = useState<
    boolean | undefined
  >(undefined);

  useEffect(() => {
    const sync = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void readLicenseGraceSnapshot().then((snapshot) => {
      if (!cancelled) {
        setSnapshotAiEnabled(
          typeof snapshot?.aiEnabled === "boolean"
            ? snapshot.aiEnabled
            : undefined,
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lastDeviceCheckResult]);

  const aiEnabled =
    lastDeviceCheckResult?.success === true &&
    typeof lastDeviceCheckResult.aiEnabled === "boolean"
      ? lastDeviceCheckResult.aiEnabled
      : snapshotAiEnabled;

  const appName = t("titleBar.appName", "Reda Tech POS");
  const dir = i18n.dir() === "rtl" ? "rtl" : "ltr";

  const loggedIn = Boolean(isAuthenticated && user?.username);
  const authPageLabel = loggedIn ? "" : resolveAuthPageLabel(pathname, t);
  const username = loggedIn ? user!.username : "";
  const userRoleKind: "admin" | "user" | "" = loggedIn
    ? isAdmin || userRole === "ADMIN"
      ? "admin"
      : "user"
    : "";
  const license = loggedIn
    ? resolveLicense({
        isTrialActive,
        aiEnabled,
        isLicenseValid,
        t,
      })
    : { label: "", kind: "" as LicenseKind };
  const onlineLabel = loggedIn
    ? isOnline
      ? t("titleBar.online", "Online")
      : t("titleBar.offline", "Offline")
    : "";
  const onlineKind: "online" | "offline" | "" = loggedIn
    ? isOnline
      ? "online"
      : "offline"
    : "";

  useEffect(() => {
    const setContent = window.api?.app?.setTitleBarContent;
    if (!setContent) return;
    void setContent({
      appName,
      dir,
      pageTitle: authPageLabel,
      statusUser: username,
      statusUserRole: userRoleKind,
      statusLicense: license.label,
      statusLicenseKind: license.kind,
      statusOnline: onlineLabel,
      statusOnlineKind: onlineKind,
    });
  }, [
    appName,
    dir,
    authPageLabel,
    username,
    userRoleKind,
    license.label,
    license.kind,
    onlineLabel,
    onlineKind,
  ]);

  return null;
}
