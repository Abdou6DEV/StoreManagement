import { ipcMain, BrowserWindow } from "electron";
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
  generateUniqueBarcode,
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
  searchSales,
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
import { bills } from "../../lib/database/bills";
import {
  createServiceAppointment,
  getAllServiceAppointments,
  getServiceAppointmentById,
  getServiceAppointmentsByClient,
  getUpcomingServiceAppointments,
  getOverdueServiceAppointments,
  searchServiceAppointments,
  updateServiceAppointment,
  markServiceAppointmentCompleted,
  markServiceAppointmentIncomplete,
  deleteServiceAppointment,
  getServiceAppointmentStats,
  getServiceTypes,
} from "../../lib/database/serviceAppointments";

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
    }
  );

  ipcMain.handle(
    "db:products:createWithPurchase",
    async (_event, { productData, purchaseData }) => {
      return await createProductWithPurchase(productData, purchaseData);
    }
  );

  ipcMain.handle(
    "db:products:updateWithPurchase",
    async (
      _event,
      {
        productId,
        additionalQuantity,
        purchaseData,
        updateBoughtPrice,
        newSellingPrice,
      }
    ) => {
      return await updateProductWithPurchase(
        productId,
        additionalQuantity,
        purchaseData,
        updateBoughtPrice || false,
        newSellingPrice
      );
    }
  );

  ipcMain.handle("db:products:generateUniqueBarcode", async () => {
    return await generateUniqueBarcode();
  });

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

  ipcMain.handle("db:sales:getRecent", async (_event, { limit, offset, days }) => {
    return await getRecentSales(limit, offset, days);
  });

  ipcMain.handle("db:sales:search", async (_event, { searchTerm, limit, offset, days }) => {
    return await searchSales(searchTerm, limit, offset, days);
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
        new Date(endDate)
      );
    }
  );

  ipcMain.handle("db:sales:getSummary", async (_event, startDate, endDate) => {
    return await getSalesSummary(new Date(startDate), new Date(endDate));
  });

  ipcMain.handle(
    "db:sales:getBySpecificPeriod",
    async (_event, period, periodValue) => {
      return await getSalesBySpecificPeriod(period, periodValue);
    }
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
    }
  );

  ipcMain.handle("db:payments:getAll", async () => {
    return await getAllPayments();
  });

  ipcMain.handle("db:payments:getAllWithClientInfo", async () => {
    return await getAllPaymentsWithClientInfo();
  });

  ipcMain.handle(
    "db:payments:updatePaidAt",
    async (event, { paymentId, paidDate }) => {
      return await updatePaymentPaidAt(paymentId, paidDate);
    }
  );

  ipcMain.handle(
    "db:payments:updateAmount",
    async (_event, { paymentId, givenAmount }) => {
      return await updatePaymentAmount(paymentId, givenAmount);
    }
  );

  ipcMain.handle(
    "db:payments:getBySpecificPeriod",
    async (_event, period, periodValue) => {
      return await getPaymentsBySpecificPeriod(period, periodValue);
    }
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
    }
  );

  ipcMain.handle(
    "db:purchases:getBySeller",
    async (_event, sellerId: string) => {
      return await getPurchasesBySeller(sellerId);
    }
  );

  ipcMain.handle(
    "db:purchases:getBySpecificPeriod",
    async (_event, period, periodValue) => {
      return await getPurchasesBySpecificPeriod(period, periodValue);
    }
  );

  ipcMain.handle("db:purchases:createWithItems", async (_event, data) => {
    return await createPurchaseWithItems(data);
  });

  ipcMain.handle(
    "db:purchases:updateWithItems",
    async (_event, { purchaseId, data }) => {
      return await updatePurchaseWithItems(purchaseId, data);
    }
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
    }
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

  // Bills handlers
  ipcMain.handle("db:bills:create", async (_event, data) => {
    return await bills.create(data);
  });

  ipcMain.handle("db:bills:getAll", async () => {
    return await bills.getAll();
  });

  ipcMain.handle("db:bills:getById", async (_event, id: string) => {
    return await bills.getById(id);
  });

  ipcMain.handle("db:bills:update", async (_event, { id, data }) => {
    return await bills.update(id, data);
  });

  ipcMain.handle("db:bills:delete", async (_event, id: string) => {
    return await bills.delete(id);
  });


  ipcMain.handle("db:bills:getFiltered", async (_event, filters) => {
    return await bills.getFiltered(filters);
  });

  ipcMain.handle("db:bills:getDueSoon", async (_event, days) => {
    return await bills.getDueSoon(days);
  });

  ipcMain.handle("db:bills:getStats", async () => {
    return await bills.getStats();
  });

  ipcMain.handle("db:bills:getBillTypes", async () => {
    return await bills.getBillTypes();
  });

  ipcMain.handle("db:bills:resetBillToNextDuration", async (_event, id: string) => {
    return await bills.resetBillToNextDuration(id);
  });

  ipcMain.handle("db:bills:getBillTitles", async () => {
    return await bills.getBillTitles();
  });

  ipcMain.handle("db:bills:getBillByTitle", async (_event, title: string) => {
    return await bills.getBillByTitle(title);
  });

  ipcMain.handle("db:bills:recordPayment", async (_event, billId: string, amount: number, notes?: string) => {
    return await bills.recordPayment(billId, amount, notes);
  });

  ipcMain.handle("db:bills:getBillWithPayments", async (_event, billId: string) => {
    return await bills.getBillWithPayments(billId);
  });

  ipcMain.handle("db:bills:getAllPayments", async () => {
    return await bills.getAllPayments();
  });

  ipcMain.handle("db:bills:getBillsPaymentsAggregatedByPeriod", async (_event, period, startDate, endDate) => {
    return await bills.getBillsPaymentsAggregatedByPeriod(period, startDate, endDate);
  });

  ipcMain.handle("db:bills:getBySpecificPeriod", async (_event, period, periodValue) => {
    return await bills.getBySpecificPeriod(period, periodValue);
  });

  // Service Appointments handlers
  ipcMain.handle("db:serviceAppointments:create", async (_event, data) => {
    return await createServiceAppointment(data);
  });

  ipcMain.handle("db:serviceAppointments:getAll", async () => {
    return await getAllServiceAppointments();
  });

  ipcMain.handle("db:serviceAppointments:getById", async (_event, id: string) => {
    return await getServiceAppointmentById(id);
  });

  ipcMain.handle("db:serviceAppointments:getByClient", async (_event, clientId: string) => {
    return await getServiceAppointmentsByClient(clientId);
  });

  ipcMain.handle("db:serviceAppointments:getUpcoming", async (_event, days = 7) => {
    return await getUpcomingServiceAppointments(days);
  });

  ipcMain.handle("db:serviceAppointments:getOverdue", async () => {
    return await getOverdueServiceAppointments();
  });

  ipcMain.handle("db:serviceAppointments:search", async (_event, query: string) => {
    return await searchServiceAppointments(query);
  });

  ipcMain.handle("db:serviceAppointments:update", async (_event, { id, data }) => {
    return await updateServiceAppointment(id, data);
  });

  ipcMain.handle("db:serviceAppointments:markCompleted", async (_event, id: string) => {
    return await markServiceAppointmentCompleted(id);
  });

  ipcMain.handle("db:serviceAppointments:markIncomplete", async (_event, id: string) => {
    return await markServiceAppointmentIncomplete(id);
  });

  ipcMain.handle("db:serviceAppointments:delete", async (_event, id: string) => {
    return await deleteServiceAppointment(id);
  });

  ipcMain.handle("db:serviceAppointments:getStats", async () => {
    return await getServiceAppointmentStats();
  });

  ipcMain.handle("db:serviceAppointments:getServiceTypes", async () => {
    return await getServiceTypes();
  });
}
