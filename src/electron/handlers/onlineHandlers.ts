import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from "electron";
import fs from "fs";
import path from "path";
import { finished } from "node:stream/promises";
import { getMachineGuid } from "../utils/validationKey";
import { getStoreOnlineConfig, type StoreOnlineConfig } from "../utils/onlineConfig";
import {
  clearStoredLicenseGrace,
  persistStoredLicenseGrace,
  readStoredLicenseGrace,
  type LicenseGraceSnapshot,
} from "../utils/licenseGraceStore";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceLinkExistingPayload, DeviceLinkExistingResult } from "../types/deviceLinkExisting";
import type { DeviceCheckResult } from "../types/deviceCheck";
import { AI_OFFLINE } from "../../lib/ai/aiMessageLimits";
import { resolvePaidCloudBackupAccess } from "../../lib/license/paidCloudBackupAccess";
import { resolvePremiumAccess } from "../../lib/license/premiumAccess";
import type {
  AiConsumeEntitlementError,
  AiConsumeResult,
} from "../types/aiConsume";
import type {
  CloudBackupDownloadResult,
  CloudBackupDownloadToLocalResult,
  CloudBackupErrorCode,
  CloudBackupTransferProgressPayload,
  CloudBackupUploadMeta,
  CloudBackupUploadResult,
} from "../types/cloudBackup";
import {
  getStoredOnlineCustomerId,
  syncOnlineCustomerIdFromServer,
} from "../../lib/onboarding/onlineCustomerId";
import {
  CLOUD_LATEST_FROM_ONLINE_DB,
  CLOUD_LATEST_FROM_ONLINE_META,
} from "../utils/cloudBackupFilenames";
import {
  checkCloudBackupAppVersionGate,
  parseCloudBackupUploadMeta,
} from "../utils/cloudBackupMeta";

function deviceRequestUrl(base: string): string {
  return `${base}/functions/v1/device-request`;
}

function deviceCheckUrl(base: string): string {
  return `${base}/functions/v1/device-check`;
}

function aiConsumeUrl(base: string): string {
  return `${base}/functions/v1/ai-consume`;
}

function aiQuotaUrl(base: string): string {
  return `${base}/functions/v1/ai-quota`;
}

function deviceLinkExistingUrl(base: string): string {
  return `${base}/functions/v1/device-link-existing`;
}

function backupUploadUrl(base: string): string {
  return `${base}/functions/v1/backup-upload-latest`;
}

function backupDownloadUrl(base: string): string {
  return `${base}/functions/v1/backup-download-latest`;
}

function onlineAuthedHeaders(cfg: StoreOnlineConfig): Record<string, string> {
  return {
    "x-app-secret": cfg.appSecret,
    Authorization: `Bearer ${cfg.anonKey}`,
    apikey: cfg.anonKey,
  };
}

function mapCloudBackupErrorCode(error: string, status: number): CloudBackupErrorCode {
  const normalized = error.trim().toLowerCase();
  if (normalized === "unauthorized") return "unauthorized";
  if (normalized === "file_too_large_free_tier") return "file_too_large";
  if (status === 404) return "not_found";
  if (
    normalized.includes("not found") ||
    normalized.includes("no backup") ||
    normalized.includes("object not found")
  ) {
    return "not_found";
  }
  if (status === 401 || status === 403) return "unauthorized";
  if (status >= 400 && status < 500) return "edge";
  return "http";
}

function cloudBackupAppUpdateRequiredResult(
  cloudAppVersion: string,
  installedAppVersion: string,
): CloudBackupDownloadToLocalResult {
  return {
    success: false,
    error: `Cloud backup requires app version ${cloudAppVersion} or newer (installed: ${installedAppVersion}).`,
    code: "app_update_required",
    cloudAppVersion,
    installedAppVersion,
  };
}

async function fetchCloudBackupMetaFromSignedUrl(
  metaSignedUrl: string,
): Promise<CloudBackupUploadMeta | null> {
  try {
    const res = await fetch(metaSignedUrl);
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parseCloudBackupUploadMeta(json);
  } catch {
    return null;
  }
}

function versionGateBlockFromMeta(
  meta: CloudBackupUploadMeta,
  installedAppVersion: string,
): CloudBackupDownloadToLocalResult | null {
  const gate = checkCloudBackupAppVersionGate(meta, installedAppVersion);
  if (!gate.blocked) return null;
  return cloudBackupAppUpdateRequiredResult(gate.cloudAppVersion, gate.installedAppVersion);
}

function sendCloudBackupProgressThrottled(
  event: IpcMainInvokeEvent | null,
): (payload: CloudBackupTransferProgressPayload) => void {
  let lastTime = 0;
  let lastDownloaded = 0;
  return (payload: CloudBackupTransferProgressPayload) => {
    const now = Date.now();
    const timeDiff = now - lastTime;
    const force = payload.progress >= 100;
    if (!force && lastTime > 0 && timeDiff < 1000) {
      return;
    }
    const speed =
      lastTime > 0 && timeDiff > 0
        ? ((payload.downloaded - lastDownloaded) / timeDiff) * 1000
        : payload.speed;
    const out: CloudBackupTransferProgressPayload = { ...payload, speed };
    if (event && !event.sender.isDestroyed()) {
      event.sender.send("cloud-backup-transfer-progress", out);
    } else if (!event) {
      BrowserWindow.getAllWindows().forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send("cloud-backup-transfer-progress", out);
        }
      });
    }
    lastTime = now;
    lastDownloaded = payload.downloaded;
  };
}

async function assertCloudBackupAccessAllowed(): Promise<
  | { success: false; error: string; code: CloudBackupErrorCode }
  | null
> {
  const check = await runDeviceCheckInternal();
  const snapshot = readStoredLicenseGrace();
  const isOnline = !(check.success === false && check.code === "network");
  const access = resolvePaidCloudBackupAccess({
    effectiveCheckResult: check,
    snapshot,
    isLicenseValid: check.success === true && check.allowed === true,
    nowMs: Date.now(),
    isOnline,
    aiEnabled: check.success === true ? check.aiEnabled : undefined,
  });

  if (access.hasPaidCloudBackupAccess) {
    return null;
  }

  switch (access.blockReason) {
    case "offline":
      return {
        success: false,
        error: "Online backup requires an active internet connection.",
        code: "network",
      };
    case "trial":
      return {
        success: false,
        error: "Online backup is not available during the free trial.",
        code: "unauthorized",
      };
    case "disabled":
      return {
        success: false,
        error: "Premium is required for online backup.",
        code: "unauthorized",
      };
    case "subscription_expired":
      return {
        success: false,
        error: "Your paid subscription has ended.",
        code: "unauthorized",
      };
    case "not_licensed":
      return {
        success: false,
        error: "This device is not activated for paid cloud backup yet.",
        code: "unauthorized",
      };
    default:
      return {
        success: false,
        error: "Online backup is not available for this device.",
        code: "unauthorized",
      };
  }
}

export type AiPremiumAccessBlock = {
  error: string;
  code: "offline" | "ai_disabled";
};

/** Fresh device-check + trial gate before paid external AI calls (Serper, etc.). */
export async function assertAiPremiumAccessInternal(): Promise<AiPremiumAccessBlock | null> {
  const check = await runDeviceCheckInternal();
  const snapshot = readStoredLicenseGrace();
  const nowMs = Date.now();
  const isOnline = !(check.success === false && check.code === "network");

  let trialEndsAtMs: number | null = null;
  if (check.success === true && check.trialEndsAt) {
    const parsed = Date.parse(check.trialEndsAt);
    if (Number.isFinite(parsed)) trialEndsAtMs = parsed;
  }
  if (trialEndsAtMs == null && snapshot?.trialEndsAtMs != null) {
    trialEndsAtMs = snapshot.trialEndsAtMs;
  }
  const isTrialActive =
    trialEndsAtMs != null && Number.isFinite(trialEndsAtMs) && nowMs < trialEndsAtMs;

  const access = resolvePremiumAccess({
    isOnline,
    isTrialActive,
    aiEnabled: check.success === true ? check.aiEnabled : undefined,
  });

  if (access.canUsePremium) return null;

  if (access.blockReason === "offline") {
    return { error: AI_OFFLINE, code: "offline" };
  }
  if (access.blockReason === "trial") {
    return { error: "ai_trial_blocked", code: "ai_disabled" };
  }
  return { error: "ai_disabled", code: "ai_disabled" };
}

export async function uploadCloudBackupLatest(
  event: IpcMainInvokeEvent | null,
  backupFilePath: string,
  uploadSource?: string,
): Promise<CloudBackupUploadResult> {
  const denied = await assertCloudBackupAccessAllowed();
  if (denied) return denied;

  const backupPath = String(backupFilePath ?? "").trim();
  if (!backupPath) {
    return { success: false, error: "Backup file path is required.", code: "missing_file" };
  }
  if (!fs.existsSync(backupPath)) {
    return { success: false, error: "Backup file was not found.", code: "missing_file" };
  }

  const identity = await resolveCloudBackupIdentity();
  if (identity.success === false) {
    return { success: false, error: identity.error, code: identity.code };
  }

  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      success: false,
      error: "Online backup is not configured (missing STORE_ONLINE_* env vars).",
      code: "missing_env",
    };
  }

  const send = sendCloudBackupProgressThrottled(event);
  const totalSize = fs.statSync(backupPath).size;
  const chunkSize = 2 * 1024 * 1024;
  const parts: Buffer[] = [];
  let readOff = 0;
  const fd = fs.openSync(backupPath, "r");
  try {
    while (readOff < totalSize) {
      const len = Math.min(chunkSize, totalSize - readOff);
      const buf = Buffer.allocUnsafe(len);
      fs.readSync(fd, buf, 0, len, readOff);
      parts.push(buf);
      readOff += len;
      const progressRead = totalSize > 0 ? Math.min(35, Math.round((readOff / totalSize) * 35)) : 0;
      send({
        phase: "upload",
        progress: progressRead,
        downloaded: readOff,
        total: totalSize || readOff,
        speed: 0,
      });
    }
  } finally {
    fs.closeSync(fd);
  }

  const fileBuffer = Buffer.concat(parts);
  const form = new FormData();
  form.append("device_id", identity.deviceId);
  form.append("customer_id", identity.customerId);
  form.append("app_version", app.getVersion());
  const source =
    typeof uploadSource === "string" && uploadSource.trim().length > 0
      ? uploadSource.trim()
      : "manual_upload";
  form.append("source", source);
  form.append("file", new Blob([fileBuffer], { type: "application/octet-stream" }), path.basename(backupPath));

  const networkStart = Date.now();
  const estimatedMs = Math.max(8000, (totalSize / (200 * 1024)) * 1000);
  let networkIv: ReturnType<typeof setInterval> | null = null;
  networkIv = setInterval(() => {
    const elapsed = Date.now() - networkStart;
    const prog = Math.min(99, 35 + (elapsed / estimatedMs) * 64);
    const downloadedDisplay = Math.floor((totalSize * prog) / 100);
    send({
      phase: "upload",
      progress: Math.round(prog),
      downloaded: downloadedDisplay,
      total: totalSize,
      speed: 0,
    });
  }, 1000);

  try {
    const res = await fetch(backupUploadUrl(cfg.supabaseUrl), {
      method: "POST",
      headers: onlineAuthedHeaders(cfg),
      body: form,
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok || (json && typeof json === "object" && (json as Record<string, unknown>).ok === false)) {
      const error = readEdgeError(json, res.status);
      return {
        success: false,
        error,
        code: mapCloudBackupErrorCode(error, res.status),
      };
    }

    if (!json || typeof json !== "object") {
      return {
        success: false,
        error: "Invalid cloud backup upload response",
        code: "edge",
      };
    }

    const body = json as Record<string, unknown>;
    const meta = parseCloudBackupUploadMeta(body.meta);
    if (!meta || typeof body.db_path !== "string" || typeof body.meta_path !== "string") {
      return {
        success: false,
        error: "Invalid cloud backup upload response",
        code: "edge",
      };
    }

    send({
      phase: "upload",
      progress: 100,
      downloaded: totalSize,
      total: totalSize,
      speed: 0,
    });

    return {
      success: true,
      dbPath: body.db_path,
      metaPath: body.meta_path,
      meta,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  } finally {
    if (networkIv) clearInterval(networkIv);
  }
}

async function writeStreamChunk(writeStream: fs.WriteStream, buf: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      writeStream.removeListener("error", onError);
      writeStream.removeListener("drain", onDrain);
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };
    const onError = (err: Error) => {
      finish(() => reject(err));
    };
    const onDrain = () => {
      finish(() => resolve());
    };

    writeStream.once("error", onError);
    writeStream.write(buf, (err) => {
      if (err) {
        finish(() => reject(err));
        return;
      }
      if (writeStream.writableNeedDrain) {
        writeStream.once("drain", onDrain);
      } else {
        finish(() => resolve());
      }
    });
  });
}

async function requestCloudBackupDownloadSignedUrl(
  overrideCustomerId?: string,
): Promise<CloudBackupDownloadResult> {
  const denied = await assertCloudBackupAccessAllowed();
  if (denied) return denied;

  const identity = await resolveCloudBackupIdentity(overrideCustomerId);
  if (identity.success === false) {
    return { success: false, error: identity.error, code: identity.code };
  }

  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      success: false,
      error: "Online backup is not configured (missing STORE_ONLINE_* env vars).",
      code: "missing_env",
    };
  }

  try {
    const res = await fetch(backupDownloadUrl(cfg.supabaseUrl), {
      method: "POST",
      headers: {
        ...onlineAuthedHeaders(cfg),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: identity.deviceId,
        customer_id: identity.customerId,
      }),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok || (json && typeof json === "object" && (json as Record<string, unknown>).ok === false)) {
      const edgeError = readEdgeError(json, res.status);
      return {
        success: false,
        error: edgeError,
        code: mapCloudBackupErrorCode(edgeError, res.status),
      };
    }

    if (!json || typeof json !== "object") {
      return {
        success: false,
        error: "Invalid cloud backup download response",
        code: "edge",
      };
    }

    const body = json as Record<string, unknown>;
    const dbSignedUrl =
      typeof body.db_signed_url === "string" && body.db_signed_url.trim()
        ? body.db_signed_url.trim()
        : null;
    if (!dbSignedUrl) {
      return {
        success: false,
        error: "Cloud backup download URL was not returned",
        code: "edge",
      };
    }

    const metaSignedUrlRaw = body.meta_signed_url;
    const metaSignedUrl =
      typeof metaSignedUrlRaw === "string" && metaSignedUrlRaw.trim() ? metaSignedUrlRaw.trim() : null;

    return {
      success: true,
      customerId: identity.customerId,
      dbSignedUrl,
      metaSignedUrl,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

async function resolveCloudBackupIdentity(
  overrideCustomerId?: string,
): Promise<
  | { success: true; deviceId: string; customerId: string }
  | { success: false; error: string; code: CloudBackupErrorCode }
> {
  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      success: false,
      error: "Online backup is not configured (missing STORE_ONLINE_* env vars).",
      code: "missing_env",
    };
  }

  let deviceId: string;
  try {
    deviceId = getMachineGuid();
  } catch (e) {
    return { success: false, error: (e as Error).message, code: "invalid" };
  }

  const override = (overrideCustomerId ?? "").trim();
  if (override) {
    return { success: true, deviceId, customerId: override };
  }

  const check = await runDeviceCheckInternal();
  if (check.success === true && check.customerId?.trim()) {
    const customerId = await syncOnlineCustomerIdFromServer(check.customerId);
    if (customerId) {
      return { success: true, deviceId, customerId };
    }
  }

  const stored = await getStoredOnlineCustomerId();
  if (stored) {
    return { success: true, deviceId, customerId: stored };
  }

  return {
    success: false,
    error: "Customer ID is not recorded on this device. Complete welcome setup first.",
    code: "missing_customer_id",
  };
}

function readEdgeError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const msg = o.error ?? o.message ?? o.detail;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return `HTTP ${status}`;
}

function parseDeviceCheckJson(json: unknown): {
  allowed: boolean;
  trialEndsAt?: string | null;
  expiresAt?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  aiEnabled?: boolean;
} | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (typeof o.allowed !== "boolean") return null;

  let trialEndsAt: string | null | undefined;
  if ("trial_ends_at" in o) {
    if (o.trial_ends_at === null) trialEndsAt = null;
    else if (typeof o.trial_ends_at === "string") trialEndsAt = o.trial_ends_at;
    else if (o.trial_ends_at !== undefined) trialEndsAt = String(o.trial_ends_at);
  }

  let expiresAt: string | null | undefined;
  if ("expires_at" in o) {
    if (o.expires_at === null) expiresAt = null;
    else if (typeof o.expires_at === "string") expiresAt = o.expires_at;
    else if (o.expires_at !== undefined) expiresAt = String(o.expires_at);
  }

  let customerId: string | null | undefined;
  if ("customer_id" in o) {
    if (o.customer_id === null) customerId = null;
    else if (typeof o.customer_id === "string") customerId = o.customer_id.trim() || null;
    else if (o.customer_id !== undefined) customerId = String(o.customer_id).trim() || null;
  }

  let customerName: string | null | undefined;
  let customerPhone: string | null | undefined;
  if (typeof o.customer_name === "string" && o.customer_name.trim()) {
    customerName = o.customer_name.trim();
  }
  if (typeof o.customer_phone === "string" && o.customer_phone.trim()) {
    customerPhone = o.customer_phone.trim();
  }
  if (o.customer && typeof o.customer === "object") {
    const c = o.customer as Record<string, unknown>;
    if (customerName == null && typeof c.name === "string" && c.name.trim()) {
      customerName = c.name.trim();
    }
    if (customerPhone == null && typeof c.phone === "string" && c.phone.trim()) {
      customerPhone = c.phone.trim();
    }
  }

  let aiEnabled: boolean | undefined;
  if ("ai_enabled" in o) {
    aiEnabled = o.ai_enabled === true;
  }

  return {
    allowed: o.allowed,
    trialEndsAt,
    expiresAt,
    customerId,
    customerName,
    customerPhone,
    aiEnabled,
  };
}

async function runDeviceCheckInternal(): Promise<DeviceCheckResult> {
  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      success: false,
      error: "Online provisioning is not configured (missing STORE_ONLINE_* env vars).",
      code: "missing_env",
    };
  }

  let deviceId: string;
  try {
    deviceId = getMachineGuid();
  } catch (e) {
    return { success: false, error: (e as Error).message, code: "invalid" };
  }

  try {
    const res = await fetch(deviceCheckUrl(cfg.supabaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-secret": cfg.appSecret,
        Authorization: `Bearer ${cfg.anonKey}`,
        apikey: cfg.anonKey,
      },
      body: JSON.stringify({ device_id: deviceId }),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return {
        success: false,
        error: readEdgeError(json, res.status),
        code: "http",
      };
    }

    if (json && typeof json === "object" && (json as Record<string, unknown>).ok === false) {
      return {
        success: false,
        error: readEdgeError(json, res.status),
        code: "edge",
      };
    }

    const parsed = parseDeviceCheckJson(json);
    if (!parsed) {
      return {
        success: false,
        error: "Invalid device-check response",
        code: "edge",
      };
    }

    return {
      success: true,
      allowed: parsed.allowed,
      trialEndsAt: parsed.trialEndsAt,
      expiresAt: parsed.expiresAt,
      customerId: parsed.customerId,
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      aiEnabled: parsed.aiEnabled,
      raw: json,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

const AI_CONSUME_ENTITLEMENT_ERRORS = new Set<AiConsumeEntitlementError>([
  "device_not_found",
  "ai_disabled",
  "ai_trial_blocked",
  "ai_not_licensed",
  "rate_limit_minute",
  "rate_limit_day",
]);

function parseAiConsumeEntitlementError(
  value: unknown,
): AiConsumeEntitlementError | undefined {
  if (typeof value !== "string") return undefined;
  return AI_CONSUME_ENTITLEMENT_ERRORS.has(value as AiConsumeEntitlementError)
    ? (value as AiConsumeEntitlementError)
    : undefined;
}

function parseAiConsumeSuccessJson(json: unknown): {
  remainingMinute?: number | null;
  remainingDay?: number | null;
  limits?: { requests_per_minute: number; requests_per_day: number };
} | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.ok !== true) return null;

  let remainingMinute: number | null | undefined;
  if ("remaining_minute" in o) {
    if (o.remaining_minute === null) remainingMinute = null;
    else if (typeof o.remaining_minute === "number") {
      remainingMinute = o.remaining_minute;
    }
  }

  let remainingDay: number | null | undefined;
  if ("remaining_day" in o) {
    if (o.remaining_day === null) remainingDay = null;
    else if (typeof o.remaining_day === "number") remainingDay = o.remaining_day;
  }

  let limits: { requests_per_minute: number; requests_per_day: number } | undefined;
  if (o.limits && typeof o.limits === "object") {
    const l = o.limits as Record<string, unknown>;
    if (
      typeof l.requests_per_minute === "number" &&
      typeof l.requests_per_day === "number"
    ) {
      limits = {
        requests_per_minute: l.requests_per_minute,
        requests_per_day: l.requests_per_day,
      };
    }
  }

  return { remainingMinute, remainingDay, limits };
}

export type AiConsumeOptions = {
  /** Whole points added to ai_usage_daily.count. Default 1. */
  dayCost?: number;
  /** Added to ai_usage_minute.count. 0 = day-only settle (no extra minute hit). Default 1. */
  minuteCost?: number;
};

export async function runAiConsumeInternal(
  options?: AiConsumeOptions,
): Promise<AiConsumeResult> {
  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      success: false,
      error: "Online provisioning is not configured (missing STORE_ONLINE_* env vars).",
      code: "missing_env",
    };
  }

  let deviceId: string;
  try {
    deviceId = getMachineGuid();
  } catch (e) {
    return { success: false, error: (e as Error).message, code: "invalid" };
  }

  try {
    const res = await fetch(aiConsumeUrl(cfg.supabaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-secret": cfg.appSecret,
        Authorization: `Bearer ${cfg.anonKey}`,
        apikey: cfg.anonKey,
      },
      body: JSON.stringify({
        device_id: deviceId,
        cost: Math.max(1, Math.floor(options?.dayCost ?? 1)),
        minute_cost: Math.max(0, Math.floor(options?.minuteCost ?? 1)),
      }),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return {
        success: false,
        error: readEdgeError(json, res.status),
        code: "http",
      };
    }

    if (json && typeof json === "object") {
      const o = json as Record<string, unknown>;
      if (o.ok === false) {
        const entitlementError = parseAiConsumeEntitlementError(o.error);
        return {
          success: false,
          error:
            typeof o.error === "string" && o.error.trim()
              ? o.error.trim()
              : "AI entitlement rejected",
          code: "entitlement",
          entitlementError,
        };
      }
    }

    const parsed = parseAiConsumeSuccessJson(json);
    if (!parsed) {
      return {
        success: false,
        error: "Invalid ai-consume response",
        code: "edge",
      };
    }

    return {
      success: true,
      remainingMinute: parsed.remainingMinute,
      remainingDay: parsed.remainingDay,
      limits: parsed.limits,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

export async function runAiQuotaPeekInternal(): Promise<AiConsumeResult> {
  const cfg = getStoreOnlineConfig();
  if ("error" in cfg) {
    return {
      success: false,
      error: "Online provisioning is not configured (missing STORE_ONLINE_* env vars).",
      code: "missing_env",
    };
  }

  let deviceId: string;
  try {
    deviceId = getMachineGuid();
  } catch (e) {
    return { success: false, error: (e as Error).message, code: "invalid" };
  }

  try {
    const res = await fetch(aiQuotaUrl(cfg.supabaseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-secret": cfg.appSecret,
        Authorization: `Bearer ${cfg.anonKey}`,
        apikey: cfg.anonKey,
      },
      body: JSON.stringify({ device_id: deviceId }),
    });

    const text = await res.text();
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!res.ok) {
      return {
        success: false,
        error: readEdgeError(json, res.status),
        code: "http",
      };
    }

    const parsed = parseAiConsumeSuccessJson(json);
    if (!parsed) {
      return {
        success: false,
        error: "Invalid ai-quota response",
        code: "edge",
      };
    }

    return {
      success: true,
      remainingMinute: parsed.remainingMinute,
      remainingDay: parsed.remainingDay,
      limits: parsed.limits,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message || "Network error",
      code: "network",
    };
  }
}

export function setupOnlineHandlers(): void {
  ipcMain.handle("online:deviceCheck", async (): Promise<DeviceCheckResult> => {
    const result = await runDeviceCheckInternal();
    if (result.success === true && result.customerId?.trim()) {
      await syncOnlineCustomerIdFromServer(result.customerId);
    }
    return result;
  });

  ipcMain.handle(
    "online:deviceLinkExisting",
    async (_event, payload: DeviceLinkExistingPayload): Promise<DeviceLinkExistingResult> => {
      const customerId = (payload?.customerId ?? "").trim();
      const name = (payload?.name ?? "").trim();
      const phone = (payload?.phone ?? "").trim();
      if (!customerId || !name || !phone) {
        return {
          success: false,
          error: "Customer ID, name, and phone are required.",
          code: "invalid",
        };
      }

      const cfg = getStoreOnlineConfig();
      if ("error" in cfg) {
        return {
          success: false,
          error: "Online provisioning is not configured (missing STORE_ONLINE_* env vars).",
          code: "missing_env",
        };
      }

      let deviceId: string;
      try {
        deviceId = getMachineGuid();
      } catch (e) {
        return { success: false, error: (e as Error).message, code: "invalid" };
      }

      try {
        const res = await fetch(deviceLinkExistingUrl(cfg.supabaseUrl), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...onlineAuthedHeaders(cfg),
          },
          body: JSON.stringify({
            device_id: deviceId,
            customer_id: customerId,
            name,
            phone,
          }),
        });

        const text = await res.text();
        let json: unknown;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = { raw: text };
        }

        if (!res.ok) {
          return {
            success: false,
            error: readEdgeError(json, res.status),
            code: "http",
          };
        }

        if (json && typeof json === "object" && (json as Record<string, unknown>).ok === false) {
          return {
            success: false,
            error: readEdgeError(json, res.status),
            code: "edge",
          };
        }

        if (!json || typeof json !== "object") {
          return {
            success: false,
            error: "Invalid device-link-existing response",
            code: "edge",
          };
        }

        const body = json as Record<string, unknown>;
        const returnedCustomerId =
          typeof body.customer_id === "string" && body.customer_id.trim()
            ? body.customer_id.trim()
            : customerId;
        const mode = typeof body.mode === "string" ? body.mode : null;
        const alreadyLinked = body.already_linked === true;

        await syncOnlineCustomerIdFromServer(returnedCustomerId);

        return {
          success: true,
          customerId: returnedCustomerId,
          mode,
          alreadyLinked,
          raw: json,
        };
      } catch (e) {
        return {
          success: false,
          error: (e as Error).message || "Network error",
          code: "network",
        };
      }
    },
  );

  ipcMain.handle("online:deviceRequest", async (_event, payload: DeviceRequestPayload): Promise<DeviceRequestResult> => {
    const name = (payload?.name ?? "").trim();
    const phone = (payload?.phone ?? "").trim();
    const customerId = (payload?.customerId ?? "").trim() || undefined;
    if (!name || !phone) {
      return { success: false, error: "Name and phone are required.", code: "invalid" };
    }

    const cfg = getStoreOnlineConfig();
    if ("error" in cfg) {
      return {
        success: false,
        error: "Online provisioning is not configured (missing STORE_ONLINE_* env vars).",
        code: "missing_env",
      };
    }

    let deviceId: string;
    try {
      deviceId = getMachineGuid();
    } catch (e) {
      return { success: false, error: (e as Error).message, code: "invalid" };
    }

    const body: Record<string, string> = {
      device_id: deviceId,
      name,
      phone,
    };
    if (customerId) body.customer_id = customerId;

    try {
      const res = await fetch(deviceRequestUrl(cfg.supabaseUrl), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-secret": cfg.appSecret,
          Authorization: `Bearer ${cfg.anonKey}`,
          apikey: cfg.anonKey,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = { raw: text };
      }

      if (!res.ok) {
        return {
          success: false,
          error: readEdgeError(json, res.status),
          code: "http",
        };
      }

      if (json && typeof json === "object" && (json as Record<string, unknown>).ok === false) {
        return {
          success: false,
          error: readEdgeError(json, res.status),
          code: "edge",
        };
      }

      let returnedCustomerId: string | null | undefined;
      if (json && typeof json === "object") {
        const c = (json as Record<string, unknown>).customer_id;
        if (typeof c === "string" && c.trim()) returnedCustomerId = c.trim();
      }

      if (returnedCustomerId) {
        await syncOnlineCustomerIdFromServer(returnedCustomerId);
      }

      return { success: true, customerId: returnedCustomerId ?? null, raw: json };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error",
        code: "network",
      };
    }
  });

  ipcMain.handle("online:licenseGrace:read", (): LicenseGraceSnapshot | null => {
    return readStoredLicenseGrace();
  });

  ipcMain.handle(
    "online:licenseGrace:persist",
    (
      _event,
      payload: { trialEndsAt?: string | null; expiresAt?: string | null } | undefined,
    ): { success: true } | { success: false; error: string } => {
      try {
        persistStoredLicenseGrace(payload?.trialEndsAt, payload?.expiresAt);
        return { success: true };
      } catch (e) {
        return { success: false, error: (e as Error).message || "Failed to persist license grace." };
      }
    },
  );

  ipcMain.handle("online:licenseGrace:clear", (): { success: true } => {
    clearStoredLicenseGrace();
    return { success: true };
  });

  ipcMain.handle(
    "online:backupUploadLatest",
    async (event, backupFilePath: string, uploadSource?: string): Promise<CloudBackupUploadResult> =>
      uploadCloudBackupLatest(event, backupFilePath, uploadSource),
  );

  ipcMain.handle("online:backupDownloadLatest", async (): Promise<CloudBackupDownloadResult> => {
    return requestCloudBackupDownloadSignedUrl();
  });

  ipcMain.handle(
    "online:backupDownloadLatestToLocal",
    async (event, overrideCustomerId?: string): Promise<CloudBackupDownloadToLocalResult> => {
      const signed = await requestCloudBackupDownloadSignedUrl(
        typeof overrideCustomerId === "string" ? overrideCustomerId : undefined,
      );
      if (signed.success === false) {
        return signed;
      }

      const backupDir = path.join(app.getPath("userData"), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const dest = path.join(backupDir, CLOUD_LATEST_FROM_ONLINE_DB);
      const metaDest = path.join(backupDir, CLOUD_LATEST_FROM_ONLINE_META);
      const send = sendCloudBackupProgressThrottled(event);

      if (signed.metaSignedUrl?.trim()) {
        const meta = await fetchCloudBackupMetaFromSignedUrl(signed.metaSignedUrl.trim());
        if (meta) {
          const versionBlock = versionGateBlockFromMeta(meta, app.getVersion());
          if (versionBlock) {
            return versionBlock;
          }
          try {
            fs.writeFileSync(metaDest, JSON.stringify(meta), "utf8");
          } catch {
            /* non-fatal — restore can still proceed */
          }
        }
      }

      try {
        const fileRes = await fetch(signed.dbSignedUrl);
        if (!fileRes.ok) {
          return {
            success: false,
            error: `Cloud file download failed (HTTP ${fileRes.status})`,
            code: "http",
          };
        }

        const totalSize = parseInt(fileRes.headers.get("content-length") ?? "0", 10) || 0;
        const body = fileRes.body;
        if (!body) {
          return {
            success: false,
            error: "Cloud file download missing response body",
            code: "network",
          };
        }

        const reader = body.getReader();
        const writeStream = fs.createWriteStream(dest);
        let downloadedSize = 0;

        try {
          let streamDone = false;
          while (!streamDone) {
            const { done, value } = await reader.read();
            if (done) {
              streamDone = true;
              break;
            }
            if (value && value.byteLength > 0) {
              const buf = Buffer.from(value);
              await writeStreamChunk(writeStream, buf);
              downloadedSize += buf.length;
              const progress = totalSize > 0 ? (downloadedSize / totalSize) * 100 : downloadedSize > 0 ? 5 : 0;
              send({
                phase: "download",
                progress: Math.min(99, Math.round(progress)),
                downloaded: downloadedSize,
                total: totalSize > 0 ? totalSize : downloadedSize,
                speed: 0,
              });
            }
          }
        } catch (streamErr) {
          writeStream.destroy();
          try {
            if (fs.existsSync(dest)) fs.unlinkSync(dest);
          } catch {
            /* ignore */
          }
          throw streamErr;
        }

        writeStream.end();
        await finished(writeStream);

        const sizeBytes = fs.existsSync(dest) ? fs.statSync(dest).size : downloadedSize;
        send({
          phase: "download",
          progress: 100,
          downloaded: sizeBytes,
          total: sizeBytes,
          speed: 0,
        });

        return {
          success: true,
          backupPath: dest,
          sizeBytes,
        };
      } catch (e) {
        try {
          if (fs.existsSync(dest)) fs.unlinkSync(dest);
        } catch {
          /* ignore */
        }
        return {
          success: false,
          error: (e as Error).message || "Network error",
          code: "network",
        };
      }
    },
  );
}
