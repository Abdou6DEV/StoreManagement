import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { getWarmupSnapshot, subscribeWarmup } from "../warmup/appWarmup";

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
  const [services, setServices] = useState<any[] | null>(null);

  const calculateOverdueServices = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!enableBadge || !badgeLoaded) {
        setUnseenOverdueServicesCount(0);
        return;
      }

      const allServices = services ?? [];
      const today = new Date();

      // Get seen overdue services from localStorage
      const savedSeen = localStorage.getItem("seenOverdueServices");
      let seenIds = new Set<string>();
      if (savedSeen) {
        try {
          seenIds = new Set(JSON.parse(savedSeen) as string[]);
        } catch {
          seenIds = new Set();
        }
      }

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
  }, [services, enableBadge, badgeLoaded]);

  const markOverdueServicesAsSeen = useCallback(() => {
    const allServices = services ?? [];
    const today = new Date();
    const overdueServices = allServices.filter((service) => {
      if (service.isCompleted) return false;
      const dueDate = new Date(service.dueDate);
      return dueDate < today;
    });

    const overdueIds = overdueServices.map((service) => service.id);
    localStorage.setItem("seenOverdueServices", JSON.stringify(overdueIds));
    setUnseenOverdueServicesCount((c) => (c === 0 ? c : 0));
  }, [services]);

  // Load badge setting and services list from warmup (no polling here)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    setServices(snap.services);
    const v = snap.options?.["enableOverdueServicesBadge"];
    setEnableBadge(v !== "false");
    setBadgeLoaded(true);

    return subscribeWarmup((detail) => {
      if (detail.key === "services") {
        setServices(detail.snapshot.services);
      }
      if (detail.key === "options") {
        const val = detail.snapshot.options?.["enableOverdueServicesBadge"];
        setEnableBadge(val !== "false");
        setBadgeLoaded(true);
      }
    });
  }, []);

  useEffect(() => {
    void calculateOverdueServices();

    const interval = setInterval(() => {
      void calculateOverdueServices();
    }, 60000);

    return () => clearInterval(interval);
  }, [calculateOverdueServices]);

  const value = useMemo(
    () => ({
      unseenOverdueServicesCount,
      markOverdueServicesAsSeen,
      isLoading,
      enableBadge,
      badgeLoaded,
    }),
    [
      unseenOverdueServicesCount,
      markOverdueServicesAsSeen,
      isLoading,
      enableBadge,
      badgeLoaded,
    ],
  );

  return (
    <OverdueServicesContext.Provider value={value}>
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
