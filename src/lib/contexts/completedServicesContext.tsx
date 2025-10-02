import React, { createContext, useContext, useState, useEffect } from 'react';

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
      // Check if badge is enabled first
      const badgeEnabled = await window.api.database.options.get("enableCompletedServicesBadge");
      const isEnabled = badgeEnabled !== "false"; // Default to true if not set
      setIsBadgeEnabled(isEnabled);
      
      if (isEnabled) {
        // Get completed services that are not sold using the optimized function
        const completedServices = await window.api.database.serviceAppointments.getCompletedForCashier();
        setCompletedServicesCount(completedServices.length);
      } else {
        setCompletedServicesCount(0);
      }
    } catch (error) {
      console.error('Error fetching completed services count:', error);
      setCompletedServicesCount(0);
    }
  };

  useEffect(() => {
    refreshCompletedServicesCount();
    
    // Listen for changes to the admin setting
    const interval = setInterval(() => {
      refreshCompletedServicesCount();
    }, 2000); // Check every 2 seconds for setting changes
    
    return () => clearInterval(interval);
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
