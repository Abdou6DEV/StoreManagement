# REDA AI — Supabase entitlement & rate limits (implementation plan)

**Status:** Plan only — do **not** implement until ready.  
**Written:** 2026-08-22  
**Project:** `fayqqjnhqggmtcwaymwh` (Abdou6DEV's Project)  
**Constraint:** Existing installs run an **old app** without AI. All changes must be **additive** and **safe** for those clients.

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

### Suggested starting limits (confirm before implement)

- `requests_per_minute`: **10**
- `requests_per_day`: **100**

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

## 2. What exists today (inspected live)

### Tables (`public`)

- **`customers`** — `id`, `name`, `phone`, `created_at`  
- **`allowed_devices`** — PK `device_id`; `customer_id`, `active`, `expires_at`, `trial_ends_at`, `last_seen_at`, `seen_count`, `customer_name`, `customer_phone`  
  - ~12 rows; **no AI column yet**  
- **`device_requests`** — onboarding  

### Edge Functions

| Slug | Role |
|------|------|
| `device-check` | License gate; `x-app-secret`; `allowed = trialOk \|\| paidOk` |
| `device-request` | Request access |
| `device-link-existing` | Link existing |
| `backup-upload-latest` / `backup-download-latest` | Cloud backup |

### `device-check` behavior (do not break)

- Auth: header `x-app-secret` === `X_APP_SECRET`  
- Body: `{ device_id }`  
- Selects: `device_id, customer_id, active, expires_at, trial_ends_at, seen_count`  
- Updates `last_seen_at` / `seen_count`  
- Response fields old app uses: `ok`, `device_id`, `allowed`, `customer_id`, `customer_name`, `customer_phone`, `expires_at`, `trial_ends_at`, `now`  

Desktop parser (`onlineHandlers.ts` / `parseDeviceCheckJson`) only **requires** `allowed: boolean`. Unknown extra keys are ignored → safe to add optional fields later if needed.

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
  day         date NOT NULL   -- UTC date recommended; document timezone choice
  count       int NOT NULL DEFAULT 0
  PRIMARY KEY (device_id, day)
```

### 3.4 Per-minute

Options (pick one when implementing):

- **A.** Count recent rows / timestamps in a small `ai_usage_events` table (last 60s)  
- **B.** Store sliding window on consume in Edge (e.g. Redis not available → use DB timestamps)  
- **C.** `ai_usage_minute (device_id, minute_bucket, count)` with `minute_bucket = date_trunc('minute', now())`

Recommend **C** for simplicity and atomicity.

### 3.5 RLS

- Enable RLS on `ai_settings`, `ai_usage_daily`, (and minute table)  
- **No** anon/authenticated write policies (or no policies = deny for Data API)  
- Edge uses **service role** (same as `device-check`)  

---

## 4. Edge plan

### 4.1 Prefer new function: `ai-consume` (recommended)

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
8. Check + increment minute usage for this device → if over → `{ ok: false, error: "rate_limit_minute" }`  
9. Check + increment daily usage → if over → `{ ok: false, error: "rate_limit_day" }`  
10. Return e.g. `{ ok: true, remaining_day, remaining_minute, limits: { ... } }`

Use a **transaction** or atomic upsert so two concurrent sends cannot both pass the same slot.

### 4.2 Do **not** change `device-check` core logic

- Keep `allowed = trialOk || paidOk` exactly as today  
- Do **not** make AI affect `allowed`  
- Optional later (not required for v1): add `ai_enabled` to the JSON response as an **extra** field only (old clients ignore it)

### 4.3 Optional helper: `ai-status` (read-only)

For UI (show/hide chat) without consuming a quota. Can be deferred; UI can rely on last consume error + cached `ai_enabled` from an extended `device-check`.

---

## 5. Desktop plan (new app only)

1. Before every `ai:chat` / adapter send:  
   `POST .../functions/v1/ai-consume` with same secret + `device_id` as online handlers  
2. If not `ok` → show localized error; **do not** call LLM  
3. If network fail → treat as no AI (offline rule)  
4. Hide or disable ChatBox when device is not AI-entitled (after license check / cached flag)  
5. Keep store tools + page perms local  

### i18n (new strings — ask for final translations when implementing)

Examples:

- `ai.disabled` — AI is not enabled on this device  
- `ai.trialBlocked` — AI is not available during the trial  
- `ai.rateLimitMinute` — Too many messages. Please wait a minute  
- `ai.rateLimitDay` — Daily AI limit reached. Try again tomorrow  
- `ai.offlineRequired` — AI requires an internet connection  

---

## 6. Old-app / production safety

| Requirement | How |
|-------------|-----|
| Existing users no AI | `ai_enabled DEFAULT false` |
| Old `device-check` unchanged in meaning | Separate `ai-consume`; don’t alter allow formula |
| No required new JSON fields for old app | Additive only |
| Deploy order | (1) migration → (2) deploy `ai-consume` → (3) ship new app |
| Never ship app before Edge exists | App would fail every chat |

### What must never happen

- Old update breaks on missing columns/fields  
- `device-check` errors because AI tables empty  
- AI schema changes who is “licensed”  
- Old clients hit rate limits or AI errors  

---

## 7. Explicitly out of scope (this slice)

- LLM proxy / moving API keys to Supabase  
- Per-cashier AI flags (page perms already gate tool data)  
- Offline grace for AI  
- Chat history in the cloud  
- Enforcing each model’s `rpm`/`rpd` from `aiModels.ts`  

---

## 8. Implementation order (when you start)

1. Confirm limits: 10/min, 100/day (or your numbers)  
2. Confirm timezone for `day` (recommend **UTC**)  
3. Apply migration: `ai_enabled` + `ai_settings` + usage tables + RLS  
4. Seed `ai_settings` singleton  
5. Deploy Edge `ai-consume` (`verify_jwt: false`, secret header like others)  
6. Wire desktop online helper + gate in `AIRuntimeProvider` / `ai:chat`  
7. UI: hide/disable chat + error mapping  
8. Locales en/fr/ar  
9. Test matrix:  
   - Old app + existing device → license OK, no AI calls  
   - New app + `ai_enabled=false` → blocked  
   - New app + trial → blocked  
   - New app + paid + enabled → OK until limits  
   - Hit minute / day limits  
   - Offline → no AI  
10. Manually set `ai_enabled = true` only for devices you want  

---

## 9. Manual enable (ops)

After ship, enable AI for a device in SQL/dashboard:

```sql
UPDATE public.allowed_devices
SET ai_enabled = true
WHERE device_id = '<that device id>';
```

Leave everyone else `false`.

---

## 10. Resume checklist for tomorrow

- [ ] Re-read this file  
- [ ] Confirm 10/min & 100/day (or change)  
- [ ] Confirm UTC for daily buckets  
- [ ] Implement DB migration only first; verify existing `device-check` still works  
- [ ] Deploy `ai-consume`; smoke-test with curl + app secret  
- [ ] Then desktop wiring + i18n  
- [ ] Enable AI on one test device only  

**Do not implement until you explicitly start this work.**
