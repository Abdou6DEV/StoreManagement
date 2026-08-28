import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Download, Wifi, WifiOff, CheckCircle } from "lucide-react";
import { useUpdateChecker } from "../hooks/useUpdateChecker";
import { useTheme } from "../hooks/useTheme";
import { LOGO_ICON, LOGO_ICON_DARK } from "../assets";
import { Typing } from "./ui/typing";

interface PreloadLoadingProps {
  onComplete?: () => void;
  /** When true, do not render the logo (e.g. when parent provides a shared logo after login transition). */
  hideLogo?: boolean;
  /** When provided, progress bar reflects real preload. Completion only after !isPreloading. */
  isPreloading?: boolean;
  preloadProgress?: number;
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

const MIN_PRELOAD_DISPLAY_MS = 1500;
const READY_DELAY_MS = 600;
const SMOOTH_TICK_MS = 60;
/** Minimum time for the bar to visually go 0→100 so 2nd login (cached) doesn't jump to 100% */
const MIN_PROGRESS_ANIMATION_MS = 2200;

export default function PreloadLoading({ onComplete, hideLogo, isPreloading, preloadProgress }: PreloadLoadingProps) {
  const { t } = useTranslation();
  const [timerProgress, setTimerProgress] = useState(0);
  const [smoothedProgress, setSmoothedProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime] = useState(Date.now());
  const [updateStatus, setUpdateStatus] = useState<string>("");
  const [elapsedForMinProgress, setElapsedForMinProgress] = useState(0);
  const completionHandledRef = React.useRef(false);
  const prevPreloadingRef = React.useRef<boolean | undefined>(undefined);
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { checkForUpdates, isChecking, updateInfo, error } = useUpdateChecker();
  const { isDark } = useTheme();

  const useRealProgress = preloadProgress !== undefined && isPreloading !== undefined;
  const realProgress = useRealProgress ? preloadProgress : timerProgress;
  const minProgressFromTime = Math.min(100, (elapsedForMinProgress / MIN_PROGRESS_ANIMATION_MS) * 100);
  const progress = useRealProgress ? Math.min(smoothedProgress, minProgressFromTime) : timerProgress;
  // Only show green/Ready when the bar the user sees has reached 100% (not when realProgress is 100% instantly)
  const displayComplete = useRealProgress ? realProgress >= 100 && !isPreloading && progress >= 100 : isComplete;

  // Reset completion ref and smoothed bar when a new preload starts (e.g. second login)
  useEffect(() => {
    if (isPreloading === true && prevPreloadingRef.current === false) {
      completionHandledRef.current = false;
      setSmoothedProgress(0);
      setElapsedForMinProgress(0);
    }
    prevPreloadingRef.current = isPreloading;
  }, [isPreloading]);

  // Time-based cap: bar never shows more than (elapsed / MIN_PROGRESS_ANIMATION_MS) * 100 so 2nd login animates
  useEffect(() => {
    if (!useRealProgress) return;
    const id = setInterval(() => {
      setElapsedForMinProgress((e) => Math.min(e + SMOOTH_TICK_MS, MIN_PROGRESS_ANIMATION_MS));
    }, SMOOTH_TICK_MS);
    return () => clearInterval(id);
  }, [useRealProgress]);

  // Smooth progress bar toward real value so it doesn't jump in big steps
  useEffect(() => {
    if (!useRealProgress) return;
    if (realProgress <= 0) {
      setSmoothedProgress(0);
      return;
    }
    const id = setInterval(() => {
      setSmoothedProgress((prev) => {
        if (prev >= realProgress) return prev;
        const next = Math.min(prev + (realProgress - prev) * 0.35, realProgress);
        return Math.round(next * 10) / 10;
      });
    }, SMOOTH_TICK_MS);
    return () => clearInterval(id);
  }, [useRealProgress, realProgress]);

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

  // When using real preload: schedule onComplete after min display + Ready. Use ref so callback identity doesn't clear timeout.
  useEffect(() => {
    if (!useRealProgress || completionHandledRef.current) return;
    if (isPreloading || realProgress < 100) return;
    const elapsed = Date.now() - startTime;
    const minWait = Math.max(MIN_PRELOAD_DISPLAY_MS, MIN_PROGRESS_ANIMATION_MS);
    const remaining = minWait - elapsed;
    const delay = (remaining > 0 ? remaining : 0) + READY_DELAY_MS;
    completionHandledRef.current = true;
    const timeoutId = setTimeout(() => {
      onCompleteRef.current?.();
    }, delay);
    return () => clearTimeout(timeoutId);
  }, [useRealProgress, isPreloading, realProgress, startTime]);

  // When not using real preload: original timer-based behavior
  useEffect(() => {
    if (useRealProgress) return;
    const minLoadingTime = 6000;
    const tickMs = 80;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const linear = Math.min(elapsed / minLoadingTime, 1);
      const eased = 1 - Math.pow(1 - linear, 1.15);
      const newProgress = Math.min(100, eased * 100);
      setTimerProgress(newProgress);
      if (newProgress >= 100) {
        clearInterval(interval);
        setIsComplete(true);
        if (onComplete) setTimeout(onComplete, READY_DELAY_MS);
      }
    }, tickMs);
    return () => clearInterval(interval);
  }, [useRealProgress, onComplete, startTime]);

  const content = (
    <div className="flex flex-col items-center w-full max-w-md px-4">
        {/* App logo – theme-based; pulse animation like dashboard loading icon (optional when hideLogo) */}
        {!hideLogo && (
          <div className="mb-4 flex items-center justify-center">
            <img
              src={isDark ? LOGO_ICON : LOGO_ICON_DARK}
              alt=""
              className={`h-50 w-50 object-contain select-none ${!displayComplete ? "animate-pulse" : ""}`}
            />
          </div>
        )}

        {/* Title + description between logo and dots – always visible */}
        <div className="text-center space-y-2 mb-4">
          <h2 className="text-xl font-semibold text-foreground">
            {displayComplete
              ? t("loading.ready", "Ready!")
              : t("loading.preparingSystem", "Preparing system")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {displayComplete
              ? t("loading.readyDesc", "You're all set.")
              : t("loading.preparingSystemDesc", "Please wait...")}
          </p>
        </div>

        {!displayComplete && (
          <Typing
            className="mb-6 h-2 w-8 text-red-500"
            label={t("loading.loadingPrefix", "Loading")}
          />
        )}

        {/* Progress bar + percentage – green when complete */}
        <div className="w-full mb-2">
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${displayComplete ? "bg-green-500" : "bg-primary"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className={`text-sm mt-1.5 text-center ${displayComplete ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
            {Math.round(Math.min(progress, 100))}%
          </div>
        </div>

        {/* Current step label – spinner + "Loading Main Menu...", or verified icon + "Loading complete" at 100% */}
        <div className="w-full flex items-center gap-2 min-h-[1.25rem]">
          {displayComplete ? (
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
