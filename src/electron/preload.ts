import { contextBridge, ipcRenderer } from "electron";
import {
  Product,
  Category,
  Client,
  Sale,
  SaleItem,
  Payment,
} from "@prisma/client";

type SaleWithDetails = Sale & {
  client?: Client;
  saleItems: (SaleItem & {
    product: Product;
  })[];
  payment?: Payment;
  totalAmount: number;
  totalWithDiscount: number;
  totalPaid: number;
  totalItems: number;
  remainingAmount: number;
  isPaidInCash: boolean;
};

contextBridge.exposeInMainWorld("api", {
  database: {
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
        purchaseData: { sellerId?: string; quantity: number };
      }) => ipcRenderer.invoke("db:products:createWithPurchase", data),
      updateWithPurchase: (data: {
        productId: string;
        additionalQuantity: number;
        purchaseData: { sellerId?: string; quantity: number };
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
    },
    options: {
      get: (key: string) => ipcRenderer.invoke("db:options:get", key),
      set: (key: string, value: string) =>
        ipcRenderer.invoke("db:options:set", { key, value }),
    },
    payments: {
      create: (data: {
        saleId: string;
        clientId: string;
        givenAmount: number;
        dueDate: Date;
        paidDate?: Date;
        type: "CREDIT" | "VERSEMENT";
      }) => ipcRenderer.invoke("db:payments:create", data),
      getByClient: (clientId: string) =>
        ipcRenderer.invoke("db:payments:getByClient", clientId),
      getAll: () => ipcRenderer.invoke("db:payments:getAll"),
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
      }) => ipcRenderer.invoke("db:sellers:create", data),
      update: (
        id: string,
        data: {
          name?: string;
          phone?: string;
          email?: string;
          address?: string;
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
      }) => ipcRenderer.invoke("db:purchases:create", data),
      update: (
        id: string,
        data: {
          productId?: string;
          sellerId?: string;
          quantity?: number;
        },
      ) => ipcRenderer.invoke("db:purchases:update", { id, data }),
      delete: (id: string) => ipcRenderer.invoke("db:purchases:delete", id),
      getById: (id: string) => ipcRenderer.invoke("db:purchases:getById", id),
      getByProduct: (productId: string) =>
        ipcRenderer.invoke("db:purchases:getByProduct", productId),
      getBySeller: (sellerId: string) =>
        ipcRenderer.invoke("db:purchases:getBySeller", sellerId),
    },
  },
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
  },
});

declare global {
  interface Window {
    api: {
      database: {
        products: {
          getAll: () => Promise<Product[]>;
          add: (
            product: Omit<Product, "id" | "createdAt" | "updatedAt">,
          ) => Promise<Product>;
          update: (
            id: string,
            data: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>,
          ) => Promise<Product>;
          delete: (id: string) => Promise<void>;
          getSalesCounts: () => Promise<
            { productId: string; totalSold: number }[]
          >;
          getWithPurchaseHistory: (id: string) => Promise<any>;
          createWithPurchase: (data: {
            productData: any;
            purchaseData: { sellerId?: string; quantity: number };
          }) => Promise<any>;
          updateWithPurchase: (data: {
            productId: string;
            additionalQuantity: number;
            purchaseData: { sellerId?: string; quantity: number };
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
            },
          ) => Promise<Client>;
        };
        sales: {
          create: (data: {
            clientId?: string;
            items: { productId: string; quantity: number; price: number }[];
            discount?: number;
          }) => Promise<Sale>;
          getAll: () => Promise<SaleWithDetails[]>;
        };
        options: {
          get: (key: string) => Promise<string | null>;
          set: (key: string, value: string) => Promise<void>;
        };
        payments: {
          create: (data: {
            saleId: string;
            clientId: string;
            givenAmount: number;
            dueDate: Date;
            paidDate?: Date;
            type: "CREDIT" | "VERSEMENT";
          }) => Promise<Payment>;
          getByClient: (clientId: string) => Promise<Payment[]>;
          getAll: () => Promise<(Payment & { client: Client; sale: Sale })[]>;
          markAsPaid: (paymentId: string, paidDate: Date) => Promise<void>;
          updateAmount: (
            paymentId: string,
            givenAmount: number,
          ) => Promise<void>;
        };
        sellers: {
          getAll: () => Promise<any[]>;
          create: (data: {
            name: string;
            phone?: string;
            email?: string;
            address?: string;
          }) => Promise<any>;
          update: (
            id: string,
            data: {
              name?: string;
              phone?: string;
              email?: string;
              address?: string;
            },
          ) => Promise<any>;
          delete: (id: string) => Promise<void>;
          getById: (id: string) => Promise<any>;
        };
        purchases: {
          getAll: () => Promise<any[]>;
          create: (data: {
            productId: string;
            sellerId?: string;
            quantity: number;
          }) => Promise<any>;
          update: (
            id: string,
            data: {
              productId?: string;
              sellerId?: string;
              quantity?: number;
            },
          ) => Promise<any>;
          delete: (id: string) => Promise<void>;
          getById: (id: string) => Promise<any>;
          getByProduct: (productId: string) => Promise<any[]>;
          getBySeller: (sellerId: string) => Promise<any[]>;
        };
      };
      app: {
        getVersion: () => Promise<string>;
      };
    };
  }
}
