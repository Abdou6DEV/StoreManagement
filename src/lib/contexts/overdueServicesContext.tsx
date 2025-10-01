import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface OverdueServicesContextType {
  unseenOverdueServicesCount: number;
  markOverdueServicesAsSeen: () => void;
  isLoading: boolean;
  enableBadge: boolean;
  badgeLoaded: boolean;
}

const OverdueServicesContext = createContext<OverdueServicesContextType | undefined>(undefined);

export const OverdueServicesProvider = ({ children }: { children: ReactNode }) => {
  const [unseenOverdueServicesCount, setUnseenOverdueServicesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [enableBadge, setEnableBadge] = useState(false); // Start as false to prevent flash
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  const calculateOverdueServices = async () => {
    try {
      setIsLoading(true);
      if (!enableBadge || !badgeLoaded) {
        setUnseenOverdueServicesCount(0);
        return;
      }

      const allServices = await window.api.database.serviceAppointments.getAll();
      const today = new Date();
      
      // Get seen overdue services from localStorage
      const savedSeen = localStorage.getItem('seenOverdueServices');
      const seenIds = savedSeen ? new Set(JSON.parse(savedSeen)) : new Set();
      
      // Count overdue services that haven't been seen
      const overdueServices = allServices.filter((service: any) => {
        if (service.isCompleted) return false;
        const dueDate = new Date(service.dueDate);
        return dueDate < today && !seenIds.has(service.id);
      });
      
      setUnseenOverdueServicesCount(overdueServices.length);
    } catch (error) {
      console.error("Error calculating overdue services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markOverdueServicesAsSeen = () => {
    // Mark all current overdue services as seen
    window.api.database.serviceAppointments.getAll().then((allServices: any[]) => {
      const today = new Date();
      const overdueServices = allServices.filter((service) => {
        if (service.isCompleted) return false;
        const dueDate = new Date(service.dueDate);
        return dueDate < today;
      });
      
      const overdueIds = overdueServices.map((service) => service.id);
      localStorage.setItem('seenOverdueServices', JSON.stringify(overdueIds));
      setUnseenOverdueServicesCount(0);
    });
  };

  // Load badge setting and listen for changes
  useEffect(() => {
    const loadBadgeSetting = () => {
      window.api.database.options
        .get("enableOverdueServicesBadge")
        .then((val) => {
          setEnableBadge(val !== "false"); // Default to true if not set
          setBadgeLoaded(true); // Mark as loaded
        });
    };

    // Load initial setting
    loadBadgeSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadBadgeSetting, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    calculateOverdueServices();
    
    // Refresh every minute
    const interval = setInterval(calculateOverdueServices, 60000);
    
    return () => clearInterval(interval);
  }, [enableBadge, badgeLoaded]);

  return (
    <OverdueServicesContext.Provider value={{ unseenOverdueServicesCount, markOverdueServicesAsSeen, isLoading, enableBadge, badgeLoaded }}>
      {children}
    </OverdueServicesContext.Provider>
  );
};

export const useOverdueServices = () => {
  const context = useContext(OverdueServicesContext);
  if (context === undefined) {
    throw new Error("useOverdueServices must be used within an OverdueServicesProvider");
  }
  return context;
};
