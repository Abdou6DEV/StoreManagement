# REDA AI — Supabase entitlement & rate limits (implementation plan)

**Status:** Phase 0 (local app) **done** · Phase 1 (Supabase) **not started**  
**Written:** 2026-08-22 · **Last verified:** 2026-08-23  
**Project:** `fayqqjnhqggmtcwaymwh` (Abdou6DEV's Project)  
**Constraint:** Existing installs run an **old app** without AI. All Supabase changes must be **additive** and **safe** for those clients.

---

## 0. Progress tracker (read this first on other PC)

### Phase 0 — Local app (DONE, uncommitted branch work)

| Item | Status | Where |
|------|--------|-------|
| Trial gate (UI overlay) | Done | `useAiChatGate`, `AiChatBlockOverlay`, `ChatBox` |
| Offline gate (UI overlay) | Done | same |
| Trial data source | `trial_ends_at` from `device-check` / grace snapshot via `useActiveTrial` | |
| Adapter guard (trial/offline) | Done | `AIRuntimeProvider` |
| Local send cooldown (2.5s) | Done | `aiRateLimit.ts`, `ai:chat` |
| Local 10/min rolling window | Done | temporary until Supabase owns minute quota |
| Local daily cap | **Skipped** | avoid double cap with Supabase 100/day |
| Message queue while running | Disabled | `unstable_enableMessageQueue: false` |
| i18n trial/offline/cooldown/minute | Done | `en.json`, `fr.json`, `ar.json` |

**Known gaps (fix in Phase 1 or sooner):**

- Trial/offline **not** enforced in main-process `ai:chat` (UI-only today; bypass via IPC possible).
- No `ai_enabled`, no `ai-consume` call yet.
- Paid users can use AI locally until Supabase ships (no server entitlement).

### Phase 1 — Supabase (TODO)

- [ ] DB migration (`ai_enabled`, `ai_settings`, usage tables, RLS)
- [ ] Deploy `ai-consume` Edge function
- [ ] Wire desktop: call `ai-consume` in `ai:chat` before LLM
- [ ] UI for `ai_disabled`, `rate_limit_day`, map errors
- [ ] **Remove** local 10/min when Supabase minute quota is live (**keep** 2.5s cooldown)
- [ ] Enable `ai_enabled = true` on pilot devices only

---

## 1. Product rules (locked)

| Rule | Decision |
|------|----------|
| AI on/off | Per device: `allowed_devices.ai_enabled` |
| Limit config | Global table `ai_settings` (not per device) |
| Usage counters | **Per device** against those global caps |
| Trial (7 days) | **No AI** while `trial_ends_at > now` |
| Offline | **No AI** (LLM + quota need network) |
| Quota check | **Every chat message** → Supabase before LLM |
| LLM keys | Stay on desktop for now (no proxy yet) |
| Existing devices | Default **AI off** (`ai_enabled = false`) |
| Old app | Must keep working; never call new AI endpoints |

### Rate limits — who owns what

| Limit | Now (Phase 0) | After Supabase (Phase 1) |
|-------|---------------|---------------------------|
| Send cooldown (~2.5s) | Local main process | **Keep local** |
| Per minute (10) | Local in-memory session | **Supabase only** — remove local |
| Per day (100) | None | **Supabase only** |
| Message length (500) | Local forever | Local forever |

### Suggested starting limits (confirm before Phase 1)

- `requests_per_minute`: **10**
- `requests_per_day`: **100**
- Daily bucket timezone: **UTC** (recommended)

### When is AI allowed?

All of:

1. Online  
2. Device row exists  
3. `ai_enabled === true`  
4. **Not** in active trial (`trial_ends_at` is null **or** `<= now`)  
5. Paid OK (`active === true` and `expires_at` null or in the future) — same idea as `paidOk` in `device-check`  
6. Under per-minute and per-day caps for **this** `device_id`  
7. Then call local Gemini/OpenRouter/etc. as today  

Local forever (unchanged by this plan):

- Page permissions (`aiAccess` — stock/clients/…)  
- 500 char input limit  
- Tool compaction / sample limits  

---

## 2. What exists on Supabase (verified live 2026-08-23)

### Tables (`public`)

| Table | Rows | RLS | Notes |
|-------|------|-----|-------|
| `customers` | 13 | on | |
| `allowed_devices` | 12 | on | **No `ai_enabled` column yet** |
| `device_requests` | 12 | on | |

**`allowed_devices` columns (live):**  
`device_id`, `customer_id`, `active`, `expires_at`, `created_at`, `trial_ends_at`, `last_seen_at`, `seen_count`, `customer_name`, `customer_phone`

**Not present yet:** `ai_enabled`, `ai_settings`, `ai_usage_daily`, `ai_usage_minute`

### Migrations (live)

1. `allowed_devices_last_seen`
2. `allowed_devices_customer_name_phone`

No AI-related migrations yet.

### Edge Functions (live)

| Slug | Version | `verify_jwt` | Notes |
|------|---------|--------------|-------|
| `device-check` | v7 | false | `allowed = trialOk \|\| paidOk` — unchanged |
| `device-request` | v5 | false | |
| `device-link-existing` | v2 | false | |
| `backup-upload-latest` | v5 | false | |
| `backup-download-latest` | v17 | false | |
| **`ai-consume`** | — | — | **Not deployed** |

### `device-check` behavior (do not break)

- Auth: header `x-app-secret` === `X_APP_SECRET`  
- Body: `{ device_id }`  
- Selects: `device_id, customer_id, active, expires_at, trial_ends_at, seen_count, last_seen_at`  
- Updates `last_seen_at` / `seen_count` (once per UTC day)  
- **`allowed = trialOk || paidOk`** — trial users are **licensed for the app**, not blocked  
- Response: `ok`, `device_id`, `allowed`, `customer_id`, `customer_name`, `customer_phone`, `expires_at`, `trial_ends_at`, `now`  
- **No `ai_enabled` in response yet**

Desktop parser (`onlineHandlers.ts` / `parseDeviceCheckJson`) only **requires** `allowed: boolean`. Unknown extra keys are ignored → safe to add optional fields later.

### Trial vs license vs AI (important)

| Check | Question | Trial user |
|-------|----------|------------|
| `device-check` | Can use the **app**? | Usually **yes** (`allowed: true`) |
| Local UI / `ai-consume` | Can use **AI chat**? | **No** while `trial_ends_at > now` |

---

## 3. Schema plan (additive only)

### 3.1 Column on `allowed_devices`

```sql
ALTER TABLE public.allowed_devices
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT false;
```

- All **existing** rows → `false` (no AI until you enable per device)  
- No renames/drops  

### 3.2 Global settings

```text
ai_settings
  id                int PK (singleton, e.g. id = 1 only)
  requests_per_minute  int NOT NULL
  requests_per_day     int NOT NULL
  updated_at           timestamptz
```

Insert one row with the agreed defaults.

### 3.3 Per-device daily usage

```text
ai_usage_daily
  device_id   text NOT NULL  REFERENCES allowed_devices(device_id) ON DELETE CASCADE
  day         date NOT NULL   -- UTC
  count       int NOT NULL DEFAULT 0
  PRIMARY KEY (device_id, day)
```

### 3.4 Per-minute

Recommend **C:** `ai_usage_minute (device_id, minute_bucket, count)` with `minute_bucket = date_trunc('minute', now())`

### 3.5 RLS

- Enable RLS on new AI tables  
- **No** anon/authenticated write policies  
- Edge uses **service role** (same as `device-check`)  

---

## 4. Edge plan

### 4.1 New function: `ai-consume` (required for Phase 1)

**Why:** Old apps never call it → zero risk to license flow.

**Auth:** same as `device-check` (`x-app-secret`).

**Request:**

```json
{ "device_id": "<machine guid>" }
```

**Logic (every message):**

1. Validate secret + `device_id`  
2. Load `allowed_devices` row  
3. If missing → `{ ok: false, error: "device_not_found" }`  
4. If `ai_enabled !== true` → `{ ok: false, error: "ai_disabled" }`  
5. If trial active (`trial_ends_at > now`) → `{ ok: false, error: "ai_trial_blocked" }`  
6. If not `paidOk` → `{ ok: false, error: "ai_not_licensed" }`  
7. Load `ai_settings`  
8. Check + increment minute usage → if over → `{ ok: false, error: "rate_limit_minute" }`  
9. Check + increment daily usage → if over → `{ ok: false, error: "rate_limit_day" }`  
10. Return e.g. `{ ok: true, remaining_day, remaining_minute, limits: { ... } }`

Use a **transaction** or atomic upsert so two concurrent sends cannot both pass the same slot.

### 4.2 Do **not** change `device-check` core logic

- Keep `allowed = trialOk || paidOk` exactly as today  
- Do **not** make AI affect `allowed`  
- Optional (not required for v1): add `ai_enabled` to JSON response as **extra** field (old clients ignore it)

### 4.3 Optional: `ai-status` (read-only)

Deferred. UI can use last `ai-consume` error + optional cached `ai_enabled` from extended `device-check`.

---

## 5. Desktop plan — Phase 1 wiring

**Deploy order (critical):**

```
1. Supabase migration + seed ai_settings
2. Deploy ai-consume → smoke-test with curl
3. Ship app update that calls ai-consume
```

**Never ship the app that calls `ai-consume` before the Edge function exists** — every chat would fail.

### In `ai:chat` (main process), before LLM:

1. Local cooldown (keep from Phase 0)  
2. **`POST .../functions/v1/ai-consume`** with `x-app-secret` + `device_id`  
3. If not `ok` → throw mapped error code; **do not** call LLM  
4. If network fail → treat as no AI (same as offline)  
5. Else → existing LLM + tools flow  

### UI (extend Phase 0):

- Map `ai_disabled`, `ai_trial_blocked`, `ai_not_licensed`, `rate_limit_minute`, `rate_limit_day`  
- Optional overlay for `ai_disabled` (like trial/offline)  
- Trial/offline overlays already done  

### i18n still needed for Phase 1

- `ai.disabled` — AI is not enabled on this device  
- `ai.rateLimitDay` — Daily AI limit reached. Try again tomorrow  
- (trial/offline/cooldown/minute already in locales)

---

## 6. Old-app / production safety

| Question | Answer |
|----------|--------|
| Existing users **before** app update? | **No problem** — old app never calls `ai-consume`; `device-check` unchanged |
| Supabase migration while old app runs? | **Safe** — additive column/tables; old app ignores them |
| Existing users **after** app update? | App/license OK; **AI off** until `ai_enabled = true` (and not on trial) |
| Trial users after update? | App OK; AI blocked by UI + `ai-consume` |

| Requirement | How |
|-------------|-----|
| Existing users no AI by default | `ai_enabled DEFAULT false` |
| Old `device-check` unchanged | Separate `ai-consume` |
| No required new JSON for old app | Additive only |

### What must never happen

- Change `device-check` so `allowed` depends on `ai_enabled`  
- Ship app that calls `ai-consume` before Edge is deployed  
- Local daily cap **and** Supabase daily cap both active  
- Old clients hit AI rate limits  

---

## 7. Explicitly out of scope

- LLM proxy / moving API keys to Supabase  
- Per-cashier AI flags (page perms already gate tool data)  
- Offline grace for AI  
- Chat history in the cloud  
- Enforcing each model’s `rpm`/`rpd` from `aiModels.ts`  

---

## 8. Phase 1 implementation order

1. Confirm limits: 10/min, 100/day, UTC daily buckets  
2. Apply migration only → verify `device-check` still works (curl + old app login)  
3. Seed `ai_settings` singleton  
4. Deploy `ai-consume` (`verify_jwt: false`, secret header)  
5. Smoke-test `ai-consume` with curl  
6. Wire `onlineHandlers` helper + gate in `aiHandlers.ts` `ai:chat`  
7. Extend error mapping in `AIRuntimeProvider` + optional `ai_disabled` overlay  
8. Add remaining i18n (`ai.disabled`, `ai.rateLimitDay`)  
9. Remove local **10/min** (keep cooldown)  
10. Test matrix (below)  
11. `UPDATE allowed_devices SET ai_enabled = true` for **one** pilot device  

---

## 9. Test matrix

- [ ] Old app + existing device → license OK, no AI calls to Supabase  
- [ ] New app + `ai_enabled=false` → blocked with clear message  
- [ ] New app + trial → blocked (UI + server)  
- [ ] New app + paid + enabled → OK until limits  
- [ ] Hit minute limit → `rate_limit_minute`  
- [ ] Hit day limit → `rate_limit_day`  
- [ ] Offline → no AI (no LLM call)  
- [ ] `device-check` unchanged for trial user (`allowed: true`)  
- [ ] Rapid send → local cooldown still works  

---

## 10. Manual enable (ops)

```sql
UPDATE public.allowed_devices
SET ai_enabled = true
WHERE device_id = '<that device id>';
```

Leave everyone else `false`.

---

## 11. Resume checklist (other PC)

- [ ] Read **§0 Progress tracker** — Phase 0 is done in git branch, not Supabase  
- [ ] Pull/sync branch with Phase 0 changes  
- [ ] Re-verify Supabase: `list_tables`, `list_edge_functions` (still no `ai-consume`?)  
- [ ] Start Phase 1 at **§8 step 1**  
- [ ] Do **not** ship app with `ai-consume` until step 4–5 pass  

---

## 12. Key files (Phase 0 — already touched)

```
src/lib/hooks/useAiChatGate.ts
src/lib/license/aiChatAccess.ts
src/lib/components/ai/AiChatBlockOverlay.tsx
src/lib/components/ai/ChatBox.tsx
src/lib/components/ai/AIRuntimeProvider.tsx
src/electron/ai/aiRateLimit.ts
src/electron/handlers/aiHandlers.ts
src/lib/ai/aiMessageLimits.ts
```

Phase 1 will mainly add: `onlineHandlers` (ai-consume helper), `aiHandlers.ts` gate, Supabase Edge function, migration SQL.
