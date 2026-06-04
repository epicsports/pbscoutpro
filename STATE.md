# STATE — authoritative open-items index

> **Source of truth for what's OPEN.** Repo-verified (2026-06-04 reconciliation), not memory.
> Stop re-deriving open work from chat/memory — it mis-flags shipped items as pending.
> One line per item: status + ref. Detail lives in `NEXT_TASKS.md` (sub-boards) + `DEPLOY_LOG.md` (ships) +
> `docs/DESIGN_DECISIONS.md` (§ rationale). Keep this terse; update on every doc-closeout.

**Last reconciled:** 2026-06-04 · main HEAD `71e67b37` (+ unmerged hotfix below).

---

## 🔴 In-flight (branch exists / partially shipped)
- _(none)_

_(✅ recently cleared: `fix/scouttab-hooks-310` React #310 cold-launch crash `93ece048`; read-volume B server-side self-log filter `cebcbdf3` — both 2026-06-04.)_

## 🔴 Open (actionable, needs brief/GO)
- **Read-volume A2c** — rollup-docs structural lever (extend `recomputeMatchAggregates`); + opt. IndexedDB result-cache. Own brief.
- **§90 A1** — catalog isolation **cutover**. **Stage 1.1 SHIPPED** (`7fa7e780` — `workspaceSlug` denormalized + backfilled). **Stage 1.2/1.3 (scoped collectionGroup rules) FOLDED into read-volume C** (crowdsource stays cross-tenant via a precomputed aggregate = the rollup; build aggregate → migrate consumers → scope raw; GATE: before FIT multi-tenant selfLog go-live). **Stage 2A (clear live twin-deps) ✅ SHIPPED** (`ec5a008c`): repair tool → global `/teams`; `breakoutVariants` relocated off the twin (`/workspaces/{slug}/breakoutVariants/{teamId}/variants` + scoped rule). Twins now fully read-free. **🔴 Stage 2B + Stage 3 (DESTRUCTIVE) — SCHEDULED: production-push window MONDAY 8 JUNE 2026 (Jacek-set 2026-06-04).** In that session: drop `mirrorTwin` → `--dry` re-enumerate + JSON backup → `--live` delete ~2,634 player + ~299 team twin docs (CONFIRM) → remove twin rule blocks `:310`/`:420` (CONFIRM) → Stage 3 `/layouts` straggler `--dry`+backup+delete (CONFIRM). All gated on Jacek's live in-session CONFIRM. Runway ready (2A decoupled the twins). **(2 workspaces: pbfit + ranger1996.)**
- **Sparing (B1) / Events unification (B2) / Player claim flow (B3)** — B3 has an [ESCALATE] write-model fork; B1/B2 await Jacek decisions.
- **Bugs:** B4 (home/landing, awaiting mockup) · B9 (training squad-matchup roster backfill, awaiting-decision) · B23 (F5/F6/F7, needs-validation) · B24 (player-name mojibake) · B26 (repair button — fix shipped `8076f3a6`, smoke owed).
- **GDPR** data-subject-rights — BLOCKED-ON-LEGAL (Q1–Q2; do (c) privacy/consent first). `docs/architecture/GDPR_DATA_MAP.md`.
- **Ghost cleanup** — admin-SDK `--live` strip of accounts wrongly auto-joined to `ranger1996` (awaiting GO; future ghosts already prevented by `5f69dc04`).
- **collectionGroup `selfReports` membership-scoping** (§94 #3) — cross-tenant self-log read leak; needs discovery; trigger = before selfReports multi-tenant go-live.
- **Spark headroom ladder #2/#3/#4** — league-scoped catalog load · match-listener scoping · version-read caching (trigger ~N=40–50). `docs/architecture/COST_PROJECTION_SPARK.md`.
- **Point-as-Timeline Stages 3–8** — 3 multi-scout reconcile (must cover `timeline[]`) · 4 typed move-seq · 5 time axis · 6 full scrubber (6-lite shipped) · 7 self-log/kiosk+events · 8 analytics. `docs/POINT_AS_TIMELINE.md`.
- **§64 Canvas Step 5** — AnalyticsCanvas extraction; + [FUTURE] Tactic→DrawingOverlay.
- **§98 follow-ups** — tactics two-store consolidation · drop legacy `dangerZone/sajgonZone/bigMoveZone` dual-write + base `discoLine/zeekerLine` · drop legacy workspace `/layouts` collection (§96) — all "once prod-confirmed".
- **Account mgmt** — (B) real deletion + (C) guarded admin-SDK `deleteUser` script [ESCALATE: run C now vs GDPR build].
- **Tier D security** — custom claims · per-pid selfReports ownership · `/users` global read · adminUid create-time validation (post-MAX defer).
- **Misc:** More e2e UATs (#4/#5/#6) · Loupe pan-lag perf · PPT picker→`useEvents` (decision owed) · D1 BreakAnalyzer module (spec-only) · D3 schedule-import Pass 0 robustness · C3 TacticPage stage-adoption (scoped-out of §103).

## ⏸ Blocked / awaiting Jacek decision
- **LayoutDetailPage UX pass** (design discussion) · **Switcher UI brief** · **B17** `type:'practice'` keep-or-drop · **`ARCHITECTURE_C4_v2` + §38** (needs desktop+connector).

## ❓ NOT FOUND in repo — confirm or drop (memory artifacts)
- **Color configurator (B4-arch / `useColorPreferences`)** — no such code/task in repo. Confirm it's a real want or drop.
- **"State-doc audit"** — superseded by THIS `STATE.md`. Confirm that was the intent.

## ✅ Recently shipped
See `DEPLOY_LOG.md` (newest first). 2026-06-03/04 block: search/filter A–D (§104) · global-first CRUD (§105) · admin-parity 1–3 (§106) · team branding Phase 1–2 (§107) · SW precache trim · read-volume A · productization doc (DEFERRED) · §94 FIT magic-link access (verified, `afc37f17`) · adminUid repoint (B22) · §98 layout-config build.
