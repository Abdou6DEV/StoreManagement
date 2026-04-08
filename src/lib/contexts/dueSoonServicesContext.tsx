import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { getWarmupSnapshot, subscribeWarmup } from "../warmup/appWarmup";

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
  const [services, setServices] = useState<any[] | null>(null);

  const calculateDueSoonServices = async () => {
    try {
      setIsLoading(true);
      if (!enableBadge || !badgeLoaded) {
        setUnseenDueSoonServicesCount(0);
        return;
      }

      const allServices = services ?? [];
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
    const allServices = services ?? [];
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
  };

  // Load badge setting, threshold, and services list from warmup (no polling here)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    setServices(snap.services);
    const badge = snap.options?.["enableDueSoonServicesBadge"];
    setEnableBadge(badge !== "false");
    setBadgeLoaded(true);
    const thresh = snap.options?.["dueSoonServicesThresholdDays"];
    setDueSoonThresholdDays(thresh ? Number(thresh) : 2);

    return subscribeWarmup((detail) => {
      if (detail.key === "services") {
        setServices(detail.snapshot.services);
      }
      if (detail.key === "options") {
        const b = detail.snapshot.options?.["enableDueSoonServicesBadge"];
        setEnableBadge(b !== "false");
        setBadgeLoaded(true);
        const t = detail.snapshot.options?.["dueSoonServicesThresholdDays"];
        setDueSoonThresholdDays(t ? Number(t) : 2);
      }
    });
  }, []);

  useEffect(() => {
    calculateDueSoonServices();
    
    // Refresh every minute
    const interval = setInterval(calculateDueSoonServices, 60000);
    
    return () => clearInterval(interval);
  }, [services, dueSoonThresholdDays, enableBadge, badgeLoaded]);

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
