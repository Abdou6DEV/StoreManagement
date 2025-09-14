import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useStock } from './stockContext';

interface LowStockContextType {
  unseenLowStockCount: number;
  markLowStockAsSeen: () => void;
  lowStockThreshold: number;
}

const LowStockContext = createContext<LowStockContextType | undefined>(undefined);

export const useLowStock = () => {
  const context = useContext(LowStockContext);
  if (!context) {
    throw new Error('useLowStock must be used within a LowStockProvider');
  }
  return context;
};

interface LowStockProviderProps {
  children: ReactNode;
}

export const LowStockProvider: React.FC<LowStockProviderProps> = ({ children }) => {
  const { products } = useStock();
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(5);
  const [seenLowStockProducts, setSeenLowStockProducts] = useState<Set<string>>(new Set());

  // Load low stock threshold from options and listen for changes
  useEffect(() => {
    const loadThreshold = () => {
      window.api.database.options
        .get("lowStockThreshold")
        .then((val) => {
          const newThreshold = val ? Number(val) : 5;
          setLowStockThreshold(prev => {
            // Only update if threshold actually changed
            if (prev !== newThreshold) {
              return newThreshold;
            }
            return prev;
          });
        });
    };

    // Load initial threshold
    loadThreshold();

    // Listen for threshold changes (poll every 1 second for responsiveness)
    const interval = setInterval(loadThreshold, 1000);

    return () => clearInterval(interval);
  }, []);

  // Load seen products from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('seenLowStockProducts');
    if (saved) {
      try {
        setSeenLowStockProducts(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Failed to load seen low stock products:', error);
      }
    }
  }, []);

  // Calculate unseen low stock count - SIMPLE AND INSTANT
  const unseenLowStockCount = React.useMemo(() => {
    if (!products.length || lowStockThreshold === 0) return 0;
    
    const lowStockProducts = products.filter(product => product.quantity <= lowStockThreshold);
    const unseenProducts = lowStockProducts.filter(product => !seenLowStockProducts.has(product.id));
    
    return unseenProducts.length;
  }, [products, lowStockThreshold, seenLowStockProducts]);

  // Mark all current low stock products as seen
  const markLowStockAsSeen = () => {
    if (!products.length || lowStockThreshold === 0) return;

    const lowStockProducts = products.filter(product => product.quantity <= lowStockThreshold);
    const newSeenProducts = new Set(seenLowStockProducts);
    
    lowStockProducts.forEach(product => {
      newSeenProducts.add(product.id);
    });
    
    setSeenLowStockProducts(newSeenProducts);
    localStorage.setItem('seenLowStockProducts', JSON.stringify(Array.from(newSeenProducts)));
  };

  // Clean up seen products that are no longer low stock - SIMPLE
  useEffect(() => {
    if (!products.length) return;

    const updatedSeenProducts = new Set(seenLowStockProducts);
    let hasChanges = false;
    
    seenLowStockProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product && product.quantity > lowStockThreshold) {
        updatedSeenProducts.delete(productId);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSeenLowStockProducts(updatedSeenProducts);
      localStorage.setItem('seenLowStockProducts', JSON.stringify(Array.from(updatedSeenProducts)));
    }
  }, [products, lowStockThreshold, seenLowStockProducts]);

  const value: LowStockContextType = {
    unseenLowStockCount,
    markLowStockAsSeen,
    lowStockThreshold,
  };

  return (
    <LowStockContext.Provider value={value}>
      {children}
    </LowStockContext.Provider>
  );
};