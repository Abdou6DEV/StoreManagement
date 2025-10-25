import { useState, useCallback } from 'react';
import { UpdateChecker } from '../utils/updateChecker';

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
}

export const useUpdateChecker = () => {
  const [state, setState] = useState<UpdateState>({
    isChecking: false,
    updateInfo: null,
    error: null,
  });

  const checkForUpdates = useCallback(async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const updateInfo = await UpdateChecker.checkForUpdates();
      setState(prev => ({ 
        ...prev, 
        isChecking: false, 
        updateInfo,
        error: updateInfo.error || null
      }));
      return updateInfo;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({ 
        ...prev, 
        isChecking: false, 
        error: errorMessage 
      }));
      return {
        available: false,
        currentVersion: '',
        latestVersion: '',
        downloadUrl: '',
        error: errorMessage
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isChecking: false,
      updateInfo: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    checkForUpdates,
    clearError,
    reset,
  };
};
