import { app, BrowserWindow, screen } from "electron";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "child_process";
import { prismaPromise } from "../lib/database/prismaClient";

// Handle Squirrel events on Windows
const handleSquirrelEvent = (): boolean => {
  if (process.platform !== 'win32') return false;

  const appFolder = path.resolve(process.execPath, '..');
  const rootFolder = path.resolve(appFolder, '..');
  const updateExe = path.resolve(rootFolder, 'Update.exe');
  const exeName = path.basename(process.execPath);

  const squirrelCommand = process.argv[1];

  const spawnUpdate = (args: string[]) => {
    return new Promise<void>((resolve) => {
      try {
        const child = spawn(updateExe, args, { detached: true });
        child.on('close', () => resolve());
        child.on('error', () => resolve()); // Don't block on error
      } catch (error) {
        resolve(); // Don't block on error
      }
    });
  };

  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Create desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]).then(() => {
        setTimeout(() => app.quit(), 1000);
      });
      return true;

    case '--squirrel-uninstall':
      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]).then(() => {
        setTimeout(() => app.quit(), 1000);
      });
      return true;

    case '--squirrel-obsolete':
      // This is called on the old version when a new version is installed
      app.quit();
      return true;

    default:
      return false;
  }
};

// Handle Squirrel events on Windows for install/update/uninstall
if (handleSquirrelEvent()) {
  // Don't proceed with normal app initialization
} else {
  // Normal app startup continues below
}

// Declare Vite environment variables
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
import {
  setupDatabaseHandlers,
  setupLoggerHandlers,
  setupAuthHandlers,
  setupSystemHandlers,
  setupBackupHandlers,
  setupActivityLogHandlers,
  setupOnboardingHandlers,
} from "./handlers";
import { setupAppHandlers } from "./handlers/appHandlers";

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
  setupActivityLogHandlers();
  setupOnboardingHandlers();
  setupAppHandlers();

  const { width, height, x, y } = screen.getPrimaryDisplay().workArea;

  // Get icon path (works in both dev and production)
  // Try multiple possible locations for the icon file
  let iconPath: string | undefined;
  const possiblePaths = [
    path.join(__dirname, "../public/myapp.ico"), // Dev mode and some production setups
    path.join(app.getAppPath(), "public", "myapp.ico"), // Production (app.asar)
    path.join(process.resourcesPath || app.getAppPath(), "public", "myapp.ico"), // Resources folder
    path.join(process.resourcesPath || app.getAppPath(), "app", "public", "myapp.ico"), // Alternative resource path
  ];

  // Find the first existing path
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      iconPath = possiblePath;
      break;
    }
  }

  // If no icon found, undefined will make Electron use default icon (no error thrown)

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
    icon: iconPath,
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

app.on("ready", () => {
  // createWindow is now called directly since Squirrel events exit early
  createWindow();
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
