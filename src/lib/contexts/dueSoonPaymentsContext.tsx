import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { PaymentWithClient } from '../../types';

interface DueSoonPaymentsContextType {
  unseenDueSoonCreditsCount: number;
  unseenDueSoonVersementsCount: number;
  markDueSoonCreditsAsSeen: () => void;
  markDueSoonVersementsAsSeen: () => void;
  dueSoonThresholdDays: number;
}

const DueSoonPaymentsContext = createContext<DueSoonPaymentsContextType | undefined>(undefined);

export const useDueSoonPayments = () => {
  const context = useContext(DueSoonPaymentsContext);
  if (context === undefined) {
    throw new Error('useDueSoonPayments must be used within a DueSoonPaymentsProvider');
  }
  return context;
};

interface DueSoonPaymentsProviderProps {
  children: React.ReactNode;
}

export const DueSoonPaymentsProvider: React.FC<DueSoonPaymentsProviderProps> = ({ children }) => {
  const [payments, setPayments] = useState<PaymentWithClient[]>([]);
  const [seenDueSoonCredits, setSeenDueSoonCredits] = useState<Set<string>>(new Set());
  const [seenDueSoonVersements, setSeenDueSoonVersements] = useState<Set<string>>(new Set());
  const [enableBadge, setEnableBadge] = useState(false);
  const [badgeLoaded, setBadgeLoaded] = useState(false);
  const [dueSoonThresholdDays, setDueSoonThresholdDays] = useState(2);

  // Load enableDueSoonPaymentsBadge setting
  useEffect(() => {
    let isMounted = true;
    
    const loadBadgeSetting = () => {
      if (!isMounted) return;
      
      window.api.database.options
        .get("enableDueSoonPaymentsBadge")
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
  }, []); // Empty dependency array is correct here

  // Load dueSoonThresholdDays setting
  useEffect(() => {
    let isMounted = true;
    
    const loadThresholdSetting = () => {
      if (!isMounted) return;
      
      window.api.database.options
        .get("dueSoonThresholdDays")
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

  // Load all payments
  useEffect(() => {
    let isMounted = true;
    
    const loadPayments = () => {
      if (!isMounted) return;
      
      window.api.database.payments
        .getAll()
        .then((data) => {
          if (!isMounted) return;
          setPayments(data);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("Failed to load payments:", error);
        });
    };

    // Load initial payments
    loadPayments();

    // Poll for changes every 5 seconds
    const interval = setInterval(loadPayments, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load seen payments from localStorage
  useEffect(() => {
    const savedCredits = localStorage.getItem('seenDueSoonCredits');
    const savedVersements = localStorage.getItem('seenDueSoonVersements');

    if (savedCredits) {
      try {
        setSeenDueSoonCredits(new Set(JSON.parse(savedCredits)));
      } catch (error) {
        console.error('Failed to parse seenDueSoonCredits from localStorage:', error);
      }
    }

    if (savedVersements) {
      try {
        setSeenDueSoonVersements(new Set(JSON.parse(savedVersements)));
      } catch (error) {
        console.error('Failed to parse seenDueSoonVersements from localStorage:', error);
      }
    }
  }, []);

  // Helper function to check if a payment is due soon (within configured threshold days)
  const isDueSoon = (dueDate: Date): boolean => {
    if (!dueDate) return false;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= dueSoonThresholdDays;
  };

  // Calculate unseen due soon credits count
  const unseenDueSoonCreditsCount = React.useMemo(() => {
    if (!payments.length || !enableBadge || !badgeLoaded) return 0;
    
    const dueSoonCredits = payments.filter(payment => 
      payment.type === "CREDIT" && 
      !payment.paidDate && 
      isDueSoon(payment.dueDate)
    );
    
    const unseenCredits = dueSoonCredits.filter(payment => 
      !seenDueSoonCredits.has(payment.id)
    );
    
    return unseenCredits.length;
  }, [payments, enableBadge, badgeLoaded, seenDueSoonCredits, dueSoonThresholdDays]);

  // Calculate unseen due soon versements count
  const unseenDueSoonVersementsCount = React.useMemo(() => {
    if (!payments.length || !enableBadge || !badgeLoaded) return 0;
    
    const dueSoonVersements = payments.filter(payment => 
      payment.type === "VERSEMENT" && 
      !payment.paidDate && 
      isDueSoon(payment.dueDate)
    );
    
    const unseenVersements = dueSoonVersements.filter(payment => 
      !seenDueSoonVersements.has(payment.id)
    );
    
    return unseenVersements.length;
  }, [payments, enableBadge, badgeLoaded, seenDueSoonVersements, dueSoonThresholdDays]);

  // Mark due soon credits as seen
  const markDueSoonCreditsAsSeen = useCallback(() => {
    if (!payments.length || !enableBadge) return;

    const dueSoonCredits = payments.filter(payment => 
      payment.type === "CREDIT" && 
      !payment.paidDate && 
      isDueSoon(payment.dueDate)
    );
    
    setSeenDueSoonCredits(prevSeen => {
      const newSeenCredits = new Set(prevSeen);
      dueSoonCredits.forEach(payment => {
        newSeenCredits.add(payment.id);
      });
      localStorage.setItem('seenDueSoonCredits', JSON.stringify(Array.from(newSeenCredits)));
      return newSeenCredits;
    });
  }, [payments, enableBadge, dueSoonThresholdDays]);

  // Mark due soon versements as seen
  const markDueSoonVersementsAsSeen = useCallback(() => {
    if (!payments.length || !enableBadge) return;

    const dueSoonVersements = payments.filter(payment => 
      payment.type === "VERSEMENT" && 
      !payment.paidDate && 
      isDueSoon(payment.dueDate)
    );
    
    setSeenDueSoonVersements(prevSeen => {
      const newSeenVersements = new Set(prevSeen);
      dueSoonVersements.forEach(payment => {
        newSeenVersements.add(payment.id);
      });
      localStorage.setItem('seenDueSoonVersements', JSON.stringify(Array.from(newSeenVersements)));
      return newSeenVersements;
    });
  }, [payments, enableBadge, dueSoonThresholdDays]);

  // Clean up seen payments that are no longer due soon
  useEffect(() => {
    if (!payments.length) return;

    setSeenDueSoonCredits(prevSeenCredits => {
      const updatedSeenCredits = new Set(prevSeenCredits);
      let hasChanges = false;
      
      // Clean up credits
      prevSeenCredits.forEach(paymentId => {
        const payment = payments.find(p => p.id === paymentId);
        if (payment && (payment.paidDate || !isDueSoon(payment.dueDate))) {
          updatedSeenCredits.delete(paymentId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('seenDueSoonCredits', JSON.stringify(Array.from(updatedSeenCredits)));
      }
      
      return hasChanges ? updatedSeenCredits : prevSeenCredits;
    });

    setSeenDueSoonVersements(prevSeenVersements => {
      const updatedSeenVersements = new Set(prevSeenVersements);
      let hasChanges = false;
      
      // Clean up versements
      prevSeenVersements.forEach(paymentId => {
        const payment = payments.find(p => p.id === paymentId);
        if (payment && (payment.paidDate || !isDueSoon(payment.dueDate))) {
          updatedSeenVersements.delete(paymentId);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        localStorage.setItem('seenDueSoonVersements', JSON.stringify(Array.from(updatedSeenVersements)));
      }
      
      return hasChanges ? updatedSeenVersements : prevSeenVersements;
    });
  }, [payments]);

  const value: DueSoonPaymentsContextType = {
    unseenDueSoonCreditsCount,
    unseenDueSoonVersementsCount,
    markDueSoonCreditsAsSeen,
    markDueSoonVersementsAsSeen,
    dueSoonThresholdDays,
  };

  return (
    <DueSoonPaymentsContext.Provider value={value}>
      {children}
    </DueSoonPaymentsContext.Provider>
  );
};
