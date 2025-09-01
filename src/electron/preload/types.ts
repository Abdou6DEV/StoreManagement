import {
  Product,
  Category,
  Client,
  Sale,
  SaleItem,
  Payment,
  Seller,
  User,
  UserRole,
} from "@prisma/client";
import { LogLevel } from "../../lib/logger/common";

export type SaleWithDetails = Sale & {
  client?: Client;
  saleItems: (SaleItem & {
    product: Product;
  })[];
  payment?: Payment;
  totalAmount: number;
  totalAmountWithDiscount: number;
  paidAmount: number;
  remainingAmount: number;
  totalItems: number;
  isPaidInCash: boolean;
};

export type DatabaseAPI = {
  products: {
    getAll: () => Promise<Product[]>;
    add: (
      product: Omit<Product, "id" | "createdAt" | "updatedAt">
    ) => Promise<Product>;
    update: (
      id: string,
      data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>
    ) => Promise<Product>;
    delete: (id: string) => Promise<void>;
    getSalesCounts: () => Promise<{ productId: string; totalSold: number }[]>;
    getWithPurchaseHistory: (id: string) => Promise<any>;
    createWithPurchase: (data: {
      productData: any;
      purchaseData: {
        sellerId?: string;
        quantity: number;
        price: number;
      };
    }) => Promise<any>;
    updateWithPurchase: (data: {
      productId: string;
      additionalQuantity: number;
      purchaseData: {
        sellerId?: string;
        quantity: number;
        price: number;
      };
      updateBoughtPrice?: boolean;
      newSellingPrice?: number;
    }) => Promise<any>;
  };
  categories: {
    getAll: () => Promise<Category[]>;
    ensure: (name: string) => Promise<Category>;
  };
  clients: {
    create: (data: {
      name: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => Promise<Client>;
    getAll: () => Promise<Client[]>;
    getAllWithTotalPurchases: () => Promise<
      Client & { totalPurchases: number }[]
    >;
    delete: (id: string) => Promise<void>;
    update: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        address?: string;
        notes?: string;
      }
    ) => Promise<Client>;
  };
  sales: {
    create: (data: {
      clientId?: string;
      items: { productId: string; quantity: number; price: number }[];
      discount?: number;
    }) => Promise<Sale>;
    getAll: () => Promise<SaleWithDetails[]>;
    getRecent: (options?: { limit?: number; offset?: number }) => Promise<{
      sales: SaleWithDetails[];
      totalCount: number;
      hasMore: boolean;
    }>;
    update: (
      id: string,
      data: {
        clientId?: string;
        items: { productId: string; quantity: number; price: number }[];
        discount?: number;
      }
    ) => Promise<SaleWithDetails>;
    delete: (id: string) => Promise<void>;
  };
  options: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
  };
  payments: {
    create: (data: {
      saleId?: string;
      clientId: string;
      givenAmount: number;
      dueDate: Date;
      paidDate?: Date;
      type: "CREDIT" | "VERSEMENT";
    }) => Promise<Payment>;
    getByClient: (clientId: string) => Promise<Payment[]>;
    getAll: () => Promise<(Payment & { client: Client; sale: Sale })[]>;
    getAllWithClientInfo: () => Promise<
      (Payment & { client: Client; sale: Sale })[]
    >;
    markAsPaid: (paymentId: string, paidDate: Date) => Promise<void>;
    updateAmount: (paymentId: string, givenAmount: number) => Promise<void>;
  };
  sellers: {
    getAll: () => Promise<Seller[]>;
    create: (data: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    }) => Promise<Seller>;
    update: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
      }
    ) => Promise<Seller>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<Seller>;
  };
  purchases: {
    getAll: () => Promise<any[]>;
    create: (data: {
      productId: string;
      sellerId?: string;
      quantity: number;
      price: number;
    }) => Promise<any>;
    update: (
      id: string,
      data: {
        productId?: string;
        sellerId?: string;
        quantity?: number;
        price?: number;
      }
    ) => Promise<any>;
    delete: (id: string) => Promise<void>;
    getById: (id: string) => Promise<any>;
    getByProduct: (productId: string) => Promise<any[]>;
    getBySeller: (sellerId: string) => Promise<any[]>;
  };
  manualProducts: {
    search: (
      query: string
    ) => Promise<{ id: string; name: string; type: string }[]>;
    getAll: () => Promise<{ id: string; name: string; type: string }[]>;
    create: (data: {
      name: string;
      type: string;
    }) => Promise<{ id: string; name: string; type: string }>;
    findOrCreate: (data: {
      name: string;
      type: string;
    }) => Promise<{ id: string; name: string; type: string }>;
    getById: (
      id: string
    ) => Promise<{ id: string; name: string; type: string } | null>;
    update: (
      id: string,
      data: { name?: string; type?: string }
    ) => Promise<{ id: string; name: string; type: string }>;
    delete: (id: string) => Promise<void>;
  };
};

export type AppAPI = {
  getVersion: () => Promise<string>;
};

export type LoggerAPI = {
  log: (entry: {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: string;
    data?: any;
    userId?: string;
  }) => Promise<void>;
  getLogFiles: () => Promise<string[]>;
  readLogFile: (filePath: string, lines?: number) => Promise<string[]>;
  getLogFileStats: (
    filePath: string
  ) => Promise<{ totalLines: number; fileSize: number }>;
  clearLogs: () => Promise<void>;
  updateConfig: (config: any) => Promise<void>;
  getConfig: () => Promise<{
    level: LogLevel;
    maxFileSize: number;
    maxFiles: number;
    logToFile: boolean;
    logToConsole: boolean;
  }>;
};

export type AuthAPI = {
  login: (credentials: { username: string; password: string }) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  createUser: (userData: {
    username: string;
    email?: string;
    password: string;
    role?: UserRole;
  }) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  getUserById: (userId: string) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  getUserByUsername: (username: string) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  updateUserRole: (
    userId: string,
    role: string
  ) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  getAllUsers: () => Promise<{
    success: boolean;
    users?: Omit<User, "password">[];
    error?: string;
  }>;
  deactivateUser: (userId: string) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  activateUser: (userId: string) => Promise<{
    success: boolean;
    user?: Omit<User, "password">;
    error?: string;
  }>;
  deleteUser: (userId: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
};

export type API = {
  database: DatabaseAPI;
  app: AppAPI;
  logger: LoggerAPI;
  auth: AuthAPI;
};
