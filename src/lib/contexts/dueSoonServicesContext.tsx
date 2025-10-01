import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface DueSoonServicesContextType {
  unseenDueSoonServicesCount: number;
  markDueSoonServicesAsSeen: () => void;
  dueSoonThresholdDays: number;
  isLoading: boolean;
  enableBadge: boolean;
  badgeLoaded: boolean;
}

const DueSoonServicesContext = createContext<DueSoonServicesContextType | undefined>(undefined);

export const DueSoonServicesProvider = ({ children }: { children: ReactNode }) => {
  const [unseenDueSoonServicesCount, setUnseenDueSoonServicesCount] = useState(0);
  const [dueSoonThresholdDays, setDueSoonThresholdDays] = useState(2); // Default 2 days
  const [isLoading, setIsLoading] = useState(true);
  const [enableBadge, setEnableBadge] = useState(false); // Start as false to prevent flash
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  const calculateDueSoonServices = async () => {
    try {
      setIsLoading(true);
      if (!enableBadge || !badgeLoaded) {
        setUnseenDueSoonServicesCount(0);
        return;
      }

      const allServices = await window.api.database.serviceAppointments.getAll();
      const today = new Date();
      const dueSoonDate = new Date(today.getTime() + dueSoonThresholdDays * 24 * 60 * 60 * 1000);
      
      // Get seen due soon services from localStorage
      const savedSeen = localStorage.getItem('seenDueSoonServices');
      const seenIds = savedSeen ? new Set(JSON.parse(savedSeen)) : new Set();
      
      // Count due soon services that haven't been seen
      const dueSoonServices = allServices.filter((service: any) => {
        if (service.isCompleted) return false;
        const dueDate = new Date(service.dueDate);
        return dueDate >= today && dueDate <= dueSoonDate && !seenIds.has(service.id);
      });
      
      setUnseenDueSoonServicesCount(dueSoonServices.length);
    } catch (error) {
      console.error("Error calculating due soon services:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const markDueSoonServicesAsSeen = () => {
    // Mark all current due soon services as seen
    window.api.database.serviceAppointments.getAll().then((allServices: any[]) => {
      const today = new Date();
      const dueSoonDate = new Date(today.getTime() + dueSoonThresholdDays * 24 * 60 * 60 * 1000);
      
      const dueSoonServices = allServices.filter((service) => {
        if (service.isCompleted) return false;
        const dueDate = new Date(service.dueDate);
        return dueDate >= today && dueDate <= dueSoonDate;
      });
      
      const dueSoonIds = dueSoonServices.map((service) => service.id);
      localStorage.setItem('seenDueSoonServices', JSON.stringify(dueSoonIds));
      setUnseenDueSoonServicesCount(0);
    });
  };

  // Load badge setting and listen for changes
  useEffect(() => {
    const loadBadgeSetting = () => {
      window.api.database.options
        .get("enableDueSoonServicesBadge")
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
    const loadThresholdSetting = () => {
      window.api.database.options.get("dueSoonServicesThresholdDays").then((value) => {
        if (value) {
          setDueSoonThresholdDays(Number(value));
        }
      });
    };

    // Load initial setting
    loadThresholdSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadThresholdSetting, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    calculateDueSoonServices();
    
    // Refresh every minute
    const interval = setInterval(calculateDueSoonServices, 60000);
    
    return () => clearInterval(interval);
  }, [dueSoonThresholdDays, enableBadge, badgeLoaded]);

  return (
    <DueSoonServicesContext.Provider value={{ unseenDueSoonServicesCount, markDueSoonServicesAsSeen, dueSoonThresholdDays, isLoading, enableBadge, badgeLoaded }}>
      {children}
    </DueSoonServicesContext.Provider>
  );
};

export const useDueSoonServices = () => {
  const context = useContext(DueSoonServicesContext);
  if (context === undefined) {
    throw new Error("useDueSoonServices must be used within a DueSoonServicesProvider");
  }
  return context;
};
