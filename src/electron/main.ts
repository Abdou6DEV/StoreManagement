import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { initializePrisma } from "../lib/database/prismaClient";
import {
  setupDatabaseHandlers,
  setupLoggerHandlers,
  setupAuthHandlers,
} from "./handlers";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  await initializePrisma();
  setupDatabaseHandlers();
  setupLoggerHandlers();
  setupAuthHandlers();

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
