import { ipcRenderer } from "electron";

export const appAPI = {
  getVersion: () => ipcRenderer.invoke("app:getVersion"),
  setTitleBarOverlay: (options: {
    color?: string;
    symbolColor?: string;
    height?: number;
  }) => ipcRenderer.invoke("app:setTitleBarOverlay", options),
  setTitleBarContent: (payload: {
    theme?: "light" | "dark";
    appName?: string;
    pageTitle?: string;
    separator?: string;
    dir?: "ltr" | "rtl";
    visible?: boolean;
    statusUser?: string;
    statusUserRole?: "admin" | "user" | "";
    statusLicense?: string;
    statusLicenseKind?: "trial" | "premium" | "standard" | "";
    statusOnline?: string;
    statusOnlineKind?: "online" | "offline" | "";
  }) => ipcRenderer.invoke("app:setTitleBarContent", payload),
  onTitleBarUpdate: (
    callback: (payload: {
      theme?: "light" | "dark";
      appName?: string;
      pageTitle?: string;
      separator?: string;
      dir?: "ltr" | "rtl";
      visible?: boolean;
      statusUser?: string;
      statusUserRole?: "admin" | "user" | "";
      statusLicense?: string;
      statusLicenseKind?: "trial" | "premium" | "standard" | "";
      statusOnline?: string;
      statusOnlineKind?: "online" | "offline" | "";
    }) => void,
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: {
        theme?: "light" | "dark";
        appName?: string;
        pageTitle?: string;
        separator?: string;
        dir?: "ltr" | "rtl";
        visible?: boolean;
        statusUser?: string;
        statusUserRole?: "admin" | "user" | "";
        statusLicense?: string;
        statusLicenseKind?: "trial" | "premium" | "standard" | "";
        statusOnline?: string;
        statusOnlineKind?: "online" | "offline" | "";
      },
    ) => {
      callback(payload ?? {});
    };
    ipcRenderer.on("titlebar:update", handler);
    return () => {
      ipcRenderer.removeListener("titlebar:update", handler);
    };
  },
  isFullScreen: () =>
    ipcRenderer.invoke("app:isFullScreen") as Promise<boolean>,
  toggleFullScreen: () =>
    ipcRenderer.invoke("app:toggleFullScreen") as Promise<boolean>,
  onFullscreenChanged: (callback: (isFullScreen: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isFullScreen: boolean) => {
      callback(Boolean(isFullScreen));
    };
    ipcRenderer.on("app:fullscreen-changed", handler);
    return () => {
      ipcRenderer.removeListener("app:fullscreen-changed", handler);
    };
  },
  openExternal: (url: string) => ipcRenderer.invoke("app:openExternal", url),
  checkForUpdates: () => ipcRenderer.invoke("app:checkForUpdates"),
  downloadUpdate: (url: string) => ipcRenderer.invoke("app:downloadUpdate", url),
  cancelUpdateDownload: () => ipcRenderer.invoke("app:cancelUpdateDownload"),
  installUpdate: (path: string) => ipcRenderer.invoke("app:installUpdate", path),
  readPendingUpdate: () =>
    ipcRenderer.invoke("app:pendingUpdate:read") as Promise<{
      version: string;
      path: string;
      downloadedAtMs: number;
    } | null>,
  persistPendingUpdate: (payload: { version: string; path: string }) =>
    ipcRenderer.invoke("app:pendingUpdate:persist", payload) as Promise<
      { success: true } | { success: false; error: string }
    >,
  clearPendingUpdate: () =>
    ipcRenderer.invoke("app:pendingUpdate:clear") as Promise<{ success: true }>,
  getPrinters: () => ipcRenderer.invoke("app:getPrinters") as Promise<{ name: string; displayName: string; status: number }[]>,
  printSilently: (html: string, deviceName?: string, options?: { pageWidthMm?: number; pageHeightMm?: number }) =>
    ipcRenderer.invoke("app:printSilently", html, deviceName, options),
  
  // Event listeners for download progress
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  
  removeDownloadProgressListener: (callback: (data: any) => void) => {
    ipcRenderer.removeListener('download-progress', callback);
  }
};
