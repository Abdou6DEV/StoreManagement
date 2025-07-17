import { contextBridge, ipcRenderer } from "electron";
import { Product, Category } from "@prisma/client";

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
      // Optionally, add search/filter methods here
      delete: (id: string) => ipcRenderer.invoke("db:products:delete", id),
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
    },
    sales: {
      create: (data: {
        clientId?: string;
        items: { productId: string; quantity: number; price: number }[];
      }) => ipcRenderer.invoke("db:sales:create", data),
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
          }) => Promise<any>;
          getAll: () => Promise<any[]>;
        };
        sales: {
          create: (data: {
            clientId?: string;
            items: { productId: string; quantity: number; price: number }[];
          }) => Promise<any>;
        };
      };
      app: {
        getVersion: () => Promise<string>;
      };
    };
  }
}
