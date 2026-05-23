import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowDown,
  Play,
  Shield,
  Clock,
  Info,
  X,
  XCircle,
  AlertTriangle
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

export default function UpdateManagement() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { 
    state,
    clearError,
    setDownloadState
  } = useUpdateChecker();
  
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
    downloadPath
  } = state;
  
  const [showDetails, setShowDetails] = useState(false);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  // Updates are checked automatically in preload, no need to check again here

  // Listen for download progress updates
  useEffect(() => {
    const handleDownloadProgress = (data: { progress: number; downloaded: number; total: number; speed: number }) => {
      setDownloadState({
        downloadProgress: data.progress,
        downloadedSize: data.downloaded,
        totalSize: data.total,
        downloadSpeed: data.speed || 0
      });
    };

    // Listen for download progress events using the proper API
    if (window.api?.app?.onDownloadProgress) {
      window.api.app.onDownloadProgress(handleDownloadProgress);
      
      return () => {
        if (window.api?.app?.removeDownloadProgressListener) {
          window.api.app.removeDownloadProgressListener(handleDownloadProgress);
        }
      };
    }
  }, [setDownloadState]);

  // Helper function to format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDownloadClick = () => {
    setShowWarningDialog(true);
  };

  const handleConfirmDownload = async () => {
    setShowWarningDialog(false);
    if (!updateInfo?.downloadUrl) return;

    const version = updateInfo?.latestVersion ?? "unknown";
    setDownloadState({
      isDownloading: true,
      downloadProgress: 0,
      downloadSpeed: 0,
      downloadedSize: 0,
      totalSize: 0,
      isDownloaded: false,
      isPaused: false
    });

    window.api?.activityLog?.log({
      username: user?.username ?? "unknown",
      action: "activityLog.actions.updateDownloadStarted",
      details: `Version: ${version}`,
    }).catch((): undefined => undefined);

    try {
      const result = await window.api.app.downloadUpdate(updateInfo.downloadUrl);

      if (result.success) {
        setDownloadState({
          downloadProgress: 100,
          isDownloaded: true,
          downloadPath: result.path,
          isDownloading: false
        });

        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.updateDownloadCompleted",
          details: `Version: ${version}\nPath: ${result.path ?? ""}`,
        }).catch((): undefined => undefined);

        showToast(t("updates.downloadSuccess", "Download completed successfully!"), "success");
      } else {
        throw new Error(result.error || "Download failed");
      }
    } catch (error) {
      // Don't show error if download was intentionally cancelled or aborted
      const err = error instanceof Error ? error : { message: String(error), type: 'unknown' };
      if (err.message?.includes('aborted') || 
          err.message?.includes('cancelled') || 
          err.message?.includes('interrupted') ||
          (err as { type?: string }).type === 'aborted') {
        // Just reset the state silently
        setDownloadState({ 
          isDownloading: false,
          isPaused: false,
          downloadProgress: 0,
          downloadedSize: 0,
          totalSize: 0,
          downloadSpeed: 0,
          isDownloaded: false,
          downloadPath: ''
        });
        return;
      }
      
      // Show error for actual failures
      showToast(t("updates.downloadFailed", "Download failed"), "error");
      
      // Reset download state
      setDownloadState({ 
        isDownloading: false,
        isPaused: false,
        downloadProgress: 0,
        downloadedSize: 0,
        totalSize: 0,
        downloadSpeed: 0,
        isDownloaded: false,
        downloadPath: ''
      });
    }
  };

  const handleInstallUpdate = async () => {
    if (!downloadPath) return;

    setDownloadState({ isInstalling: true });

    try {
      const result = await window.api.app.installUpdate(downloadPath);

      if (result.success) {
        window.api?.activityLog?.log({
          username: user?.username ?? "unknown",
          action: "activityLog.actions.updateInstallStarted",
          details: `Path: ${downloadPath}`,
        }).catch((): undefined => undefined);

        showToast(t("updates.installSuccess", "Installation started"), "success");
      } else {
        throw new Error(result.error || "Installation failed");
      }
    } catch (error) {
      showToast(t("updates.installFailed", "Installation failed"), "error");
    } finally {
      setDownloadState({ isInstalling: false });
    }
  };

  const handleCancelDownload = async () => {
    try {
      await window.api.app.cancelUpdateDownload();

      const version = updateInfo?.latestVersion ?? "unknown";
      window.api?.activityLog?.log({
        username: user?.username ?? "unknown",
        action: "activityLog.actions.updateDownloadCancelled",
        details: `Version: ${version}`,
      }).catch((): undefined => undefined);

      showToast(t("updates.downloadCancelled", "Download cancelled"), "info");

      setDownloadState({
        isDownloading: false,
        downloadProgress: 0,
        downloadedSize: 0,
        totalSize: 0,
        downloadSpeed: 0,
        isDownloaded: false,
        downloadPath: ''
      });
    } catch (error) {
      showToast(t("updates.downloadCancelled", "Download cancelled"), "info");
      setDownloadState({
        isDownloading: false,
        downloadProgress: 0,
        downloadedSize: 0,
        totalSize: 0,
        downloadSpeed: 0,
        isDownloaded: false,
        downloadPath: ''
      });
    }
  };

  const getStatusIcon = () => {
    if (isChecking || isDownloading) {
      return <Loader2 className="w-8 h-8 text-primary animate-spin" />;
    }
    
    if (error) {
      return <WifiOff className="w-8 h-8 text-red-500" />;
    }
    
    if (updateInfo?.available) {
      return <Download className="w-8 h-8 text-green-500" />;
    }
    
    if (updateInfo?.currentVersion === updateInfo?.latestVersion) {
      return <CheckCircle className="w-8 h-8 text-green-500" />;
    }
    
    return <CheckCircle className="w-8 h-8 text-green-500" />;
  };

  const getStatusMessage = () => {
    if (isChecking) {
      return t("updates.checking");
    }
    
    if (isDownloading) {
      return t("updates.downloading", "Downloading update...");
    }
    
    if (isDownloaded) {
      return t("updates.downloaded", "Download completed! Ready to install.");
    }
    
    if (isInstalling) {
      return t("updates.installing", "Installing update...");
    }
    
    if (error) {
      if (error.includes("fetch") || error.includes("network")) {
        return t("updates.noInternet");
      }
      return t("updates.checkFailed", { error });
    }
    
    if (updateInfo?.available) {
      return t("updates.updateAvailable", { version: updateInfo.latestVersion });
    }
    
    if (updateInfo?.currentVersion === updateInfo?.latestVersion) {
      return t("updates.upToDate");
    }
    
    return t("updates.noReleases");
  };

  const getStatusColor = () => {
    if (isChecking || isDownloading) {
      return "text-primary";
    }
    
    if (isDownloaded) {
      return "text-blue-500";
    }
    
    if (isInstalling) {
      return "text-orange-500";
    }
    
    if (error) {
      return "text-red-500";
    }
    
    if (updateInfo?.available) {
      return "text-green-500";
    }
    
    if (updateInfo?.currentVersion === updateInfo?.latestVersion) {
      return "text-green-500";
    }
    
    return "text-blue-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-6 h-6 text-orange-500" />
            {t("admin.updatesContent.title", "System Updates")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("admin.updatesContent.subtitle", "Keep your application up to date with the latest features and security patches")}
          </p>
        </div>
      </div>

      {/* Main Status Card */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-8">
        <div className="text-center">
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {getStatusIcon()}
          </div>

          {/* Status Message */}
          <h3 className={`text-xl font-semibold mb-4 ${getStatusColor()}`}>
            {getStatusMessage()}
          </h3>

          {/* Current Version Info */}
          {updateInfo && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t("admin.updatesContent.currentVersion", "Current Version")}:</span>
                  <span className="font-medium text-foreground">v{updateInfo.currentVersion}</span>
                </div>
                {updateInfo.latestVersion && updateInfo.latestVersion !== updateInfo.currentVersion && (
                  <div className="flex items-center justify-center gap-2">
                    <ArrowDown className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("admin.updatesContent.latestVersion", "Latest Version")}:</span>
                    <span className="font-medium text-foreground">v{updateInfo.latestVersion}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Download Progress */}
          {isDownloading && (
            <div className="mb-6">
              <div className="w-full bg-muted rounded-full h-3 mb-3">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground mb-2">
                <span>{Math.round(downloadProgress)}% {t("admin.updatesContent.complete", "complete")}</span>
                <span>
                  {downloadSpeed > 0 && `${formatBytes(downloadSpeed)}/s`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>
                  {formatBytes(downloadedSize)} / {formatBytes(totalSize)}
                </span>
                <span>
                  {totalSize > 0 && downloadedSize > 0 && downloadSpeed > 0 && 
                    (() => {
                      const remainingBytes = totalSize - downloadedSize;
                      const remainingSeconds = Math.ceil(remainingBytes / downloadSpeed);
                      
                      if (remainingSeconds < 60) {
                        return `${remainingSeconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
                      } else if (remainingSeconds < 3600) {
                        const minutes = Math.floor(remainingSeconds / 60);
                        const seconds = remainingSeconds % 60;
                        return `${minutes}m ${seconds}s ${t("admin.updatesContent.remaining", "remaining")}`;
                      } else {
                        const hours = Math.floor(remainingSeconds / 3600);
                        const minutes = Math.floor((remainingSeconds % 3600) / 60);
                        return `${hours}h ${minutes}m ${t("admin.updatesContent.remaining", "remaining")}`;
                      }
                    })()
                  }
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {updateInfo?.available && !isDownloading && !isInstalling && !isDownloaded && (
              <button
                onClick={handleDownloadClick}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t("admin.updatesContent.downloadUpdate", "Download Update")}
              </button>
            )}
            
            {isDownloading && (
              <button
                onClick={handleCancelDownload}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                {t("admin.updatesContent.cancelDownload", "Cancel Download")}
              </button>
            )}
            
            {isDownloaded && !isInstalling && (
              <button
                onClick={handleInstallUpdate}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                {t("admin.updatesContent.installUpdate", "Install Update")}
              </button>
            )}
            
            {updateInfo?.available && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Info className="w-4 h-4" />
                {showDetails ? t("admin.updatesContent.hideDetails", "Hide Details") : t("admin.updatesContent.showDetails", "Show Details")}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Update Details */}
      {showDetails && updateInfo?.available && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6">
          <h4 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            {t("admin.updatesContent.updateDetails", "Update Details")}
          </h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("admin.updatesContent.currentVersion", "Current Version")}
                </label>
                <p className="text-foreground font-mono">v{updateInfo.currentVersion}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("admin.updatesContent.latestVersion", "Latest Version")}
                </label>
                <p className="text-foreground font-mono">v{updateInfo.latestVersion}</p>
              </div>
            </div>
            
            {updateInfo.releaseNotes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  {t("admin.updatesContent.releaseNotes", "Release Notes")}
                </label>
                <div className="mt-2 p-4 bg-muted/50 rounded-lg">
                  <pre className="text-sm text-foreground whitespace-pre-wrap">
                    {updateInfo.releaseNotes}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                {t("admin.updatesContent.errorTitle", "Update Check Failed")}
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                {error}
              </p>
              <button
                onClick={clearError}
                className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
                {t("admin.updatesContent.dismissError", "Dismiss")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                {t("admin.updatesContent.infoTitle", "About Updates")}
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• {t("admin.updatesContent.info1", "Updates include new features, bug fixes, and security improvements")}</li>
              <li>• {t("admin.updatesContent.info2", "Your data and settings will be preserved during updates")}</li>
              <li>• {t("admin.updatesContent.info3", "The app will restart automatically after installation")}</li>
              <li>• {t("admin.updatesContent.info4", "Make sure to backup your data before major updates")}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              {t("updates.downloadWarningTitle", "Important: Before Downloading Update")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-2">
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

          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mt-2">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              {t("updates.downloadWarningNote", "Any interruption during the download process may cause the update to fail.")}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowWarningDialog(false)}
              className="flex-1 sm:flex-none"
            >
              {t("updates.downloadWarningCancel", "Cancel")}
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmDownload}
              className="flex-1 sm:flex-none bg-primary hover:bg-primary/90"
            >
              {t("updates.downloadWarningConfirm", "I understand, proceed with download")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
