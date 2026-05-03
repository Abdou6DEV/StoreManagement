import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useStock } from './stockContext';

interface OutOfStockContextType {
  outOfStockCount: number;
  unseenOutOfStockCount: number;
  markOutOfStockAsSeen: () => void;
}

const OutOfStockContext = createContext<OutOfStockContextType | undefined>(undefined);

export const useOutOfStock = () => {
  const context = useContext(OutOfStockContext);
  if (!context) {
    throw new Error('useOutOfStock must be used within an OutOfStockProvider');
  }
  return context;
};

interface OutOfStockProviderProps {
  children: ReactNode;
}

export const OutOfStockProvider: React.FC<OutOfStockProviderProps> = ({ children }) => {
  const { products } = useStock();
  const [seenOutOfStockProducts, setSeenOutOfStockProducts] = useState<Set<string>>(new Set());

  // Load seen products from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('seenOutOfStockProducts');
    if (saved) {
      try {
        setSeenOutOfStockProducts(new Set(JSON.parse(saved)));
      } catch (error) {
        console.error('Failed to load seen out of stock products:', error);
      }
    }
  }, []);

  // Calculate total out of stock count (products with quantity = 0)
  const outOfStockCount = useMemo(() => {
    return products.filter(product => product.quantity === 0).length;
  }, [products]);

  // Calculate unseen out of stock count (products that are out of stock but haven't been seen)
  const unseenOutOfStockCount = useMemo(() => {
    if (!products.length) return 0;
    
    const outOfStockProducts = products.filter(product => product.quantity === 0);
    const unseenProducts = outOfStockProducts.filter(product => !seenOutOfStockProducts.has(product.id));
    
    return unseenProducts.length;
  }, [products, seenOutOfStockProducts]);

  const markOutOfStockAsSeen = useCallback(() => {
    if (!products.length) return;

    const outOfStockIds = products
      .filter((product) => product.quantity === 0)
      .map((p) => p.id);

    setSeenOutOfStockProducts((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const id of outOfStockIds) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      if (!changed) return prev;
      localStorage.setItem(
        "seenOutOfStockProducts",
        JSON.stringify([...next]),
      );
      return next;
    });
  }, [products]);

  // Clean up seen products that are no longer out of stock
  useEffect(() => {
    if (!products.length) return;

    const updatedSeenProducts = new Set(seenOutOfStockProducts);
    let hasChanges = false;
    
    seenOutOfStockProducts.forEach(productId => {
      const product = products.find(p => p.id === productId);
      if (product && product.quantity > 0) {
        updatedSeenProducts.delete(productId);
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      setSeenOutOfStockProducts(updatedSeenProducts);
      localStorage.setItem('seenOutOfStockProducts', JSON.stringify(Array.from(updatedSeenProducts)));
    }
  }, [products, seenOutOfStockProducts]);

  const value = useMemo<OutOfStockContextType>(
    () => ({
      outOfStockCount,
      unseenOutOfStockCount,
      markOutOfStockAsSeen,
    }),
    [outOfStockCount, unseenOutOfStockCount, markOutOfStockAsSeen],
  );

  return (
    <OutOfStockContext.Provider value={value}>
      {children}
    </OutOfStockContext.Provider>
  );
};
