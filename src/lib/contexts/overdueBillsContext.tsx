import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface OverdueBillsContextType {
  unseenOverdueBillsCount: number;
  markOverdueBillsAsSeen: () => void;
}

const OverdueBillsContext = createContext<OverdueBillsContextType | undefined>(undefined);

export const useOverdueBills = () => {
  const context = useContext(OverdueBillsContext);
  if (context === undefined) {
    throw new Error('useOverdueBills must be used within an OverdueBillsProvider');
  }
  return context;
};

interface OverdueBillsProviderProps {
  children: ReactNode;
}

export const OverdueBillsProvider: React.FC<OverdueBillsProviderProps> = ({ children }) => {
  const [bills, setBills] = useState<any[]>([]);
  const [seenOverdueBills, setSeenOverdueBills] = useState<Set<string>>(new Set());
  const [enableBadge, setEnableBadge] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  // Load badge setting
  useEffect(() => {
    const loadBadgeSetting = () => {
      window.api.database.options
        .get("enableOverdueBillsBadge")
        .then((val) => {
          setEnableBadge(val !== "false"); // Default to true if not set
          setBadgeLoaded(true);
        });
    };

    loadBadgeSetting();

    // Poll for changes every 1 second
    const interval = setInterval(loadBadgeSetting, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load bills
  useEffect(() => {
    const loadBills = async () => {
      try {
        const allBills = await window.api.database.bills.getAll();
        setBills(allBills);
      } catch (error) {
        console.error('Failed to load bills:', error);
      }
    };

    loadBills();

    // Poll for changes every 5 seconds
    const interval = setInterval(loadBills, 5000);

    return () => clearInterval(interval);
  }, []);

  // Load seen bills from localStorage on mount
  useEffect(() => {
    const savedBills = localStorage.getItem('seenOverdueBills');
    
    if (savedBills) {
      try {
        setSeenOverdueBills(new Set(JSON.parse(savedBills)));
      } catch (error) {
        console.error('Failed to load seen overdue bills:', error);
      }
    }
  }, []);

  // Helper function to check if bill is overdue
  const isOverdue = (nextBillDate: Date, duration: string) => {
    if (duration === "NO_NEXT") return false;
    return new Date(nextBillDate) < new Date() && new Date(nextBillDate).getTime() !== 0;
  };

  // Calculate unseen overdue bills count
  const unseenOverdueBillsCount = React.useMemo(() => {
    if (!bills.length || !enableBadge || !badgeLoaded) return 0;
    
    const overdueBills = bills.filter(bill => 
      isOverdue(bill.nextBillDate, bill.duration)
    );
    
    const unseenBills = overdueBills.filter(bill => 
      !seenOverdueBills.has(bill.id)
    );
    
    return unseenBills.length;
  }, [bills, enableBadge, badgeLoaded, seenOverdueBills]);

  // Mark all current overdue bills as seen
  const markOverdueBillsAsSeen = useCallback(() => {
    if (!bills.length || !enableBadge) return;

    const overdueBills = bills.filter(bill => 
      isOverdue(bill.nextBillDate, bill.duration)
    );
    
    setSeenOverdueBills(prevSeen => {
      const newSeenBills = new Set(prevSeen);
      overdueBills.forEach(bill => {
        newSeenBills.add(bill.id);
      });
      localStorage.setItem('seenOverdueBills', JSON.stringify(Array.from(newSeenBills)));
      return newSeenBills;
    });
  }, [bills, enableBadge]);

  // Clean up seen bills that are no longer overdue
  useEffect(() => {
    if (!bills.length) return;

    setSeenOverdueBills(prevSeenBills => {
      const updatedSeenBills = new Set(prevSeenBills);
      let hasChanges = false;
      
      // Clean up bills
      prevSeenBills.forEach(billId => {
        const bill = bills.find(b => b.id === billId);
        if (bill && !isOverdue(bill.nextBillDate, bill.duration)) {
          updatedSeenBills.delete(billId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('seenOverdueBills', JSON.stringify(Array.from(updatedSeenBills)));
      }
      
      return hasChanges ? updatedSeenBills : prevSeenBills;
    });
  }, [bills]);

  const value: OverdueBillsContextType = {
    unseenOverdueBillsCount,
    markOverdueBillsAsSeen,
  };

  return (
    <OverdueBillsContext.Provider value={value}>
      {children}
    </OverdueBillsContext.Provider>
  );
};
