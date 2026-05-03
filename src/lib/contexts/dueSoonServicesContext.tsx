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

  const calculateDueSoonServices = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!enableBadge || !badgeLoaded) {
        setUnseenDueSoonServicesCount(0);
        return;
      }

      const allServices = services ?? [];
      const today = new Date();
      const dueSoonDate = new Date(
        today.getTime() + dueSoonThresholdDays * 24 * 60 * 60 * 1000,
      );

      const savedSeen = localStorage.getItem("seenDueSoonServices");
      let seenIds = new Set<string>();
      if (savedSeen) {
        try {
          seenIds = new Set(JSON.parse(savedSeen) as string[]);
        } catch {
          seenIds = new Set();
        }
      }

      const dueSoonServices = allServices.filter((service: any) => {
        if (service.isCompleted) return false;
        const dueDate = new Date(service.dueDate);
        return (
          dueDate >= today &&
          dueDate <= dueSoonDate &&
          !seenIds.has(service.id)
        );
      });

      setUnseenDueSoonServicesCount(dueSoonServices.length);
    } catch (error) {
      console.error("Error calculating due soon services:", error);
    } finally {
      setIsLoading(false);
    }
  }, [services, dueSoonThresholdDays, enableBadge, badgeLoaded]);

  const markDueSoonServicesAsSeen = useCallback(() => {
    const allServices = services ?? [];
    const today = new Date();
    const dueSoonDate = new Date(
      today.getTime() + dueSoonThresholdDays * 24 * 60 * 60 * 1000,
    );

    const dueSoonServices = allServices.filter((service) => {
      if (service.isCompleted) return false;
      const dueDate = new Date(service.dueDate);
      return dueDate >= today && dueDate <= dueSoonDate;
    });

    const dueSoonIds = dueSoonServices.map((service) => service.id);
    localStorage.setItem("seenDueSoonServices", JSON.stringify(dueSoonIds));
    setUnseenDueSoonServicesCount((c) => (c === 0 ? c : 0));
  }, [services, dueSoonThresholdDays]);

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
    void calculateDueSoonServices();

    const interval = setInterval(() => {
      void calculateDueSoonServices();
    }, 60000);

    return () => clearInterval(interval);
  }, [calculateDueSoonServices]);

  const value = useMemo(
    () => ({
      unseenDueSoonServicesCount,
      markDueSoonServicesAsSeen,
      dueSoonThresholdDays,
      isLoading,
      enableBadge,
      badgeLoaded,
    }),
    [
      unseenDueSoonServicesCount,
      markDueSoonServicesAsSeen,
      dueSoonThresholdDays,
      isLoading,
      enableBadge,
      badgeLoaded,
    ],
  );

  return (
    <DueSoonServicesContext.Provider value={value}>
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
