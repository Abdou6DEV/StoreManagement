import React, { createContext, useContext, useState, useEffect } from 'react';
import { getWarmupSnapshot, subscribeWarmup } from '../warmup/appWarmup';

interface CompletedServicesContextType {
  completedServicesCount: number;
  isBadgeEnabled: boolean;
  refreshCompletedServicesCount: () => Promise<void>;
}

const CompletedServicesContext = createContext<CompletedServicesContextType | undefined>(undefined);

export function CompletedServicesProvider({ children }: { children: React.ReactNode }) {
  const [completedServicesCount, setCompletedServicesCount] = useState(0);
  const [isBadgeEnabled, setIsBadgeEnabled] = useState(true);

  const refreshCompletedServicesCount = async () => {
    try {
      // Prefer warmup snapshot; fall back to live call if not ready.
      const snap = getWarmupSnapshot();
      const badgeEnabled = snap.options?.["enableCompletedServicesBadge"];
      const isEnabled = badgeEnabled !== "false";
      setIsBadgeEnabled(isEnabled);
      if (!isEnabled) {
        setCompletedServicesCount(0);
        return;
      }
      if (snap.completedServices) {
        setCompletedServicesCount(snap.completedServices.length);
        return;
      }
      const completedServices = await window.api.database.serviceAppointments.getCompletedForCashier();
      setCompletedServicesCount(completedServices.length);
    } catch (error) {
      console.error('Error fetching completed services count:', error);
      setCompletedServicesCount(0);
    }
  };

  useEffect(() => {
    refreshCompletedServicesCount();

    // Subscribe to warmup updates instead of polling.
    return subscribeWarmup((detail) => {
      if (detail.key === "options" || detail.key === "services") {
        void refreshCompletedServicesCount();
      }
    });
  }, []);

  return (
    <CompletedServicesContext.Provider
      value={{
        completedServicesCount,
        isBadgeEnabled,
        refreshCompletedServicesCount,
      }}
    >
      {children}
    </CompletedServicesContext.Provider>
  );
}

export function useCompletedServices() {
  const context = useContext(CompletedServicesContext);
  if (context === undefined) {
    throw new Error('useCompletedServices must be used within a CompletedServicesProvider');
  }
  return context;
}
