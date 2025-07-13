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
      };
      app: {
        getVersion: () => Promise<string>;
      };
    };
  }
}
