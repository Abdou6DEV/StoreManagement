import type { TFunction } from "i18next";
import type { ShowToastOptions } from "../contexts/toastContext";
import type { ToastType } from "../../types";

type SetDownloadState = (state: {
  isDownloading?: boolean;
  isPaused?: boolean;
  downloadProgress?: number;
  downloadSpeed?: number;
  downloadedSize?: number;
  totalSize?: number;
  isInstalling?: boolean;
  isDownloaded?: boolean;
  downloadPath?: string;
}) => void;

type ShowToast = (message: string, type?: ToastType, options?: ShowToastOptions) => void;

/** Same install path as Updates page / toast — integrity checks run in main via installUpdate. */
export async function installDownloadedUpdate(params: {
  pathToInstall: string;
  username: string;
  setDownloadState: SetDownloadState;
  showToast: ShowToast;
  t: TFunction;
}): Promise<void> {
  const { pathToInstall, username, setDownloadState, showToast, t } = params;
  if (!pathToInstall) return;

  setDownloadState({ isInstalling: true, downloadPath: pathToInstall, isDownloaded: true });

  try {
    const result = await window.api.app.installUpdate(pathToInstall);

    if (result.success) {
      window.api?.activityLog
        ?.log({
          username,
          action: "activityLog.actions.updateInstallStarted",
          details: `Path: ${pathToInstall}`,
        })
        .catch((): undefined => undefined);

      showToast(t("updates.installSuccess", "Installation started"), "success");
    } else {
      throw new Error(result.error || "Installation failed");
    }
  } catch {
    showToast(t("updates.installFailed", "Installation failed"), "error");
  } finally {
    setDownloadState({ isInstalling: false });
  }
}

/** Download update and show sticky Install toast (same behavior as Updates page). */
export async function downloadAppUpdate(params: {
  downloadUrl: string;
  version: string;
  username: string;
  setDownloadState: SetDownloadState;
  showToast: ShowToast;
  t: TFunction;
}): Promise<void> {
  const { downloadUrl, version, username, setDownloadState, showToast, t } = params;
  if (!downloadUrl) return;

  setDownloadState({
    isDownloading: true,
    downloadProgress: 0,
    downloadSpeed: 0,
    downloadedSize: 0,
    totalSize: 0,
    isDownloaded: false,
    isPaused: false,
  });

  window.api?.activityLog
    ?.log({
      username,
      action: "activityLog.actions.updateDownloadStarted",
      details: `Version: ${version}`,
    })
    .catch((): undefined => undefined);

  try {
    const result = await window.api.app.downloadUpdate(downloadUrl);

    if (result.success) {
      if (result.path && version !== "unknown") {
        await window.api.app.persistPendingUpdate({ version, path: result.path });
      }

      setDownloadState({
        downloadProgress: 100,
        isDownloaded: true,
        downloadPath: result.path,
        isDownloading: false,
      });

      window.api?.activityLog
        ?.log({
          username,
          action: "activityLog.actions.updateDownloadCompleted",
          details: `Version: ${version}\nPath: ${result.path ?? ""}`,
        })
        .catch((): undefined => undefined);

      const installedPath = result.path ?? "";
      showToast(t("updates.downloadSuccess", "Download completed successfully!"), "success", {
        sticky: true,
        icon: "install",
        actions: [
          {
            label: t("updates.downloadToastLater", "Later"),
            variant: "outline",
            onClick: () => undefined,
          },
          {
            label: t("updates.downloadToastInstall", "Install"),
            variant: "primary",
            onClick: () => {
              void installDownloadedUpdate({
                pathToInstall: installedPath,
                username,
                setDownloadState,
                showToast,
                t,
              });
            },
          },
        ],
      });
    } else {
      throw new Error(result.error || "Download failed");
    }
  } catch (error) {
    const err = error instanceof Error ? error : { message: String(error), type: "unknown" };
    if (
      err.message?.includes("aborted") ||
      err.message?.includes("cancelled") ||
      err.message?.includes("interrupted") ||
      (err as { type?: string }).type === "aborted"
    ) {
      setDownloadState({
        isDownloading: false,
        isPaused: false,
        downloadProgress: 0,
        downloadedSize: 0,
        totalSize: 0,
        downloadSpeed: 0,
        isDownloaded: false,
        downloadPath: "",
      });
      return;
    }

    showToast(t("updates.downloadFailed", "Download failed"), "error");
    setDownloadState({
      isDownloading: false,
      isPaused: false,
      downloadProgress: 0,
      downloadedSize: 0,
      totalSize: 0,
      downloadSpeed: 0,
      isDownloaded: false,
      downloadPath: "",
    });
  }
}
