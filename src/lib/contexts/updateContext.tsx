import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  error?: string;
}

interface UpdateState {
  isChecking: boolean;
  updateInfo: UpdateInfo | null;
  error: string | null;
  lastChecked: number | null;
  isDownloading: boolean;
  isPaused: boolean;
  downloadProgress: number;
  downloadSpeed: number;
  downloadedSize: number;
  totalSize: number;
  isInstalling: boolean;
  isDownloaded: boolean;
  downloadPath: string;
}

interface UpdateContextType {
  state: UpdateState;
  checkForUpdates: () => Promise<UpdateInfo>;
  clearError: () => void;
  reset: () => void;
  setDownloadState: (state: Partial<UpdateState>) => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const useUpdateContext = () => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdateContext must be used within an UpdateProvider');
  }
  return context;
};

interface UpdateProviderProps {
  children: ReactNode;
}

function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }
  return 0;
}

// Global state that persists across provider instances
let globalUpdateState: UpdateState = {
  isChecking: false,
  updateInfo: null,
  error: null,
  lastChecked: null,
  isDownloading: false,
  isPaused: false,
  downloadProgress: 0,
  downloadSpeed: 0,
  downloadedSize: 0,
  totalSize: 0,
  isInstalling: false,
  isDownloaded: false,
  downloadPath: '',
};

let globalStateListeners: Array<(state: UpdateState) => void> = [];
let pendingRestoreStarted = false;

const notifyListeners = (newState: UpdateState) => {
  globalUpdateState = newState;
  globalStateListeners.forEach(listener => listener(newState));
};

/** Live update state (survives provider remounts) — for timers outside React render. */
export function getGlobalUpdateState(): UpdateState {
  return globalUpdateState;
}

async function applyPendingUpdateState(updateInfo: UpdateInfo | null): Promise<void> {
  if (typeof window === 'undefined' || !window.api?.app?.readPendingUpdate) return;

  try {
    const pending = await window.api.app.readPendingUpdate();
    if (!pending) {
      if (globalUpdateState.isDownloaded && !globalUpdateState.isDownloading) {
        notifyListeners({
          ...globalUpdateState,
          isDownloaded: false,
          downloadPath: '',
        });
      }
      return;
    }

    const latest = updateInfo?.latestVersion?.trim() || '';
    if (latest && compareVersions(pending.version, latest) < 0) {
      await window.api.app.clearPendingUpdate();
      notifyListeners({
        ...globalUpdateState,
        isDownloaded: false,
        downloadPath: '',
      });
      return;
    }

    let currentVersion =
      updateInfo?.currentVersion?.trim() ||
      globalUpdateState.updateInfo?.currentVersion?.trim() ||
      '';
    if (!currentVersion && window.api.app.getVersion) {
      try {
        currentVersion = await window.api.app.getVersion();
      } catch {
        currentVersion = '';
      }
    }
    if (currentVersion && compareVersions(pending.version, currentVersion) <= 0) {
      await window.api.app.clearPendingUpdate();
      notifyListeners({
        ...globalUpdateState,
        isDownloaded: false,
        downloadPath: '',
      });
      return;
    }

    const nextInfo: UpdateInfo =
      updateInfo ??
      {
        available: true,
        currentVersion,
        latestVersion: pending.version,
        downloadUrl: '',
        releaseNotes: globalUpdateState.updateInfo?.releaseNotes,
      };

    notifyListeners({
      ...globalUpdateState,
      updateInfo: {
        ...nextInfo,
        available: true,
        currentVersion: nextInfo.currentVersion || currentVersion,
        latestVersion: nextInfo.latestVersion || pending.version,
      },
      isDownloaded: true,
      downloadPath: pending.path,
    });
  } catch {
    /* ignore restore errors */
  }
}

export const UpdateProvider: React.FC<UpdateProviderProps> = ({ children }) => {
  const [state, setState] = useState<UpdateState>(globalUpdateState);

  // Subscribe to global state changes
  React.useEffect(() => {
    const listener = (newState: UpdateState) => setState(newState);
    globalStateListeners.push(listener);

    return () => {
      globalStateListeners = globalStateListeners.filter(l => l !== listener);
    };
  }, []);

  // Restore pending downloaded installer once on mount
  React.useEffect(() => {
    if (pendingRestoreStarted) return;
    pendingRestoreStarted = true;
    void applyPendingUpdateState(globalUpdateState.updateInfo);
  }, []);

  // Global download progress (Updates page + login modal)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.api?.app?.onDownloadProgress) return;

    const handleDownloadProgress = (data: {
      progress: number;
      downloaded: number;
      total: number;
      speed: number;
    }) => {
      notifyListeners({
        ...globalUpdateState,
        downloadProgress: data.progress,
        downloadedSize: data.downloaded,
        totalSize: data.total,
        downloadSpeed: data.speed || 0,
      });
    };

    window.api.app.onDownloadProgress(handleDownloadProgress);
    return () => {
      window.api?.app?.removeDownloadProgressListener?.(handleDownloadProgress);
    };
  }, []);

  const checkForUpdates = useCallback(async (): Promise<UpdateInfo> => {
    // If we already checked recently (within 5 minutes), return cached result
    const now = Date.now();
    if (globalUpdateState.updateInfo && globalUpdateState.lastChecked && (now - globalUpdateState.lastChecked) < 5 * 60 * 1000) {
      await applyPendingUpdateState(globalUpdateState.updateInfo);
      return globalUpdateState.updateInfo;
    }

    // If already checking, wait for it to complete
    if (globalUpdateState.isChecking) {
      console.log("Update check already in progress, waiting...");
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!globalUpdateState.isChecking && globalUpdateState.updateInfo) {
            clearInterval(checkInterval);
            resolve(globalUpdateState.updateInfo);
          }
        }, 100);
      });
    }

    notifyListeners({ ...globalUpdateState, isChecking: true, error: null });
    
    try {
      const updateInfo = await window.api.app.checkForUpdates();
      
      notifyListeners({ 
        ...globalUpdateState, 
        isChecking: false, 
        updateInfo,
        error: updateInfo.error || null,
        lastChecked: now
      });

      await applyPendingUpdateState(updateInfo);
      
      return globalUpdateState.updateInfo ?? updateInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notifyListeners({ 
        ...globalUpdateState, 
        isChecking: false, 
        error: errorMessage 
      });

      await applyPendingUpdateState(null);
      
      const errorResult = {
        available: false,
        currentVersion: '',
        latestVersion: '',
        downloadUrl: '',
        error: errorMessage
      };
      
      return errorResult;
    }
  }, []);

  const clearError = useCallback(() => {
    notifyListeners({ ...globalUpdateState, error: null });
  }, []);

  const reset = useCallback(() => {
    const resetState: UpdateState = {
      isChecking: false,
      updateInfo: null,
      error: null,
      lastChecked: null,
      isDownloading: false,
      isPaused: false,
      downloadProgress: 0,
      downloadSpeed: 0,
      downloadedSize: 0,
      totalSize: 0,
      isInstalling: false,
      isDownloaded: false,
      downloadPath: '',
    };
    notifyListeners(resetState);
  }, []);

  const setDownloadState = useCallback((newState: Partial<UpdateState>) => {
    notifyListeners({ ...globalUpdateState, ...newState });
  }, []);

  return (
    <UpdateContext.Provider value={{
      state,
      checkForUpdates,
      clearError,
      reset,
      setDownloadState,
    }}>
      {children}
    </UpdateContext.Provider>
  );
};
