import { ipcRenderer } from "electron";
import { Product } from "@prisma/client";

export const databaseAPI = {
  products: {
    getAll: () => ipcRenderer.invoke("db:products:getAll"),
    add: (product: Omit<Product, "id" | "createdAt" | "updatedAt">) =>
      ipcRenderer.invoke("db:products:add", product),
    update: (
      id: string,
      data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
    ) => ipcRenderer.invoke("db:products:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:products:delete", id),
    getSalesCounts: () => ipcRenderer.invoke("db:products:getSalesCounts"),
    getWithPurchaseHistory: (id: string) =>
      ipcRenderer.invoke("db:products:getWithPurchaseHistory", id),
    createWithPurchase: (data: {
      productData: any;
      purchaseData: { sellerId?: string; quantity: number; price: number };
    }) => ipcRenderer.invoke("db:products:createWithPurchase", data),
    updateWithPurchase: (data: {
      productId: string;
      additionalQuantity: number;
      purchaseData: { sellerId?: string; quantity: number; price: number };
    }) => ipcRenderer.invoke("db:products:updateWithPurchase", data),
  },
  categories: {
    getAll: () => ipcRenderer.invoke("db:categories:getAll"),
    ensure: (name: string) =>
      ipcRenderer.invoke("db:categories:ensure", name),
  },
  clients: {
    create: (data: {
      name: string;
      phone?: string;
      address?: string;
      notes?: string;
    }) => ipcRenderer.invoke("db:clients:create", data),
    getAll: () => ipcRenderer.invoke("db:clients:getAll"),
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
      },
    ) => ipcRenderer.invoke("db:clients:update", { id, data }),
  },
  sales: {
    create: (data: {
      clientId?: string;
      items: { productId: string; quantity: number; price: number }[];
      discount?: number;
    }) => ipcRenderer.invoke("db:sales:create", data),
    getAll: () => ipcRenderer.invoke("db:sales:getAll"),
    getRecent: (options?: { limit?: number; offset?: number }) =>
      ipcRenderer.invoke("db:sales:getRecent", options),
    update: (
      id: string,
      data: {
        clientId?: string;
        items: { productId: string; quantity: number; price: number }[];
        discount?: number;
      },
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
      dueDate: Date;
      paidDate?: Date;
      type: "CREDIT" | "VERSEMENT";
    }) => ipcRenderer.invoke("db:payments:create", data),
    getByClient: (clientId: string) =>
      ipcRenderer.invoke("db:payments:getByClient", clientId),
    getAll: () => ipcRenderer.invoke("db:payments:getAll"),
    getAllWithClientInfo: () =>
      ipcRenderer.invoke("db:payments:getAllWithClientInfo"),
    markAsPaid: (paymentId: string, paidDate: Date) =>
      ipcRenderer.invoke("db:payments:updatePaidAt", {
        paymentId,
        paidDate,
      }),
    updateAmount: (paymentId: string, givenAmount: number) =>
      ipcRenderer.invoke("db:payments:updateAmount", {
        paymentId,
        givenAmount,
      }),
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
      },
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
      },
    ) => ipcRenderer.invoke("db:purchases:update", { id, data }),
    delete: (id: string) => ipcRenderer.invoke("db:purchases:delete", id),
    getById: (id: string) => ipcRenderer.invoke("db:purchases:getById", id),
    getByProduct: (productId: string) =>
      ipcRenderer.invoke("db:purchases:getByProduct", productId),
    getBySeller: (sellerId: string) =>
      ipcRenderer.invoke("db:purchases:getBySeller", sellerId),
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
    delete: (id: string) =>
      ipcRenderer.invoke("db:manualProducts:delete", id),
  },
  services: {
    search: (query: string) =>
      ipcRenderer.invoke("db:services:search", query),
    getAll: () => ipcRenderer.invoke("db:services:getAll"),
    create: (data: { name: string; description?: string }) =>
      ipcRenderer.invoke("db:services:create", data),
    findOrCreate: (data: { name: string; description?: string }) =>
      ipcRenderer.invoke("db:services:findOrCreate", data),
    getById: (id: string) =>
      ipcRenderer.invoke("db:services:getById", id),
    update: (id: string, data: { name?: string; description?: string }) =>
      ipcRenderer.invoke("db:services:update", { id, data }),
    delete: (id: string) =>
      ipcRenderer.invoke("db:services:delete", id),
  },
}; 