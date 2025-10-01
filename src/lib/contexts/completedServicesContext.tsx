import React, { createContext, useContext, useState, useEffect } from 'react';

interface CompletedServicesContextType {
  completedServicesCount: number;
  refreshCompletedServicesCount: () => Promise<void>;
}

const CompletedServicesContext = createContext<CompletedServicesContextType | undefined>(undefined);

export function CompletedServicesProvider({ children }: { children: React.ReactNode }) {
  const [completedServicesCount, setCompletedServicesCount] = useState(0);

  const refreshCompletedServicesCount = async () => {
    try {
      // Get completed services that are not sold using the optimized function
      const completedServices = await window.api.database.serviceAppointments.getCompletedForCashier();
      setCompletedServicesCount(completedServices.length);
    } catch (error) {
      console.error('Error fetching completed services count:', error);
      setCompletedServicesCount(0);
    }
  };

  useEffect(() => {
    refreshCompletedServicesCount();
  }, []);

  return (
    <CompletedServicesContext.Provider
      value={{
        completedServicesCount,
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
