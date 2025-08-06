import { app, BrowserWindow, screen, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { initializePrisma } from "../lib/database/prismaClient";
import logger from "../lib/logger";
import { getAllCategories, ensureCategory } from "../lib/database/categories";
import {
  updateProduct,
  getAllProducts,
  addProduct,
  deleteProduct,
  getProductWithPurchaseHistory,
  createProductWithPurchase,
  updateProductWithPurchase,
} from "../lib/database/products";
import {
  getAllClients,
  getAllClientsWithTotalPurchases,
  createClient,
  deleteClient,
  updateClient,
} from "../lib/database/clients";
import {
  createSale,
  getProductSalesCounts,
  getAllSales,
  updateSale,
  getRecentSales,
  deleteSale,
} from "../lib/database/sales";
import { getOption, setOption } from "../lib/database/options";
import {
  createPayment,
  getPaymentsByClient,
  getAllPayments,
  getAllPaymentsWithClientInfo,
  updatePaymentPaidAt,
  updatePaymentAmount,
} from "../lib/database/payments";
import {
  getAllSellers,
  createSeller,
  updateSeller,
  deleteSeller,
  getSellerById,
} from "../lib/database/sellers";
import {
  getAllPurchases,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getPurchaseById,
  getPurchasesByProduct,
  getPurchasesBySeller,
} from "../lib/database/purchases";
import {
  searchManualProducts,
  getAllManualProducts,
  createManualProduct,
  findOrCreateManualProduct,
  getManualProductById,
  updateManualProduct,
  deleteManualProduct,
} from "../lib/database/manualProducts";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  await initializePrisma();
  setupDatabaseHandlers();
  setupLoggerHandlers();

  const { width, height, x, y } = screen.getPrimaryDisplay().workArea;

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function setupDatabaseHandlers() {
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

  ipcMain.handle("db:categories:getAll", async () => {
    return await getAllCategories();
  });

  ipcMain.handle("db:categories:ensure", async (_event, name) => {
    return await ensureCategory(name);
  });

  ipcMain.handle("db:clients:create", async (_event, data) => {
    return await createClient(data);
  });

  ipcMain.handle("db:sales:create", async (_event, data) => {
    return await createSale(data);
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

  ipcMain.handle("db:products:getSalesCounts", async () => {
    return await getProductSalesCounts();
  });

  ipcMain.handle("db:options:get", async (_event, key: string) => {
    return await getOption(key);
  });

  ipcMain.handle("db:options:set", async (_event, { key, value }) => {
    await setOption(key, value);
    return true;
  });

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
}

function setupLoggerHandlers() {
  ipcMain.handle("logger:log", async (_event, entry) => {
    const { timestamp, level, message, context, data, userId } = entry;
    logger.log(level, message, context, data, userId);
  });

  ipcMain.handle("logger:getLogFiles", async () => {
    return logger.getLogFiles();
  });

  ipcMain.handle("logger:readLogFile", async (_event, { filePath, lines }) => {
    return logger.readLogFile(filePath, lines);
  });

  ipcMain.handle("logger:getLogFileStats", async (_event, { filePath }) => {
    return logger.getLogFileStats(filePath);
  });

  ipcMain.handle("logger:clearLogs", async () => {
    logger.clearLogs();
  });

  ipcMain.handle("logger:updateConfig", async (_event, config) => {
    logger.updateConfig(config);
  });

  ipcMain.handle("logger:getConfig", async () => {
    return logger.getConfig();
  });
}
