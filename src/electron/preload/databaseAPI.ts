import { ipcRenderer } from "electron";
import { Product } from "@prisma/client";

export const databaseAPI = {
  cashier: {
    getBootstrap: () => ipcRenderer.invoke("db:cashier:getBootstrap"),
  },
  products: {
    getAll: () => ipcRenderer.invoke("db:products:getAll"),
    add: (productOrPayload: Omit<Product, "id" | "createdAt" | "updatedAt"> | { product: Omit<Product, "id" | "createdAt" | "updatedAt">; username?: string }) =>
      ipcRenderer.invoke("db:products:add", productOrPayload),
    update: (
      id: string,
      data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
      username?: string,
      logAction?: string,
      skipLog?: boolean
    ) => ipcRenderer.invoke("db:products:update", { id, data, username, logAction, skipLog }),
    delete: (id: string) => ipcRenderer.invoke("db:products:delete", id),
    getSalesCounts: () => ipcRenderer.invoke("db:products:getSalesCounts"),
    getWithPurchaseHistory: (id: string) =>
      ipcRenderer.invoke("db:products:getWithPurchaseHistory", id),
    createWithPurchase: (data: {
      productData: any;
      purchaseData: { sellerId?: string; quantity: number; price: number };
      username?: string;
    }) => ipcRenderer.invoke("db:products:createWithPurchase", data),
    updateWithPurchase: (data: {
      productId: string;
      additionalQuantity: number;
      purchaseData: { sellerId?: string; quantity: number; price: number };
      updateBoughtPrice?: boolean;
      newSellingPrice?: number;
      username?: string;
    }) => ipcRenderer.invoke("db:products:updateWithPurchase", data),
    generateUniqueBarcode: () => ipcRenderer.invoke("db:products:generateUniqueBarcode"),
        getUnused: () => ipcRenderer.invoke("db:products:getUnused"),
        cleanupUnused: () => ipcRenderer.invoke("db:products:cleanupUnused"),
        getUnusedProducts: (periodMonths: number) => ipcRenderer.invoke("db:products:getUnusedProducts", periodMonths),
        deleteMultipleProducts: (productIds: string[]) => ipcRenderer.invoke("db:products:deleteMultipleProducts", productIds),
  },
  categories: {
    getAll: () => ipcRenderer.invoke("db:categories:getAll"),
    ensure: (name: string) => ipcRenderer.invoke("db:categories:ensure", name),
  },
  clients: {
    create: (data: {
      name: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => ipcRenderer.invoke("db:clients:create", data),
    getAll: () => ipcRenderer.invoke("db:clients:getAll"),
    findByName: (name: string) => ipcRenderer.invoke("db:clients:findByName", name),
    getAllWithTotalPurchases: () =>
      ipcRenderer.invoke("db:clients:getAllWithTotalPurchases"),
    delete: (id: string) => ipcRenderer.invoke("db:clients:delete", id),
    update: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        address?: string;
        notes?: string;
      }
    ) => ipcRenderer.invoke("db:clients:update", { id, data }),
  },
  sales: {
    create: (data: {
      clientId?: string;
      items: {
        productId?: string;
        quantity: number;
        price: number;
        manualProductName?: string;
        manualProductType?: string;
        manualProductCostPrice?: number;
        serviceName?: string;
        serviceDescription?: string;
        serviceCostPrice?: number;
        serviceAppointmentId?: string;
      }[];
      discount?: number;
    }) => ipcRenderer.invoke("db:sales:create", data),
    getAll: () => ipcRenderer.invoke("db:sales:getAll"),
    getAllLight: () => ipcRenderer.invoke("db:sales:getAllLight"),
    getRecent: (options?: { limit?: number; offset?: number; days?: number }) =>
      ipcRenderer.invoke("db:sales:getRecent", options),
    search: (options: { searchTerm: string; limit?: number; offset?: number; days?: number }) =>
      ipcRenderer.invoke("db:sales:search", options),
    getAggregatedByPeriod: (
      period: "day" | "month" | "year",
      startDate: Date,
      endDate: Date
    ) =>
      ipcRenderer.invoke(
        "db:sales:getAggregatedByPeriod",
        period,
        startDate,
        endDate
      ),
    getSummary: (startDate: Date, endDate: Date) =>
      ipcRenderer.invoke("db:sales:getSummary", startDate, endDate),
    getBySpecificPeriod: (
      period: "day" | "month" | "year",
      periodValue: string
    ) =>
      ipcRenderer.invoke("db:sales:getBySpecificPeriod", period, periodValue),
    getByClient: (clientId: string) => ipcRenderer.invoke("db:sales:getByClient", clientId),
    getById: (id: string) => ipcRenderer.invoke("db:sales:getById", id),
    update: (
      id: string,
      data: {
        clientId?: string;
        items: { productId: string; quantity: number; price: number }[];
        discount?: number;
      }
    ) => ipcRenderer.invoke("db:sales:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:sales:delete", id),
  },
  options: {
    get: (key: string) => ipcRenderer.invoke("db:options:get", key),
    set: (key: string, value: string) =>
      ipcRenderer.invoke("db:options:set", { key, value }),
  },
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
    }) => ipcRenderer.invoke("db:payments:create", data),
    getByClient: (clientId: string) =>
      ipcRenderer.invoke("db:payments:getByClient", clientId),
    getByClientWithInfo: (clientId: string) =>
      ipcRenderer.invoke("db:payments:getByClientWithInfo", clientId),
    getAll: () => ipcRenderer.invoke("db:payments:getAll"),
    getAllWithClientInfo: () =>
      ipcRenderer.invoke("db:payments:getAllWithClientInfo"),
    getBySpecificPeriod: (
      period: "day" | "month" | "year",
      periodValue: string
    ) =>
      ipcRenderer.invoke(
        "db:payments:getBySpecificPeriod",
        period,
        periodValue
      ),
    markAsPaid: (paymentId: string, paidDate: Date | null) =>
      ipcRenderer.invoke("db:payments:updatePaidAt", {
        paymentId,
        paidDate,
      }),
    updateAmount: (paymentId: string, givenAmount: number) =>
      ipcRenderer.invoke("db:payments:updateAmount", {
        paymentId,
        givenAmount,
      }),
    updateReason: (paymentId: string, reason: string | null) =>
      ipcRenderer.invoke("db:payments:updateReason", {
        paymentId,
        reason,
      }),
    getReasonSuggestions: () =>
      ipcRenderer.invoke("db:payments:getReasonSuggestions"),
    cancelVersement: (paymentId: string) =>
      ipcRenderer.invoke("db:payments:cancelVersement", paymentId),
  },
  sellers: {
    getAll: () => ipcRenderer.invoke("db:sellers:getAll"),
    create: (data: {
      name: string;
      phone?: string;
      email?: string;
      address?: string;
      notes?: string;
    }) => ipcRenderer.invoke("db:sellers:create", data),
    update: (
      id: string,
      data: {
        name?: string;
        phone?: string;
        email?: string;
        address?: string;
        notes?: string;
      }
    ) => ipcRenderer.invoke("db:sellers:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:sellers:delete", id),
    getById: (id: string) => ipcRenderer.invoke("db:sellers:getById", id),
  },
  purchases: {
    getAll: () => ipcRenderer.invoke("db:purchases:getAll"),
    create: (data: {
      productId: string;
      sellerId?: string;
      quantity: number;
      price: number;
    }) => ipcRenderer.invoke("db:purchases:create", data),
    update: (
      id: string,
      data: {
        productId?: string;
        sellerId?: string;
        quantity?: number;
        price?: number;
      }
    ) => ipcRenderer.invoke("db:purchases:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:purchases:delete", id),
    getById: (id: string) => ipcRenderer.invoke("db:purchases:getById", id),
    getByProduct: (productId: string) =>
      ipcRenderer.invoke("db:purchases:getByProduct", productId),
    getBySeller: (sellerId: string) =>
      ipcRenderer.invoke("db:purchases:getBySeller", sellerId),
    getBySpecificPeriod: (
      period: "day" | "month" | "year",
      periodValue: string
    ) =>
      ipcRenderer.invoke(
        "db:purchases:getBySpecificPeriod",
        period,
        periodValue
      ),
    createWithItems: (data: {
      sellerId?: string;
      items: Array<{
        productId: string;
        quantity: number;
        price: number;
      }>;
    }) => ipcRenderer.invoke("db:purchases:createWithItems", data),
    updateWithItems: (
      purchaseId: string,
      data: {
        sellerId?: string;
        items: Array<{
          id?: string;
          productId: string;
          quantity: number;
          price: number;
        }>;
      }
    ) =>
      ipcRenderer.invoke("db:purchases:updateWithItems", { purchaseId, data }),
  },
  purchaseItems: {
    create: (data: {
      productId: string;
      purchaseId: string;
      quantity: number;
      price: number;
    }) => ipcRenderer.invoke("db:purchaseItems:create", data),
    update: (
      id: string,
      data: {
        quantity?: number;
        price?: number;
      }
    ) => ipcRenderer.invoke("db:purchaseItems:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:purchaseItems:delete", id),
    getByPurchase: (purchaseId: string) =>
      ipcRenderer.invoke("db:purchaseItems:getByPurchase", purchaseId),
  },
  manualProducts: {
    search: (query: string) =>
      ipcRenderer.invoke("db:manualProducts:search", query),
    getAll: () => ipcRenderer.invoke("db:manualProducts:getAll"),
    create: (data: { name: string; type: string }) =>
      ipcRenderer.invoke("db:manualProducts:create", data),
    findOrCreate: (data: { name: string; type: string }) =>
      ipcRenderer.invoke("db:manualProducts:findOrCreate", data),
    getById: (id: string) =>
      ipcRenderer.invoke("db:manualProducts:getById", id),
    update: (id: string, data: { name?: string; type?: string }) =>
      ipcRenderer.invoke("db:manualProducts:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:manualProducts:delete", id),
  },
  services: {
    search: (query: string) => ipcRenderer.invoke("db:services:search", query),
    getAll: () => ipcRenderer.invoke("db:services:getAll"),
    create: (data: { name: string; description?: string }) =>
      ipcRenderer.invoke("db:services:create", data),
    findOrCreate: (data: { name: string; description?: string }) =>
      ipcRenderer.invoke("db:services:findOrCreate", data),
    getById: (id: string) => ipcRenderer.invoke("db:services:getById", id),
    getByClient: (clientId: string) => ipcRenderer.invoke("db:services:getByClient", clientId),
    update: (id: string, data: { name?: string; description?: string }) =>
      ipcRenderer.invoke("db:services:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:services:delete", id),
  },
  bills: {
    create: (data: {
      title: string;
      description?: string;
      type: string;
      amount: number;
      nextBillDate: Date;
      duration: string;
      notes?: string;
      firstPaymentNotes?: string;
    }) => ipcRenderer.invoke("db:bills:create", data),
    getAll: () => ipcRenderer.invoke("db:bills:getAll"),
    getById: (id: string) => ipcRenderer.invoke("db:bills:getById", id),
    update: (id: string, data: {
      title?: string;
      description?: string;
      type?: string;
      amount?: number;
      nextBillDate?: Date;
      duration?: string;
      notes?: string;
    }) => ipcRenderer.invoke("db:bills:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:bills:delete", id),
    getFiltered: (filters?: {
      type?: string;
      duration?: string;
      search?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }) => ipcRenderer.invoke("db:bills:getFiltered", filters),
    getDueSoon: (days?: number) => ipcRenderer.invoke("db:bills:getDueSoon", days),
    getStats: () => ipcRenderer.invoke("db:bills:getStats"),
    getBillTypes: () => ipcRenderer.invoke("db:bills:getBillTypes"),
    getBillTitles: () => ipcRenderer.invoke("db:bills:getBillTitles"),
    getBillByTitle: (title: string) => ipcRenderer.invoke("db:bills:getBillByTitle", title),
    recordPayment: (billId: string, amount: number, notes?: string) => ipcRenderer.invoke("db:bills:recordPayment", billId, amount, notes),
    getBillWithPayments: (billId: string) => ipcRenderer.invoke("db:bills:getBillWithPayments", billId),
    getAllPayments: () => ipcRenderer.invoke("db:bills:getAllPayments"),
    deletePayment: (id: string, username?: string) =>
      ipcRenderer.invoke("db:bills:deletePayment", { id, username }),
    getBillsPaymentsAggregatedByPeriod: (
      period: "day" | "month" | "year",
      startDate: Date,
      endDate: Date
    ) => ipcRenderer.invoke("db:bills:getBillsPaymentsAggregatedByPeriod", period, startDate, endDate),
    getBySpecificPeriod: (
      period: "day" | "month" | "year",
      periodValue: string
    ) => ipcRenderer.invoke("db:bills:getBySpecificPeriod", period, periodValue),
    resetBillToNextDuration: (id: string) => ipcRenderer.invoke("db:bills:resetBillToNextDuration", id),
  },
  serviceAppointments: {
    create: (data: {
      name: string;
      serviceType: string;
      description?: string;
      costPrice?: number;
      servicePrice: number;
      clientId?: string;
      dueDate: Date;
      notes?: string;
    }) => ipcRenderer.invoke("db:serviceAppointments:create", data),
    getAll: () => ipcRenderer.invoke("db:serviceAppointments:getAll"),
    getById: (id: string) => ipcRenderer.invoke("db:serviceAppointments:getById", id),
    getByClient: (clientId: string) => ipcRenderer.invoke("db:serviceAppointments:getByClient", clientId),
    getUpcoming: (days?: number) => ipcRenderer.invoke("db:serviceAppointments:getUpcoming", days),
    getOverdue: () => ipcRenderer.invoke("db:serviceAppointments:getOverdue"),
    search: (query: string) => ipcRenderer.invoke("db:serviceAppointments:search", query),
    update: (id: string, data: {
      name?: string;
      serviceType?: string;
      description?: string;
      costPrice?: number;
      servicePrice?: number;
      clientId?: string;
      dueDate?: Date;
      notes?: string;
    }) => ipcRenderer.invoke("db:serviceAppointments:update", { id, data }),
    markCompleted: (id: string) => ipcRenderer.invoke("db:serviceAppointments:markCompleted", id),
    markIncomplete: (id: string) => ipcRenderer.invoke("db:serviceAppointments:markIncomplete", id),
    delete: (id: string) => ipcRenderer.invoke("db:serviceAppointments:delete", id),
    getStats: () => ipcRenderer.invoke("db:serviceAppointments:getStats"),
    getServiceTypes: () => ipcRenderer.invoke("db:serviceAppointments:getServiceTypes"),
    getServiceNames: () => ipcRenderer.invoke("db:serviceAppointments:getServiceNames"),
    getCompletedForCashier: () => ipcRenderer.invoke("db:serviceAppointments:getCompletedForCashier"),
    isSold: (id: string) => ipcRenderer.invoke("db:serviceAppointments:isSold", id),
    getSaleId: (id: string) => ipcRenderer.invoke("db:serviceAppointments:getSaleId", id),
    getPaymentStatus: (id: string) => ipcRenderer.invoke("db:serviceAppointments:getPaymentStatus", id),
    updatePaymentStatus: (id: string, isPaid: boolean) => ipcRenderer.invoke("db:serviceAppointments:updatePaymentStatus", { id, isPaid }),
  },
};
