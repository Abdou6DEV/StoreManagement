# REDA TECH — AI supplier receipt scanner (implementation plan)

**Status:** Not started  
**Written:** 2026-08-25 · **Last verified:** 2026-08-25 (live Supabase + this repo)  
**Project:** `fayqqjnhqggmtcwaymwh` (Abdou6DEV's Project)  
**Constraint:** Additive only. Do not change stock writes, sales, backup, chatbot, licensing, or `device-check` `allowed` logic.

Flow:

```
Phone camera → GitHub Pages scan.html → private Storage → REDA TECH desktop → Gemini JSON → review table
```

No extra server. No extra paid hosting.

---

## 0. Progress tracker (read this first on other PC)

| Phase | What | Status |
|-------|------|--------|
| 1 | Inspect architecture (this plan) | Done 2026-08-25 |
| 2 | Table `invoice_scan_sessions` + RLS | Not started |
| 3 | Bucket `invoice-scans` | Not started |
| 4 | Edge Function `invoice-scan` | Not started |
| 5 | GitHub Pages `scan.html?s=` | Not started |
| 6 | Desktop QR + poll + download | Not started |
| 7 | Phone upload → desktop receives image | Not started |
| 8 | Gemini vision JSON (`ai:scan-receipt`) | Not started |
| 9 | Wizard: supplier + product match + review + stock save | Not started |
| 10 | Cleanup (Storage + local temp + expiry) | Not started |

Do not start desktop UI until phases 2–4 work with curl.

---

## 1. Product rules (locked)

| Rule | Decision |
|------|----------|
| Goal | Phone receipt → match local supplier + products → save like Add Stock |
| Stock | **Step 5 Confirm writes stock** the same way Add Stock pending-save does (purchase + qty + prices). Steps 1–4 do not write. |
| Confirm | 5-step wizard (upload → AI → supplier → products → review). Not a 3-column dump. |
| Chatbot | **Do not** use `ai:chat`. New IPC `ai:scan-receipt` |
| Auth | Existing `x-app-secret` + anon key. No second system |
| Phone auth | Session UUID only. **Never** put app secret or service role on Pages |
| Hosting | Existing GitHub Pages. URL is a **real file** + query string |
| Scan URL | `scan.html?s=<session_uuid>` — **not** `/scan/{token}` |
| Storage | New private bucket `invoice-scans`. **Not** `backups` |
| Path | Always `{session_id}/invoice.jpg` (phone compresses to JPEG) |
| AI model | Configured Gemini Flash-Lite (`gemini-3.5-flash-lite`) |
| AI extracts | **Supplier name** (optional/null) + items: **name, quantity, unit boughtPrice** |
| Product match | **Local** fuzzy search on Prisma products. Do **not** send the catalog to Gemini. |
| Supplier match | **Local** fuzzy search on sellers. Gemini only returns a name string. |
| Quota | Must call existing `ai-consume` before Gemini |
| Offline / trial / `ai_enabled=false` | Block scanner the same way as chat |
| Polling | **Every 3s** (not 1s). Stop when modal closes or status is `uploaded`/`expired`/`failed`. Do not add Realtime |
| Image lifetime | Temporary. Delete Storage after successful desktop download. Delete local temp after wizard finishes or cancel |
| Phone image | Always compress to **JPEG** on the phone → Storage path is always `{session_id}/invoice.jpg` |
| Active QR | **One `waiting` session per device.** New create-session cancels/expires the previous waiting one |
| Expiry | Expire **`waiting` only** at `expires_at`. **`uploaded` is not deleted** until download, cleanup, or a grace window (10 min after `uploaded_at`) |

Out of scope (later phase): IMEI, barcode, invoice number/date, PDF, mobile app, multi-photo long receipts.

---

## 2. What exists (verified live 2026-08-25)

### Tables (`public`)

| Table | Rows | RLS | Notes |
|-------|------|-----|-------|
| `customers` | 13 | on | |
| `allowed_devices` | 12 | on | includes `ai_enabled` |
| `device_requests` | 12 | on | |
| `ai_settings` | 1 | on | 10/min, 100/day |
| `ai_usage_minute` | 2 | on | |
| `ai_usage_daily` | 2 | on | |

**Not present:** `invoice_scan_sessions`

RLS is on, with **no** anon/authenticated policies. Edge uses **service role** (bypasses RLS). New table must match that.

### Storage

| Bucket | Public | Notes |
|--------|--------|-------|
| `backups` | private | Cloud backup only. Do not reuse |

**Not present:** `invoice-scans`

Backup upload goes **through** the Edge Function as multipart. Receipts must **not** copy that: phone uploads via **signed URL** straight to Storage.

### Edge Functions

| Slug | Version | `verify_jwt` | CORS |
|------|---------|--------------|------|
| `device-check` | v8 | false | none (Electron only) |
| `device-request` | v5 | false | none |
| `device-link-existing` | v2 | false | none |
| `backup-upload-latest` | v5 | false | none |
| `backup-download-latest` | v17 | false | none |
| `ai-consume` | v1 | false | none |
| `ai-quota` | v1 | false | none |

**Not present:** `invoice-scan`

Auth pattern: header `x-app-secret` === `X_APP_SECRET`. Desktop also sends `Authorization: Bearer <anon>` + `apikey`.

### Desktop (this repo)

- Config: `src/electron/utils/onlineConfig.ts` — `STORE_ONLINE_SUPABASE_URL`, `STORE_ONLINE_SUPABASE_ANON_KEY`, `STORE_ONLINE_APP_SECRET`
- Device ID: `getMachineGuid()`
- Online IPC: `src/electron/handlers/onlineHandlers.ts` + `src/electron/preload/onlineAPI.ts`
- AI chat: `src/electron/handlers/aiHandlers.ts` — **text only**. `GeminiPart` has no `inlineData`
- Models: `src/lib/ai/aiModels.ts` — `gemini-3.5-flash-lite` first
- Add Stock: `src/pages/stock/components/addStockForm/index.tsx` (pending products list already exists)
- QR library: **none**
- Realtime: **not used**

### GitHub Pages (this repo)

- Workflow: `.github/workflows/deploy-pages.yml`
- Build: `npm run build:landing` → `docs/` (renames `landing.html` → `index.html`)
- Vite: `vite.landing.config.mts` — **single** input `landing.html`
- Landing: `src/landing.tsx` → `WelcomeSetup marketingSite` — **no router**
- Nested path `/scan/{token}` would **404**. Use a real file instead.

---

## 3. Schema

```sql
CREATE TABLE public.invoice_scan_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL REFERENCES public.allowed_devices(device_id),
  status TEXT NOT NULL CHECK (status IN ('waiting', 'uploaded', 'completed', 'expired', 'failed')),
  storage_path TEXT NULL,
  mime_type TEXT NULL,
  original_filename TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ NULL,
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX invoice_scan_sessions_device_id_idx
  ON public.invoice_scan_sessions (device_id);

CREATE INDEX invoice_scan_sessions_status_expires_idx
  ON public.invoice_scan_sessions (status, expires_at);

ALTER TABLE public.invoice_scan_sessions ENABLE ROW LEVEL SECURITY;
-- No policies for anon / authenticated. Service role only.
```

Statuses:

| Status | Meaning |
|--------|---------|
| `waiting` | QR live, no image yet |
| `uploaded` | Phone uploaded; desktop may download |
| `completed` | Desktop downloaded; Storage deleted |
| `expired` | Past `expires_at` (default now + 10 minutes) |
| `failed` | Explicit failure |

`id` is the session **and** the phone token. Never use `device_id` as the file key.

---

## 4. Storage bucket

Name: `invoice-scans`  
Public: **false**  
`file_size_limit`: 10 MB  
`allowed_mime_types`: `image/jpeg`, `image/png`, `image/webp`

Object key:

```
{session_id}/invoice.jpg
{session_id}/invoice.png
{session_id}/invoice.webp
```

Extension from the real mime type. Never `invoice.jpg` at bucket root.

---

## 5. Edge Function `invoice-scan`

Reuse `createClient` + `X_APP_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` like `device-check`.

`verify_jwt: false`.

Body: `{ "action": "...", ... }`.

### Auth split (required)

| Action | Caller | Auth |
|--------|--------|------|
| `create-session` | Desktop | `x-app-secret` + `device_id`. Device must exist and be allowed (same idea as backup: row exists, `active`, not expired) |
| `get-status` | Desktop | `x-app-secret` + `device_id` **and** session belongs to that device |
| `get-download-url` | Desktop | same |
| `cleanup` | Desktop | same. Delete Storage object, set `completed` + `completed_at`. If object missing, still complete |
| `get-upload-url` | Phone | session `id` only. **No** app secret |
| `mark-uploaded` | Phone | session `id` only. **No** app secret |

Phone / GitHub Pages must **never** receive service role or `X_APP_SECRET`. Pages may embed the **anon / publishable** key.

### CORS

Existing functions have **no** CORS (Electron does not need it). Phone browser on `github.io` **does**.

- Handle `OPTIONS`
- Send CORS headers on **phone** actions (`get-upload-url`, `mark-uploaded`)
- Desktop actions can keep current JSON-only style (Electron)

### Expiry + stuck uploads

On `get-status` and `get-upload-url`:

1. If `now > expires_at` and status is `waiting` or `uploaded` → set `expired`, delete leftover object if any
2. If status is `waiting` but the object already exists → treat as `uploaded` (phone `mark-uploaded` may have failed)

If download fails, **do not** delete the image.

### Signed URLs

- Upload: `createSignedUploadUrl` for `{id}/invoice.{ext}` after validating mime
- Download: `createSignedUrl` with a short TTL (e.g. 60–120s)
- Phone uploads **directly** to Storage. Image must not pass through the Edge Function body

### `create-session` response

```json
{
  "ok": true,
  "session_id": "<uuid>",
  "expires_at": "<iso>",
  "scan_url": "https://<pages-host>/scan.html?s=<uuid>"
}
```

Hardcode / env the Pages origin once the live URL is confirmed. Do not invent `/scan/{uuid}`.

---

## 6. GitHub Pages phone page

**Why not `/scan/{token}`:** Pages only serves files that exist. Vite landing is a single `index.html` with no router. Nested paths 404.

**Do this:** second static entry.

| File | Role |
|------|------|
| `index.html` (today’s landing) | Unchanged |
| `scan.html?s=<uuid>` | Receipt capture only |

Changes:

- `scan.html` + small React/vanilla entry (keep it tiny; do not import Welcome/marketing)
- `vite.landing.config.mts`: add `scan` input
- `build:landing`: keep renaming landing → `index.html`; also emit `scan.html`
- `.github/workflows/deploy-pages.yml` `paths`: include `scan.html` so it deploys

Page UX:

1. Open QR → `scan.html?s=…`
2. Take photo (`input capture="environment"`) or gallery
3. Preview + retake
4. Client-side compress (~1–2 MB JPEG) before upload
5. `get-upload-url` → PUT to signed URL → `mark-uploaded` (retry if that call fails)
6. “Receipt sent successfully”

Errors: expired QR, bad type, file too large, HEIC (not allowed — tell user to use camera or JPEG/PNG), network fail.

iOS gallery is often HEIC. Reject with a clear message unless we add conversion later.

---

## 7. Desktop

### Where

Stock → Add stock. Button: **Scan Supplier Receipt**.

Gate before create-session (same as chat):

- Online
- Device allowed
- `ai_enabled === true`
- Not in trial
- Under quota (`ai-consume` runs at Gemini step; UI can still hide/disable early)

### Flow (QR + 5-step wizard)

**QR (before the wizard)**

1. `create-session`
2. Show QR (`qrcode` package) + “Scan this QR code with your phone.” + expiry countdown
3. Poll `get-status` every **3s**. First poll immediately. Stop if the modal closes.
4. On `uploaded`: stop polling → `get-download-url` → temp file → `cleanup` Storage

**Wizard (after the image is local)**

| Step | Name | What happens |
|------|------|----------------|
| 1 | Upload done | Show receipt preview. User continues. |
| 2 | AI | `ai:scan-receipt` spinner. JSON: supplier name + items. |
| 3 | Supplier | Local lookalikes of extracted name. User picks one, searches the full seller list, or **Add supplier**. One seller for the whole receipt (same as Add Stock multi-mode). |
| 4 | Products | For **each** extracted line: local lookalikes of the name. User picks an existing product or **Add new product**. Existing → prefill bought (AI) + selling (current). If bought price changed → existing **moyen pondéré** (`PriceConfirmationDialog`). New → user fills category + selling price (bought prefilled). Selling-price-below-bought warning = existing `SellingPriceWarningDialog`. |
| 5 | Review | Full list (resolved product, qty, bought, selling, price strategy). **Confirm** runs the same save path as Add Stock pending-save: stock qty, bought/selling, purchase with `sellerId`. Then delete local temp. |

Matching is **local** (Prisma `products` / `sellers`). Gemini never receives the catalog.

Lookalike scoring (desktop): normalize lowercase; exact name first; then token overlap (`revaleo`, `cable`, `tk-87`); then contains. Show top ~5. If TK-87 is missing but other Revaleo rows exist, show those. Always **Add new product** / **Add supplier**.

New modules. Do not fold into `backup-*` or `ai:chat`. Reuse `PriceConfirmationDialog` and `SellingPriceWarningDialog`; do not rewrite them.

IPC (sketch):

- `online:invoiceScanCreateSession`
- `online:invoiceScanGetStatus`
- `online:invoiceScanDownloadAndCleanup`
- `ai:scan-receipt`

### Gemini (`ai:scan-receipt`)

Do **not** reuse the tool/streaming chat loop.

1. `ai-consume` (existing helper in `onlineHandlers`)
2. `generateContent` with `inlineData` + `responseMimeType: "application/json"`
3. Expected JSON:

```json
{
  "supplierName": "SARL Example" ,
  "items": [
    {
      "name": "Revaleo cable TK-87",
      "quantity": 5,
      "boughtPrice": 38000
    }
  ]
}
```

Rules:

- `supplierName` may be `null` if not on the receipt (step 3 still shows the seller list)
- Do not invent missing values; use `null`
- Do not include products that are not on the receipt
- Multiple lines OK
- AR / FR / EN
- Strip DA / DZD / commas / spaces; `boughtPrice` is a **unit** price, not line total

Unreadable receipt → clear UI: “Could not read the receipt. Please try another photo.”

Delete local temp after step 5 (or cancel). Storage should already be gone from `cleanup`.

---

## 8. Simultaneous users

| Customer | Isolation |
|----------|-----------|
| A / B / C | Each scan is a new UUID. Object key is `{session_id}/invoice.{ext}` |

Same device may have more than one session. Never overwrite by `device_id`.

---

## 9. Failure handling (UI)

| Case | Message (English default; add fr/ar) |
|------|--------------------------------------|
| QR past 10 min | QR code expired. Please try again. |
| Phone upload fail | Receipt upload failed. |
| Download fail | Could not receive the receipt. Keep the QR page closed and retry. |
| Gemini fail / empty | Could not read the receipt. Please try another photo. |
| Partial fields | Some information could not be read. |
| HEIC / bad type | This image type is not supported. Take a new photo or use JPEG/PNG. |
| Too large | Image is too large (max 10 MB). |
| Offline / trial / AI off | Same overlays/copy as AI chat |
| Quota | Same as `ai-consume` (`rate_limit_minute` / `rate_limit_day`) |

i18n: new strings in `en.json`, `fr.json`, `ar.json`. Ask for final copy when adding UI.

---

## 10. Isolation — do not touch

- Sales
- Backup bucket + `backup-*` functions
- `ai:chat` behavior
- `device-check` `allowed = trialOk \|\| paidOk`
- Existing license / device-request / device-link
- Rewrite of Add Stock dialogs (reuse weighted + selling-price warning)

Stock/purchase writes happen **only** on wizard step 5 Confirm, through the **existing** Add Stock save helpers (`createPurchaseWithItems` / product update). Do not invent a second stock writer.

---

## 11. Implementation order

1. Confirm live GitHub Pages origin (for `scan_url`)
2. Apply table migration + RLS (no policies)
3. Create `invoice-scans` bucket + limits
4. Deploy `invoice-scan` (`verify_jwt: false`)
5. Curl: create-session (secret) → get-upload-url (no secret) → fake upload → get-status → download URL → cleanup
6. Add `scan.html` + Vite/workflow; deploy Pages
7. Desktop QR + poll + download
8. Phone photo → desktop image (end-to-end **before** Gemini)
9. `ai:scan-receipt` (supplier + items JSON)
10. Wizard steps 3–5 (local match, weighted modal, Confirm → existing stock save)
11. Expiry, HEIC, compress, failure copy, i18n

Never claim the feature works until step 8 has been done with a real phone.

---

## 12. Packages / env / manual steps

### npm

- `qrcode` (and types if needed)

No new AI provider SDK.

### Env

Desktop: existing `STORE_ONLINE_*` + `GEMINI_API_KEY`. **No new secrets required** if Pages origin is a constant in the Edge Function.

Pages (`scan.html`): public Supabase URL + **anon** key only.

### Manual

- [ ] Confirm Pages URL (project site vs custom domain). Vite landing `base` is `"/"` today — verify assets load; scan URL must match
- [ ] Merge/deploy so Pages builds `scan.html`
- [ ] Workflow `paths` includes `scan.html`
- [ ] Translations for new UI strings (en / fr / ar)
- [ ] Devices without `ai_enabled` stay blocked (currently 2 of 12 enabled)

---

## 13. Test procedure (final)

1. Paid + `ai_enabled` desktop: click Scan Supplier Receipt → QR appears
2. Phone (4G OK, does not need same WiFi): open QR → `scan.html?s=…`
3. Take receipt photo → preview → upload → success
4. Desktop stops polling, shows image
5. Wizard: AI → supplier pick → product lookalikes / new → review
6. Confirm writes stock + purchase like Add Stock; weighted modal if bought price changed
7. Storage object gone; local temp gone; session `completed`
8. Second device / second session: files do not overwrite
9. Wait 10+ min: QR expired message
10. Trial / AI-off device: scanner blocked, no session created (or created then Gemini blocked — prefer block before QR)
11. Chatbot still works unchanged
12. Cloud backup still works unchanged

---

## 14. Resume checklist (other PC)

- [ ] Read **§0** and **§2** (live inventory is already done)
- [ ] Start at **§11 step 1** (Pages origin), then SQL + bucket
- [ ] Do not ship desktop UI before Edge curl smoke test
- [ ] Do not put `X_APP_SECRET` or service role in `scan.html`
- [ ] Do not send the image through the Edge Function
- [ ] Do not call `ai:chat` for vision

---

## 15. Key files (when implementing)

**New (expected)**

```
scan.html
src/scan.tsx                          (or equivalent tiny entry)
supabase: invoice-scan Edge Function  (dashboard / MCP; functions are not in this git tree today)
src/electron/handlers/invoiceScanHandlers.ts
src/pages/stock/components/invoiceScan/   (QR modal + review table)
```

**Modify (expected)**

```
vite.landing.config.mts
package.json                          (build:landing, qrcode)
.github/workflows/deploy-pages.yml
src/electron/handlers/index.ts
src/electron/preload/onlineAPI.ts
src/electron/preload/aiAPI.ts
src/electron/handlers/aiHandlers.ts   (add scan-receipt only; do not change chat loop)
src/pages/stock/components/addStockForm/index.tsx
locales en / fr / ar
```

**Do not modify**

```
backup-* Edge Functions
backups bucket
src/electron/handlers/onlineHandlers.ts backup paths (only add helpers if needed)
AI chatbot UI (thread / ChatBox) except maybe a stock-page entry point
```

---

## 16. Gaps found on re-read (2026-08-25)

The v1 plan was **not** complete. These are the misses. Locked where we can; open where you must decide.

### A. 5-step wizard (locked 2026-08-25)

Replaces the old “3-column review then pending only” idea.

**Matching is local, not Gemini.** Example: AI reads `Revaleo cable TK-87`. Desktop searches `products`. If TK-87 is missing, show other Revaleo lookalikes. User picks one or **Add new product**. Same idea for suppliers.

**Selling price:** existing product → keep current selling price (user can edit). New product → user fills (do **not** copy bought price).

**Bought price change on existing product:** reuse `PriceConfirmationDialog` (moyen pondéré vs keep new). Same as Add Stock.

**Step 5 Confirm:** existing pending-save path (stock + purchase). Not a second writer.

Gemini JSON adds `supplierName` (nullable). Supplier extraction is **in scope**.

### B. Orphan files if desktop never polls again

Expiry cleanup only runs inside `get-status` / `get-upload-url`. If the PC closes after the phone uploaded, **nothing deletes Storage** until some later call.

**Locked:** `create-session` also sweeps **this device**: expire old `waiting`; delete Storage for `uploaded` past grace. Cheap, no cron, Free-tier friendly.

### C. Upload vs 10-minute QR race

Signed upload URLs last **~2 hours**. Session is **10 minutes**. Phone can still PUT after expiry.

**Locked:** `mark-uploaded` rejects if `waiting` expired. `uploaded` is **not** flipped to `expired` on the 10 min QR timer. Desktop can still download. Grace: 10 min after `uploaded_at`, then sweep (see B).

### D. License check on `create-session` was the wrong copy-paste

Backup uses paid/`active`/`expires_at`. Scanner must use the **AI gate** (`useAiChatGate`: online, not trial, `ai_enabled`). Trial users are licensed for the **app** (`device-check` `allowed`) but **not** AI.

**Locked:** Block before QR with the same gate as chat. Edge `create-session` should refuse trial / `ai_enabled=false` / inactive-unpaid, so a patched client cannot mint sessions.

### E. GitHub Pages `base: "/"` still unconfirmed

If Pages is `https://<user>.github.io/StoreManagement/`, then:

- `scan.html` asset URLs 404 unless Vite `base` is `/StoreManagement/`
- QR `scan_url` must include that prefix

**Locked:** Confirm live origin **before** deploying `scan.html`. Do not guess.

### F. Phone must send the anon key (documented now)

`verify_jwt: false` still usually needs `apikey` + `Authorization: Bearer <anon>` on `*.supabase.co`. CORS `OPTIONS` must allow those headers.

**Locked:** `scan.html` may embed **anon only**. No app secret. `Referrer-Policy: no-referrer`. No third-party scripts/fonts (session UUID must not leak in Referer).

### G. Gemini

- `ai-consume` then model error → **quota already spent**. Acceptable; show error; do not consume again for a JSON-parse retry.
- Fallback models: **Google vision only** (`gemini-*-flash*`). Not Groq / Mistral / DeepSeek (no image).
- Prompt: **unit bought price**, not line total (`qty × price`). Algeria receipts mix HT/TTC — take the printed unit price, do not invent tax math.
- Compress to JPEG also for **Gemini inlineData size**, not only Storage.
- Do not enqueue behind `ai:chat` if a long chat is running, **or** document that scan waits on the same AI queue. Prefer a **separate** handler so stock scan is not blocked by the chatbot (and vice versa).

### H. Desktop UX holes

- Close QR while `waiting`: stop polls; leave session to expire (A/B sweep).
- Close after `uploaded` but before download: still download+cleanup **or** explicit abandon+delete Storage. Do not leave the file.
- Close after local file exists: delete temp even if review is cancelled.
- One waiting QR per device (already locked). Second click replaces QR.
- Phone camera permission denied: message on `scan.html`.
- Preview rotation (EXIF): canvas compress should bake orientation so desktop is not sideways.
- QR must be **large** and high contrast (warehouse lighting).
- Camera `capture="environment"` is HTTPS-only — Pages is HTTPS. Opening `scan.html` as `file://` will fail; do not test that way.

### I. Abuse / ops (acceptable, not blockers)

- UUID in the QR is the secret for 10 minutes. A photographed QR can upload once. After `uploaded`, reject a second file (no overwrite).
- No cap on `get-status` beyond 3s client poll. Do not add Realtime.
- Table grows forever (`completed`/`expired` rows). Fine at this scale; optional later purge > 30 days.
- Do not log image bytes or full signed URLs.
- Old app versions never call this. Phone page can ship first; old desktops ignore it.

### J. Still out of scope (do not sneak in)

- Two photos for a long thermal receipt
- HEIC conversion (reject + message)
- Matching IMEI / barcode
- pg_cron sweeper (create-session sweep is enough for v1)
