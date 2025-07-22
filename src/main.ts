import { app, BrowserWindow, screen, ipcMain } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { DatabaseService } from "./lib/database";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  await DatabaseService.initialize();
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
  const prisma = DatabaseService.client;

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
    return await DatabaseService.getAllCategories();
  });

  ipcMain.handle("db:categories:ensure", async (_event, name) => {
    return await DatabaseService.ensureCategory(name);
  });

  ipcMain.handle("db:clients:create", async (_event, data) => {
    return await DatabaseService.createClient(data);
  });

  ipcMain.handle("db:sales:create", async (_event, data) => {
    return await DatabaseService.createSale(data);
  });

  ipcMain.handle("db:clients:getAll", async () => {
    return await DatabaseService.getAllClients();
  });

  ipcMain.handle("db:clients:delete", async (_event, id: string) => {
    return await DatabaseService.deleteClient(id);
  });

  ipcMain.handle("db:clients:update", async (_event, { id, data }) => {
    return await DatabaseService.updateClient(id, data);
  });

  ipcMain.handle("db:clients:getAllWithTotalPurchases", async () => {
    return await DatabaseService.getAllClientsWithTotalPurchases();
  });

  ipcMain.handle("db:products:getSalesCounts", async () => {
    return await DatabaseService.getProductSalesCounts();
  });

  ipcMain.handle("db:options:get", async (_event, key: string) => {
    return await DatabaseService.getOption(key);
  });

  ipcMain.handle("db:options:set", async (_event, { key, value }) => {
    await DatabaseService.setOption(key, value);
    return true;
  });

  ipcMain.handle("db:payments:create", async (_event, data) => {
    return await DatabaseService.createPayment(data);
  });
}
