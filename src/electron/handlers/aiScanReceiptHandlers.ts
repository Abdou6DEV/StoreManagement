import fs from "fs";
import { ipcMain, type WebContents } from "electron";
import { AI_MODELS } from "../../lib/ai/aiModels";
import { AI_OFFLINE } from "../../lib/ai/aiMessageLimits";
import { AI_SCAN_DAY_POINTS } from "../../lib/ai/aiPoints";
import type { ScanReceiptResult } from "../../lib/ai/scanReceiptTypes";
import { applyAiQuotaFromConsume } from "../ai/aiQuotaBridge";
import {
  fetchWithTimeout,
  MODEL_FETCH_TIMEOUT_MS,
} from "../ai/fetchWithTimeout";
import { runAiConsumeInternal, runAiQuotaPeekInternal } from "./onlineHandlers";
import type { AiConsumeResult } from "../types/aiConsume";

const SCAN_PROMPT = `You extract data from a supplier invoice / receipt photo for a retail store inventory app.

Return ONLY JSON matching this shape:
{
  "supplierName": string | null,
  "items": [
    { "name": string, "quantity": number, "boughtPrice": number | null }
  ]
}

Rules:
- supplierName: company/vendor name printed on the receipt. null if unclear or missing.
- items: only products that clearly appear as purchase lines. Do not invent products.
- name: product description as printed (keep useful brand/model tokens).
- quantity: units bought for that line. If missing, use 1.
- boughtPrice: UNIT buy/cost price for one unit (not line total). Strip currency symbols (DA, DZD, €, $), spaces, and thousand separators. null if unknown.
- Do not invent tax math (HT/TTC). Use the printed unit price when present.
- Languages may be Arabic, French, or English.
- If the image is unreadable or not a receipt/invoice, return {"supplierName":null,"items":[]}.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    supplierName: {
      type: "STRING",
      nullable: true,
      description: "Supplier / vendor name, or null",
    },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER" },
          boughtPrice: { type: "NUMBER", nullable: true },
        },
        required: ["name", "quantity", "boughtPrice"],
      },
    },
  },
  required: ["supplierName", "items"],
} as const;

function visionGeminiModels(): string[] {
  return AI_MODELS.filter(
    (m) => m.provider === "google" && m.id.includes("flash"),
  ).map((m) => m.id);
}

function readLocalJpegBase64(localPath: string): string | null {
  try {
    if (!localPath || !fs.existsSync(localPath)) return null;
    const buf = fs.readFileSync(localPath);
    if (buf.length < 32) return null;
    return buf.toString("base64");
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function parseMoney(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    return Math.round(raw * 100) / 100;
  }
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\s/g, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

function parseQty(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return Math.max(1, Math.round(raw));
  }
  if (typeof raw === "string") {
    const n = Number(raw.replace(/[^\d.]/g, ""));
    if (Number.isFinite(n) && n > 0) return Math.max(1, Math.round(n));
  }
  return 1;
}

function normalizeExtraction(raw: unknown): ScanReceiptResult {
  const rec = asRecord(raw);
  if (!rec) {
    return { success: false, error: "Could not read the receipt.", code: "parse" };
  }
  const supplierRaw = rec.supplierName;
  const supplierName =
    typeof supplierRaw === "string" && supplierRaw.trim()
      ? supplierRaw.trim().slice(0, 180)
      : null;

  const itemsRaw = Array.isArray(rec.items) ? rec.items : [];
  const items = itemsRaw
    .map((row) => {
      const r = asRecord(row);
      if (!r) return null;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) return null;
      return {
        name: name.slice(0, 200),
        quantity: parseQty(r.quantity),
        boughtPrice: parseMoney(r.boughtPrice),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  if (items.length === 0) {
    return {
      success: false,
      error: "Could not read the receipt. Please try another photo.",
      code: "unreadable",
    };
  }

  return { success: true, data: { supplierName, items } };
}

function extractTextFromGemini(json: unknown): string {
  const rec = asRecord(json);
  const candidates = rec?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";
  const first = asRecord(candidates[0]);
  const content = asRecord(first?.content);
  const parts = content?.parts;
  if (!Array.isArray(parts)) return "";
  const texts: string[] = [];
  for (const part of parts) {
    const p = asRecord(part);
    if (typeof p?.text === "string" && p.text.trim()) texts.push(p.text);
  }
  return texts.join("\n").trim();
}

async function callGeminiVision(
  apiKey: string,
  modelId: string,
  imageBase64: string,
): Promise<unknown> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: SCAN_PROMPT },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: imageBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    MODEL_FETCH_TIMEOUT_MS,
  );

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = asRecord(json);
    const msg =
      (typeof err?.error === "object" &&
        err.error &&
        typeof (err.error as { message?: string }).message === "string" &&
        (err.error as { message: string }).message) ||
      `Gemini HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

function mapConsumeFailure(
  entitlement: Extract<AiConsumeResult, { success: false }>,
  sender: WebContents,
): ScanReceiptResult {
  if (
    entitlement.entitlementError === "rate_limit_minute" ||
    entitlement.entitlementError === "rate_limit_day"
  ) {
    void runAiQuotaPeekInternal().then((peek) => {
      if (peek.success) applyAiQuotaFromConsume(sender, peek);
    });
    return {
      success: false,
      error: entitlement.entitlementError,
      code: "quota",
    };
  }
  if (entitlement.code === "network" || entitlement.code === "missing_env") {
    return { success: false, error: AI_OFFLINE, code: "offline" };
  }
  const err = entitlement.entitlementError || entitlement.error || "ai_consume_failed";
  if (
    err === "ai_disabled" ||
    err === "ai_trial_blocked" ||
    err === "ai_not_licensed"
  ) {
    return { success: false, error: err, code: "ai_disabled" };
  }
  return { success: false, error: err, code: "offline" };
}

export function registerAiScanReceiptHandler(): void {
  ipcMain.handle(
    "ai:scan-receipt",
    async (event, localPathRaw: unknown): Promise<ScanReceiptResult> => {
      const localPath = typeof localPathRaw === "string" ? localPathRaw.trim() : "";
      if (!localPath) {
        return { success: false, error: "Missing image path", code: "invalid" };
      }

      const imageBase64 = readLocalJpegBase64(localPath);
      if (!imageBase64) {
        return {
          success: false,
          error: "Receipt image not found on disk.",
          code: "missing_file",
        };
      }

      const apiKey = (process.env.GEMINI_API_KEY ?? "").trim();
      if (!apiKey) {
        return {
          success: false,
          error: "GEMINI_API_KEY is not configured",
          code: "missing_env",
        };
      }

      const peek = await runAiQuotaPeekInternal();
      if (peek.success === false) {
        return mapConsumeFailure(peek, event.sender);
      }
      if (peek.remainingMinute === 0) {
        return mapConsumeFailure(
          {
            success: false,
            error: "rate_limit_minute",
            code: "entitlement",
            entitlementError: "rate_limit_minute",
          },
          event.sender,
        );
      }
      if (
        peek.remainingDay != null &&
        peek.remainingDay < AI_SCAN_DAY_POINTS
      ) {
        return mapConsumeFailure(
          {
            success: false,
            error: "rate_limit_day",
            code: "entitlement",
            entitlementError: "rate_limit_day",
          },
          event.sender,
        );
      }
      applyAiQuotaFromConsume(event.sender, peek);

      const models = visionGeminiModels();
      let lastError = "model_failed";

      for (const modelId of models) {
        try {
          const json = await callGeminiVision(apiKey, modelId, imageBase64);
          const text = extractTextFromGemini(json);
          if (!text) {
            lastError = "empty_response";
            continue;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(text);
          } catch {
            const start = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (start >= 0 && end > start) {
              parsed = JSON.parse(text.slice(start, end + 1));
            } else {
              lastError = "bad_json";
              continue;
            }
          }
          const extracted = normalizeExtraction(parsed);
          if (!extracted.success) {
            lastError = extracted.error || "unreadable";
            continue;
          }
          const charged = await runAiConsumeInternal({
            dayCost: AI_SCAN_DAY_POINTS,
            minuteCost: 1,
          });
          if (charged.success === false) {
            return mapConsumeFailure(charged, event.sender);
          }
          applyAiQuotaFromConsume(event.sender, charged);
          return extracted;
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
          continue;
        }
      }

      return {
        success: false,
        error: lastError || "Could not read the receipt.",
        code: "model",
      };
    },
  );
}
