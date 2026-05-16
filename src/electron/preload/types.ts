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
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceCheckResult } from "../types/deviceCheck";
import type {
  CloudBackupDownloadResult,
  CloudBackupDownloadToLocalResult,
  CloudBackupTransferProgressPayload,
  CloudBackupUploadResult,
} from "../types/cloudBackup";

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
  cashier: {
    getBootstrap: () => Promise<{
      products: Product[];
      salesCounts: { productId: string; totalSold: number }[];
      completedServices: unknown[];
    }>;
  };
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
    generateUniqueBarcode: () => Promise<string>;
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
    getByClient: (clientId: string) => Promise<any[]>;
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
      creditAmount?: number;
      reason?: string;
      dueDate: Date;
      paidDate?: Date;
      type: "CREDIT" | "VERSEMENT";
      pendingSaleItems?: string;
      discount?: number;
    }) => Promise<Payment>;
    getByClient: (clientId: string) => Promise<Payment[]>;
    getAll: () => Promise<(Payment & { client: Client; sale: Sale })[]>;
    getAllWithClientInfo: () => Promise<
      (Payment & { client: Client; sale: Sale })[]
    >;
    markAsPaid: (paymentId: string, paidDate: Date) => Promise<void>;
    updateAmount: (paymentId: string, givenAmount: number) => Promise<void>;
    updateReason: (paymentId: string, reason: string | null) => Promise<void>;
    getReasonSuggestions: () => Promise<string[]>;
    cancelVersement: (paymentId: string) => Promise<{ success: boolean }>;
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
  services: {
    search: (query: string) => Promise<any[]>;
    getAll: () => Promise<any[]>;
    create: (data: { name: string; description?: string }) => Promise<any>;
    findOrCreate: (data: { name: string; description?: string }) => Promise<any>;
    getById: (id: string) => Promise<any>;
    getByClient: (clientId: string) => Promise<any[]>;
    update: (id: string, data: { name?: string; description?: string }) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
};

export type AppAPI = {
  getVersion: () => Promise<string>;
  checkForUpdates: () => Promise<{
    available: boolean;
    currentVersion: string;
    latestVersion: string;
    downloadUrl: string;
    releaseNotes?: string;
    error?: string;
  }>;
  getPrinters: () => Promise<{ name: string; displayName: string; status: number }[]>;
  printSilently: (html: string, deviceName?: string) => Promise<boolean>;
  downloadUpdate: (url: string) => Promise<{
    success: boolean;
    path: string;
    error: string | null;
  }>;
  installUpdate: (path: string) => Promise<{
    success: boolean;
    error: string | null;
  }>;
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
  /** Unpackaged dev build only: session as primary ADMIN from DB without password. */
  loginDevAsPrimaryAdmin: () => Promise<{
    success: boolean;
    user?: Omit<User, "password"> & { permissions?: any };
    error?: string;
  }>;
  loginByActivationKey: (activationKey: string, machineId?: string) => Promise<{
    success: boolean;
    user?: Omit<User, "password"> & { permissions?: any };
    error?: string;
  }>;
  needsInitialAdminSetup: () => Promise<{ needsSetup: boolean }>;
  completeInitialAdminSetup: (credentials: {
    username: string;
    password: string;
  }) => Promise<{
    success: boolean;
    user?: Omit<User, "password"> & { permissions?: any };
    error?: string;
  }>;
  createUser: (userData: {
    username: string;
    email?: string;
    password: string;
    role?: UserRole;
    permissions?: {
      canAccessCashier: boolean;
      canAccessStock: boolean;
      canAccessClients: boolean;
      canAccessBills: boolean;
      canAccessHistory: boolean;
      canAccessServices: boolean;
      canAccessDashboard: boolean;
      canManageUsers: boolean;
      canViewLogs: boolean;
      canManageSettings: boolean;
    };
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
  updatePassword: (userId: string, newPassword: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  updateUsername: (userId: string, newUsername: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  updatePermissions: (userId: string, permissions: {
    canAccessCashier: boolean;
    canAccessStock: boolean;
    canAccessClients: boolean;
    canAccessBills: boolean;
    canAccessHistory: boolean;
    canAccessDashboard: boolean;
    canManageUsers: boolean;
    canViewLogs: boolean;
    canManageSettings: boolean;
  }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  getAllUsersWithPermissions: () => Promise<{
    success: boolean;
    users?: (Omit<User, "password"> & { permissions: any })[];
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

export type SystemAPI = {
  getMachineId: () => Promise<{
    success: boolean;
    machineId?: string;
    error?: string;
  }>;
  generateValidationKey: (machineId: string) => Promise<{
    success: boolean;
    validationKey?: string;
    error?: string;
  }>;
  validateKey: (machineId: string, enteredKey: string) => Promise<{
    success: boolean;
    isValid?: boolean;
    error?: string;
  }>;
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
  off: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
};

export type BackupFile = {
  name: string;
  path: string;
  size: number;
  date: string;
  readableDate: string;
  type: "automatic" | "manual" | "cloud";
};

export type BackupResult = {
  success: boolean;
  error?: string;
  backupPath?: string;
  size?: number;
  date?: string;
  message?: string;
  backups?: BackupFile[];
};

export type BackupAPI = {
  create: () => Promise<BackupResult>;
  createManual: () => Promise<BackupResult>;
  createCloud: () => Promise<BackupResult>;
  deleteCloudUploadStaging: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  deleteListingFile: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
  ensureDailyBackup: () => Promise<{
    success: boolean;
    created?: boolean;
    skipped?: boolean;
    error?: string;
  }>;
  list: () => Promise<{ success: boolean; backups?: BackupFile[]; error?: string }>;
  restore: (backupPath: string) => Promise<BackupResult>;
  getInfo: () => Promise<{ backupDir: string; databasePath: string; backupExists: boolean }>;
  onAutoBackupSuccess: (callback: () => void) => () => void;
  onAutoCloudUploadSuccess: (callback: () => void) => () => void;
};

export type OnboardingAPI = {
  isCoreDatabaseEmpty: () => Promise<{
    success: boolean;
    isEmpty?: boolean;
    error?: string;
  }>;
};

export type LicenseGraceSnapshot = {
  lastOkAtMs: number;
  graceUntilMs: number;
  trialEndsAtMs?: number;
  expiresAtMs?: number;
};

export type OnlineAPI = {
  deviceCheck: () => Promise<DeviceCheckResult>;
  deviceRequest: (payload: DeviceRequestPayload) => Promise<DeviceRequestResult>;
  readLicenseGrace: () => Promise<LicenseGraceSnapshot | null>;
  persistLicenseGrace: (payload: {
    trialEndsAt?: string | null;
    expiresAt?: string | null;
  }) => Promise<{ success: true } | { success: false; error: string }>;
  clearLicenseGrace: () => Promise<{ success: true }>;
  backupUploadLatest: (backupFilePath: string, uploadSource?: string) => Promise<CloudBackupUploadResult>;
  backupDownloadLatest: () => Promise<CloudBackupDownloadResult>;
  backupDownloadLatestToLocal: () => Promise<CloudBackupDownloadToLocalResult>;
  onCloudBackupTransferProgress: (callback: (data: CloudBackupTransferProgressPayload) => void) => () => void;
};

export type ActivityLogAPI = {
  log: (payload: { username: string; action: string; details?: string | null }) => Promise<void>;
  getList: (filter: {
    username?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
    search?: string | null;
    searchAction?: string | null;
    searchDetails?: string | null;
    actionKeys?: string[] | null;
    limit?: number;
    offset?: number;
  }) => Promise<{ entries: Array<{ id: string; username: string; action: string; details: string | null; createdAt: Date }>; total: number }>;
  getUsernames: () => Promise<string[]>;
  getRetentionDays: () => Promise<number>;
  setRetentionDays: (days: number) => Promise<void>;
  cleanupOld: () => Promise<number>;
};

export type API = {
  database: DatabaseAPI;
  app: AppAPI;
  logger: LoggerAPI;
  auth: AuthAPI;
  system: SystemAPI;
  backup: BackupAPI;
  activityLog: ActivityLogAPI;
  onboarding: OnboardingAPI;
  online: OnlineAPI;
};
