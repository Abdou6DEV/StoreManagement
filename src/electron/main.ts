import { app, BrowserWindow, screen, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { prisma, initializePrisma } from "../lib/prismaClient";
import { getAllCategories, ensureCategory } from "../lib/database/categories";
import {
  getAllClients,
  getAllClientsWithTotalPurchases,
  createClient,
  deleteClient,
  updateClient,
} from "../lib/database/clients";
import { createSale, getProductSalesCounts } from "../lib/database/sales";
import { getOption, setOption } from "../lib/database/options";
import { createPayment } from "../lib/database/payments";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  await initializePrisma();
  setupDatabaseHandlers();

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
    return await prisma.product.findMany();
  });

  ipcMain.handle("db:products:add", async (_event, product) => {
    return await prisma.product.create({ data: product });
  });

  ipcMain.handle("db:products:update", async (_event, { id, data }) => {
    return await prisma.product.update({
      where: { id },
      data,
    });
  });

  ipcMain.handle("db:products:delete", async (_event, id: string) => {
    return await prisma.product.delete({
      where: { id },
    });
  });

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
}
