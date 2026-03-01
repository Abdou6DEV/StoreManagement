import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Download, Wifi, WifiOff, CheckCircle } from "lucide-react";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import { useTheme } from "../hooks/useTheme";
import { LOGO_ICON, LOGO_ICON_DARK } from "../assets";

interface PreloadLoadingProps {
  onComplete?: () => void;
  /** When true, do not render the logo (e.g. when parent provides a shared logo after login transition). */
  hideLogo?: boolean;
}

interface LoadingStep {
  id: string;
  nameKey: string;
  threshold: number;
}

const LOADING_STEPS: LoadingStep[] = [
  { id: "main-menu", nameKey: "loading.mainMenu", threshold: 10 },
  { id: "dashboard", nameKey: "loading.dashboard", threshold: 25 },
  { id: "clients", nameKey: "loading.clients", threshold: 40 },
  { id: "cashier", nameKey: "loading.cashier", threshold: 55 },
  { id: "stock", nameKey: "loading.stock", threshold: 70 },
  { id: "history", nameKey: "loading.history", threshold: 80 },
  { id: "bills", nameKey: "loading.bills", threshold: 90 },
  { id: "services", nameKey: "loading.services", threshold: 95 },
  { id: "administrator", nameKey: "loading.administrator", threshold: 100 },
];

export default function PreloadLoading({ onComplete, hideLogo }: PreloadLoadingProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [updateStatus, setUpdateStatus] = useState<string>("");

  const { checkForUpdates, isChecking, updateInfo, error } = useUpdateChecker();
  const { isDark } = useTheme();

  // Use the *last* step whose threshold we've reached (so label advances: Main Menu → Dashboard → … → Administrator)
  const currentStepIndex = useMemo(() => {
    let idx = -1;
    for (let i = 0; i < LOADING_STEPS.length; i++) {
      if (progress >= LOADING_STEPS[i].threshold) idx = i;
    }
    return idx >= 0 ? idx : 0;
  }, [progress]);
  const currentStepLabel = LOADING_STEPS[currentStepIndex]
    ? t(LOADING_STEPS[currentStepIndex].nameKey, LOADING_STEPS[currentStepIndex].nameKey)
    : "";

  // Check for updates on component mount
  useEffect(() => {
    const checkUpdates = async () => {
      setUpdateStatus(t("updates.checking"));
      const result = await checkForUpdates();
      
      if (result.error) {
        if (result.error.includes("fetch") || result.error.includes("network")) {
          setUpdateStatus(t("updates.noInternet"));
        } else {
          setUpdateStatus(t("updates.checkFailed", { error: result.error }));
        }
      } else if (result.available) {
        setUpdateStatus(t("updates.updateAvailable", { version: result.latestVersion }));
      } else if (result.currentVersion === result.latestVersion) {
        setUpdateStatus(t("updates.upToDate"));
      } else {
        setUpdateStatus(t("updates.noReleases"));
      }
    };
    
    checkUpdates();
  }, [checkForUpdates, t]);

  useEffect(() => {
    const minLoadingTime = 6000; // 4s – bar and steps stay in sync
    const tickMs = 80; // smooth bar, in sync with step changes

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const linear = Math.min(elapsed / minLoadingTime, 1);
      const eased = 1 - Math.pow(1 - linear, 1.15); // smooth ease-out
      const newProgress = Math.min(100, eased * 100);

      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) {
          setTimeout(onComplete, 600);
        }
      }
    }, tickMs);

    return () => clearInterval(interval);
  }, [onComplete, startTime]);

  const content = (
    <div className="flex flex-col items-center w-full max-w-md px-4">
        {/* App logo – theme-based; pulse animation like dashboard loading icon (optional when hideLogo) */}
        {!hideLogo && (
          <div className="mb-4 flex items-center justify-center">
            <img
              src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
              alt=""
              className={`w-50 h-50 object-contain select-none ${!isComplete ? "animate-pulse" : ""}`}
            />
          </div>
        )}

        {/* Title + description between logo and dots – always visible */}
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            {isComplete
              ? t("loading.ready", "Ready!")
              : t("loading.preparingSystem", "Preparing system")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isComplete
              ? t("loading.readyDesc", "You're all set.")
              : t("loading.preparingSystemDesc", "Please wait...")}
          </p>
        </div>

        {/* Red jumping dots */}
        {!isComplete && (
          <>
            <div className="flex gap-2 mb-6">
              <div
                className="w-2 h-2 rounded-full bg-red-500"
                style={{
                  animation: "preloadBounce 0.9s infinite",
                  animationDelay: "0ms",
                }}
              />
              <div
                className="w-2 h-2 rounded-full bg-red-500"
                style={{
                  animation: "preloadBounce 0.9s infinite",
                  animationDelay: "150ms",
                }}
              />
              <div
                className="w-2 h-2 rounded-full bg-red-500"
                style={{
                  animation: "preloadBounce 0.9s infinite",
                  animationDelay: "300ms",
                }}
              />
            </div>
            <style>{`
              @keyframes preloadBounce {
                0%, 100% {
                  transform: translateY(0);
                  animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
                }
                50% {
                  transform: translateY(-100%);
                  animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
                }
              }
            `}</style>
          </>
        )}

        {/* Progress bar + percentage – green when complete */}
        <div className="w-full mb-2">
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${isComplete ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className={`text-sm mt-1.5 text-center ${isComplete ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
            {Math.round(Math.min(progress, 100))}%
          </div>
        </div>

        {/* Current step label – spinner + "Loading Main Menu...", or verified icon + "Loading complete" at 100% */}
        <div className="w-full flex items-center gap-2 min-h-[1.25rem]">
          {isComplete ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" aria-hidden />
              <p className="text-sm text-green-600 font-medium">
                {t("loading.loadingComplete", "Loading complete")}
              </p>
            </>
          ) : currentStepLabel ? (
            <>
              <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {t("loading.loadingPrefix", "Loading")} {currentStepLabel}...
              </p>
            </>
          ) : null}
        </div>

        {/* Update status */}
        {updateStatus && (
          <div className="mt-6 w-full p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-center gap-2">
              {isChecking ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              ) : updateInfo?.available ? (
                <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : error ? (
                <WifiOff className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : (
                <Wifi className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
              <span
                className={`text-sm font-medium ${
                  updateInfo?.available
                    ? "text-green-600"
                    : error
                      ? "text-red-500"
                      : "text-muted-foreground"
                }`}
              >
                {updateStatus}
              </span>
            </div>
          </div>
        )}
    </div>
  );

  if (hideLogo) {
    return content;
  }
  return (
    <div className="h-screen bg-background flex flex-col items-center justify-center">
      {content}
    </div>
  );
}
