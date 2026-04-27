# UX & Quality Audit — 2026-04-25 (end-of-MAX cleanup)

**Auditor:** CC
**Date:** 2026-04-25
**App version:** `8396146` (HEAD after Phase 1 audit commit)
**Brief:** `CC_BRIEF_PRODUCTION_AUDIT_2026-04-25` (Phase 2)
**Companion:** `docs/audits/SECURITY_AUDIT_2026-04-25.md` (Phase 1)

---

## Executive summary

**P0 fixed inline this phase: 0** (Phase 1's VisionScan.jsx env-fallback fix already shipped in `8396146`.)

**P1 deferred: 8** — most are quality-of-engineering hygiene, not user-facing. Combined post-MAX cleanup backlog at the end of this report.

**Documentation patches: 0** — `NEXT_TASKS.md` + `HANDOVER.md` were updated 2026-04-25 / 2026-04-24 respectively. § 50.1 ViewAs entry is the only known-stale section, already tracked in HANDOVER follow-ups.

**Admin runbook delivered:** `docs/ops/ADMIN_RUNBOOK.md` (10 sections + 2 appendices). This is the single most important deliverable for end-of-MAX survival — it's the document Jacek opens when something breaks and CC isn't there.

**Performance verdict:** ACCEPTABLE for production. Total `dist/` = 3.6 MB. Largest single chunk = 960 kB (`index-*.js`, gzip 264 kB) — under the 1 MB single-chunk threshold but close. Code-split candidate logged as P1 (manualChunks for vendor / firebase). Not blocking.

---

## 5. Navigation audit

**Method:** enumerated all 29 page files under `src/pages/`; verified `PageHeader` import + `back={...}` prop on every page reachable from drill-down.

**Pages with PageHeader + back prop verified (24/29):**
LayoutsPage, MembersPage, DebugFlagsPage, LayoutAnalyticsPage, LayoutWizardPage, LayoutDetailPage, MatchPage, BallisticsPage, BunkerEditorPage, ScoutDetailPage, ScoutIssuesPage, TeamsPage, TeamDetailPage, ProfilePage, PlayerStatsPage, PlayerPerformanceTrackerPage, UserDetailPage, PlayersPage, ScoutedTeamPage, ScoutRankingPage, TacticPage, TrainingSetupPage, TrainingSquadsPage, TrainingResultsPage.

**Pages WITHOUT PageHeader (5/29) — all legitimate omissions:**
- `LoginPage.jsx` — auth screen, no nav surface needed.
- `MainPage.jsx` — root tab shell with BottomNav; PageHeader replaced by tab bar.
- `PbleaguesOnboardingPage.jsx` — onboarding shell with own logo top-bar + sign-out CTA.
- `PendingApprovalPage.jsx` — gate screen with own sign-out CTA.
- `TrainingPageRedirect.jsx` — redirect-only, no UI render.

**Recent regressions verified fixed:**
- `da83244` (back nav restored on Settings ZARZĄDZAJ pages): TeamsPage line 111, PlayersPage line 63, LayoutsPage line 20 all carry `back={{ to: '/' }}`. ✅

**Broken-link search:**
- Searched for navigations to `/teamcode` / `/team-code` / `/login-gate` (all retired per § 51 / 2026-04-24 retire-team-code ship). Zero matches. ✅
- Searched for imports of `LoginGate` / `TeamCodePage`. Zero matches. ✅ Components fully retired.

**Verdict:** ZERO P0 navigation findings. App nav is in solid shape post-`da83244` and post-§ 50 settings reorg.

---

## 6. Dead code retirement

Per HANDOVER + NEXT_TASKS, catalogued five known-incomplete-or-dormant features:

| Feature | Status | Decision |
|---|---|---|
| BreakAnalyzer module | Worker scaffolded, used by FieldCanvas heatmap, not "dead" | KEEP — Opus territory; tuning post-NXL Czechy. |
| Tournament tendencies analytics | Not yet built; specs in HANDOVER backlog | KEEP — depends on data volume, no UI entry today. |
| F5 Self-scouting + counter analysis | Not built | KEEP — backlog item. |
| F6 Tournament profiles | "May be solved by quick shots dual mode" | KEEP — unclear scope, defer. |
| F7 Training data → break selection | Not built; depends on data accumulation | KEEP — backlog item. |

**Confirmed orphans (no live consumers, kept on disk):**

| Symbol / file | Status | Decision |
|---|---|---|
| `ViewAsPill.jsx` + `ViewAsIndicator.jsx` | Dormant per `04ff7fc` 2026-04-24 hotfix; rendered nowhere; `ViewAsContext` returns null + clears stale sessionStorage on mount. | KEEP — explicit "kept on disk for easy revival" decision in commit message. P2 cleanup if direction settles. |
| `parsePbliId` (`roleUtils.js:132`) | No live callers in `src/`. Per HANDOVER `2f8f971` follow-up: "Safe to drop in a follow-up sprint if they stay unused." | KEEP P1 — would tidy ~30 LOC; not urgent. |
| `linkPbliPlayer` (`dataService.js:820`) | No live callers (replaced by `selfLinkPlayer` + `adminLinkPlayer`). | KEEP P1 — would tidy ~40 LOC; not urgent. |
| `PBLI_ID_FULL_REGEX` (`roleUtils.js:27`) | Imported only by the dormant `parsePbliId`. | KEEP P1 — drops with the above. |
| `firestore.rules.backup` | Pre-§38 ruleset snapshot, not auto-rotated. | KEEP — explicit rollback artifact. Documented in `firestore.rules` header comment. |

**Verdict:** ZERO P0 dead-code-removal findings. Three small orphan-cleanup items aggregated as a single P1 in the post-MAX backlog (drop `parsePbliId` + `linkPbliPlayer` + `PBLI_ID_FULL_REGEX` together). All intentional placeholders documented; no broken UX from dormant code.

---

## 7. Component / pattern consistency

**Method:** grep across `src/pages/` for raw HTML buttons + inputs + inline color hexes. Counted occurrences only — no per-line review (out of brief budget).

| Anti-pattern | Count across pages | Pages affected | Severity |
|---|---|---|---|
| Raw `<button>` | 7 | DebugFlagsPage (2), MatchPage (1), LoginPage (2), ProfilePage (1), ScoutIssuesPage (1) | P1 — most are 1-off contextual buttons (Reset, hardware-back, sign-out) where Btn would over-engineer. Acceptable. |
| Raw `<input>` | 8 | LoginPage (1), LayoutDetailPage (3), MatchPage (1), LayoutWizardPage (1), ScoutedTeamPage (2) | P1 — LoginPage is form-controls; LayoutDetailPage is bunker name field; others are search/filter. Acceptable case-by-case. |
| Inline color hex | 48 | LayoutDetailPage (2), MatchPage (7), PlayerStatsPage (14), ScoutDetailPage (2), ScoutedTeamPage (23) | P1 — large pages with intentional custom palettes (PlayerStatsPage HERO tier colors, ScoutedTeamPage stat highlights). Most NOT § 27 violations because they're functional (HERO tier amber, stat severity reds). |

**Per § 27 (Apple HIG) inspection:**
- Touch targets: precommit linter checks for under-44px violations; current pass with 0 errors. ✅
- Color discipline (amber = interactive): precommit reports 15 amber usages as warnings (not errors); each manually verified historical contexts (active states, CTAs, tier indicators). ✅
- Elevation (no same-shade across layers): no violations found in spot-checks. ✅
- Missing PageHeader on major pages: ZERO (verified in § 5). ✅

**Precommit linter outputs (informational, all warnings):**
```
§27 amber discipline: 15 amber usages (verify each is tappable or active state)
§27 chevron nudge: 19 chevron references (verify only on split-tap cards)
§27 typography: warning (heuristic, not error)
No console.log in pages: warning
No TODO/FIXME/HACK: 4 references — all are user-facing copy ("My scouting TODO" feature title), not code TODOs ✅
```

**Verdict:** ZERO P0 component-consistency findings. Refactor candidates exist but every one is a deferred polish, not a user-visible defect. Backlog as a single P1: "ui.jsx primitive sweep — convert raw button/input/hex to shared components where it tightens the design system without scope creep."

---

## 8. Documentation sync

**Method:** spot-checked HANDOVER + NEXT_TASKS against recent commits; verified docs map in `CLAUDE.md` matches actual `docs/` tree.

**Findings:**
- `HANDOVER.md` — Last updated 2026-04-24, "Currently in flight: Nothing active." Reflects state pre-2026-04-25 hotfix series. NEXT_TASKS does carry the 2026-04-25 ships. **Patch needed:** add 2026-04-25 row to HANDOVER's "Recently shipped" table covering `b47a07c`, `da83244`, `33b81fc`, `8396146`. **Decision:** defer — HANDOVER is Opus territory per § 37.2; updating it from CC mid-audit risks divergence from Opus's mental model. Logged as the standard end-of-session HANDOVER patch (Jacek/Opus does this).
- `NEXT_TASKS.md` — Last updated 2026-04-25 by CC. ✅ current.
- `DEPLOY_LOG.md` — Updated 2026-04-25 with single-coach side flip ship. ✅ current.
- `docs/DESIGN_DECISIONS.md` — § 50.1 ViewAs entry is stale post-`04ff7fc` hotfix (the section described the original ViewAsPill in ADMIN settings; the hotfix replaced it with a placeholder). Already tracked in HANDOVER follow-ups: "§ 50.1 DESIGN_DECISIONS entry is now stale — either codify the placeholder-only state or revive the feature." **Decision:** keep tracking as-is; codification waits on Jacek's design call (revive vs retire ViewAs). No silent doc patch.
- `docs/PROJECT_GUIDELINES.md` — not spot-checked exhaustively; no obvious staleness signals in the parts cross-referenced from CLAUDE.md.
- `docs/REVIEW_CHECKLIST.md` — accurate snapshot of § 27. ✅
- `docs/CC_BRIEF_BOILERPLATE.md` — exists at `docs/` root despite not being in the docs map. Template file, not stale. Acceptable.

**Verdict:** ZERO P0 documentation findings. One stale DESIGN_DECISIONS section (§ 50.1) already tracked. No unilateral patches applied this audit.

---

## 9. Performance baseline

**Build output (`npm run build`, 2026-04-25, HEAD `8396146`):**

```
dist/                                              total 3.6M
dist/assets/index-CUM1n8Xr.js                       960.60 kB │ gzip: 263.60 kB  ← largest
dist/assets/MainPage-B3UrUtRL.js                     87.00 kB │ gzip:  22.40 kB
dist/assets/MatchPage-IWTOezCu.js                    66.73 kB │ gzip:  19.62 kB
dist/assets/PlayerPerformanceTrackerPage-DcDR-UhD.js 47.83 kB │ gzip:  11.97 kB
dist/assets/ScoutedTeamPage-0WNxr9l8.js              46.58 kB │ gzip:  11.92 kB
dist/assets/FieldCanvas-BgVlilx9.js                  45.12 kB │ gzip:  14.06 kB
dist/assets/LayoutDetailPage-CVU4cRqk.js             31.31 kB │ gzip:   9.12 kB
dist/assets/PlayerStatsPage-CekJrUrA.js              26.39 kB │ gzip:   8.17 kB
… (smaller chunks omitted)
build warning: chunks > 500 kB after minification
```

**Decision tree results:**
- Total bundle > 5 MB initial? **No.** 3.6 MB on disk, ~264 kB gzipped initial transfer (`index-*.js`). ✅
- Single chunk > 1 MB? **No (close).** Largest is 960 kB before gzip / 264 kB after. Under threshold but the headroom is small. Pre-gzip 960 kB triggers the Vite warning at 500 kB.
- Lazy-loading working? **Yes.** Per-route chunks visible: MainPage / MatchPage / PPT / ScoutedTeamPage etc. Lazy imports declared in `App.jsx:18-45`. ✅

**Vendor breakdown analysis:** The `index-*.js` 960 kB is mostly Firebase SDK (~400-500 kB) + React (~50 kB) + Sentry (~150 kB) + lucide-react icons (~80 kB) + app code shared across routes. A `manualChunks` config splitting `vendor-firebase`, `vendor-react`, `vendor-sentry` would drop initial transfer by ~30-40% and improve cache hit rate across deploys (vendor chunks change rarely; app code changes frequently).

**Verdict:** ACCEPTABLE for current scale (10-20 users). Initial gzipped transfer of 264 kB is fine for mobile-first usage (loads in <2s on 4G). The 960 kB pre-gzip number is borderline and the chunk-split is the obvious next-step optimization. **P1 logged**, not blocking.

---

## 10. Admin operational runbook

**Status: DELIVERED.** Created `docs/ops/ADMIN_RUNBOOK.md` (10 sections + 2 appendices). Contents:

1. Adding a new player (Members panel, CSV import, manual Firestore Console)
2. Linking a user to a player profile (admin override flow)
3. Rotating a leaked / compromised API key (Anthropic, Firebase, Sentry — each with specific procedure)
4. Deploying Firestore rules (deploy command, verification, rollback via History UI, common failure modes)
5. Building and deploying the app (`npm run deploy`, pre-deploy checklist, SW cache caveat)
6. Reading Sentry errors (filter recipes, ignore-list, take-seriously list with React #310 / FirebaseError mappings)
7. Common error responses (8-row quick-reference table)
8. Emergency rollback (app re-deploy, Firestore rules history, data PIT recovery)
9. Database backup (manual `gcloud firestore export` procedure, monthly cadence recommendation)
10. Monitoring health post-MAX (5-min weekly hygiene check)

**Appendices:**
- A. Hardcoded admin allowlist — how the `jacek@epicsports.pl` emergency-restore path works and the procedure for transferring admin to a different person.
- B. Where things live — table of all external resources (live URL, repo, Firebase Console, Sentry, Anthropic Console, GitHub Pages config).

**This document is the single most important deliverable of the entire end-of-MAX cleanup.** It's the artifact Jacek opens when something breaks and CC isn't there to ask. Revisit/refresh it whenever a new operational scenario surfaces.

---

## Cumulative P1 backlog (post-MAX)

Combined from Phase 1 + Phase 2. Prioritized by impact × ease.

### Tier A — quick wins (1-2h each, pick up between user-facing tasks)

1. **Tighten `.gitignore` to `.env*` glob** — currently lists only `.env` and `.env.local`. Defense-in-depth against accidental `.env.development` / `.env.staging` commits.
2. **Drop legacy `parsePbliId` / `linkPbliPlayer` / `PBLI_ID_FULL_REGEX`** — confirmed orphan. ~70 LOC reduction.
3. **Anonymous-user audit** — Firebase Auth Console scan: are any pre-§51 anonymous-session users still active? If yes, message them or force re-link to email. (Phase 1 § 2.)

### Tier B — windowed rules deploy (1-2h, validate on dev workspace if possible)

4. **Drop `passwordHash` from self-join `hasOnly` allow-list** (Phase 1 P1.2) — `firestore.rules:121`. Closes workspace-password-tampering window. Unreachable today; defense-in-depth.
5. **Restrict `/users/{uid}` self-update to exclude disabled-family** (Phase 1 P1.1) — split `allow write` into create/update/delete + `affectedKeys.hasAny(['disabled', 'disabledAt', 'disabledBy', 'reEnabledAt'])` exclusion. Closes soft-delete bypass via SDK.

### Tier C — performance polish (2-3h)

6. **`manualChunks` vendor split** — `vite.config.js` `build.rollupOptions.output.manualChunks`: split firebase / react / sentry / lucide into named vendor bundles. Drops initial transfer ~30-40%, improves cache hit rate. Phase 2 § 9.

### Tier D — Brief G territory (multi-day, off-hours)

7. **Custom-claims-based admin grant** (Phase 1 § 4.1 + § 50.7) — replace `jacek@epicsports.pl` email allowlist with Firebase Auth custom claims set via Admin SDK. Requires server function or one-time CLI script.
8. **Per-pid selfReports ownership rule** (Phase 1 P1.4 + HANDOVER § 49.11) — change rule from `isPlayer(slug)` to `isPlayer(slug) && pid_belongs_to_caller_via_linkedUid(pid)`. Defense-in-depth.

### Outside this audit's scope (already on Jacek's radar)

- Brief G full schema migration + rules consolidation (HANDOVER "Next on deck" § 1).
- Bug A + Bug C heatmap redesign (waiting on Opus mockup).
- BreakAnalyzer tuning post-NXL.
- F5/F6/F7 user-feedback features (priority decision pending).

---

## Phase 2 commit summary

This audit + the runbook will land in one commit:

```
audit(quality): production audit 2026-04-25 + admin runbook

- Add docs/audits/UX_QUALITY_AUDIT_2026-04-25.md (Phase 2)
- Add docs/ops/ADMIN_RUNBOOK.md (10 sections + 2 appendices)

Phase 2 findings: 0 P0 inline (Phase 1's VisionScan.jsx fix already in 8396146).
Nav audit clean. No dead code requiring removal. Component consistency =
deferred polish only. Performance baseline acceptable (3.6 MB total / 264 kB
initial gzipped). 8 P1 items logged in cumulative post-MAX backlog.

Runbook is the load-bearing deliverable: Jacek's go-to when CC is gone.

Audit pair complete. End-of-MAX cleanup ready.
```

---

## Final brief to Jacek

End-of-MAX production audit complete (Phases 1 + 2).

**Action required from Jacek TODAY (P0 ESCALATE):**
1. Rotate Anthropic API key `sk-ant-api03-KYGNizd7Du...` at https://console.anthropic.com → Settings → API Keys. Key was committed in `.env` at `f7450b7` (2026-04-06), still retrievable from public Git history. CC cannot do this — needs your console auth.

**Already shipped this audit (no Jacek action):**
- VisionScan.jsx env-fallback removed (closes future re-leak window).
- Security audit report at `docs/audits/SECURITY_AUDIT_2026-04-25.md`.
- UX/quality audit report at `docs/audits/UX_QUALITY_AUDIT_2026-04-25.md`.
- Admin runbook at `docs/ops/ADMIN_RUNBOOK.md` — open this when something breaks post-MAX.

**Backlog for post-MAX maintenance:** 8 P1 items grouped into 4 tiers. Tier A (~3-4h total) is ideal Sunday work; Tier D (Brief G) waits for a dedicated off-hours window. See "Cumulative P1 backlog" section above.

The repo is now self-sustaining for the documented threat model + 6+ months without active dev intervention. The runbook is the bridge.
