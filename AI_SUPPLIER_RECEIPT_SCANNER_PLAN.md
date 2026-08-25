# REDA TECH — AI supplier receipt scanner (implementation plan)

**Status:** Transfer pipeline **done**. Gemini + wizard **implemented in repo** (needs E2E test with real receipt).  
**Written:** 2026-08-25 · **Last verified:** 2026-08-25 (live transfer; wizard code added same day)  
**Project:** `fayqqjnhqggmtcwaymwh` (Abdou6DEV's Project)  
**Constraint:** Additive only. Do not change stock writes, sales, backup, chatbot, licensing, or `device-check` `allowed` logic.

Flow:

```
Phone camera → redatechpos.com/scan.html → private Storage → REDA TECH desktop → Gemini JSON → review wizard
                 ▲                              ▲
                 └── DONE (verified) ───────────┘     └── NEXT
```

No extra server. No extra paid hosting.

---

## 0. Progress tracker (read this first on other PC)

| Phase | What | Status |
|-------|------|--------|
| 1 | Inspect architecture (this plan) | **Done** 2026-08-25 |
| 2 | Table `invoice_scan_sessions` + RLS | **Done** (live; RLS on, no anon policies) |
| 3 | Bucket `invoice-scans` | **Done** (private, 10 MB, jpeg/png/webp) |
| 4 | Edge Function `invoice-scan` | **Done** (v3, `verify_jwt: false`) |
| 5 | GitHub Pages / custom domain `scan.html?s=` | **Done** — live at `https://www.redatechpos.com/scan.html` |
| 6 | Desktop QR + poll + download | **Done** |
| 7 | Phone upload → desktop receives image | **Done** (user-verified E2E) |
| 8 | Gemini vision JSON (`ai:scan-receipt`) | **Done in repo** — needs real-receipt E2E |
| 9 | Wizard: supplier + product match + review + stock save | **Done in repo** — needs E2E |
| 10 | Cleanup polish (local temp on cancel, i18n for wizard) | **Done** (temp delete on close/confirm; en/fr/ar strings) |

**Verified working path (do not rebuild):**

1. Stock → Add Stock → **Scan Supplier Receipt**
2. Desktop creates session + shows QR (`qrcode`) pointing at `https://www.redatechpos.com/scan.html?s=<uuid>`
3. Phone opens page → take/choose photo → compress JPEG → signed upload → `mark-uploaded`
4. Desktop polls → `uploaded` → `get-download-url` → temp JPEG + preview → `cleanup` (Storage + session row deleted)
5. Modal phase `received` shows the image

**Next work:** from local image → Gemini → 5-step wizard → Confirm stock.

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
| Hosting | Custom domain Pages. URL is a **real file** + query string |
| Scan URL | `https://www.redatechpos.com/scan.html?s=<session_uuid>` — **not** `/scan/{token}` |
| Storage | Private bucket `invoice-scans`. **Not** `backups` |
| Path | Always `{session_id}/invoice.jpg` (phone always compresses to JPEG) |
| AI model | Configured Gemini Flash-Lite (`gemini-3.5-flash-lite`) |
| AI extracts | **Supplier name** (optional/null) + items: **name, quantity, unit boughtPrice** |
| Product match | **Local** fuzzy search on Prisma products. Do **not** send the catalog to Gemini. |
| Supplier match | **Local** fuzzy search on sellers. Gemini only returns a name string. |
| Quota | Must call existing `ai-consume` before Gemini |
| Offline / trial / `ai_enabled=false` | Block scanner the same way as chat (Edge also refuses on `create-session`) |
| Polling | **Implemented at 10s** (desktop + phone `check-session`). Plan originally said 3s; 10s is live and fine unless UX needs faster. Stop when modal closes or status is terminal. Do not add Realtime |
| Image lifetime | Temporary. Delete Storage after successful desktop download. Delete local temp after wizard finishes or cancel |
| Phone image | Always compress to **JPEG** on the phone → Storage path is always `{session_id}/invoice.jpg` |
| Active QR | **One waiting session per device.** `create-session` sweeps prior waiting (and stale uploaded past grace) |
| Expiry | Expire **`waiting` only** at `expires_at` (Edge discards row + object). **`uploaded` is not deleted** until download, cleanup, or grace (10 min after `uploaded_at`) |

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
| `invoice_scan_sessions` | 0* | on | **Present.** Columns match §3. *rows vary; often 0 after cleanup deletes rows |

RLS on, **no** anon/authenticated policies. Edge uses **service role**.

### Storage

| Bucket | Public | Limits | Notes |
|--------|--------|--------|-------|
| `backups` | private | | Cloud backup only. Do not reuse |
| `invoice-scans` | **false** | 10 MB; `image/jpeg`, `image/png`, `image/webp` | **Present.** Uploads are always JPEG |

### Edge Functions

| Slug | Version | `verify_jwt` | Notes |
|------|---------|--------------|-------|
| `device-check` | v8 | false | |
| `device-request` | v5 | false | |
| `device-link-existing` | v2 | false | |
| `backup-upload-latest` | v5 | false | |
| `backup-download-latest` | v17 | false | |
| `ai-consume` | v1 | false | |
| `ai-quota` | v1 | false | |
| **`invoice-scan`** | **v3** | **false** | **Present.** CORS `*`. Phone + desktop actions |

Auth pattern: header `x-app-secret` === `X_APP_SECRET` for desktop actions. Desktop also sends `Authorization: Bearer <anon>` + `apikey`. Phone actions use anon only.

### Desktop (this repo) — transfer done

| Piece | Path / note |
|-------|-------------|
| Config | `src/electron/utils/onlineConfig.ts` — `STORE_ONLINE_*` + `DEFAULT_INVOICE_SCAN_PAGE_URL = https://www.redatechpos.com/scan.html` |
| Handlers | `src/electron/handlers/invoiceScanHandlers.ts` — create / get-status / download+cleanup |
| Preload | `src/electron/preload/onlineAPI.ts` + types |
| Wired in | `src/electron/main.ts` → `setupInvoiceScanHandlers()` |
| UI | `src/pages/stock/components/invoiceScan/InvoiceScanModal.tsx` — QR → poll → preview |
| Entry | Add Stock form embeds `InvoiceScanButton` + modal |
| QR lib | `qrcode` (+ `@types/qrcode`) installed |
| i18n (QR phase) | `stock.invoiceScan.*` in `en.json` / `fr.json` / `ar.json` |

**Not present yet:** `ai:scan-receipt`, wizard steps 2–5, local fuzzy match UI, Confirm → stock.

### Phone page (this repo) — done

| Piece | Note |
|-------|------|
| Source | `public/scan.html` — **vanilla** single file (not a React Vite entry) |
| Live URL | `https://www.redatechpos.com/scan.html` |
| Deploy | Copied via Vite `publicDir: "public"` on landing build → `docs/scan.html` |
| Features | en/fr/ar, camera + gallery, JPEG compress (~1600px, 0.82), `check-session` poll 10s, signed PUT, `mark-uploaded` |
| Secrets | Anon key + project URL only. `Referrer-Policy: no-referrer` |

---

## 3. Schema (live — do not re-create)

```sql
-- ALREADY APPLIED. Reference only.
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
-- Indexes + RLS enabled, no policies. Service role only.
```

**Live cleanup behavior (v3):** `cleanup` / expiry / sweep call `discardSession` → **delete Storage object + delete the row**. Session does not linger as `completed`. Status `completed` remains valid in the CHECK but is unused by current Edge code.

Statuses (as used):

| Status | Meaning |
|--------|---------|
| `waiting` | QR live, no image yet |
| `uploaded` | Phone uploaded; desktop may download |
| `expired` | Returned briefly after discard of past-due waiting |
| `failed` | Reserved / unused so far |

`id` is the session **and** the phone token. Never use `device_id` as the file key.

---

## 4. Storage bucket (live)

Name: `invoice-scans`  
Public: **false**  
`file_size_limit`: 10 MB  
`allowed_mime_types`: `image/jpeg`, `image/png`, `image/webp`

Object key in practice (Edge forces JPEG):

```
{session_id}/invoice.jpg
```

---

## 5. Edge Function `invoice-scan` (live v3)

`verify_jwt: false`. Body: `{ "action": "...", ... }`.

### Auth split (implemented)

| Action | Caller | Auth |
|--------|--------|------|
| `create-session` | Desktop | `x-app-secret` + `device_id`. AI gate: `ai_enabled`, not trial, paid/active |
| `get-status` | Desktop | secret + device owns session |
| `get-download-url` | Desktop | same |
| `cleanup` | Desktop | same. Deletes Storage + **deletes row** |
| `check-session` | Phone | session `id` only |
| `get-upload-url` | Phone | session `id` only |
| `mark-uploaded` | Phone | session `id` only |

### CORS

All responses include CORS (`Access-Control-Allow-Origin: *`). `OPTIONS` handled.

### Notable live details

- Upload path always `{id}/invoice.jpg`; phone compresses to JPEG
- `create-session` sweeps this device: discards all `waiting`; discards `uploaded` past 10 min grace
- `get-status` / upload path: promote `waiting` → `uploaded` if object already exists (`mark-uploaded` may have failed)
- Download signed URL TTL: **120s**
- `create-session` response: `{ ok, session_id, expires_at }` — **desktop** builds `scan_url` + QR locally (does not rely on Edge `scan_url`)

Do **not** redeploy Edge unless fixing a bug. Transfer path is verified.

---

## 6. Phone page (done)

**Live:** `https://www.redatechpos.com/scan.html?s=<uuid>`  
**Source:** `public/scan.html`

UX (shipped):

1. Open QR → validate via `check-session`
2. Take photo (`capture="environment"`) or gallery
3. Preview + retake
4. Compress to JPEG client-side
5. `get-upload-url` → PUT (with token) → `mark-uploaded`
6. “Receipt sent successfully” (+ poll kills session UI if expired / already uploaded)

Errors covered: invalid link, expired, unsupported type, already sent, too large, upload fail. HEIC fails via canvas decode → unsupported message.

---

## 7. Desktop

### Done — QR transfer

Stock → Add stock → **Scan Supplier Receipt**.

- IPC: `online:invoiceScanCreateSession` / `GetStatus` / `DownloadAndCleanup`
- QR + expiry countdown
- Poll every **10s** (first poll immediate)
- On `uploaded`: download to `%TEMP%/reda-invoice-scan-<sessionId>.jpg`, show preview, call `cleanup`
- Close modal stops polls

### Remaining — wizard (after local image)

| Step | Name | What happens | Status |
|------|------|----------------|--------|
| 1 | Upload done | Show receipt preview. User continues. | Preview only — **no Continue → wizard yet** |
| 2 | AI | `ai:scan-receipt` spinner. JSON: supplier name + items. | **Not started** |
| 3 | Supplier | Local lookalikes of extracted name. Pick / search / **Add supplier**. | **Not started** |
| 4 | Products | Per line: lookalikes or **Add new product**. Prefill bought (AI) + selling (current). Weighted modal if bought changed. | **Not started** |
| 5 | Review | Confirm → existing Add Stock pending-save path. Delete local temp. | **Not started** |

Matching is **local** (Prisma `products` / `sellers`). Gemini never receives the catalog.

Lookalike scoring (desktop): normalize lowercase; exact name first; then token overlap; then contains. Show top ~5. Always **Add new product** / **Add supplier**.

Reuse `PriceConfirmationDialog` and `SellingPriceWarningDialog`; do not rewrite them.

IPC still needed:

- `ai:scan-receipt` ← **next**

### Gemini (`ai:scan-receipt`) — next build

Do **not** reuse the tool/streaming chat loop.

1. `ai-consume` (existing helper in `onlineHandlers`)
2. `generateContent` with `inlineData` + `responseMimeType: "application/json"`
3. Expected JSON:

```json
{
  "supplierName": "SARL Example",
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
| A / B / C | Each scan is a new UUID. Object key is `{session_id}/invoice.jpg` |

Same device may have more than one historical session. Never overwrite by `device_id`. Live `create-session` keeps at most one fresh `waiting` (sweeps others).

---

## 9. Failure handling (UI)

| Case | Message (English default; add fr/ar) | Status |
|------|--------------------------------------|--------|
| QR past 10 min | QR code expired. Please try again. | Done (desktop + phone) |
| Phone upload fail | Receipt upload failed. | Done (phone) |
| Download fail | Could not receive the receipt. Please try again. | Done |
| Gemini fail / empty | Could not read the receipt. Please try another photo. | **TODO** |
| Partial fields | Some information could not be read. | **TODO** |
| HEIC / bad type | This image type is not supported… | Done (phone) |
| Too large | Image is too large (max 10 MB). | Done (phone) |
| Offline / trial / AI off | Edge errors `ai_disabled` / `ai_trial_blocked` / `ai_not_licensed` | Done on create-session |
| Quota | Same as `ai-consume` | **TODO** at Gemini step |

i18n: QR-phase strings exist. Ask for final copy when adding wizard UI strings.

---

## 10. Isolation — do not touch

- Sales
- Backup bucket + `backup-*` functions
- `ai:chat` behavior
- `device-check` `allowed = trialOk \|\| paidOk`
- Existing license / device-request / device-link
- Rewrite of Add Stock dialogs (reuse weighted + selling-price warning)
- Working transfer pipeline (Edge v3, `scan.html`, invoiceScanHandlers) unless fixing a real bug

Stock/purchase writes happen **only** on wizard step 5 Confirm, through the **existing** Add Stock save helpers (`createPurchaseWithItems` / product update). Do not invent a second stock writer.

---

## 11. Implementation order

| # | Task | Status |
|---|------|--------|
| 1 | Confirm live Pages origin | **Done** — `https://www.redatechpos.com/scan.html` |
| 2 | Table + RLS | **Done** |
| 3 | Bucket | **Done** |
| 4 | Deploy `invoice-scan` | **Done** (v3) |
| 5 | Curl / phone smoke | **Done** (user E2E) |
| 6 | `public/scan.html` + deploy | **Done** |
| 7 | Desktop QR + poll + download | **Done** |
| 8 | Phone → desktop image E2E | **Done** |
| 9 | `ai:scan-receipt` (supplier + items JSON) | **NEXT** |
| 10 | Wizard steps 3–5 (local match, weighted modal, Confirm → stock) | Pending |
| 11 | Local temp delete on cancel; wizard failure copy; extra i18n | Pending |

---

## 12. Packages / env / manual steps

### npm

- `qrcode` + `@types/qrcode` — **installed**

No new AI provider SDK.

### Env

Desktop: existing `STORE_ONLINE_*` + `GEMINI_API_KEY`. Optional override: `STORE_INVOICE_SCAN_PAGE_URL` (defaults to live scan.html).

Pages (`scan.html`): public Supabase URL + **anon** key only (embedded).

### Manual checklist

- [x] Confirm Pages URL — `https://www.redatechpos.com/scan.html`
- [x] Deploy `scan.html` (live)
- [x] Table + bucket + Edge
- [x] Phone → desktop image E2E
- [ ] Translations for **wizard** UI strings (en / fr / ar) — ask when adding
- [ ] `ai:scan-receipt` + Confirm stock path

---

## 13. Test procedure

### A. Transfer (already passing — re-check only if touching Edge/phone/handlers)

1. Paid + `ai_enabled` desktop: Scan Supplier Receipt → QR
2. Phone (4G OK): open QR → photo → success
3. Desktop shows image; Storage object gone after cleanup

### B. Wizard + AI (not yet — required before calling the feature complete)

1. From received image → Continue → AI extracts supplier + lines
2. Supplier pick / add
3. Product lookalikes / new; weighted modal if bought price changed
4. Confirm writes stock + purchase like Add Stock
5. Local temp gone
6. Second session does not overwrite first device’s files
7. Trial / AI-off: blocked before QR
8. Chatbot + cloud backup unchanged

---

## 14. Resume checklist (other PC)

- [x] Phases 1–7 done — **do not rebuild transfer**
- [ ] Read **§0** + **§7 Remaining** + **§11 step 9**
- [ ] Implement `ai:scan-receipt` next (inlineData + JSON)
- [ ] Then wizard steps 3–5 using existing Add Stock save helpers
- [ ] Do not put `X_APP_SECRET` or service role in `scan.html`
- [ ] Do not send the image through the Edge Function
- [ ] Do not call `ai:chat` for vision

---

## 15. Key files

### Done (transfer)

```
public/scan.html
src/electron/handlers/invoiceScanHandlers.ts
src/electron/types/invoiceScan.ts
src/electron/preload/onlineAPI.ts
src/electron/utils/onlineConfig.ts          (DEFAULT_INVOICE_SCAN_PAGE_URL)
src/pages/stock/components/invoiceScan/InvoiceScanModal.tsx
src/pages/stock/components/addStockForm/index.tsx   (button + modal)
src/lib/locales/{en,fr,ar}.json             (stock.invoiceScan.*)
supabase: invoice-scan Edge Function v3     (dashboard only; not in this git tree)
```

### Still to add / modify (wizard + AI)

```
src/electron/handlers/aiHandlers.ts   (add scan-receipt only; do not change chat loop)
src/electron/preload/aiAPI.ts
src/pages/stock/components/invoiceScan/   (wizard steps after preview)
locales en / fr / ar                      (wizard strings — ask for translations)
```

### Do not modify (unless bugfix)

```
backup-* Edge Functions
backups bucket
Working invoice-scan transfer actions
AI chatbot UI (thread / ChatBox)
```

---

## 16. Gaps / decisions (still relevant for wizard)

### A. 5-step wizard (locked)

Matching is local, not Gemini. Selling price: existing → keep current; new → user fills. Bought change → `PriceConfirmationDialog`. Step 5 Confirm → existing pending-save.

### B–F. Transfer gaps — mostly resolved live

- Orphan Storage: `create-session` sweep + grace — **implemented**
- Upload vs QR race: `mark-uploaded` rejects expired waiting; uploaded kept — **implemented**
- AI gate on `create-session` — **implemented**
- Pages origin — **confirmed** `redatechpos.com`
- Phone anon key + CORS — **implemented**

### G. Gemini (open — next)

- `ai-consume` then model error → quota spent. Acceptable.
- Fallback models: Google vision only (`gemini-*-flash*`).
- Prompt: **unit bought price**, not line total.
- Prefer a **separate** handler so stock scan is not blocked by chatbot queue.

### H. Desktop UX still open for wizard

- After `received`: Continue into wizard (not Close-only).
- Close after local file exists: delete temp even if review cancelled.
- Close QR while `waiting`: leave session for Edge expiry/sweep (already OK).

### I. Abuse / ops (acceptable)

- UUID in QR is the 10-minute secret.
- After `uploaded`, reject second file.
- Table may stay empty often because cleanup **deletes** rows (fine).

### J. Still out of scope

- Two photos for a long thermal receipt
- HEIC conversion (reject + message — already)
- Matching IMEI / barcode
- pg_cron sweeper

---

## 17. As-built vs original plan (quick deltas)

| Original plan | As built |
|---------------|----------|
| Poll every 3s | Poll every **10s** |
| Vite second React entry for scan | Vanilla **`public/scan.html`** |
| Edge returns `scan_url` | Desktop builds URL from `DEFAULT_INVOICE_SCAN_PAGE_URL` |
| `cleanup` → status `completed` | `cleanup` → **delete row** + Storage |
| png/webp object keys | Always **`invoice.jpg`** after phone compress |
| Phone actions: get-upload-url, mark-uploaded | Also **`check-session`** |
| GitHub.io path uncertainty | Custom domain **confirmed** |
