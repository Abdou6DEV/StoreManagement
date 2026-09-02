import React from "react";
import { useTranslation } from "react-i18next";
import { Download, Sparkles, ArrowRight, Clock, Play } from "lucide-react";
import { Modal } from "../../../lib/components/modal";
import { useUpdateContext } from "../../../lib/contexts/updateContext";
import { useToast } from "../../../lib/contexts/toastContext";
import { useAuth } from "../../../lib/contexts/authContext";
import {
  downloadAppUpdate,
  installDownloadedUpdate,
} from "../../../lib/updates/updateActions";
import type { ModalAction } from "../../../types";

interface UpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, download mode hides Update Now and shows the auto-download note. */
  downloadStartedAutomatically?: boolean;
}

export function UpdateModal({
  open,
  onOpenChange,
  downloadStartedAutomatically = false,
}: UpdateModalProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { state: updateState, setDownloadState } = useUpdateContext();
  const updateInfo = updateState.updateInfo;
  const readyToInstall = updateState.isDownloaded === true;
  const username = user?.username ?? "unknown";
  const hideDownloadAction = !readyToInstall && downloadStartedAutomatically;

  if (!updateInfo?.available && !readyToInstall) {
    return null;
  }

  const handleInstall = () => {
    onOpenChange(false);
    const pathToInstall = updateState.downloadPath;
    if (!pathToInstall) {
      showToast(t("updates.installFailed", "Installation failed"), "error");
      return;
    }
    void installDownloadedUpdate({
      pathToInstall,
      username,
      setDownloadState,
      showToast,
      t,
    });
  };

  const handleDownload = () => {
    onOpenChange(false);
    if (!navigator.onLine) {
      showToast(t("updates.noInternet", "No internet connection - updates will be available when you're back online"), "error");
      return;
    }
    if (updateState.isDownloading || updateState.isInstalling) return;
    if (!updateInfo?.downloadUrl) {
      showToast(t("updates.downloadFailed", "Download failed"), "error");
      return;
    }

    showToast(t("updates.downloading", "Downloading update..."), "info");
    void downloadAppUpdate({
      downloadUrl: updateInfo.downloadUrl,
      version: updateInfo.latestVersion ?? "unknown",
      username,
      setDownloadState,
      showToast,
      t,
    });
  };

  const handlePrimary = () => {
    if (readyToInstall) {
      handleInstall();
    } else {
      handleDownload();
    }
  };

  const handleLater = () => {
    onOpenChange(false);
  };

  const actions: ModalAction[] = [
    {
      label: hideDownloadAction
        ? t("mainMenu.updateModal.close", "Close")
        : t("mainMenu.updateModal.later", "Later"),
      variant: "outline",
      onClick: handleLater,
    },
  ];

  if (!hideDownloadAction) {
    actions.push({
      label: readyToInstall
        ? t("mainMenu.updateModal.installNow", "Install")
        : t("mainMenu.updateModal.updateNow", "Update Now"),
      variant: "default",
      onClick: handlePrimary,
      icon: readyToInstall ? (
        <Play className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      ),
      className: readyToInstall
        ? "bg-blue-700 hover:bg-blue-800 text-white"
        : "bg-orange-500 hover:bg-orange-600 text-white",
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      className="max-h-[90vh] min-w-[600px] flex flex-col"
      title={
        readyToInstall
          ? t("mainMenu.updateModal.installTitle", "Update ready to install")
          : t("mainMenu.updateModal.title", "New Update Available!")
      }
      subtitle={
        readyToInstall
          ? t(
              "mainMenu.updateModal.installSubtitle",
              "The update was downloaded earlier and is ready to install",
            )
          : t(
              "mainMenu.updateModal.subtitle",
              "A new version of the application is ready to download",
            )
      }
      icon={
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            readyToInstall ? "bg-blue-700/10" : "bg-orange-500/10"
          }`}
        >
          {readyToInstall ? (
            <Play className="h-5 w-5 text-blue-700" />
          ) : (
            <Sparkles className="h-5 w-5 text-orange-500" />
          )}
        </div>
      }
      showCloseButton={true}
      closeOnOverlayClick={true}
      closeOnEscape={true}
      actions={actions}
    >
      <div className="space-y-6 py-2">
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("mainMenu.updateModal.currentVersion", "Current Version")}
              </span>
            </div>
            <span className="text-sm font-semibold">{updateInfo?.currentVersion || "N/A"}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium text-muted-foreground">
                {t("mainMenu.updateModal.latestVersion", "Latest Version")}
              </span>
            </div>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {updateInfo?.latestVersion}
            </span>
          </div>
        </div>

        {updateInfo?.releaseNotes && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
              {t("mainMenu.updateModal.whatsNew", "What's New")}
            </h4>
            <div
              className="release-notes-scrollable rounded-lg border border-border bg-card p-4 max-h-[30vh] overflow-y-auto"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(156, 163, 175, 0.5) transparent",
              }}
            >
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed pr-2">
                {updateInfo.releaseNotes}
              </div>
            </div>
          </div>
        )}

        <div
          className={`rounded-lg border p-4 ${
            readyToInstall
              ? "bg-gradient-to-br from-blue-700/10 to-blue-800/5 border-blue-700/20"
              : "bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20"
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <Clock className={`h-5 w-5 ${readyToInstall ? "text-blue-700" : "text-orange-500"}`} />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                {readyToInstall
                  ? t("mainMenu.updateModal.installBenefitsTitle", "Ready when you are")
                  : t("mainMenu.updateModal.benefitsTitle", "Why update?")}
              </p>
              {readyToInstall ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "mainMenu.updateModal.installBenefitsBody",
                    "Installing will restart the app. You can also install later from Administrator → Updates.",
                  )}
                </p>
              ) : (
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>{t("mainMenu.updateModal.benefit1", "New features and improvements")}</li>
                  <li>{t("mainMenu.updateModal.benefit2", "Bug fixes and stability enhancements")}</li>
                  <li>{t("mainMenu.updateModal.benefit3", "Security updates and patches")}</li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          <span>
            {readyToInstall
              ? t(
                  "mainMenu.updateModal.installActionNote",
                  "Click Install to launch the installer. The app will restart.",
                )
              : hideDownloadAction
                ? t(
                    "mainMenu.updateModal.autoDownloadActionNote",
                    "The download has started automatically. You can close this and continue working.",
                  )
                : t(
                    "mainMenu.updateModal.actionNote",
                    "Click Update Now to download the update in the background.",
                  )}
          </span>
        </div>
      </div>
    </Modal>
  );
}
