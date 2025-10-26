import { useUpdateContext } from '../contexts/updateContext';

export const useUpdateChecker = () => {
  const { state, checkForUpdates, clearError, reset, setDownloadState } = useUpdateContext();
  
  return {
    state,
    checkForUpdates,
    clearError,
    reset,
    setDownloadState,
    // Spread state properties for convenience
    isChecking: state.isChecking,
    updateInfo: state.updateInfo,
    error: state.error,
    isDownloading: state.isDownloading,
    isPaused: state.isPaused,
    downloadProgress: state.downloadProgress,
    downloadSpeed: state.downloadSpeed,
    downloadedSize: state.downloadedSize,
    totalSize: state.totalSize,
    isInstalling: state.isInstalling,
    isDownloaded: state.isDownloaded,
    downloadPath: state.downloadPath,
    lastChecked: state.lastChecked,
  };
};
