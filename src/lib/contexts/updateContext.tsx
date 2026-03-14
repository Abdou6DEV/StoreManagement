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

const notifyListeners = (newState: UpdateState) => {
  globalUpdateState = newState;
  globalStateListeners.forEach(listener => listener(newState));
};

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

  const checkForUpdates = useCallback(async (): Promise<UpdateInfo> => {
    // If we already checked recently (within 5 minutes), return cached result
    const now = Date.now();
    if (globalUpdateState.updateInfo && globalUpdateState.lastChecked && (now - globalUpdateState.lastChecked) < 5 * 60 * 1000) {
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
      
      return updateInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notifyListeners({ 
        ...globalUpdateState, 
        isChecking: false, 
        error: errorMessage 
      });
      
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
