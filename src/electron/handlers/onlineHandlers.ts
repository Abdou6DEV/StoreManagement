import { app, ipcMain } from "electron";
import fs from "fs";
import path from "path";
import { getMachineGuid } from "../utils/validationKey";
import { getStoreOnlineConfig, type StoreOnlineConfig } from "../utils/onlineConfig";
import {
  clearStoredLicenseGrace,
  persistStoredLicenseGrace,
  readStoredLicenseGrace,
  type LicenseGraceSnapshot,
} from "../utils/licenseGraceStore";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceCheckResult } from "../types/deviceCheck";
import type {
  CloudBackupDownloadResult,
  CloudBackupErrorCode,
  CloudBackupUploadMeta,
  CloudBackupUploadResult,
} from "../types/cloudBackup";
import { getOption } from "../../lib/database/options";
import { ONLINE_CUSTOMER_ID_OPTION_KEY } from "../../lib/onboarding/constants";

function deviceRequestUrl(base: string): string {
  return `${base}/functions/v1/device-request`;
}

function deviceCheckUrl(base: string): string {
  return `${base}/functions/v1/device-check`;
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
  if (status === 401 || status === 403) return "unauthorized";
  if (status >= 400 && status < 500) return "edge";
  return "http";
}

function parseCloudBackupUploadMeta(value: unknown): CloudBackupUploadMeta | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  if (
    typeof o.uploaded_at !== "string" ||
    typeof o.size_bytes !== "number" ||
    typeof o.source !== "string" ||
    typeof o.app_version !== "string" ||
    typeof o.device_id !== "string" ||
    typeof o.customer_id !== "string"
  ) {
    return null;
  }
  return {
    uploaded_at: o.uploaded_at,
    size_bytes: o.size_bytes,
    source: o.source,
    app_version: o.app_version,
    device_id: o.device_id,
    customer_id: o.customer_id,
  };
}

async function resolveCloudBackupIdentity(): Promise<
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

  const customerId = (await getOption(ONLINE_CUSTOMER_ID_OPTION_KEY))?.trim();
  if (!customerId) {
    return {
      success: false,
      error: "Customer ID is not recorded on this device. Complete welcome setup first.",
      code: "missing_customer_id",
    };
  }

  return { success: true, deviceId, customerId };
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

  return {
    allowed: o.allowed,
    trialEndsAt,
    expiresAt,
    customerId,
    customerName,
    customerPhone,
  };
}

export function setupOnlineHandlers(): void {
  ipcMain.handle("online:deviceCheck", async (): Promise<DeviceCheckResult> => {
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
        raw: json,
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error",
        code: "network",
      };
    }
  });

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
    async (_event, backupFilePath: string, uploadSource?: string): Promise<CloudBackupUploadResult> => {
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

      const fileBuffer = fs.readFileSync(backupPath);
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
      }
    },
  );

  ipcMain.handle("online:backupDownloadLatest", async (): Promise<CloudBackupDownloadResult> => {
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

      return {
        success: true,
        customerId: identity.customerId,
        dbSignedUrl,
      };
    } catch (e) {
      return {
        success: false,
        error: (e as Error).message || "Network error",
        code: "network",
      };
    }
  });
}
