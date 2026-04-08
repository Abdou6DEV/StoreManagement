import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getWarmupSnapshot, subscribeWarmup } from '../warmup/appWarmup';

interface OverduePaymentsContextType {
  unseenOverdueCreditsCount: number;
  unseenOverdueVersementsCount: number;
  markOverdueCreditsAsSeen: () => void;
  markOverdueVersementsAsSeen: () => void;
}

const OverduePaymentsContext = createContext<OverduePaymentsContextType | undefined>(undefined);

export const useOverduePayments = () => {
  const context = useContext(OverduePaymentsContext);
  if (context === undefined) {
    throw new Error('useOverduePayments must be used within an OverduePaymentsProvider');
  }
  return context;
};

interface OverduePaymentsProviderProps {
  children: ReactNode;
}

export const OverduePaymentsProvider: React.FC<OverduePaymentsProviderProps> = ({ children }) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [seenOverdueCredits, setSeenOverdueCredits] = useState<Set<string>>(new Set());
  const [seenOverdueVersements, setSeenOverdueVersements] = useState<Set<string>>(new Set());
  const [enableBadge, setEnableBadge] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);

  // Load badge setting (prefer warmup snapshot to avoid polling here)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    const v = snap.options?.["enableOverduePaymentsBadge"];
    setEnableBadge(v !== "false");
    setBadgeLoaded(true);
    return subscribeWarmup((detail) => {
      if (detail.key !== "options") return;
      const val = detail.snapshot.options?.["enableOverduePaymentsBadge"];
      setEnableBadge(val !== "false");
      setBadgeLoaded(true);
    });
  }, []);

  // Load payments (prefer warmup snapshot to avoid polling here)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    if (snap.payments) setPayments(snap.payments);
    return subscribeWarmup((detail) => {
      if (detail.key !== "payments") return;
      if (detail.snapshot.payments) setPayments(detail.snapshot.payments);
    });
  }, []);

  // Load seen payments from localStorage on mount
  useEffect(() => {
    const savedCredits = localStorage.getItem('seenOverdueCredits');
    const savedVersements = localStorage.getItem('seenOverdueVersements');
    
    if (savedCredits) {
      try {
        setSeenOverdueCredits(new Set(JSON.parse(savedCredits)));
      } catch (error) {
        console.error('Failed to load seen overdue credits:', error);
      }
    }
    
    if (savedVersements) {
      try {
        setSeenOverdueVersements(new Set(JSON.parse(savedVersements)));
      } catch (error) {
        console.error('Failed to load seen overdue versements:', error);
      }
    }
  }, []);

  // Helper function to check if payment is overdue
  const isOverdue = (dueDate: Date) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).getTime() !== 0;
  };

  // Calculate unseen overdue credits count
  const unseenOverdueCreditsCount = React.useMemo(() => {
    if (!payments.length || !enableBadge || !badgeLoaded) return 0;
    
    const overdueCredits = payments.filter(payment => 
      payment.type === "CREDIT" && 
      !payment.paidDate && 
      isOverdue(payment.dueDate)
    );
    
    const unseenCredits = overdueCredits.filter(payment => 
      !seenOverdueCredits.has(payment.id)
    );
    
    return unseenCredits.length;
  }, [payments, enableBadge, badgeLoaded, seenOverdueCredits]);

  // Calculate unseen overdue versements count
  const unseenOverdueVersementsCount = React.useMemo(() => {
    if (!payments.length || !enableBadge || !badgeLoaded) return 0;
    
    const overdueVersements = payments.filter(payment => 
      payment.type === "VERSEMENT" && 
      !payment.paidDate && 
      isOverdue(payment.dueDate)
    );
    
    const unseenVersements = overdueVersements.filter(payment => 
      !seenOverdueVersements.has(payment.id)
    );
    
    return unseenVersements.length;
  }, [payments, enableBadge, badgeLoaded, seenOverdueVersements]);

  // Mark all current overdue credits as seen
  const markOverdueCreditsAsSeen = useCallback(() => {
    if (!payments.length || !enableBadge) return;

    const overdueCredits = payments.filter(payment => 
      payment.type === "CREDIT" && 
      !payment.paidDate && 
      isOverdue(payment.dueDate)
    );
    
    setSeenOverdueCredits(prevSeen => {
      const newSeenCredits = new Set(prevSeen);
      overdueCredits.forEach(payment => {
        newSeenCredits.add(payment.id);
      });
      localStorage.setItem('seenOverdueCredits', JSON.stringify(Array.from(newSeenCredits)));
      return newSeenCredits;
    });
  }, [payments, enableBadge]);

  // Mark all current overdue versements as seen
  const markOverdueVersementsAsSeen = useCallback(() => {
    if (!payments.length || !enableBadge) return;

    const overdueVersements = payments.filter(payment => 
      payment.type === "VERSEMENT" && 
      !payment.paidDate && 
      isOverdue(payment.dueDate)
    );
    
    setSeenOverdueVersements(prevSeen => {
      const newSeenVersements = new Set(prevSeen);
      overdueVersements.forEach(payment => {
        newSeenVersements.add(payment.id);
      });
      localStorage.setItem('seenOverdueVersements', JSON.stringify(Array.from(newSeenVersements)));
      return newSeenVersements;
    });
  }, [payments, enableBadge]);

  // Clean up seen payments that are no longer overdue
  useEffect(() => {
    if (!payments.length) return;

    setSeenOverdueCredits(prevSeenCredits => {
      const updatedSeenCredits = new Set(prevSeenCredits);
      let hasChanges = false;
      
      // Clean up credits
      prevSeenCredits.forEach(paymentId => {
        const payment = payments.find(p => p.id === paymentId);
        if (payment && (payment.paidDate || !isOverdue(payment.dueDate))) {
          updatedSeenCredits.delete(paymentId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('seenOverdueCredits', JSON.stringify(Array.from(updatedSeenCredits)));
      }
      
      return hasChanges ? updatedSeenCredits : prevSeenCredits;
    });

    setSeenOverdueVersements(prevSeenVersements => {
      const updatedSeenVersements = new Set(prevSeenVersements);
      let hasChanges = false;
      
      // Clean up versements
      prevSeenVersements.forEach(paymentId => {
        const payment = payments.find(p => p.id === paymentId);
        if (payment && (payment.paidDate || !isOverdue(payment.dueDate))) {
          updatedSeenVersements.delete(paymentId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('seenOverdueVersements', JSON.stringify(Array.from(updatedSeenVersements)));
      }
      
      return hasChanges ? updatedSeenVersements : prevSeenVersements;
    });
  }, [payments]);

  const value: OverduePaymentsContextType = {
    unseenOverdueCreditsCount,
    unseenOverdueVersementsCount,
    markOverdueCreditsAsSeen,
    markOverdueVersementsAsSeen,
  };

  return (
    <OverduePaymentsContext.Provider value={value}>
      {children}
    </OverduePaymentsContext.Provider>
  );
};
