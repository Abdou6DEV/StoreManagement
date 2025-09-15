import React, { createContext, useContext, useState, useEffect } from 'react';

interface CashierHistoryContextType {
  isEnabled: boolean;
  isLoading: boolean;
}

const CashierHistoryContext = createContext<CashierHistoryContextType | undefined>(undefined);

interface CashierHistoryProviderProps {
  children: React.ReactNode;
}

export const CashierHistoryProvider: React.FC<CashierHistoryProviderProps> = ({ children }) => {
  const [isEnabled, setIsEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSetting = () => {
      window.api.database.options
        .get("enableCashierHistory")
        .then((val) => {
          setIsEnabled(val !== "false"); // Default to true if not set
          setIsLoading(false);
        })
        .catch(() => {
          setIsEnabled(true); // Default to true on error
          setIsLoading(false);
        });
    };

    loadSetting();
    
    // Poll for changes every 2 seconds
    const interval = setInterval(loadSetting, 2000);
    return () => clearInterval(interval);
  }, []);

  const value: CashierHistoryContextType = {
    isEnabled,
    isLoading,
  };

  return (
    <CashierHistoryContext.Provider value={value}>
      {children}
    </CashierHistoryContext.Provider>
  );
};

export const useCashierHistory = (): CashierHistoryContextType => {
  const context = useContext(CashierHistoryContext);
  if (context === undefined) {
    throw new Error('useCashierHistory must be used within a CashierHistoryProvider');
  }
  return context;
};
