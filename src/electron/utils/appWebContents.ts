import { BrowserWindow, type WebContents } from "electron";

const appWebContentsByWindow = new WeakMap<BrowserWindow, WebContents>();

export function registerAppWebContents(
  win: BrowserWindow,
  webContents: WebContents,
) {
  appWebContentsByWindow.set(win, webContents);
}

export function getAppWebContents(win: BrowserWindow): WebContents {
  return appWebContentsByWindow.get(win) ?? win.webContents;
}

export function sendToApp(
  win: BrowserWindow,
  channel: string,
  ...args: unknown[]
) {
  if (win.isDestroyed()) return;
  const wc = getAppWebContents(win);
  if (!wc.isDestroyed()) {
    wc.send(channel, ...args);
  }
}

export function broadcastToAllApps(channel: string, ...args: unknown[]) {
  for (const win of BrowserWindow.getAllWindows()) {
    sendToApp(win, channel, ...args);
  }
}

/** Resolve the BrowserWindow that owns an event sender (app or title-bar view). */
export function browserWindowFromEventSender(
  sender: WebContents,
): BrowserWindow | null {
  const direct = BrowserWindow.fromWebContents(sender);
  if (direct && !direct.isDestroyed()) return direct;

  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue;
    if (win.webContents === sender) return win;
    if (appWebContentsByWindow.get(win) === sender) return win;
  }
  return null;
}
