# REDA TECH POS — Premium Plan (product & implementation)

**Status:** In progress — AI features done · Cloud backup Premium gate **next**  
**Written:** 2026-08-29  
**Constraint:** One simple Premium plan. Server flag stays `allowed_devices.ai_enabled` (treated as **Premium enabled** in product language).

---

## Implementation flow (locked order)

Do work in this order only:

```
Phase 1 → Cloud backup as Premium
Phase 2 → Build remaining Premium features
Phase 3 → Welcome page + pricing (website updates automatically)
```

Do **not** update welcome / pricing until Phases 1 and 2 are done.

---

## 0. Progress tracker (read this first)

### Product model (locked)

| Rule | Decision |
|------|----------|
| Plans | **Base license** (full desktop app) + **Premium add-on** (one bundle) |
| Premium server flag | `allowed_devices.ai_enabled = true` (name stays; means Premium) |
| Trial | **No Premium** — no AI, no cloud backup |
| Premium unlocks | AI chat, receipt scanner, cloud backup, and all future Premium features |
| Messaging | User-facing: **“Premium”** — not “AI enabled” |
| Release | Ship Premium as features are built — **do not wait** for every feature before enabling Premium for customers |

### Premium feature list

| Feature | Type | Status |
|---------|------|--------|
| REDA AI Assistant (store chatbot) | AI / internal intelligence | **Done** |
| AI Supplier Receipt Scanner | AI / data entry | **Done** |
| Online / cloud backup | Protection | **Built — Phase 1: gate as Premium** |
| Find Product Image | AI / product setup | **Phase 2** |
| Consult Price (Algerian market) | AI / external intelligence | **Phase 2** |
| Dashboard AI insights | AI / proactive BI | **Future (after Phase 2)** |
| Smart Restock | — | **Already inside AI Assistant — do not duplicate** |

---

## Already done (no work needed)

### Server & entitlement

| Item | Where |
|------|-------|
| `ai_enabled` column on `allowed_devices` | Supabase |
| `device-check` returns `ai_enabled` | Edge function |
| `ai-consume` enforces Premium for AI actions | Edge function |
| Desktop parses `aiEnabled` from device-check | `src/electron/handlers/onlineHandlers.ts` |

### REDA AI Assistant

| Item | Where |
|------|-------|
| Chat UI, runtime, quota | `src/lib/components/ai/` |
| Premium gate | `src/lib/hooks/useAiChatGate.ts`, `src/lib/license/aiChatAccess.ts` |
| Store tools (incl. restock) | `src/electron/ai/tools/storeTools.ts` |

### AI Supplier Receipt Scanner

| Item | Where |
|------|-------|
| Full flow (QR → scan → wizard → stock) | `src/pages/stock/components/invoiceScan/` |
| Premium badge + gate | `InvoiceScanModal.tsx` |

### Cloud backup (infra exists — Premium gate is Phase 1)

| Item | Where |
|------|-------|
| Upload / download / restore | `onlineHandlers.ts`, `backupHandlers.ts` |
| Admin UI | `backupManagement.tsx` |
| Welcome restore flow | `welcome/index.tsx` |
| **Current gate: paid only** (ignores `ai_enabled`) | `paidCloudBackupAccess.ts` |

---

## Phase 1 — Cloud backup as Premium

**Goal:** Cloud backup uses the same Premium flag as AI (`ai_enabled`). Proper block messages everywhere.

### 1.1 Shared Premium resolver

- [ ] Add `src/lib/license/premiumAccess.ts`
  - `resolvePremiumAccess({ isOnline, isTrialActive, aiEnabled })`
  - `PremiumBlockReason = "offline" | "trial" | "disabled"`
  - Comment: `aiEnabled` from server = Premium enabled
- [ ] Add `src/lib/hooks/usePremiumGate.ts`
- [ ] Optionally make `useAiChatGate` call `usePremiumGate` internally (keep existing imports working)

### 1.2 Wire cloud backup to Premium

- [ ] Update `paidCloudBackupAccess.ts` — block when `aiEnabled === false` (reason: `"disabled"`)
- [ ] Update `backupManagement.tsx` — use unified gate, overlay when Premium off
- [ ] Update `welcome/index.tsx` restore flow — require Premium, not just paid license
- [ ] Guard main-process backup IPC (`online:backupUploadLatest`, download) if not already
- [ ] **Supabase:** backup edge functions reject when `ai_enabled !== true`

### 1.3 Premium messaging (in-app only — not welcome/pricing yet)

- [ ] Update backup + AI block messages to say **Premium** (not “AI enabled”)
- [ ] i18n: `admin.backup.cloudBackupUnavailablePremium`, update `ai.disabled` strings
- [ ] Files: `backupManagement.tsx`, `AiChatBlockOverlay.tsx`, `ChatBox.tsx`, `AIRuntimeProvider.tsx`, `InvoiceScanModal.tsx`, `en.json`, `fr.json`, `ar.json`

**Phase 1 done when:** paid user without `ai_enabled` cannot upload/download cloud backup and sees a clear Premium message.

---

## Phase 2 — Remaining Premium features

Build after Phase 1. Each feature uses `usePremiumGate()` + `runAiConsumeInternal()`.

### 2.1 Find Product Image

- [ ] UI: `[ Upload Image ] [ ✨ Find Image ]` in add/edit stock (`ImageUpload` area)
- [ ] `FindImageDialog.tsx` — show 4 results, user picks one, confirm
- [ ] IPC: `ai:find-product-image`, `ai:download-product-image`
- [ ] Handler: `aiFindImageHandlers.ts` — optional Gemini normalize + Serper Images API
- [ ] Env: `SERPER_API_KEY` in Electron main only (never renderer)
- [ ] Download → resize → save as `form.photo` (reuse existing photo flow)
- [ ] Quota: `runAiConsumeInternal({ dayCost: 2 })`
- [ ] i18n: `stock.findImage.*`

### 2.2 Consult Price

- [ ] UI: `[ ✨ Consult Price ]` next to selling price in add/edit stock
- [ ] `ConsultPriceDialog.tsx` — suggested price, range, sources; profit calculated in app code
- [ ] IPC: `ai:consult-price` — dedicated handler, **not** chat
- [ ] Gemini + Google Search grounding for Algerian listings (Ouedkniss, Facebook, Webstarelectro, …)
- [ ] User-triggered only — never on field change
- [ ] Quota: `runAiConsumeInternal({ dayCost: 5 })`
- [ ] i18n: `stock.consultPrice.*`

### 2.3 Dashboard AI insights (optional, later)

- [ ] Deferred until 2.1 and 2.2 are stable

**Phase 2 done when:** Find Image and Consult Price work end-to-end behind Premium gate.

---

## Phase 3 — Welcome page + pricing (last)

**Do this only after Phase 1 and Phase 2.**

Website (`landing.tsx`) uses the same `WelcomeSetup` component — updating welcome updates the site automatically.

### 3.1 Welcome page — Premium section

- [ ] Add nav: `welcome-premium` → “Premium”
- [ ] New section after tutorials, before key features
- [ ] `PREMIUM_FEATURE_DEFS` in `src/lib/about/featureDefinitions.ts` (or separate file)

| Card | Status at ship |
|------|----------------|
| REDA AI Assistant | Live |
| AI Receipt Scanner | Live |
| Online cloud backup | Live |
| Find Product Image | Live (built in Phase 2) |
| Consult Price | Live (built in Phase 2) |

- [ ] Purple Premium styling (`#8b5cf6`), badge on cards
- [ ] Keep `ABOUT_MAIN_FEATURE_DEFS` for core app features (cashier, stock, …) — separate section
- [ ] Update `SEQ` intro animation steps in `welcome/index.tsx`
- [ ] Welcome restore copy → mention Premium
- [ ] i18n: `welcome.premium.*` in en / fr / ar

### 3.2 Pricing plans

- [ ] Update `pricingPlansSection.tsx`:
  - Base license cards (Monthly / Yearly / Lifetime) — full POS app
  - Premium add-on band below — list all Premium features
- [ ] Fix price constant mismatch if needed (TS `1900` vs locale `2500`)
- [ ] i18n: `pricing.premium.*` in en / fr / ar
- [ ] Update `licenseGate` page if it embeds pricing

**Phase 3 done when:** welcome + website show Premium section and updated pricing with all shipped features.

---

## Premium access rules (reference)

All Premium features require **all** of:

1. Online
2. Valid paid license (not expired)
3. Not in active trial
4. `ai_enabled === true` on device
5. Under quota for AI actions (`ai-consume`)

Local backups stay **free for everyone**.

| Feature | Trial | Paid, Premium off | Paid, Premium on |
|---------|-------|-------------------|------------------|
| Full POS app | Yes | Yes | Yes |
| Local backup | Yes | Yes | Yes |
| REDA AI chat | No | No | Yes |
| Receipt scanner | No | No | Yes |
| Cloud backup | No | No | Yes |
| Find Image / Consult Price | No | No | Yes |

---

## File checklist (implementation order)

| # | Phase | Task | Primary files |
|---|-------|------|----------------|
| 1 | 1 | Premium resolver | `premiumAccess.ts`, `usePremiumGate.ts` |
| 2 | 1 | Cloud backup gate | `paidCloudBackupAccess.ts`, `backupManagement.tsx` |
| 3 | 1 | Welcome restore gate | `welcome/index.tsx` |
| 4 | 1 | Premium copy (in-app) | locales, AI + backup components |
| 5 | 1 | Server backup enforcement | Supabase edge functions |
| 6 | 2 | Find Product Image | handlers + stock forms |
| 7 | 2 | Consult Price | handlers + stock forms |
| 8 | 3 | Welcome Premium section | `welcome/index.tsx`, `featureDefinitions.ts` |
| 9 | 3 | Pricing update | `pricingPlansSection.tsx`, locales |

---

## Supabase / admin

- Enable Premium: `UPDATE allowed_devices SET ai_enabled = true WHERE device_id = '...';`
- Default: `ai_enabled = false` until supplier activates Premium
- Column name stays `ai_enabled`; product name is **Premium**

---

## Out of scope

- Separate Smart Restock feature (already in AI)
- AI logo / image generation / voice assistant
- Auto-select image or auto-apply price without confirm
- Renaming DB column to `premium_enabled` (optional later)

---

## Definition of done

**After Phase 1:**
- [ ] Cloud backup requires Premium (`ai_enabled`)
- [ ] Clear Premium messages in backup admin + welcome restore

**After Phase 2:**
- [ ] Find Product Image shipped
- [ ] Consult Price shipped

**After Phase 3:**
- [ ] Welcome Premium section live
- [ ] Pricing shows Base + Premium add-on
- [ ] en / fr / ar for all new copy

---

*Last updated: 2026-08-29*
