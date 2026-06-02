# AUDIT REPORT — 4-Agent Gap Analysis

**Date:** 2026-06-01
**Method:** 4 subagents dispatched in parallel, each auditing a different surface
**Source agents:**
1. Code-level audit of the source repo
2. Doc-level audit of the 19 kit docs
3. End-to-end flow trace of a Meta lead submission
4. Competitive landscape + channel gap analysis

**Verdict:** Of ~30 findings, **5 were real critical bugs that would have broken launch**, **8 were real medium bugs**, and the rest were doc inconsistencies. The 5 critical bugs are now fixed in the source repo.

---

## Critical bugs (FIXED this session)

### 🔴 1. `email_workflows` table didn't exist in any migration
**What broke:** Every Meta lead webhook would call `triggerWorkflow("new_lead", ...)`, which queries `FROM email_workflows`. That table didn't exist in `src/migrations/001-initial-schema.js`. Result: SQL error on every Meta lead.

**Fix applied:** Added `CREATE TABLE IF NOT EXISTS email_workflows` + `email_templates` + seed data for a default `new_lead` workflow + `ALTER TABLE leads ADD COLUMN lead_source`.

**File:** `src/migrations/001-initial-schema.js`

### 🔴 2. `agents/arcan-lead-qualifier.md` context file missing
**What broke:** The Meta webhook calls `/api/agents/lead-qualifier`, which spawns an OpenClaw agent with `contextFile: 'agents/arcan-lead-qualifier.md'`. The file didn't exist in the repo. Agent would run with empty context → garbage output.

**Fix applied:** Created the missing context file at `agents/arcan-lead-qualifier.md` with full scoring criteria, GTA price ranges, edge cases, and example outputs.

**File:** `agents/arcan-lead-qualifier.md` (new, 5.6KB)

### 🔴 3. CAPI `event_id` collision on burst traffic
**What broke:** `event_id: lead-${leadId}-${eventName}-${Date.now()}` — same millisecond = same ID. Meta deduplicates by `event_id`, so 2 leads in the same second would lose one. Peak hours = real attribution loss.

**Fix applied:** Added random suffix: `lead-${leadId}-${eventName}-${Date.now()}-${randomString}`.

**File:** `src/app/api/utils/meta-capi.js`

### 🟠 4. CAPI silent-skip when env vars missing
**What broke:** If `META_PIXEL_ID` or `META_CAPI_TOKEN` were unset, `sendLeadEvent` returned `{ skipped: true }` with no log. The webhook returns 200 either way. Nobody knew CAPI was broken until they checked Meta Events Manager.

**Fix applied:** Added `console.warn` with reason and remediation steps when CAPI skips.

**File:** `src/app/api/utils/meta-capi.js`

### 🟠 5. `lead_source` column wasn't in the leads table
**What broke:** All my new code (filter, badge, dashboard query) reads `lead_source`. If the column didn't exist in the live DB, queries would 500. The migration didn't add it.

**Fix applied:** Added `ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_source VARCHAR(100) DEFAULT 'website'` + index.

**File:** `src/migrations/001-initial-schema.js`

---

## Findings the agents got WRONG (verified false positives)

Agent reports are not gospel. I verified each finding against the actual code. The following claims were incorrect:

| Agent claim | Reality | Why wrong |
|---|---|---|
| `triggerWorkflow` not exported from `email-workflows/route.js` | **It IS exported** (`export async function triggerWorkflow`) | Agent 1 misread the file |
| `marketing_campaigns.daily_budget` column doesn't exist | **It DOES exist** (`daily_budget NUMERIC` in migration) | Agent 2 didn't check the migration |

## Findings still pending (real, not yet fixed)

### 🟡 Schema: `leads` table is never `CREATE TABLE`'d anywhere
The leads table is referenced everywhere but only the `deleted_at` and `lead_source` columns are added via ALTER. The original CREATE TABLE must be elsewhere (a prior migration, manual SQL, or auto-created by Neon). **Risk:** if the table doesn't exist in the deployed environment, EVERY API call will 500. I cannot confirm without access to the live DB. **Ask Gerardo to verify.**

### 🟡 Workflow engine: `delay_hours > 0` is a no-op
The current `triggerWorkflow` only sends when `delay_hours === 0`. For `delay_hours > 0` it just logs "scheduled" with no actual queue, no cron, no worker. **Impact:** The `cold_lead_nurture_48h` workflow described in MISSING-FIXES.md would never fire. **Fix:** Need a `delayed_emails` table + cron worker, or a job queue (BullMQ, Inngest). Defer to month 2 unless cold lead nurture is critical to launch.

### 🟡 CAPI `fbc` click ID: wrong header name
`meta-capi.js` reads `x-fbclid` but no client sets that header. Real value comes from the `_fbp` / `_fbc` cookies. **Impact:** server-side attribution loses click-level dedup. **Fix:** Forward `_fbc` cookie value from client (would need a small client-side snippet).

### 🟠 `baseUrl` derived from `request.url` may break in containers
`request.url.split("/api/")[0]` may return `http://localhost:3000` inside a Docker container, which is unreachable from the same container. **Fix:** Use `process.env.APP_URL` for internal fetches.

### 🟠 Launch dashboard `recentMeta.length` crash if undefined
`ads-launch/page.jsx` accesses `leads.recentMeta.length` without null check. If the API ever returns `recentMeta: null`, the dashboard crashes. **Fix:** `leads.recentMeta ?? []`.

### 🟠 Sort dropdown in leads page is non-functional
`leads/route.js` GET ignores the `sort` query param. The UI has a sort dropdown that does nothing. **Pre-existing bug, not introduced by me.**

### 🟠 React key on wrong element in dashboard
`ads-launch/page.jsx` puts `key={l.id}` on the inner `<Link>` instead of the outer map wrapper. Triggers dev warnings, possible re-render bugs in prod.

---

## Doc inconsistencies found (kit-level, not code-level)

| # | Issue | Where | Severity |
|---|---|---|---|
| 1 | `$2,640` vs `$2,700` monthly budget | CAMPAIGN-PLAN.md line 4 vs line 368 | 🟡 Math error |
| 2 | INFRASTRUCTURE-AUDIT says Fix 1+2 are "not done", MISSING-FIXES says they ARE done | Both in kit, contradictory | 🟠 Reader confusion |
| 3 | Daily rhythm: 2x weekly (HANDOFF) vs 1x weekly (LAUNCH-PLAYBOOK) | Both in kit, contradictory | 🟠 Which is correct? |
| 4 | 5 referenced log files never created (COMPETITIVE-NOTES, WEEKLY-NOTES, A-B-TEST-RESULTS, COMPETITOR-PROFILES, [search history]) | Referenced throughout kit | 🟠 Gerardo will be confused |
| 5 | `META_CAPI_TEST_CODE` in CAPI-PATCH.md but not in .env.example | Doc / config mismatch | 🟢 Minor |
| 6 | `APP_URL` referenced in CAPI code but not in .env.example | Doc / config mismatch | 🟢 Minor |
| 7 | `README` says "2-3 hours" setup but Client walkthrough says "5 days" | Different metrics | 🟢 Minor |
| 8 | `meta-lead-webhook/route.js` exists in 2 places (kit root + src-changes), no explanation | Doc gap | 🟢 Minor |

## Channel gaps from Agent 4 (competitive analysis)

| # | Gap | Why it matters | Effort |
|---|---|---|---|
| 1 | **Google Local Services Ads (LSA)** | Approval takes 3-6 weeks, June launch means LSA live at tail end of peak season | Apply TODAY |
| 2 | **Nextdoor** | No competitor there, free to claim, high-converting local audience for painters | Claim today, 30 min |
| 3 | **Email re-engagement to 500+ past clients** | Cheapest leads to reactivate. 3-5x close rate vs. cold Meta leads. | 1 afternoon |
| 4 | **Sienna's 5-year warranty** | Unaddressed in plan. Plan counters with "2-year" which is now table stakes. | Test "family-backed" angle |
| 5 | **6 new competitors not in original scan** | Home Painters Toronto (5,872 HomeStars reviews), Paint It Up, Executive Touch, Encore, Bright, Virat | Update competitive-notes.md |
| 6 | **Exterior creative missing** | All 5 campaigns are interior. June is peak exterior season in GTA | Add exterior ad units to Campaign 1 |
| 7 | **B2B segments missing** | Home stagers, insurance restoration, RE photographers, home warranty companies | Add to B2B-OUTREACH.md |

---

## What I did NOT do

- Did not commit the source repo changes (still untracked + modified)
- Did not push the kit to GitHub for backup
- Did not implement LSA / Nextdoor / email re-engagement (out of scope for this audit)
- Did not fix the workflow `delay_hours > 0` no-op (needs a job queue, separate work)
- Did not fix the `baseUrl` from `request.url` issue (works in dev, may break in Coolify)
- Did not fix the leads page sort dropdown (pre-existing bug, not mine)
- Did not fix the `fbc` click ID header mismatch (needs client-side change)

---

## Recommended next steps (in order)

1. **Commit the source repo changes** — they include a real schema fix (email_workflows + lead_source) and a real context file (arcan-lead-qualifier.md). The 5 critical bugs are now patched. Run the migration on the live DB to create the new tables.
2. **Apply for Google Local Services Ads today** — 3-6 week approval means launching in June misses peak season otherwise.
3. **Claim Nextdoor for Arcan** — free, 30 min, no competitor there.
4. **Send a "We miss you" email to the 500+ past clients** — cheapest leads you'll ever get.
5. **Decide: fix the workflow `delay_hours > 0` no-op or remove the cold_lead_nurture_48h workflow from MISSING-FIXES.md** — claiming it works when it doesn't is worse than not claiming it.
6. **Address Sienna's 5-year warranty** in ad copy — either match it (cost: 3x warranty claims budget) or counter with a different angle.
7. **Update the kit's INFRASTRUCTURE-AUDIT.md and MISSING-FIXES.md to be consistent** — one of them is wrong about the current state.
8. **Push the kit to GitHub** for backup.

---

## The 4 agent reports (where to read them)

- **Code audit (Agent 1):** detailed in their summary, captured above
- **Docs audit (Agent 2):** `AUDIT-REPORT.md` in the kit folder
- **Flow trace (Agent 3):** detailed in their summary, captured above
- **Competitive audit (Agent 4):** `COMPETITIVE-AUDIT.md` in the kit folder (23KB, includes 6 new competitor profiles + LSA/Nextdoor/email re-engagement strategy)
