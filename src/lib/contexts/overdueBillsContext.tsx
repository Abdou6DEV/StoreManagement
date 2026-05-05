import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getWarmupSnapshot, subscribeWarmup } from '../warmup/appWarmup';

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

  // Load badge setting (prefer warmup snapshot)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    const v = snap.options?.["enableOverdueBillsBadge"];
    setEnableBadge(v !== "false");
    setBadgeLoaded(true);
    return subscribeWarmup((detail) => {
      if (detail.key !== "options") return;
      const val = detail.snapshot.options?.["enableOverdueBillsBadge"];
      setEnableBadge(val !== "false");
      setBadgeLoaded(true);
    });
  }, []);

  // Load bills (prefer warmup snapshot)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    if (snap.bills) setBills(snap.bills);
    return subscribeWarmup((detail) => {
      if (detail.key !== "bills") return;
      if (detail.snapshot.bills) setBills(detail.snapshot.bills);
    });
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
    // Compare by date-only (start of day) so "today" is not overdue.
    const due = new Date(nextBillDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today && due.getTime() !== 0;
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
