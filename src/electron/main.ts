import {
  app,
  BrowserWindow,
  WebContentsView,
  screen,
  type WebContents,
} from "electron";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "child_process";
import { prismaPromise } from "../lib/database/prismaClient";
import { getStoreFirstRecordedYmd } from "../lib/database/storeFirstDate";
import { loadEnvFile } from "./utils/loadEnvFile";
import {
  registerAppWebContents,
  sendToApp,
} from "./utils/appWebContents";

const TITLEBAR_HEIGHT = 32;

loadEnvFile();

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
  setupOnlineHandlers,
  setupInvoiceScanHandlers,
} from "./handlers";
import { setupAppHandlers } from "./handlers/appHandlers";
import { setupAIHandlers } from "./handlers/aiHandlers";

const createWindow = async () => {
  // Initialize Prisma client first
  try {
    await prismaPromise;
    console.log("Prisma client initialized successfully");
    void getStoreFirstRecordedYmd();
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
  setupOnlineHandlers();
  setupInvoiceScanHandlers();
  setupAppHandlers();
  setupAIHandlers();
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

  // Title bar = window webContents; React app = inset WebContentsView below it.
  // OS taskbar title + default DevTools follow the *window* webContents (title bar),
  // so we pin the display title and route DevTools to the app view explicitly.
  // Display-only — do not use package productName / app.getName() here.
  const appTitle = "Reda Tech POS";
  const preloadPath = path.join(__dirname, "preload.js");
  const mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    title: appTitle,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: true,
    fullscreenable: true,
    icon: iconPath,
    titleBarStyle: "hidden",
    ...(process.platform === "win32"
      ? {
          titleBarOverlay: {
            color: "#00000000",
            symbolColor: "#1C1C1E",
            height: TITLEBAR_HEIGHT,
          },
        }
      : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
    },
  });

  // Prevent titlebar.html <title> from overwriting the taskbar / window title.
  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
  });
  mainWindow.setTitle(appTitle);

  const rendererDir = path.join(
    __dirname,
    `../renderer/${MAIN_WINDOW_VITE_NAME}`,
  );

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(
      `${MAIN_WINDOW_VITE_DEV_SERVER_URL}/titlebar.html`,
    );
  } else {
    void mainWindow.loadFile(path.join(rendererDir, "titlebar.html"));
  }

  const appView = new WebContentsView({
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
    },
  });
  mainWindow.contentView.addChildView(appView);
  registerAppWebContents(mainWindow, appView.webContents);

  const toggleAppDevTools = () => {
    if (!appView.webContents.isDestroyed()) {
      appView.webContents.toggleDevTools();
    }
  };

  // Default Electron DevTools binds to the window webContents (title bar).
  // Re-route common shortcuts to the React app WebContentsView instead.
  const wireDevToolsShortcut = (wc: WebContents) => {
    wc.on("before-input-event", (event, input) => {
      if (input.type !== "keyDown") return;
      const key = input.key.toLowerCase();
      const isDevToolsChord =
        (input.control || input.meta) && !input.alt && key === "i";
      const isF12 = key === "f12";
      if (!isDevToolsChord && !isF12) return;
      event.preventDefault();
      toggleAppDevTools();
    });
  };
  wireDevToolsShortcut(mainWindow.webContents);
  wireDevToolsShortcut(appView.webContents);

  const layoutShell = () => {
    if (mainWindow.isDestroyed()) return;
    const [cw, ch] = mainWindow.getContentSize();
    const bar = mainWindow.isFullScreen() ? 0 : TITLEBAR_HEIGHT;
    appView.setBounds({
      x: 0,
      y: bar,
      width: cw,
      height: Math.max(0, ch - bar),
    });
    if (!mainWindow.webContents.isDestroyed()) {
      mainWindow.webContents.send("titlebar:update", { visible: bar > 0 });
    }
  };

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void appView.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void appView.webContents.loadFile(path.join(rendererDir, "index.html"));
  }

  layoutShell();
  mainWindow.on("resize", layoutShell);

  const sendFullscreenState = (isFullScreen: boolean) => {
    layoutShell();
    sendToApp(mainWindow, "app:fullscreen-changed", isFullScreen);
  };
  mainWindow.on("enter-full-screen", () => sendFullscreenState(true));
  mainWindow.on("leave-full-screen", () => sendFullscreenState(false));
  appView.webContents.on("did-finish-load", () => {
    layoutShell();
    if (!mainWindow.isDestroyed()) {
      sendFullscreenState(mainWindow.isFullScreen());
    }
  });
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
