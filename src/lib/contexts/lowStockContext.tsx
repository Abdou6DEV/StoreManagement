import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useStock } from './stockContext';
import { getWarmupSnapshot, subscribeWarmup } from '../warmup/appWarmup';

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

  // Load low stock threshold from warmup (avoid polling here)
  useEffect(() => {
    const snap = getWarmupSnapshot();
    const v = snap.options?.["lowStockThreshold"];
    const initial = v ? Number(v) : 5;
    setLowStockThreshold(initial);
    return subscribeWarmup((detail) => {
      if (detail.key !== "options") return;
      const val = detail.snapshot.options?.["lowStockThreshold"];
      const next = val ? Number(val) : 5;
      setLowStockThreshold((prev) => (prev !== next ? next : prev));
    });
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
  // Exclude products with quantity = 0 (those are out of stock, not low stock)
  const unseenLowStockCount = React.useMemo(() => {
    if (!products.length || lowStockThreshold === 0) return 0;
    
    const lowStockProducts = products.filter(product => product.quantity > 0 && product.quantity <= lowStockThreshold);
    const unseenProducts = lowStockProducts.filter(product => !seenLowStockProducts.has(product.id));
    
    return unseenProducts.length;
  }, [products, lowStockThreshold, seenLowStockProducts]);

  // Stable reference: StockTable effects depend on this; inline functions caused
  // effect cleanups to re-run every provider render and call setState in a loop.
  const markLowStockAsSeen = useCallback(() => {
    if (!products.length || lowStockThreshold === 0) return;

    const lowStockIds = products
      .filter(
        (product) =>
          product.quantity > 0 && product.quantity <= lowStockThreshold,
      )
      .map((p) => p.id);

    setSeenLowStockProducts((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of lowStockIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      localStorage.setItem(
        "seenLowStockProducts",
        JSON.stringify([...next]),
      );
      return next;
    });
  }, [products, lowStockThreshold]);

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

  const value = useMemo<LowStockContextType>(
    () => ({
      unseenLowStockCount,
      markLowStockAsSeen,
      lowStockThreshold,
    }),
    [unseenLowStockCount, markLowStockAsSeen, lowStockThreshold],
  );

  return (
    <LowStockContext.Provider value={value}>
      {children}
    </LowStockContext.Provider>
  );
};