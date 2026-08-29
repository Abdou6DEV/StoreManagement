import fs from "fs";
import path from "path";
import { app } from "electron";
import { getMachineGuid } from "./validationKey";

const SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StoredInvoiceScanSession = {
  deviceId: string;
  sessionId: string;
};

function storePath(): string {
  return path.join(app.getPath("userData"), "invoice-scan-session.json");
}

function readDeviceId(): string | null {
  try {
    return getMachineGuid();
  } catch {
    return null;
  }
}

export function readLastInvoiceScanSessionId(): string | null {
  const deviceId = readDeviceId();
  if (!deviceId) return null;
  const filePath = storePath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as StoredInvoiceScanSession;
    if (parsed.deviceId !== deviceId) return null;
    if (typeof parsed.sessionId !== "string" || !SESSION_ID_RE.test(parsed.sessionId)) {
      return null;
    }
    return parsed.sessionId;
  } catch {
    return null;
  }
}

export function persistLastInvoiceScanSession(sessionId: string): void {
  const deviceId = readDeviceId();
  if (!deviceId || !SESSION_ID_RE.test(sessionId)) return;
  const payload: StoredInvoiceScanSession = { deviceId, sessionId };
  fs.writeFileSync(storePath(), JSON.stringify(payload), "utf8");
}

export function clearLastInvoiceScanSession(): void {
  const filePath = storePath();
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
