import { ipcMain } from "electron";
import { getMachineGuid } from "../utils/validationKey";
import { getStoreOnlineConfig } from "../utils/onlineConfig";
import type { DeviceRequestPayload, DeviceRequestResult } from "../types/deviceRequest";

function deviceRequestUrl(base: string): string {
  return `${base}/functions/v1/device-request`;
}

function readEdgeError(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const msg = o.error ?? o.message ?? o.detail;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  }
  return `HTTP ${status}`;
}

export function setupOnlineHandlers(): void {
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
