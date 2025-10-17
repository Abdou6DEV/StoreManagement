import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from './toastContext';

interface Sale {
  id: string;
  clientId?: string;
  discount: number;
  totalAmount: number;
  totalAmountWithDiscount: number;
  totalItems: number;
  totalCost: number;
  totalProfit: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  client?: any;
  payment?: any;
  saleItems: Array<{
    product?: { id: string; name: string; categoryName?: string };
    manualProduct?: { id: string; name: string; type: string };
    service?: { id: string; name: string; description?: string };
    quantity: number;
    price: number;
    boughtPrice?: number;
  }>;
}

interface DashboardData {
  sales: Sale[];
  products: any[];
  clients: any[];
  payments: any[];
  lowStockThreshold: number;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
}

interface DashboardContextType {
  data: DashboardData;
  refetch: () => Promise<void>;
  isDataStale: () => boolean;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

interface DashboardProviderProps {
  children: ReactNode;
}

export function DashboardProvider({ children }: DashboardProviderProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<DashboardData>({
    sales: [],
    products: [],
    clients: [],
    payments: [],
    lowStockThreshold: 5,
    loading: true,
    error: null,
    lastFetched: null,
  });

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch all data in parallel
      const [sales, products, clients, payments, lowStockThreshold] = await Promise.all([
        window.api.database.sales.getAll(),
        window.api.database.products.getAll(),
        window.api.database.clients.getAll(),
        window.api.database.payments.getAllWithClientInfo(),
        window.api.database.options.get("lowStockThreshold"),
      ]);

      setData({
        sales,
        products,
        clients,
        payments,
        lowStockThreshold: lowStockThreshold ? Number(lowStockThreshold) : 5,
        loading: false,
        error: null,
        lastFetched: new Date(),
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data',
      }));
      showToast('Failed to load dashboard data', 'error');
    }
  };

  const refetch = async () => {
    await fetchDashboardData();
  };

  const isDataStale = () => {
    if (!data.lastFetched) return true;
    const now = new Date();
    const timeDiff = now.getTime() - data.lastFetched.getTime();
    const minutesDiff = timeDiff / (1000 * 60);
    return minutesDiff > 5; // Consider data stale after 5 minutes
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const value: DashboardContextType = {
    data,
    refetch,
    isDataStale,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}

// Helper hooks for specific data
export function useSales() {
  const { data } = useDashboard();
  return data.sales;
}

export function useProducts() {
  const { data } = useDashboard();
  return data.products;
}

export function useClients() {
  const { data } = useDashboard();
  return data.clients;
}

export function usePayments() {
  const { data } = useDashboard();
  return data.payments;
}

export function useLowStockThreshold() {
  const { data } = useDashboard();
  return data.lowStockThreshold;
}

export function useDashboardLoading() {
  const { data } = useDashboard();
  return data.loading;
}

export function useDashboardError() {
  const { data } = useDashboard();
  return data.error;
}
