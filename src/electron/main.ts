import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import { prismaPromise } from "../lib/database/prismaClient";

// Declare Vite environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
import {
  setupDatabaseHandlers,
  setupLoggerHandlers,
  setupAuthHandlers,
  setupSystemHandlers,
  setupBackupHandlers,
  performDailyBackup,
} from "./handlers";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = async () => {
  // Initialize Prisma client first
  try {
    await prismaPromise;
    console.log("Prisma client initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Prisma client:", error);
    // Don't prevent app from starting, but log the error
  }
  
  setupDatabaseHandlers();
  setupLoggerHandlers();
  setupAuthHandlers();
  setupSystemHandlers();
  setupBackupHandlers();

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
    icon: path.join(__dirname, "../public/icon-256.png"),
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

// Set up automatic daily backup
let backupInterval: NodeJS.Timeout | null = null;

const scheduleDailyBackup = () => {
  // Clear existing interval
  if (backupInterval) {
    clearInterval(backupInterval);
  }

  // Perform backup immediately on startup
  performDailyBackup();

  // Schedule backup every 24 hours (86400000 ms)
  backupInterval = setInterval(() => {
    performDailyBackup();
  }, 24 * 60 * 60 * 1000);
};

// Start backup scheduling when app is ready
app.on("ready", () => {
  // Small delay to ensure database is initialized
  setTimeout(scheduleDailyBackup, 5000);
});

// Clean up on app quit
app.on("before-quit", () => {
  if (backupInterval) {
    clearInterval(backupInterval);
  }
});

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
