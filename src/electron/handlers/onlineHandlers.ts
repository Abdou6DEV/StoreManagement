import { ipcMain } from "electron";
import { getMachineGuid } from "../utils/validationKey";
import { getStoreOnlineConfig } from "../utils/onlineConfig";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";
import type { DeviceCheckResult } from "../types/deviceCheck";

function deviceRequestUrl(base: string): string {
  return `${base}/functions/v1/device-request`;
}

function deviceCheckUrl(base: string): string {
  return `${base}/functions/v1/device-check`;
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

  return { allowed: o.allowed, trialEndsAt, expiresAt };
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
}
