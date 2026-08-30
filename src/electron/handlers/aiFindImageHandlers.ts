import { ipcMain, type WebContents } from "electron";
import { AI_OFFLINE } from "../../lib/ai/aiMessageLimits";
import { AI_FIND_IMAGE_DAY_POINTS } from "../../lib/ai/aiPoints";
import type {
  DownloadProductImageRequest,
  DownloadProductImageResult,
  FindImageCandidate,
  FindProductImageRequest,
  FindProductImageResult,
} from "../../lib/ai/findImageTypes";
import { applyAiQuotaFromConsume } from "../ai/aiQuotaBridge";
import { fetchWithTimeout } from "../ai/fetchWithTimeout";
import {
  assertAiPremiumAccessInternal,
  runAiConsumeInternal,
  runAiQuotaPeekInternal,
} from "./onlineHandlers";
import type { AiConsumeResult } from "../types/aiConsume";

const SERPER_IMAGES_URL = "https://google.serper.dev/images";
const SERPER_FETCH_TIMEOUT_MS = 30_000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 20_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
/** Results shown in the picker. */
const MAX_RESULTS = 8;
/** Fetch up to 10 from Serper (still 1 credit), then rank and keep the best. */
const SERPER_FETCH_NUM = 10;
const MIN_PRODUCT_NAME_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;
const SEARCH_COUNTRY = "dz";

const QUERY_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "de",
  "des",
  "du",
  "for",
  "la",
  "le",
  "les",
  "the",
  "un",
  "une",
  "with",
  "و",
  "في",
  "من",
]);

const LOW_QUALITY_HINTS = [
  "clipart",
  "icon",
  "logo",
  "vector",
  "meme",
  "diagram",
  "schematic",
  "drawing",
  "illustration",
  "wallpaper",
  "banner",
  "pngwing",
  "freepng",
  "stickpng",
  "cleanpng",
  "kindpng",
  "pngtree",
  "pngitem",
];

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function parseRequest(raw: unknown): FindProductImageRequest | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const productName =
    typeof rec.productName === "string" ? rec.productName.trim() : "";
  if (productName.length < MIN_PRODUCT_NAME_LENGTH) return null;
  const categoryName =
    typeof rec.categoryName === "string" && rec.categoryName.trim()
      ? rec.categoryName.trim()
      : null;
  const locale =
    typeof rec.locale === "string" && rec.locale.trim() ? rec.locale.trim() : null;
  return { productName, categoryName, locale };
}

function parseDownloadRequest(raw: unknown): DownloadProductImageRequest | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const url = typeof rec.url === "string" ? rec.url.trim() : "";
  if (!url) return null;
  return { url };
}

/** Use the user's product name as-is — no AI rewrite (keeps model codes like TK-22 exact). */
function buildSearchQuery(request: FindProductImageRequest): string {
  const name = request.productName.trim();
  const category = request.categoryName?.trim();
  let query = name;
  if (category && !name.toLowerCase().includes(category.toLowerCase())) {
    query = `${name} ${category}`;
  }
  const lower = query.toLowerCase();
  if (!/\b(product|produit|منتج)\b/i.test(lower)) {
    query = `${query} product`;
  }
  return query.slice(0, MAX_QUERY_LENGTH);
}

function localeToHl(locale?: string | null): string {
  if (locale === "ar") return "ar";
  if (locale === "fr") return "fr";
  return "en";
}

function tokenizeForMatch(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_/+,]+/)
    .map((part) => part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((part) => part.length >= 2 && !QUERY_STOP_WORDS.has(part));
}

type ParsedImageCandidate = FindImageCandidate & {
  imageWidth: number | null;
  imageHeight: number | null;
  serperPosition: number;
};

function scoreImageCandidate(
  candidate: ParsedImageCandidate,
  tokens: string[],
): number {
  const haystack = `${candidate.title ?? ""} ${candidate.source ?? ""}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) score += 12;
  }

  for (const hint of LOW_QUALITY_HINTS) {
    if (haystack.includes(hint)) score -= 18;
  }

  const width = candidate.imageWidth;
  const height = candidate.imageHeight;
  if (width && height && width > 0 && height > 0) {
    const minSide = Math.min(width, height);
    if (minSide >= 250) score += 4;
    else if (minSide < 120) score -= 6;

    const ratio = width / height;
    if (ratio >= 0.72 && ratio <= 1.38) score += 5;
    else if (ratio > 2.8 || ratio < 0.35) score -= 8;
  }

  // Keep some weight on Google's original ranking when scores tie.
  score += Math.max(0, 10 - candidate.serperPosition);

  return score;
}

function rankImageCandidates(
  candidates: ParsedImageCandidate[],
  productName: string,
): FindImageCandidate[] {
  const tokens = tokenizeForMatch(productName);
  return [...candidates]
    .sort(
      (a, b) =>
        scoreImageCandidate(b, tokens) - scoreImageCandidate(a, tokens) ||
        a.serperPosition - b.serperPosition,
    )
    .slice(0, MAX_RESULTS)
    .map(({ url, thumbnailUrl, title, source }) => ({
      url,
      thumbnailUrl,
      title,
      source,
    }));
}

function parseSerperImages(json: unknown): ParsedImageCandidate[] {
  const rec = asRecord(json);
  const rows = Array.isArray(rec?.images) ? rec.images : [];
  const out: ParsedImageCandidate[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const item = asRecord(row);
    if (!item) continue;
    const url =
      (typeof item.imageUrl === "string" && item.imageUrl.trim()) ||
      (typeof item.link === "string" && item.link.trim()) ||
      "";
    if (!url) continue;

    const thumbnailUrl =
      typeof item.thumbnailUrl === "string" && item.thumbnailUrl.trim()
        ? item.thumbnailUrl.trim()
        : null;
    const title =
      typeof item.title === "string" && item.title.trim()
        ? item.title.trim().slice(0, 180)
        : null;
    const source =
      (typeof item.source === "string" && item.source.trim()) ||
      (typeof item.domain === "string" && item.domain.trim()) ||
      null;
    const imageWidth = typeof item.imageWidth === "number" ? item.imageWidth : null;
    const imageHeight = typeof item.imageHeight === "number" ? item.imageHeight : null;
    const serperPosition =
      typeof item.position === "number" && item.position > 0
        ? item.position
        : out.length + 1;

    out.push({
      url,
      thumbnailUrl,
      title,
      source,
      imageWidth,
      imageHeight,
      serperPosition,
    });
    if (out.length >= SERPER_FETCH_NUM) break;
  }

  return out;
}

async function searchSerperImages(
  serperKey: string,
  query: string,
  locale?: string | null,
): Promise<ParsedImageCandidate[]> {
  const res = await fetchWithTimeout(
    SERPER_IMAGES_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": serperKey,
      },
      body: JSON.stringify({
        q: query,
        num: SERPER_FETCH_NUM,
        gl: SEARCH_COUNTRY,
        hl: localeToHl(locale),
        autocorrect: false,
      }),
    },
    SERPER_FETCH_TIMEOUT_MS,
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
      (typeof err?.message === "string" && err.message) ||
      `Serper HTTP ${res.status}`;
    throw new Error(msg);
  }

  return parseSerperImages(json);
}

function isSafeHttpsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local")) return false;
    if (host === "127.0.0.1" || host.startsWith("127.")) return false;
    if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function mimeToDataUrl(mimeType: string, base64: string): string {
  return `data:${mimeType};base64,${base64}`;
}

async function downloadImageDataUrl(url: string): Promise<DownloadProductImageResult> {
  if (!isSafeHttpsUrl(url)) {
    return {
      success: false,
      error: "Invalid image URL.",
      code: "invalid",
    };
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(url, { method: "GET" }, IMAGE_DOWNLOAD_TIMEOUT_MS);
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Could not download the image.",
      code: "fetch",
    };
  }

  if (!res.ok) {
    return {
      success: false,
      error: `Image download failed (HTTP ${res.status}).`,
      code: "fetch",
    };
  }

  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    return {
      success: false,
      error: "The URL did not return an image.",
      code: "not_image",
    };
  }

  const contentLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    return {
      success: false,
      error: "The image is too large.",
      code: "too_large",
    };
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return {
      success: false,
      error: "The image is too large.",
      code: "too_large",
    };
  }

  return {
    success: true,
    dataUrl: mimeToDataUrl(contentType, buffer.toString("base64")),
    mimeType: contentType,
  };
}

function mapConsumeFailure(
  entitlement: Extract<AiConsumeResult, { success: false }>,
  sender: WebContents,
): FindProductImageResult {
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

async function ensureQuotaForFindImage(
  sender: WebContents,
): Promise<FindProductImageResult | null> {
  const peek = await runAiQuotaPeekInternal();
  if (peek.success === false) {
    return mapConsumeFailure(peek, sender);
  }
  if (peek.remainingMinute === 0) {
    return mapConsumeFailure(
      {
        success: false,
        error: "rate_limit_minute",
        code: "entitlement",
        entitlementError: "rate_limit_minute",
      },
      sender,
    );
  }
  if (
    peek.remainingDay != null &&
    peek.remainingDay < AI_FIND_IMAGE_DAY_POINTS
  ) {
    return mapConsumeFailure(
      {
        success: false,
        error: "rate_limit_day",
        code: "entitlement",
        entitlementError: "rate_limit_day",
      },
      sender,
    );
  }
  applyAiQuotaFromConsume(sender, peek);
  return null;
}

export function registerAiFindImageHandlers(): void {
  ipcMain.handle(
    "ai:find-product-image",
    async (event, rawRequest: unknown): Promise<FindProductImageResult> => {
      const request = parseRequest(rawRequest);
      if (!request) {
        return {
          success: false,
          error: "Product name is required.",
          code: "invalid",
        };
      }

      const serperKey = (process.env.SERPER_API_KEY ?? "").trim();
      if (!serperKey) {
        return {
          success: false,
          error: "SERPER_API_KEY is not configured",
          code: "missing_env",
        };
      }

      const premiumBlock = await assertAiPremiumAccessInternal();
      if (premiumBlock) {
        return {
          success: false,
          error: premiumBlock.error,
          code: premiumBlock.code,
        };
      }

      const quotaBlock = await ensureQuotaForFindImage(event.sender);
      if (quotaBlock) return quotaBlock;

      const query = buildSearchQuery(request);

      let images: FindImageCandidate[];
      try {
        const parsed = await searchSerperImages(serperKey, query, request.locale);
        images = rankImageCandidates(parsed, request.productName);
      } catch (e) {
        return {
          success: false,
          error: e instanceof Error ? e.message : "Image search failed.",
          code: "search",
        };
      }

      if (images.length === 0) {
        return {
          success: false,
          error: "No product photos found. Try a clearer product name.",
          code: "no_results",
        };
      }

      const charged = await runAiConsumeInternal({
        dayCost: AI_FIND_IMAGE_DAY_POINTS,
        minuteCost: 1,
      });
      if (charged.success === false) {
        return mapConsumeFailure(charged, event.sender);
      }
      applyAiQuotaFromConsume(event.sender, charged);

      return { success: true, query, images };
    },
  );

  ipcMain.handle(
    "ai:download-product-image",
    async (_event, rawRequest: unknown): Promise<DownloadProductImageResult> => {
      const request = parseDownloadRequest(rawRequest);
      if (!request) {
        return {
          success: false,
          error: "Image URL is required.",
          code: "invalid",
        };
      }
      return downloadImageDataUrl(request.url);
    },
  );
}
