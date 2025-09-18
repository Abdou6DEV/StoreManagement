import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

interface DueSoonBillsContextType {
  unseenDueSoonBillsCount: number;
  markDueSoonBillsAsSeen: () => void;
  dueSoonThresholdDays: number;
}

const DueSoonBillsContext = createContext<DueSoonBillsContextType | undefined>(undefined);

export const useDueSoonBills = () => {
  const context = useContext(DueSoonBillsContext);
  if (context === undefined) {
    throw new Error('useDueSoonBills must be used within a DueSoonBillsProvider');
  }
  return context;
};

interface DueSoonBillsProviderProps {
  children: React.ReactNode;
}

export const DueSoonBillsProvider: React.FC<DueSoonBillsProviderProps> = ({ children }) => {
  const [bills, setBills] = useState<any[]>([]);
  const [seenDueSoonBills, setSeenDueSoonBills] = useState<Set<string>>(new Set());
  const [enableBadge, setEnableBadge] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const [dueSoonThresholdDays, setDueSoonThresholdDays] = useState(2);

  // Load enableDueSoonBillsBadge setting
  useEffect(() => {
    let isMounted = true;
    
    const loadBadgeSetting = () => {
      if (!isMounted) return;
      
      window.api.database.options
        .get("enableDueSoonBillsBadge")
        .then((val) => {
          if (!isMounted) return;
          setEnableBadge(val !== "false"); // Default to true if not set
          setBadgeLoaded(true);
        })
        .catch(() => {
          if (!isMounted) return;
          setEnableBadge(true); // Default to true on error
          setBadgeLoaded(true);
        });
    };

    // Load initial setting
    loadBadgeSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadBadgeSetting, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load dueSoonThresholdDays setting
  useEffect(() => {
    let isMounted = true;
    
    const loadThresholdSetting = () => {
      if (!isMounted) return;
      
      window.api.database.options
        .get("dueSoonBillsThresholdDays")
        .then((val) => {
          if (!isMounted) return;
          setDueSoonThresholdDays(val ? Number(val) : 2); // Default to 2 days
        })
        .catch(() => {
          if (!isMounted) return;
          setDueSoonThresholdDays(2); // Default to 2 days on error
        });
    };

    // Load initial setting
    loadThresholdSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadThresholdSetting, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load all bills
  useEffect(() => {
    let isMounted = true;
    
    const loadBills = () => {
      if (!isMounted) return;
      
      window.api.database.bills
        .getAll()
        .then((data) => {
          if (!isMounted) return;
          setBills(data);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("Failed to load bills:", error);
        });
    };

    // Load initial bills
    loadBills();

    // Poll for changes every 5 seconds
    const interval = setInterval(loadBills, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load seen bills from localStorage
  useEffect(() => {
    const savedBills = localStorage.getItem('seenDueSoonBills');

    if (savedBills) {
      try {
        setSeenDueSoonBills(new Set(JSON.parse(savedBills)));
      } catch (error) {
        console.error('Failed to parse seenDueSoonBills from localStorage:', error);
      }
    }
  }, []);

  // Helper function to check if a bill is due soon (within configured threshold days)
  const isDueSoon = (nextBillDate: Date, duration: string): boolean => {
    if (duration === "NO_NEXT" || !nextBillDate) return false;
    const due = new Date(nextBillDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= dueSoonThresholdDays;
  };

  // Calculate unseen due soon bills count
  const unseenDueSoonBillsCount = React.useMemo(() => {
    if (!bills.length || !enableBadge || !badgeLoaded) return 0;
    
    const dueSoonBills = bills.filter(bill => 
      isDueSoon(bill.nextBillDate, bill.duration)
    );
    
    const unseenBills = dueSoonBills.filter(bill => 
      !seenDueSoonBills.has(bill.id)
    );
    
    return unseenBills.length;
  }, [bills, enableBadge, badgeLoaded, seenDueSoonBills, dueSoonThresholdDays]);

  // Mark due soon bills as seen
  const markDueSoonBillsAsSeen = useCallback(() => {
    if (!bills.length || !enableBadge) return;

    const dueSoonBills = bills.filter(bill => 
      isDueSoon(bill.nextBillDate, bill.duration)
    );
    
    setSeenDueSoonBills(prevSeen => {
      const newSeenBills = new Set(prevSeen);
      dueSoonBills.forEach(bill => {
        newSeenBills.add(bill.id);
      });
      localStorage.setItem('seenDueSoonBills', JSON.stringify(Array.from(newSeenBills)));
      return newSeenBills;
    });
  }, [bills, enableBadge, dueSoonThresholdDays]);

  // Clean up seen bills that are no longer due soon
  useEffect(() => {
    if (!bills.length) return;

    setSeenDueSoonBills(prevSeenBills => {
      const updatedSeenBills = new Set(prevSeenBills);
      let hasChanges = false;
      
      // Clean up bills
      prevSeenBills.forEach(billId => {
        const bill = bills.find(b => b.id === billId);
        if (bill && !isDueSoon(bill.nextBillDate, bill.duration)) {
          updatedSeenBills.delete(billId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('seenDueSoonBills', JSON.stringify(Array.from(updatedSeenBills)));
      }
      
      return hasChanges ? updatedSeenBills : prevSeenBills;
    });
  }, [bills]);

  const value: DueSoonBillsContextType = {
    unseenDueSoonBillsCount,
    markDueSoonBillsAsSeen,
    dueSoonThresholdDays,
  };

  return (
    <DueSoonBillsContext.Provider value={value}>
      {children}
    </DueSoonBillsContext.Provider>
  );
};
