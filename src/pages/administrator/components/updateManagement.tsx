import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowDown,
  Play,
  RefreshCw,
  Info,
  XCircle,
  AlertTriangle,
  Wifi,
} from "lucide-react";
import { useUpdateChecker } from "../../../lib/hooks/useUpdateChecker";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../lib/components/dialog";
import { Button } from "../../../lib/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../lib/components/card";
import { Badge } from "../../../lib/components/badge";
import { Alert, AlertDescription } from "../../../lib/components/alert";
import { Switch } from "../../../lib/components/switch";
import { cn } from "../../../lib/utils";
import {
  downloadAppUpdate,
  installDownloadedUpdate,
} from "../../../lib/updates/updateActions";
import {
  AUTO_DOWNLOAD_UPDATES_OPTION_KEY,
  isAutoDownloadUpdatesEnabledOptionValue,
} from "../../../lib/updates/constants";

const UPDATE_CHECK_COOLDOWN_MS = 5 * 60 * 1000;

function InfoRow({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="break-all text-sm font-semibold text-foreground">{value}</div>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export default function UpdateManagement() {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { state, clearError, setDownloadState, checkForUpdates } = useUpdateChecker();

  const {
    isChecking,
    updateInfo,
    error,
    isDownloading,
    downloadProgress,
    downloadSpeed,
    downloadedSize,
    totalSize,
    isInstalling,
    isDownloaded,
    downloadPath,
    lastChecked,
  } = state;

  const [showReleaseNotes, setShowReleaseNotes] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [autoDownloadEnabled, setAutoDownloadEnabled] = useState(true);
  const [savingAutoDownload, setSavingAutoDownload] = useState(false);

  useEffect(() => {
    const syncOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", syncOnline);
    window.addEventListener("offline", syncOnline);
    return () => {
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("offline", syncOnline);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await window.api.database.options.get(AUTO_DOWNLOAD_UPDATES_OPTION_KEY);
        setAutoDownloadEnabled(isAutoDownloadUpdatesEnabledOptionValue(raw));
      } catch {
        setAutoDownloadEnabled(true);
      }
    })();
  }, []);

  const handleAutoDownloadChange = async (checked: boolean) => {
    setSavingAutoDownload(true);
    try {
      await window.api.database.options.set(AUTO_DOWNLOAD_UPDATES_OPTION_KEY, checked ? "1" : "0");
      setAutoDownloadEnabled(checked);
    } catch {
      showToast(
        t("admin.updates.autoDownloadSaveFailed", "Could not save automatic download setting."),
        "error",
      );
    } finally {
      setSavingAutoDownload(false);
    }
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const checkCooldownRemainingMs = useMemo(() => {
    if (lastChecked == null) return 0;
    return Math.max(0, lastChecked + UPDATE_CHECK_COOLDOWN_MS - nowMs);
  }, [lastChecked, nowMs]);

  const locale = i18n.language === "ar" ? "ar" : i18n.language === "fr" ? "fr" : "en";

  const lastCheckLabel = useMemo(() => {
    if (lastChecked == null) {
      return t("admin.updates.hubNotCheckedYet", "Not checked yet");
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(lastChecked),
    );
  }, [lastChecked, locale, t]);

  const isUpToDate =
    updateInfo != null &&
    !updateInfo.available &&
    updateInfo.latestVersion !== "" &&
    updateInfo.currentVersion === updateInfo.latestVersion;

  const hasUpdateAvailable = updateInfo?.available === true;

  const isNetworkError =
    error != null &&
    (error.includes("fetch") ||
      error.includes("network") ||
      error.includes("Failed to fetch") ||
      error.toLowerCase().includes("internet"));

  const statusBadge = useMemo(() => {
    if (!isOnline) {
      return {
        className: "border-border text-muted-foreground",
        label: t("admin.updates.hubOffline", "Offline — connect to check for updates"),
      };
    }
    if (isChecking) {
      return {
        className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        label: t("admin.updates.hubChecking", "Checking for updates…"),
      };
    }
    if (isDownloading) {
      return {
        className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        label: t("admin.updates.hubDownloading", "Downloading update…"),
      };
    }
    if (isInstalling) {
      return {
        className: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        label: t("admin.updates.hubInstalling", "Installing update…"),
      };
    }
    if (isDownloaded) {
      return {
        className: "border-blue-700/40 bg-blue-700/10 text-blue-800 dark:text-blue-200",
        label: t("admin.updates.hubReadyToInstall", "Download complete — ready to install"),
      };
    }
    if (error && isNetworkError) {
      return {
        className: "border-border text-muted-foreground",
        label: t("admin.updates.hubCheckFailedOffline", "Could not reach update server"),
      };
    }
    if (error) {
      return {
        className: "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-200",
        label: t("admin.updates.hubCheckFailed", "Update check failed"),
      };
    }
    if (hasUpdateAvailable) {
      return {
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        label: t("admin.updates.hubUpdateAvailable", "New update available"),
      };
    }
    if (isUpToDate) {
      return {
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
        label: t("admin.updates.hubUpToDate", "Up to date"),
      };
    }
    return {
      className: "border-border text-muted-foreground",
      label: t("admin.updates.hubUnknown", "Not checked against server"),
    };
  }, [
    error,
    hasUpdateAvailable,
    isChecking,
    isDownloaded,
    isDownloading,
    isInstalling,
    isNetworkError,
    isOnline,
    isUpToDate,
    t,
  ]);

  const statusDescription = useMemo(() => {
    if (!isOnline && !isDownloaded) {
      return t(
        "admin.updates.hubOfflineDescription",
        "Connect to the internet to check for updates or download a new version. If you already downloaded an update, you can still install it offline.",
      );
    }
    if (isChecking) {
      return t("admin.updates.hubCheckingDescription", "Looking for the latest release on the update server.");
    }
    if (isDownloading) {
      return t(
        "admin.updates.hubDownloadingDescription",
        "Keep the app open and stay connected until the download finishes.",
      );
    }
    if (isDownloaded) {
      return t(
        "admin.updates.hubReadyDescription",
        "The installer is on this computer. Install when you are ready — the app will restart afterward.",
      );
    }
    if (hasUpdateAvailable) {
      return t(
        "admin.updates.hubUpdateAvailableDescription",
        "A newer version is available. Download it when you are ready, then install from this page.",
      );
    }
    if (isUpToDate) {
      return t(
        "admin.updates.hubUpToDateDescription",
        "You are running the latest version. Check again later for new releases.",
      );
    }
    if (error && isNetworkError) {
      return t(
        "admin.updates.hubNetworkErrorDescription",
        "The update server could not be reached. Check your connection and try again.",
      );
    }
    if (error) {
      return error;
    }
    return t(
      "admin.updates.hubDefaultDescription",
      "Use Check for updates to compare this app with the latest release.",
    );
  }, [
    error,
    hasUpdateAvailable,
    isChecking,
    isDownloaded,
    isDownloading,
    isNetworkError,
    isOnline,
    isUpToDate,
    t,
  ]);

  const handleManualCheck = useCallback(async () => {
    if (!isOnline || isChecking || checkCooldownRemainingMs > 0) return;
    try {
      await checkForUpdates();
    } catch {
      showToast(t("admin.updates.checkFailedToast", "Could not check for updates"), "error");
    }
  }, [checkCooldownRemainingMs, checkForUpdates, isChecking, isOnline, showToast, t]);

  const handleDownloadClick = () => {
    setShowWarningDialog(true);
  };

  const handleInstallUpdate = async (pathOverride?: string) => {
    const pathToInstall = pathOverride || downloadPath;
    if (!pathToInstall) return;
    await installDownloadedUpdate({
      pathToInstall,
      username: user?.username ?? "unknown",
      setDownloadState,
      showToast,
      t,
    });
  };

  const handleConfirmDownload = async () => {
    setShowWarningDialog(false);
    if (!updateInfo?.downloadUrl) return;

    await downloadAppUpdate({
      downloadUrl: updateInfo.downloadUrl,
      version: updateInfo?.latestVersion ?? "unknown",
      username: user?.username ?? "unknown",
      setDownloadState,
      showToast,
      t,
    });
  };

  const handleCancelDownload = async () => {
    try {
      await window.api.app.cancelUpdateDownload();

      const version = updateInfo?.latestVersion ?? "unknown";
      window.api?.activityLog
        ?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.updateDownloadCancelled",
          details: `Version: ${version}`,
        })
        .catch((): undefined => undefined);

      showToast(t("updates.downloadCancelled", "Download cancelled"), "info");
    } catch {
      showToast(t("updates.downloadCancelled", "Download cancelled"), "info");
    } finally {
      setDownloadState({
        isDownloading: false,
        downloadProgress: 0,
        downloadedSize: 0,
        totalSize: 0,
        downloadSpeed: 0,
        isDownloaded: false,
        downloadPath: "",
      });
      // Re-apply any previously persisted pending install (this download was never saved).
      if (window.api?.app?.readPendingUpdate) {
        void window.api.app.readPendingUpdate().then((pending) => {
          if (pending) {
            setDownloadState({
              isDownloaded: true,
              downloadPath: pending.path,
            });
          }
        });
      }
    }
  };

  const currentVersionLabel =
    updateInfo?.currentVersion != null && updateInfo.currentVersion !== ""
      ? `v${updateInfo.currentVersion}`
      : "—";

  const latestVersionLabel =
    updateInfo?.latestVersion != null && updateInfo.latestVersion !== ""
      ? `v${updateInfo.latestVersion}`
      : t("admin.updates.hubLatestUnknown", "Unknown until checked online");

  const remainingLabel =
    totalSize > 0 && downloadedSize > 0 && downloadSpeed > 0
      ? (() => {
          const remainingSeconds = Math.ceil((totalSize - downloadedSize) / downloadSpeed);
          if (remainingSeconds < 60) {
            return `${remainingSeconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
          }
          if (remainingSeconds < 3600) {
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            return `${minutes}m ${seconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
          }
          const hours = Math.floor(remainingSeconds / 3600);
          const minutes = Math.floor((remainingSeconds % 3600) / 60);
          return `${hours}h ${minutes}m ${t("admin.updatesContent.remaining", "remaining")}`;
        })()
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground">
            <Download className="h-7 w-7 text-orange-600" aria-hidden />
            {t("admin.updatesContent.title", "System Updates")}
          </h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {t(
              "admin.updatesContent.subtitle",
              "Keep your application up to date with the latest features and security patches",
            )}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void handleManualCheck()}
          disabled={!isOnline || isChecking || checkCooldownRemainingMs > 0 || isDownloading}
          className="shrink-0"
        >
          {isChecking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          )}
          {checkCooldownRemainingMs > 0
            ? t("admin.updates.checkCooldown", "Check for updates ({{seconds}}s)", {
                seconds: Math.ceil(checkCooldownRemainingMs / 1000),
              })
            : t("admin.updates.checkForUpdates", "Check for updates")}
        </Button>
      </div>

      <Card className="overflow-hidden border-border shadow-sm">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-orange-500/10 via-background to-background p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-card p-3 shadow-sm ring-1 ring-border">
                <Download className="h-7 w-7 text-orange-600" aria-hidden />
              </div>
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("font-normal", statusBadge.className)}>
                    {statusBadge.label}
                  </Badge>
                  <Badge variant="outline" className="border-border">
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1">
                        <Wifi className="h-3.5 w-3.5" aria-hidden />
                        {t("admin.updates.hubOnline", "Online")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <WifiOff className="h-3.5 w-3.5" aria-hidden />
                        {t("admin.updates.hubOfflineBadge", "Offline")}
                      </span>
                    )}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {t("admin.updates.hubTitle", "App updates")}
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{statusDescription}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow
                    label={t("admin.updatesContent.currentVersion", "Current version")}
                    value={currentVersionLabel}
                  />
                  <InfoRow
                    label={t("admin.updatesContent.latestVersion", "Latest version")}
                    value={
                      hasUpdateAvailable ? (
                        <span className="inline-flex items-center gap-1.5">
                          <ArrowDown className="h-4 w-4 text-emerald-600" aria-hidden />
                          {latestVersionLabel}
                        </span>
                      ) : (
                        latestVersionLabel
                      )
                    }
                    hint={
                      hasUpdateAvailable
                        ? t("admin.updates.hubNewerAvailable", "A newer release is ready to download.")
                        : undefined
                    }
                  />
                  <InfoRow
                    label={t("admin.updates.hubLastCheck", "Last update check")}
                    value={lastCheckLabel}
                    hint={t(
                      "admin.updates.hubLastCheckHint",
                      "Updated when the app starts or when you check for updates.",
                    )}
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <label
                      htmlFor="auto-download-updates"
                      className="text-sm font-medium text-foreground"
                    >
                      {t("admin.updates.autoDownloadLabel", "Automatic download")}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        "admin.updates.autoDownloadDesc",
                        "When enabled, available updates start downloading automatically after you log in.",
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Switch
                      id="auto-download-updates"
                      checked={autoDownloadEnabled}
                      onCheckedChange={(checked) => void handleAutoDownloadChange(checked)}
                      disabled={savingAutoDownload}
                      aria-label={t("admin.updates.autoDownloadLabel", "Automatic download")}
                    />
                    <span className="text-sm font-medium text-muted-foreground">
                      {autoDownloadEnabled
                        ? t("admin.updates.autoDownloadOn", "Enabled")
                        : t("admin.updates.autoDownloadOff", "Disabled")}
                    </span>
                  </div>
                </div>

                {isDownloading ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 px-4 py-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {Math.round(downloadProgress)}% {t("admin.updatesContent.complete", "complete")}
                      </span>
                      {downloadSpeed > 0 ? (
                        <span className="text-muted-foreground">{formatBytes(downloadSpeed)}/s</span>
                      ) : null}
                    </div>
                    <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {formatBytes(downloadedSize)} / {formatBytes(totalSize)}
                      </span>
                      {remainingLabel}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2 pt-1">
                  {hasUpdateAvailable && !isDownloading && !isInstalling && !isDownloaded ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDownloadClick}
                      disabled={!isOnline}
                      className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <Download className="h-4 w-4" aria-hidden />
                      {t("admin.updatesContent.downloadUpdate", "Download update")}
                    </Button>
                  ) : null}

                  {isDownloading ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCancelDownload()}
                      className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      {t("admin.updatesContent.cancelDownload", "Cancel download")}
                    </Button>
                  ) : null}

                  {isDownloaded && !isInstalling ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void handleInstallUpdate()}
                      className="gap-1.5 bg-blue-700 text-white hover:bg-blue-800"
                    >
                      <Play className="h-4 w-4" aria-hidden />
                      {t("admin.updatesContent.installUpdate", "Install update")}
                    </Button>
                  ) : null}

                  {hasUpdateAvailable && updateInfo?.releaseNotes ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowReleaseNotes((v) => !v)}
                      className="gap-1.5"
                    >
                      <Info className="h-4 w-4" aria-hidden />
                      {showReleaseNotes
                        ? t("admin.updatesContent.hideDetails", "Hide release notes")
                        : t("admin.updatesContent.showDetails", "Show release notes")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {!isOnline && hasUpdateAvailable && !isDownloaded ? (
            <div className="border-t border-border/60 bg-muted/15 px-6 py-3">
              <p className="text-xs text-muted-foreground">
                {t(
                  "admin.updates.hubOfflineDownloadHint",
                  "Connect to the internet to download the available update.",
                )}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showReleaseNotes && updateInfo?.releaseNotes ? (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4 text-orange-600" aria-hidden />
              {t("admin.updatesContent.releaseNotes", "Release notes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap rounded-lg border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
              {updateInfo.releaseNotes}
            </pre>
          </CardContent>
        </Card>
      ) : null}

      {error && !isNetworkError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden />
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={clearError} className="shrink-0">
              {t("admin.updatesContent.dismissError", "Dismiss")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>
                {t(
                  "admin.updatesContent.info1",
                  "Updates include new features, bug fixes, and security improvements",
                )}
              </li>
              <li>
                {t(
                  "admin.updatesContent.info2",
                  "Your data and settings will be preserved during updates",
                )}
              </li>
              <li>
                {t("admin.updatesContent.info3", "The app will restart automatically after installation")}
              </li>
              <li>
                {t("admin.updatesContent.info4", "Make sure to backup your data before major updates")}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              {t("updates.downloadWarningTitle", "Important: Before Downloading Update")}
            </DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground">
              {t("updates.downloadWarningDesc", "Please ensure the following before starting the update:")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <p className="text-sm font-medium text-foreground">
              {t("updates.downloadWarning1", "• Do NOT close the application during download")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t("updates.downloadWarning2", "• Do NOT turn off or restart your computer")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t("updates.downloadWarning3", "• Ensure a stable internet connection")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t("updates.downloadWarning4", "• Make sure you have at least 500MB free disk space")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t("updates.downloadWarning5", "• Close any other applications that might interfere")}
            </p>
            <p className="text-sm font-medium text-foreground">
              {t("updates.downloadWarning6", "• Ensure the power cable is connected (if laptop)")}
            </p>
          </div>

          <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <AlertTriangle className="mr-1 inline h-4 w-4" aria-hidden />
              {t(
                "updates.downloadWarningNote",
                "Any interruption during the download process may cause the update to fail.",
              )}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowWarningDialog(false)} className="flex-1 sm:flex-none">
              {t("updates.downloadWarningCancel", "Cancel")}
            </Button>
            <Button onClick={() => void handleConfirmDownload()} className="flex-1 sm:flex-none">
              {t("updates.downloadWarningConfirm", "I understand, proceed with download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
