import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  Download, 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  ArrowDown,
  Play,
  Shield,
  Clock,
  Info,
  X
} from "lucide-react";
import { useUpdateChecker } from "../../../lib/hooks/useUpdateChecker";

interface UpdateManagementProps {}

export default function UpdateManagement({}: UpdateManagementProps) {
  const { t } = useTranslation();
  const { 
    isChecking, 
    updateInfo, 
    error, 
    checkForUpdates, 
    clearError 
  } = useUpdateChecker();
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Check for updates on component mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const handleDownloadUpdate = async () => {
    if (!updateInfo?.downloadUrl) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Simulate progress since we can't access ipcRenderer directly
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until download completes
          return prev + Math.random() * 10;
        });
      }, 200);

      const result = await window.api.app.downloadUpdate(updateInfo.downloadUrl);
      
      clearInterval(progressInterval);
      
      if (result.success) {
        setDownloadProgress(100);
        // Start installation
        setIsInstalling(true);
        await window.api.app.installUpdate(result.path);
      } else {
        throw new Error(result.error || "Download failed");
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert(t("updates.downloadFailed", "Download failed. Please try again."));
    } finally {
      setIsDownloading(false);
      setIsInstalling(false);
      setDownloadProgress(0);
    }
  };

  const handleCheckUpdates = () => {
    clearError();
    checkForUpdates();
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
    
    if (updateInfo?.currentVersion === updateInfo?.latestVersion && !updateInfo?.downloadUrl) {
      return <Info className="w-8 h-8 text-blue-500" />;
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
    
    if (updateInfo?.currentVersion === updateInfo?.latestVersion && !updateInfo?.downloadUrl) {
      return t("updates.noReleases");
    }
    
    return t("updates.upToDate");
  };

  const getStatusColor = () => {
    if (isChecking || isDownloading) {
      return "text-primary";
    }
    
    if (error) {
      return "text-red-500";
    }
    
    if (updateInfo?.available) {
      return "text-green-500";
    }
    
    if (updateInfo?.currentVersion === updateInfo?.latestVersion && !updateInfo?.downloadUrl) {
      return "text-blue-500";
    }
    
    return "text-green-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            {t("admin.updatesContent.title", "System Updates")}
          </h2>
          <p className="text-muted-foreground mt-1">
            {t("admin.updatesContent.subtitle", "Keep your application up to date with the latest features and security patches")}
          </p>
        </div>
        <button
          onClick={handleCheckUpdates}
          disabled={isChecking || isDownloading || isInstalling}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          {t("admin.updatesContent.checkNow", "Check Now")}
        </button>
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
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {Math.round(downloadProgress)}% {t("admin.updatesContent.complete", "complete")}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {updateInfo?.available && !isDownloading && !isInstalling && (
              <button
                onClick={handleDownloadUpdate}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                {t("admin.updatesContent.downloadAndInstall", "Download & Install")}
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
    </div>
  );
}
