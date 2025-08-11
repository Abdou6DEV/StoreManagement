import { ipcMain } from "electron";
import {
  getAllCategories,
  ensureCategory,
} from "../../lib/database/categories";
import {
  updateProduct,
  getAllProducts,
  addProduct,
  deleteProduct,
  getProductWithPurchaseHistory,
  createProductWithPurchase,
  updateProductWithPurchase,
} from "../../lib/database/products";
import {
  getAllClients,
  getAllClientsWithTotalPurchases,
  createClient,
  deleteClient,
  updateClient,
} from "../../lib/database/clients";
import {
  createSale,
  getProductSalesCounts,
  getAllSales,
  updateSale,
  getRecentSales,
  deleteSale,
  getSalesAggregatedByPeriod,
  getSalesSummary,
  getSalesBySpecificPeriod,
} from "../../lib/database/sales";
import { getOption, setOption } from "../../lib/database/options";
import {
  createPayment,
  getPaymentsByClient,
  getAllPayments,
  getAllPaymentsWithClientInfo,
  updatePaymentPaidAt,
  updatePaymentAmount,
  getPaymentsBySpecificPeriod,
} from "../../lib/database/payments";
import {
  getAllSellers,
  createSeller,
  updateSeller,
  deleteSeller,
  getSellerById,
} from "../../lib/database/sellers";
import {
  getAllPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchaseById,
  getPurchasesByProduct,
  getPurchasesBySeller,
  getPurchasesBySpecificPeriod,
  createPurchaseWithItems,
  updatePurchaseWithItems,
  createPurchaseItem,
  updatePurchaseItem,
  deletePurchaseItem,
  getPurchaseItemsByPurchase,
} from "../../lib/database/purchases";
import {
  searchManualProducts,
  getAllManualProducts,
  createManualProduct,
  findOrCreateManualProduct,
  getManualProductById,
  updateManualProduct,
  deleteManualProduct,
} from "../../lib/database/manualProducts";
import {
  searchServices,
  getAllServices,
  createService,
  findOrCreateService,
  getServiceById,
  updateService,
  deleteService,
} from "../../lib/database/services";

export function setupDatabaseHandlers() {
  // Products handlers
  ipcMain.handle("db:products:getAll", async () => {
    return await getAllProducts();
  });

  ipcMain.handle("db:products:add", async (_event, product) => {
    return await addProduct(product);
  });

  ipcMain.handle("db:products:update", async (_event, { id, data }) => {
    return await updateProduct(id, data);
  });

  ipcMain.handle("db:products:delete", async (_event, id: string) => {
    return await deleteProduct(id);
  });

  ipcMain.handle(
    "db:products:getWithPurchaseHistory",
    async (_event, id: string) => {
      return await getProductWithPurchaseHistory(id);
    },
  );

  ipcMain.handle(
    "db:products:createWithPurchase",
    async (_event, { productData, purchaseData }) => {
      return await createProductWithPurchase(productData, purchaseData);
    },
  );

  ipcMain.handle(
    "db:products:updateWithPurchase",
    async (_event, { productId, additionalQuantity, purchaseData }) => {
      return await updateProductWithPurchase(
        productId,
        additionalQuantity,
        purchaseData,
      );
    },
  );

  // Categories handlers
  ipcMain.handle("db:categories:getAll", async () => {
    return await getAllCategories();
  });

  ipcMain.handle("db:categories:ensure", async (_event, name) => {
    return await ensureCategory(name);
  });

  // Clients handlers
  ipcMain.handle("db:clients:create", async (_event, data) => {
    return await createClient(data);
  });

  ipcMain.handle("db:clients:getAll", async () => {
    return await getAllClients();
  });

  ipcMain.handle("db:clients:delete", async (_event, id: string) => {
    return await deleteClient(id);
  });

  ipcMain.handle("db:clients:update", async (_event, { id, data }) => {
    return await updateClient(id, data);
  });

  ipcMain.handle("db:clients:getAllWithTotalPurchases", async () => {
    return await getAllClientsWithTotalPurchases();
  });

  // Sales handlers
  ipcMain.handle("db:sales:create", async (_event, data) => {
    return await createSale(data);
  });

  ipcMain.handle("db:products:getSalesCounts", async () => {
    return await getProductSalesCounts();
  });

  ipcMain.handle("db:sales:getAll", async () => {
    return await getAllSales();
  });

  ipcMain.handle("db:sales:getRecent", async (_event, { limit, offset }) => {
    return await getRecentSales(limit, offset);
  });

  ipcMain.handle("db:sales:update", async (_event, { id, data }) => {
    return await updateSale(id, data);
  });

  ipcMain.handle("db:sales:delete", async (_event, id: string) => {
    return await deleteSale(id);
  });

  ipcMain.handle(
    "db:sales:getAggregatedByPeriod",
    async (_event, period, startDate, endDate) => {
      return await getSalesAggregatedByPeriod(
        period,
        new Date(startDate),
        new Date(endDate),
      );
    },
  );

  ipcMain.handle("db:sales:getSummary", async (_event, startDate, endDate) => {
    return await getSalesSummary(new Date(startDate), new Date(endDate));
  });

  ipcMain.handle(
    "db:sales:getBySpecificPeriod",
    async (_event, period, periodValue) => {
      return await getSalesBySpecificPeriod(period, periodValue);
    },
  );

  // Options handlers
  ipcMain.handle("db:options:get", async (_event, key: string) => {
    return await getOption(key);
  });

  ipcMain.handle("db:options:set", async (_event, { key, value }) => {
    await setOption(key, value);
    return true;
  });

  // Payments handlers
  ipcMain.handle("db:payments:create", async (_event, data) => {
    return await createPayment(data);
  });

  ipcMain.handle(
    "db:payments:getByClient",
    async (_event, clientId: string) => {
      return await getPaymentsByClient(clientId);
    },
  );

  ipcMain.handle("db:payments:getAll", async () => {
    return await getAllPayments();
  });

  ipcMain.handle("db:payments:getAllWithClientInfo", async () => {
    return await getAllPaymentsWithClientInfo();
  });

  ipcMain.handle(
    "db:payments:updatePaidAt",
    async (_event, { paymentId, paidDate }) => {
      return await updatePaymentPaidAt(paymentId, paidDate);
    },
  );

  ipcMain.handle(
    "db:payments:updateAmount",
    async (_event, { paymentId, givenAmount }) => {
      return await updatePaymentAmount(paymentId, givenAmount);
    },
  );

  ipcMain.handle(
    "db:payments:getBySpecificPeriod",
    async (_event, period, periodValue) => {
      return await getPaymentsBySpecificPeriod(period, periodValue);
    },
  );

  // Sellers handlers
  ipcMain.handle("db:sellers:getAll", async () => {
    return await getAllSellers();
  });

  ipcMain.handle("db:sellers:create", async (_event, data) => {
    return await createSeller(data);
  });

  ipcMain.handle("db:sellers:update", async (_event, { id, data }) => {
    return await updateSeller(id, data);
  });

  ipcMain.handle("db:sellers:delete", async (_event, id: string) => {
    return await deleteSeller(id);
  });

  ipcMain.handle("db:sellers:getById", async (_event, id: string) => {
    return await getSellerById(id);
  });

  // Purchases handlers
  ipcMain.handle("db:purchases:getAll", async () => {
    return await getAllPurchases();
  });

  ipcMain.handle("db:purchases:create", async (_event, data) => {
    return await createPurchase(data);
  });

  ipcMain.handle("db:purchases:update", async (_event, { id, data }) => {
    return await updatePurchase(id, data);
  });

  ipcMain.handle("db:purchases:delete", async (_event, id: string) => {
    return await deletePurchase(id);
  });

  ipcMain.handle("db:purchases:getById", async (_event, id: string) => {
    return await getPurchaseById(id);
  });

  ipcMain.handle(
    "db:purchases:getByProduct",
    async (_event, productId: string) => {
      return await getPurchasesByProduct(productId);
    },
  );

  ipcMain.handle(
    "db:purchases:getBySeller",
    async (_event, sellerId: string) => {
      return await getPurchasesBySeller(sellerId);
    },
  );

  ipcMain.handle(
    "db:purchases:getBySpecificPeriod",
    async (_event, period, periodValue) => {
      return await getPurchasesBySpecificPeriod(period, periodValue);
    },
  );

  ipcMain.handle("db:purchases:createWithItems", async (_event, data) => {
    return await createPurchaseWithItems(data);
  });

  ipcMain.handle(
    "db:purchases:updateWithItems",
    async (_event, { purchaseId, data }) => {
      return await updatePurchaseWithItems(purchaseId, data);
    },
  );

  // Purchase Items handlers
  ipcMain.handle("db:purchaseItems:create", async (_event, data) => {
    return await createPurchaseItem(data);
  });

  ipcMain.handle("db:purchaseItems:update", async (_event, { id, data }) => {
    return await updatePurchaseItem(id, data);
  });

  ipcMain.handle("db:purchaseItems:delete", async (_event, id: string) => {
    return await deletePurchaseItem(id);
  });

  ipcMain.handle(
    "db:purchaseItems:getByPurchase",
    async (_event, purchaseId: string) => {
      return await getPurchaseItemsByPurchase(purchaseId);
    },
  );

  // Manual Products handlers
  ipcMain.handle("db:manualProducts:search", async (_event, query: string) => {
    return await searchManualProducts(query);
  });

  ipcMain.handle("db:manualProducts:getAll", async () => {
    return await getAllManualProducts();
  });

  ipcMain.handle("db:manualProducts:create", async (_event, data) => {
    return await createManualProduct(data);
  });

  ipcMain.handle("db:manualProducts:findOrCreate", async (_event, data) => {
    return await findOrCreateManualProduct(data);
  });

  ipcMain.handle("db:manualProducts:getById", async (_event, id: string) => {
    return await getManualProductById(id);
  });

  ipcMain.handle("db:manualProducts:update", async (_event, { id, data }) => {
    return await updateManualProduct(id, data);
  });

  ipcMain.handle("db:manualProducts:delete", async (_event, id: string) => {
    return await deleteManualProduct(id);
  });

  // Services handlers
  ipcMain.handle("db:services:search", async (_event, query: string) => {
    return await searchServices(query);
  });

  ipcMain.handle("db:services:getAll", async () => {
    return await getAllServices();
  });

  ipcMain.handle("db:services:create", async (_event, data) => {
    return await createService(data);
  });

  ipcMain.handle("db:services:findOrCreate", async (_event, data) => {
    return await findOrCreateService(data);
  });

  ipcMain.handle("db:services:getById", async (_event, id: string) => {
    return await getServiceById(id);
  });

  ipcMain.handle("db:services:update", async (_event, { id, data }) => {
    return await updateService(id, data);
  });

  ipcMain.handle("db:services:delete", async (_event, id: string) => {
    return await deleteService(id);
  });
}
