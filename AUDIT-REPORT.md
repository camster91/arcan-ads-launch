# Arcan Ads Launch Kit — Audit Report

**Auditor:** Hermes subagent  
**Date:** 2026-06-01  
**Docs audited:** 19 docs in `/Users/biancabienaime/projects/arcan-ads-launch/`  
**Source repo verified:** `/Users/biancabienaime/repos/arcan-painting-src` (git status, key files)

---

## Summary

The kit has real structural problems that will confuse or block Gerardo at launch. Not a single critical logical error, but several categories of inconsistency: budget math doesn't add up, missing reference files are never created, some "done" items aren't actually in the source repo yet, and the daily operating rhythm contradicts between HANDOFF and LAUNCH-PLAYBOOK.

---

## CRITICAL: Budget Math Error

**Bug:** `$90/day × 30 days = $2,700` in README and CAMPAIGN-PLAN.md.  
**Reality:** `$90/day × 30 days = $2,700` is correct math, but CAMPAIGN-PLAN.md header says `$2,640 USD` while the table at line 368 says `$2,700`. These are contradictory within 60 seconds of each other in the same file.

- README line 22: `$2,700/month` ✅  
- CAMPAIGN-PLAN.md line 4: `$2,640 USD` ❌ (wrong)  
- CAMPAIGN-PLAN.md line 368 table: `$2,700` ✅  

**Impact:** Low — this is a rounding artifact, but it undermines confidence in the doc's accuracy right at the first number Gerardo sees.

---

## CRITICAL: 5 Required Files Never Shipped

Multiple docs instruct Gerardo to create files that are never included in the kit folder, never mentioned in any deliverable list, and never pre-populated:

| File | Referenced in |
|------|--------------|
| `COMPETITIVE-NOTES.md` | CLIENT-WALKTHROUGH.md:290, COMPETITIVE-MONITORING.md:32, HANDOFF.md:119 |
| `WEEKLY-NOTES.md` | LAUNCH-PLAYBOOK.md:99, HANDOFF.md:38, HANDOFF.md:145 |
| `A-B-TEST-RESULTS.md` | A-B-TESTING.md:82 |
| `COMPETITOR-PROFILES.md` | COMPETITIVE-MONITORING.md:104 |
| `COMPETITIVE-NOTES.md` (duplicate) | HANDOFF.md:119 |

**Impact:** High — Gerardo follows instructions literally. He will spend time looking for files that don't exist, or create blank ones and not know what to put in them. The docs reference these as ongoing logs but give no template or first-entry example.

---

## HIGH: Internal Contradiction — Daily Operating Rhythm

**LAUNCH-PLAYBOOK.md says:** "Twice-daily check (5 min each)" — morning and evening, every day.  
**HANDOFF.md says:** "5 min morning" + "5 min evening" (same), but then only "30 min Friday" for weekly review.

But the **weekly review cadence is inconsistent**:
- LAUNCH-PLAYBOOK: "Friday week 1 review (30 min)" — every Friday, explicit
- LAUNCH-PLAYBOOK: "Friday week 2 review (30 min)" — every Friday
- HANDOFF: "Weekly (Friday afternoon, 30 min)" — but also says "2x weekly check-ins for the first month" on line 13

"2x weekly check-ins" means two meetings per week, not one. But HANDOFF never specifies which days or what format. LAUNCH-PLAYBOOK implies every Friday is the weekly review. These are functionally the same thing described differently, but the "2x weekly" language in HANDOFF will make Gerardo think Cam needs to be on a call twice a week, which is not what the kit intends.

---

## HIGH: INFRASTRUCTURE-AUDIT.md Claims Done Items That Source Repo Disagrees With

INFRASTRUCTURE-AUDIT.md (lines 94-124) describes "The 30-minute fixes" as a to-do list that includes Fix 1 and Fix 2, implying they need to be built. But MISSING-FIXES.md says both Fix 1 and Fix 2 are **done** and merged.

More critically, INFRASTRUCTURE-AUDIT.md at lines 60-64 says:
> "Specifically: does `new_lead` trigger fire on Meta webhook leads? **Probably not** — my new webhook calls `notifyGerardo` and `auditLog` but doesn't trigger the workflow engine."

This is the audit's own conclusion. But MISSING-FIXES.md was written AFTER this audit and claims both fixes are wired. This is a sequencing problem: the INFRASTRUCTURE-AUDIT was written first as an exploratory document, and is now stale/contradictory with MISSING-FIXES.md which supersedes it.

**Impact:** High — someone reading INFRASTRUCTURE-AUDIT.md first (as the docs recommend: "read second") will think Fix 1 and Fix 2 are unbuilt, contradicting MISSING-FIXES.md and STATUS.md.

---

## HIGH: MISSING-FIXES.md Fix 1 Description is Outdated

MISSING-FIXES.md Fix 1 describes what to add to `src/app/api/lead-webhook/meta/route.js` (lines 14-24) — a code snippet for wiring the webhook to the email workflow engine. But the actual source file already contains this code (verified at lines 189-206 of the source route.js). The doc describes what to build; it should describe what was built and confirm it's done.

**Impact:** Medium — Cam knows the fix is done, but the doc reads like a spec, not a confirmation. If someone reads this after the fact, they might re-implement it or think it's still pending.

---

## MEDIUM: MISSING-FIXES.md Fix 4 — "Configure missing email workflows" is Vague

Fix 4 (lines 122-160) says to "audit current workflows" and add missing ones, but gives no guidance on what to do if they ARE already configured. It also says the scheduling problem (delay_hours > 0 not actually scheduling) is solved by "option 1: use the internal-tasks system" but gives no details on how to wire that up. This is a gap in the fix itself, not just the documentation.

**Impact:** Medium — Fix 4 is still marked "NOT YET DONE" in STATUS.md, so this is acknowledged as pending. But the fix instructions are insufficient for someone to actually complete it without more research.

---

## MEDIUM: LANDING-PAGE.md References `ContactSection.jsx` — Path May Be Wrong

LANDING-PAGE.md line 127 says to modify `ContactSection.jsx` to capture UTMs. The source repo at `/Users/biancabienaime/repos/arcan-painting-src/src/components/ContactSection.jsx` exists, but the doc's code snippet (`useEffect` + `setUtmData`) assumes a Zustand-style state pattern that may not match the actual component's state management. Also, LANDING-PAGE.md says UTM capture is "out of scope for this kit" — so this section is informational only, not an action item.

**Impact:** Low as action item (out of scope), but the in-doc code snippet is not verified against the actual component and could confuse a developer who mistakes it for required work.

---

## MEDIUM: HANDOFF.md Mentions `COMPETITIVE-NOTES.md` in Monthly Review Agenda (line 176) but Never Explains How to Maintain It

The monthly review agenda in HANDOFF (line 176) lists "New competitor activity (from `COMPETITIVE-NOTES.md`)" as an agenda item. But there's no guidance on what `COMPETITIVE-NOTES.md` should contain, no template, and no example entry. COMPETITIVE-MONITORING.md describes the format in abstract ("maintain this file as a running log") but never creates the file or gives a sample entry.

**Impact:** Medium — Gerardo will reach the monthly review, look at agenda item 3, and have either an empty file or not know where to find the data.

---

## MEDIUM: A-B-TESTING.md References `A-B-TEST-RESULTS.md` That Never Gets Created

A-B-TESTING.md line 81-82 says "Add to `A-B-TEST-RESULTS.md` (create if doesn't exist)" and specifies columns. But this file is never included in the kit, never pre-populated, and never mentioned in any delivery checklist. After 90 days of running tests, Gerardo has no file to put them in.

**Impact:** Medium — The test results practice breaks down at the first entry because there's no file and no template.

---

## LOW: Missing `EXISTING-INFRASTRUCTURE.md` — Referenced in INFRASTRUCTURE-AUDIT but Deleted

INFRASTRUCTURE-AUDIT.md line 188 says "Action items: 1. Delete or update `EXISTING-INFRASTRUCTURE.md` to point here." The INFRASTRUCTURE-AUDIT itself was supposed to replace `EXISTING-INFRASTRUCTURE.md`. But `EXISTING-INFRASTRUCTURE.md` is never mentioned in the kit's file listing in README.md, and doesn't exist. This item in the action checklist is irrelevant — the referenced file is already gone.

**Impact:** Low — minor cleanup item, but the action item itself is confusing since the file doesn't exist.

---

## LOW: STATUS.md — "Files NOT touched" Section Lists Routes That Actually ARE Modified

STATUS.md lines 54-60 say these files were "intentionally not touched":
- `src/app/api/email-workflows/route.js`
- `src/app/api/agents/lead-qualifier/route.js`

But the actual `src/app/api/lead-webhook/meta/route.js` imports and calls `triggerWorkflow` from `email-workflows/route.js` and POSTs to `agents/lead-qualifier`. This is accurate in that those files weren't directly modified (no edits to their code), but the doc's phrasing "NOT touched — Reused as-is" implies they weren't involved in the integration, which is misleading.

**Impact:** Low — the distinction between "not modified" and "not involved" is technically correct but unclear. Could confuse Cam or Gerardo reviewing the status map.

---

## LOW: README.md Quick Start Commands Reference Non-Existent Paths

README.md line 140-142:
```bash
node --check ~/repos/arcan-painting-src/src/app/api/contact/route.js
node --check ~/repos/arcan-painting-src/src/app/api/lead-webhook/meta/route.js
node --check ~/repos/arcan-painting-src/src/app/api/utils/meta-capi.js
```

These files exist at `/Users/biancabienaime/repos/arcan-painting-src/...` (verified). But the `~` path expansion is not guaranteed — it depends on the home directory being `/Users/biancabienaime`. If this kit is ever moved to a different machine or user, these commands fail silently or find wrong files.

**Impact:** Low — these are backup verification commands, not critical path. But the path dependency is a fragility.

---

## LOW: `meta-lead-webhook/route.js` in Kit Root vs Source Repo — Duplicate Entry Point

README.md lines 61-62 lists `meta-lead-webhook/route.js` as a deliverable. This file exists in the kit at `/Users/biancabienaime/projects/arcan-ads-launch/meta-lead-webhook/route.js`. It's identical to `src-changes/api/lead-webhook/meta/route.js` (both are the same file, one is in `src-changes/` mirroring the source repo structure, one is a standalone drop-in for new installs).

The README doesn't explain why there are two copies or which to use. A developer picking up the kit might edit one and not realize the other is deployed.

**Impact:** Low — the source repo is the deployed version. The kit copies are references. But the dual copies create ambiguity.

---

## LOW: Campaign 4 and 5 "Launch Blocker" Status is Inconsistent

CLIENT-WALKTHROUGH.md Day 4 Step 3 says "For now, the 400px thumbs in `ads-assets/` will work for the first 2 weeks, then Cam will upsize." But LAUNCH-PLAYBOOK.md Day 4 says to upscale the images and re-upload them to Meta — implying they need to be upscaled before launch, not after 2 weeks.

The image resolution gap is acknowledged as the "launch blocker" in README.md line 125 and AD-CREATIVE.md line 43-44. But the instructions for when to handle it are inconsistent: CLIENT-WALKTHROUGH says use thumbs for 2 weeks; LAUNCH-PLAYBOOK says Day 4 (pre-launch).

**Impact:** Medium — if Gerardo follows CLIENT-WALKTHROUGH literally, he launches with 400px images and Meta rejects or down-rates them.

---

## INFO: Source Repo Verification Results

Verified against `/Users/biancabienaime/repos/arcan-painting-src` (git status):

✅ `src/app/api/lead-webhook/meta/route.js` — exists, correctly imports `triggerWorkflow`, `sendLeadEvent`, and POSTs to `lead-qualifier`  
✅ `src/app/api/utils/meta-capi.js` — exists  
✅ `src/app/api/contact/route.js` — patched with CAPI call  
✅ `src/app/admin/marketing/ads-launch/page.jsx` — exists (untracked in git)  
✅ `src/app/admin/layout.jsx` — modified (shows in git diff), includes "Ads Launch" nav tab at line 286  
✅ `src/app/admin/leads/page.jsx` — modified (shows in git diff)  
✅ `src/components/LeadCard.jsx` — modified (shows in git diff), source badge wired  
✅ `src/app/api/leads/route.js` — accepts `leadSource` from body (confirmed at line)  
✅ `/admin/marketing/ads-launch` route exists in source repo  

**None of the "done" claims in STATUS.md appear to be false.** The fixes that are marked DONE (Fix 1 and Fix 2) are actually implemented in the source repo.

---

## Files Created / Modified During Audit

None — this audit was read-only. No files were created or modified.

---

## Issue Count by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 2 |
| HIGH | 3 |
| MEDIUM | 5 |
| LOW | 5 |
| **Total** | **15** |

---

## Top 5 Action Items

1. **Fix the budget math:** CAMPAIGN-PLAN.md line 4 says `$2,640 USD` — change to `$2,700` to match the table and README.
2. **Create the 5 missing reference files:** `COMPETITIVE-NOTES.md`, `WEEKLY-NOTES.md`, `A-B-TEST-RESULTS.md`, `COMPETITOR-PROFILES.md` — either pre-populate with a template/first-entry or remove the references from the docs.
3. **Resolve INFRASTRUCTURE-AUDIT.md vs MISSING-FIXES.md contradiction:** INFRASTRUCTURE-AUDIT was written first as exploratory; it's now stale. Either delete the "30-minute fixes" section (lines 94-124) or mark it as superseded by MISSING-FIXES.md.
4. **Clarify the daily operating rhythm:** HANDOFF says "2x weekly check-ins" (line 13). LAUNCH-PLAYBOOK says "Friday weekly review." Reconcile to one consistent description. If it's weekly (not twice-weekly), remove "2x."
5. **Fix MISSING-FIXES.md Fix 1 description:** Currently reads as a spec ("what to add"). Should read as a confirmation ("what was built, verified at source route.js lines 189-206").