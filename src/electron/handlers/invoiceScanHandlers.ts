import { app, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { getMachineGuid } from "../utils/validationKey";
import {
  DEFAULT_INVOICE_SCAN_PAGE_URL,
  getStoreOnlineConfig,
  type StoreOnlineConfig,
} from "../utils/onlineConfig";
import {
  clearLastInvoiceScanSession,
  persistLastInvoiceScanSession,
  readLastInvoiceScanSessionId,
} from "../utils/invoiceScanSessionStore";
import type {
  InvoiceScanCreateResult,
  InvoiceScanDownloadResult,
  InvoiceScanStartResult,
  InvoiceScanStatus,
  InvoiceScanStatusResult,
} from "../types/invoiceScan";

function invoiceScanUrl(base: string): string {
  return `${base}/functions/v1/invoice-scan`;
}

function authedHeaders(cfg: StoreOnlineConfig): Record<string, string> {
  return {
    "x-app-secret": cfg.appSecret,
    Authorization: `Bearer ${cfg.anonKey}`,
    apikey: cfg.anonKey,
    "Content-Type": "application/json",
  };
}

function scanPageUrl(sessionId: string): string {
  const raw = (process.env.STORE_INVOICE_SCAN_PAGE_URL ?? DEFAULT_INVOICE_SCAN_PAGE_URL)
    .trim()
    .replace(/\/$/, "");
  const withFile = raw.toLowerCase().endsWith("scan.html") ? raw : `${raw}/scan.html`;
  const url = new URL(withFile);
  url.searchParams.set("s", sessionId);
  return url.toString();
}

function readEdgeError(json: unknown, status: number): string {
  if (json && typeof json === "object" && "error" in json) {
    const err = (json as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err.trim();
  }
  return `HTTP ${status}`;
}

async function postInvoiceScan(
  cfg: StoreOnlineConfig,
  body: Record<string, unknown>,
): Promise<{ okHttp: boolean; status: number; json: unknown }> {
  const res = await fetch(invoiceScanUrl(cfg.supabaseUrl), {
    method: "POST",
    headers: authedHeaders(cfg),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { okHttp: res.ok, status: res.status, json };
}

function asRecord(json: unknown): Record<string, unknown> | null {
  return json && typeof json === "object" ? (json as Record<string, unknown>) : null;
}

function configOrError():
  | { ok: true; cfg: StoreOnlineConfig }
  | { ok: false; result: { success: false; error: string; code: string } } {
  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      ok: false,
      result: {
        success: false,
        error: "Online scanning is not configured.",
        code: "missing_env",
      },
    };
  }
  return { ok: true, cfg };
}

function deviceIdOrError():
  | { ok: true; deviceId: string }
  | { ok: false; result: { success: false; error: string; code: string } } {
  try {
    return { ok: true, deviceId: getMachineGuid() };
  } catch (e) {
    return { ok: false, result: { success: false, error: (e as Error).message, code: "invalid" } };
  }
}

async function buildQrPayload(
  sessionId: string,
  expiresAt: string,
): Promise<Extract<InvoiceScanCreateResult, { success: true }>> {
  const scanUrl = scanPageUrl(sessionId);
  const qrDataUrl = await QRCode.toDataURL(scanUrl, {
    width: 360,
    margin: 2,
    errorCorrectionLevel: "M",
  });
  persistLastInvoiceScanSession(sessionId);
  return { success: true, sessionId, scanUrl, qrDataUrl, expiresAt };
}

async function createSession(
  cfg: StoreOnlineConfig,
  deviceId: string,
): Promise<InvoiceScanCreateResult> {
  try {
    const { okHttp, status, json } = await postInvoiceScan(cfg, {
      action: "create-session",
      device_id: deviceId,
    });
    const rec = asRecord(json);
    if (!okHttp || rec?.ok === false) {
      return {
        success: false,
        error: readEdgeError(json, status),
        code: status === 401 || status === 403 ? "unauthorized" : "edge",
      };
    }
    const sessionId = typeof rec?.session_id === "string" ? rec.session_id : "";
    const expiresAt = typeof rec?.expires_at === "string" ? rec.expires_at : "";
    if (!sessionId || !expiresAt) {
      return { success: false, error: "Invalid create-session response", code: "edge" };
    }
    return await buildQrPayload(sessionId, expiresAt);
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

async function getStatus(
  cfg: StoreOnlineConfig,
  deviceId: string,
  sessionId: string,
): Promise<InvoiceScanStatusResult> {
  try {
    const { okHttp, status, json } = await postInvoiceScan(cfg, {
      action: "get-status",
      device_id: deviceId,
      session_id: sessionId,
    });
    const rec = asRecord(json);
    if (!okHttp || rec?.ok === false) {
      return {
        success: false,
        error: readEdgeError(json, status),
        code: status === 410 ? "expired" : status === 404 ? "not_found" : "edge",
      };
    }
    const st = rec?.status;
    if (
      st !== "waiting" &&
      st !== "uploaded" &&
      st !== "completed" &&
      st !== "expired" &&
      st !== "failed"
    ) {
      return { success: false, error: "Invalid status", code: "edge" };
    }
    return {
      success: true,
      status: st as InvoiceScanStatus,
      expiresAt: typeof rec?.expires_at === "string" ? rec.expires_at : null,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

async function downloadAndCleanup(
  cfg: StoreOnlineConfig,
  deviceId: string,
  sessionId: string,
): Promise<InvoiceScanDownloadResult> {
  try {
    const signed = await postInvoiceScan(cfg, {
      action: "get-download-url",
      device_id: deviceId,
      session_id: sessionId,
    });
    const rec = asRecord(signed.json);
    if (!signed.okHttp || rec?.ok === false) {
      return {
        success: false,
        error: readEdgeError(signed.json, signed.status),
        code: "edge",
      };
    }
    const signedUrl = typeof rec?.signed_url === "string" ? rec.signed_url : "";
    if (!signedUrl) {
      return { success: false, error: "Missing download URL", code: "edge" };
    }

    const imgRes = await fetch(signedUrl);
    if (!imgRes.ok) {
      return {
        success: false,
        error: `Download failed (${imgRes.status})`,
        code: "download",
      };
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length < 32) {
      return { success: false, error: "Downloaded file is empty", code: "download" };
    }

    const localPath = path.join(app.getPath("temp"), `reda-invoice-scan-${sessionId}.jpg`);
    fs.writeFileSync(localPath, buf);
    const dataUrl = `data:image/jpeg;base64,${buf.toString("base64")}`;

    const cleaned = await postInvoiceScan(cfg, {
      action: "cleanup",
      device_id: deviceId,
      session_id: sessionId,
    });
    if (!cleaned.okHttp) {
      console.error("invoice-scan cleanup failed", readEdgeError(cleaned.json, cleaned.status));
    }

    clearLastInvoiceScanSession();
    return { success: true, localPath, dataUrl };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

async function cleanupSession(
  cfg: StoreOnlineConfig,
  deviceId: string,
  sessionId: string,
): Promise<void> {
  try {
    await postInvoiceScan(cfg, {
      action: "cleanup",
      device_id: deviceId,
      session_id: sessionId,
    });
  } catch {
    // Next create-session still sweeps waiting; cron removes leftover uploads.
  }
}

async function discardLastSession(cfg: StoreOnlineConfig, deviceId: string): Promise<void> {
  const lastId = readLastInvoiceScanSessionId();
  if (lastId) await cleanupSession(cfg, deviceId, lastId);
  clearLastInvoiceScanSession();
}

async function resumeDeviceSession(
  cfg: StoreOnlineConfig,
  deviceId: string,
): Promise<
  | { sessionId: string; status: "waiting" | "uploaded"; expiresAt: string | null }
  | null
  | "network"
> {
  try {
    const { okHttp, status, json } = await postInvoiceScan(cfg, {
      action: "resume-session",
      device_id: deviceId,
    });
    const rec = asRecord(json);
    const err = typeof rec?.error === "string" ? rec.error : "";
    if (err === "unknown_action") return null;
    if (!okHttp || rec?.ok === false) {
      if (status === 401 || status === 403) return null;
      return "network";
    }
    const sessionId = typeof rec?.session_id === "string" ? rec.session_id : "";
    const st = rec?.status;
    if (!sessionId || (st !== "waiting" && st !== "uploaded")) return null;
    return {
      sessionId,
      status: st,
      expiresAt: typeof rec?.expires_at === "string" ? rec.expires_at : null,
    };
  } catch {
    return "network";
  }
}

function waitingStillValid(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const ms = new Date(expiresAt).getTime();
  return Number.isFinite(ms) && ms > Date.now();
}

async function startSession(forceNew: boolean): Promise<InvoiceScanStartResult> {
  const cfgResult = configOrError();
  if (!cfgResult.ok) return cfgResult.result;
  const deviceResult = deviceIdOrError();
  if (!deviceResult.ok) return deviceResult.result;
  const { cfg } = cfgResult;
  const { deviceId } = deviceResult;

  const live = await resumeDeviceSession(cfg, deviceId);
  if (live === "network") {
    return { success: false, error: "Network error", code: "network" };
  }

  if (forceNew) {
    if (live) await cleanupSession(cfg, deviceId, live.sessionId);
    await discardLastSession(cfg, deviceId);
    const created = await createSession(cfg, deviceId);
    if (created.success === false) return created;
    return { ...created, kind: "qr" };
  }

  if (live?.status === "waiting" && waitingStillValid(live.expiresAt)) {
    const qr = await buildQrPayload(live.sessionId, live.expiresAt as string);
    return { ...qr, kind: "qr" };
  }
  if (live?.status === "uploaded") {
    const downloaded = await downloadAndCleanup(cfg, deviceId, live.sessionId);
    if (downloaded.success === false) {
      return {
        success: false,
        error: downloaded.error,
        code: downloaded.code === "download" ? "download" : downloaded.code,
      };
    }
    return { ...downloaded, kind: "photo" };
  }

  const lastId = readLastInvoiceScanSessionId();
  if (lastId) {
    const status = await getStatus(cfg, deviceId, lastId);
    if (status.success === false) {
      if (status.code === "network") {
        return { success: false, error: status.error, code: status.code };
      }
      clearLastInvoiceScanSession();
    } else if (status.status === "waiting" && waitingStillValid(status.expiresAt)) {
      const qr = await buildQrPayload(lastId, status.expiresAt as string);
      return { ...qr, kind: "qr" };
    } else if (status.status === "uploaded") {
      const downloaded = await downloadAndCleanup(cfg, deviceId, lastId);
      if (downloaded.success === false) {
        return {
          success: false,
          error: downloaded.error,
          code: downloaded.code === "download" ? "download" : downloaded.code,
        };
      }
      return { ...downloaded, kind: "photo" };
    } else {
      clearLastInvoiceScanSession();
    }
  }

  const created = await createSession(cfg, deviceId);
  if (created.success === false) return created;
  return { ...created, kind: "qr" };
}

export function setupInvoiceScanHandlers(): void {
  ipcMain.handle(
    "online:invoiceScanCreateSession",
    async (): Promise<InvoiceScanCreateResult> => {
      const cfgResult = configOrError();
      if (!cfgResult.ok) return cfgResult.result;
      const deviceResult = deviceIdOrError();
      if (!deviceResult.ok) return deviceResult.result;
      return createSession(cfgResult.cfg, deviceResult.deviceId);
    },
  );

  ipcMain.handle(
    "online:invoiceScanStartSession",
    async (_event, forceNewRaw: unknown): Promise<InvoiceScanStartResult> => {
      return startSession(forceNewRaw === true);
    },
  );

  ipcMain.handle(
    "online:invoiceScanGetStatus",
    async (_event, sessionIdRaw: unknown): Promise<InvoiceScanStatusResult> => {
      const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";
      if (!sessionId) {
        return { success: false, error: "Missing session", code: "invalid" };
      }
      const cfgResult = configOrError();
      if (!cfgResult.ok) return cfgResult.result;
      const deviceResult = deviceIdOrError();
      if (!deviceResult.ok) return deviceResult.result;
      return getStatus(cfgResult.cfg, deviceResult.deviceId, sessionId);
    },
  );

  ipcMain.handle(
    "online:invoiceScanDownloadAndCleanup",
    async (_event, sessionIdRaw: unknown): Promise<InvoiceScanDownloadResult> => {
      const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw.trim() : "";
      if (!sessionId) {
        return { success: false, error: "Missing session", code: "invalid" };
      }
      const cfgResult = configOrError();
      if (!cfgResult.ok) return cfgResult.result;
      const deviceResult = deviceIdOrError();
      if (!deviceResult.ok) return deviceResult.result;
      return downloadAndCleanup(cfgResult.cfg, deviceResult.deviceId, sessionId);
    },
  );

  ipcMain.handle(
    "online:invoiceScanDeleteTemp",
    async (_event, localPathRaw: unknown): Promise<{ success: boolean }> => {
      const localPath = typeof localPathRaw === "string" ? localPathRaw.trim() : "";
      if (!localPath) return { success: false };
      try {
        const tempRoot = path.resolve(app.getPath("temp"));
        const resolved = path.resolve(localPath);
        if (!resolved.startsWith(tempRoot)) return { success: false };
        if (!path.basename(resolved).startsWith("reda-invoice-scan-")) {
          return { success: false };
        }
        if (fs.existsSync(resolved)) fs.unlinkSync(resolved);
        return { success: true };
      } catch {
        return { success: false };
      }
    },
  );
}
