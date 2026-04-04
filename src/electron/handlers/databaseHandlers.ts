import { ipcMain } from "electron";
import { createActivityLog } from "../../lib/database/activityLogs";
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
  getUnusedProducts,
  cleanupUnusedProducts,
  deleteMultipleProducts,
} from "../../lib/database/products";
import {
  getAllClients,
  getAllClientsWithTotalPurchases,
  createClient,
  deleteClient,
  updateClient,
  findClientByName,
} from "../../lib/database/clients";
import {
  createSale,
  getProductSalesCounts,
  getAllSales,
  getAllLight,
  updateSale,
  getRecentSales,
  searchSales,
  deleteSale,
  getSalesAggregatedByPeriod,
  getSalesSummary,
  getSalesBySpecificPeriod,
  getSalesByClient,
  getSaleById,
} from "../../lib/database/sales";
import { getOption, setOption } from "../../lib/database/options";
import {
  createPayment,
  getPaymentsByClient,
  getPaymentsByClientWithInfo,
  getAllPayments,
  getAllPaymentsWithClientInfo,
  updatePaymentPaidAt,
  updatePaymentAmount,
  getPaymentsBySpecificPeriod,
  cancelVersementPayment,
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
  getServicesByClient,
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
  getServiceNames,
  getCompletedServicesForCashier,
  isServiceAppointmentSold,
  getSaleIdFromServiceAppointment,
  getServicePaymentStatus,
  updateServicePaymentStatus,
} from "../../lib/database/serviceAppointments";

export function setupDatabaseHandlers() {
  // Products handlers
  ipcMain.handle("db:products:getAll", async () => {
    return await getAllProducts();
  });

  ipcMain.handle("db:products:add", async (_event, payload) => {
    const product = payload?.product != null ? payload.product : payload;
    const username = typeof payload?.username === "string" ? payload.username : "unknown";
    const created = await addProduct(product);
    const lines = [
      `Product: ${created.name}`,
      `Category: ${created.categoryName}`,
      `Quantity: ${created.quantity}`,
      `Bought price: ${created.boughtPrice}`,
      `Selling price: ${created.sellingPrice}`,
    ];
    if (created.codebar?.trim()) lines.push(`Barcode: ${created.codebar.trim()}`);
    try {
      await createActivityLog({
        username,
        action: "activityLog.actions.productAdded",
        details: lines.join("\n"),
      });
      console.log("[ActivityLog] Product added:", created.name);
    } catch (e) {
      console.error("[ActivityLog] Product added log failed", e);
    }
    return created;
  });

  ipcMain.handle("db:products:update", async (_event, payload) => {
    const { id, data, username, logAction, skipLog } = payload ?? {};
    const updated = await updateProduct(id, data);
    if (!skipLog) {
      const logUsername = typeof username === "string" ? username : "unknown";
      const action = logAction === "activityLog.actions.quantityAdded"
        ? "activityLog.actions.quantityAdded"
        : "activityLog.actions.productUpdated";
      const details = action === "activityLog.actions.quantityAdded"
        ? `Product: ${updated.name}\nQuantity: ${updated.quantity}\nSelling price: ${updated.sellingPrice}`
        : `Product: ${updated.name}\nQuantity: ${updated.quantity}\nSelling price: ${updated.sellingPrice}`;
      try {
        await createActivityLog({ username: logUsername, action, details });
      } catch (e) {
        console.error("[ActivityLog] Product update log failed", e);
      }
    }
    return updated;
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
    async (_event, payload) => {
      const { productData, purchaseData, username } = payload ?? {};
      const created = await createProductWithPurchase(productData, purchaseData);
      const logUsername = typeof username === "string" ? username : "unknown";
      const lines = [
        `Product: ${created.name}`,
        `Category: ${created.categoryName}`,
        `Quantity: ${created.quantity}`,
        `Bought price: ${created.boughtPrice}`,
        `Selling price: ${created.sellingPrice}`,
      ];
      if (created.codebar?.trim()) lines.push(`Barcode: ${created.codebar.trim()}`);
      try {
        await createActivityLog({
          username: logUsername,
          action: "activityLog.actions.productAdded",
          details: lines.join("\n"),
        });
        console.log("[ActivityLog] Product added (with purchase):", created.name);
      } catch (e) {
        console.error("[ActivityLog] Product added log failed", e);
      }
      return created;
    }
  );

  ipcMain.handle(
    "db:products:updateWithPurchase",
    async (_event, payload) => {
      const {
        productId,
        additionalQuantity,
        purchaseData,
        updateBoughtPrice,
        newSellingPrice,
        username,
      } = payload ?? {};
      const updated = await updateProductWithPurchase(
        productId,
        additionalQuantity,
        purchaseData,
        updateBoughtPrice || false,
        newSellingPrice
      );
      const logUsername = typeof username === "string" ? username : "unknown";
      try {
        await createActivityLog({
          username: logUsername,
          action: "activityLog.actions.quantityAdded",
          details: `Product: ${updated.name}\nQuantity added: ${additionalQuantity}\nNew total quantity: ${updated.quantity}`,
        });
      } catch (e) {
        console.error("[ActivityLog] Quantity added log failed", e);
      }
      return updated;
    }
  );

  ipcMain.handle("db:products:generateUniqueBarcode", async () => {
    return await generateUniqueBarcode();
  });

// Product cleanup handlers
ipcMain.handle("db:products:getUnused", async () => {
  return await getUnusedProducts();
});

ipcMain.handle("db:products:cleanupUnused", async () => {
  return await cleanupUnusedProducts();
});

ipcMain.handle("db:products:getUnusedProducts", async (_, periodMonths: number) => {
  return await getUnusedProducts(periodMonths);
});

ipcMain.handle("db:products:deleteMultipleProducts", async (_, productIds: string[]) => {
  return await deleteMultipleProducts(productIds);
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

  ipcMain.handle("db:clients:findByName", async (_event, name: string) => {
    return await findClientByName(name);
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

  ipcMain.handle("db:sales:getAllLight", async () => {
    return await getAllLight();
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

  ipcMain.handle("db:sales:getByClient", async (_event, clientId: string) => {
    return await getSalesByClient(clientId);
  });

  ipcMain.handle("db:sales:getById", async (_event, id: string) => {
    return await getSaleById(id);
  });

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
  ipcMain.handle(
    "db:payments:getByClientWithInfo",
    async (_event, clientId: string) => {
      return await getPaymentsByClientWithInfo(clientId);
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

  ipcMain.handle("db:payments:cancelVersement", async (_event, paymentId: string) => {
    return await cancelVersementPayment(paymentId);
  });

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

  ipcMain.handle("db:services:getByClient", async (_event, clientId: string) => {
    return await getServicesByClient(clientId);
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

  ipcMain.handle(
    "db:bills:deletePayment",
    async (
      _event,
      payload: { id: string; username?: string } | string,
    ) => {
      const id =
        typeof payload === "string" ? payload.trim() : payload?.id?.trim();
      if (!id) {
        throw new Error("Invalid payment id");
      }
      const username =
        typeof payload === "object" &&
        payload !== null &&
        typeof payload.username === "string" &&
        payload.username.trim()
          ? payload.username.trim()
          : "unknown";

      const meta = await bills.deletePayment(id);

      const amountDisplay = (meta.amount / 100).toLocaleString("fr-FR");
      const paidStr = meta.paidDate.toISOString();
      const notesLine =
        meta.notes?.trim() ? `\nNotes: ${meta.notes.trim()}` : "";
      const details = `Bill: "${meta.billTitle}" (${meta.billType})\nPayment id: ${meta.paymentId}\nAmount: ${amountDisplay} DA (${meta.amount} centimes)\nPaid: ${paidStr}${notesLine}`;

      try {
        await createActivityLog({
          username,
          action: "activityLog.actions.billPaymentDeleted",
          details,
        });
      } catch (e) {
        console.error("[ActivityLog] Bill payment delete log failed", e);
      }

      return meta;
    },
  );

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

  ipcMain.handle("db:serviceAppointments:getServiceNames", async () => {
    return await getServiceNames();
  });

  ipcMain.handle("db:serviceAppointments:getCompletedForCashier", async () => {
    return await getCompletedServicesForCashier();
  });

  ipcMain.handle("db:serviceAppointments:isSold", async (_event, id: string) => {
    return await isServiceAppointmentSold(id);
  });

  ipcMain.handle("db:serviceAppointments:getSaleId", async (_event, id: string) => {
    return await getSaleIdFromServiceAppointment(id);
  });

  ipcMain.handle("db:serviceAppointments:getPaymentStatus", async (_event, id: string) => {
    return await getServicePaymentStatus(id);
  });

  ipcMain.handle("db:serviceAppointments:updatePaymentStatus", async (_event, { id, isPaid }: { id: string; isPaid: boolean }) => {
    return await updateServicePaymentStatus(id, isPaid);
  });
}
