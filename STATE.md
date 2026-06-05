# STATE — authoritative open-items index

> **Source of truth for what's OPEN.** Repo-verified (2026-06-04 reconciliation), not memory.
> Stop re-deriving open work from chat/memory — it mis-flags shipped items as pending.
> One line per item: status + ref. Detail lives in `NEXT_TASKS.md` (sub-boards) + `DEPLOY_LOG.md` (ships) +
> `docs/DESIGN_DECISIONS.md` (§ rationale). Keep this terse; update on every doc-closeout.

**Last reconciled:** 2026-06-05 · main HEAD `5c578ba6` (layout bunker-naming re-key shipped; B4 + Read-volume C Stage 2 earlier same day).

---

## 🔴 In-flight (branch exists / partially shipped)
- _(none)_

_(✅ recently cleared: `fix/scouttab-hooks-310` React #310 cold-launch crash `93ece048`; read-volume B server-side self-log filter `cebcbdf3` — both 2026-06-04.)_

## 🔴 Open (actionable, needs brief/GO)
- **Read-volume C (rollup lever):** **Stage 1 COMPLETE** (1.1 rollup `21019436` · 1.4 hybrid-read `bec3a038` · 1.2 layout-aggregate `5b9ee781`). **Stage 2 COMPLETE & DEPLOYED** (`73aba833`, 2026-06-05 — rules ruleset `d5242ec7`): raw `selfReports`/`shots` CGs scoped → `isMember(resource.data.workspaceSlug)` + shots `playerLinkedUid` self-carve-out; query filters make each predicate query-provable; `/layoutAggregates` write rule live (authed shared-write, 2.4). Emulator isolation matrix green (8 cells); full e2e 20/20. **GATE met (before FIT selfLog go-live).** Closes §90 1.2/1.3 + §94 #3 (selfReports CG leak). **NEXT (optional): Stage 3** IndexedDB cache. **Edge note:** rollup = match-end snapshot; post-merge point edits aren't reflected until re-merge (low-risk; flag if post-end editing becomes a workflow). **Owed: Jacek smoke** (when selfLog enabled — shot-freq/breakout-history parity + cross-tenant denial).
- **§90 A1** — catalog isolation **cutover**. **Stage 1.1 SHIPPED** (`7fa7e780` — `workspaceSlug` denormalized + backfilled). **Stage 1.2/1.3 (scoped collectionGroup rules) FOLDED into read-volume C — ✅ DONE** (Stage 2 `73aba833`, 2026-06-05: crowdsource served by `/layoutAggregates`; raw `selfReports`/`shots` CGs now `isMember(workspaceSlug)`-scoped + shots player carve-out). **Stage 2A (clear live twin-deps) ✅ SHIPPED** (`ec5a008c`): repair tool → global `/teams`; `breakoutVariants` relocated off the twin (`/workspaces/{slug}/breakoutVariants/{teamId}/variants` + scoped rule). Twins now fully read-free. **🔴 Stage 2B + Stage 3 (DESTRUCTIVE) — SCHEDULED: production-push window MONDAY 8 JUNE 2026 (Jacek-set 2026-06-04).** In that session: drop `mirrorTwin` → `--dry` re-enumerate + JSON backup → `--live` delete ~2,634 player + ~299 team twin docs (CONFIRM) → remove twin rule blocks `:310`/`:420` (CONFIRM) → Stage 3 `/layouts` straggler `--dry`+backup+delete (CONFIRM). All gated on Jacek's live in-session CONFIRM. Runway ready (2A decoupled the twins). **(2 workspaces: pbfit + ranger1996.)**
- **Sparing (B1) / Events unification (B2) / Player claim flow (B3)** — B3 has an [ESCALATE] write-model fork; B1/B2 await Jacek decisions.
- **Bugs:** ~~B4 (home/landing)~~ ✅ **partial-fix shipped 2026-06-05 (`0c4852a2`)** — Settings is never a cold-open landing (scoped, role-independent); **DEFERRED remainder** = role-aware dashboard / "get started" home + `NoTournamentEmptyState` copy/CTA tuning (FIT-cold-start UX, revisit with real usage + clearer role). · B9 (training squad-matchup roster backfill, awaiting-decision) · B23 (F5/F6/F7, needs-validation) · B24 (player-name mojibake) · B26 (repair button — fix shipped `8076f3a6`, smoke owed).
- **GDPR** data-subject-rights — BLOCKED-ON-LEGAL (Q1–Q2; do (c) privacy/consent first). `docs/architecture/GDPR_DATA_MAP.md`.
- **Ghost cleanup** — admin-SDK `--live` strip of accounts wrongly auto-joined to `ranger1996` (awaiting GO; future ghosts already prevented by `5f69dc04`).
- ~~**collectionGroup `selfReports` membership-scoping** (§94 #3)~~ — ✅ DONE (Read-volume C Stage 2, `73aba833` 2026-06-05): CG read scoped to `isMember(workspaceSlug)`; cross-tenant leak closed (emulator-proven).
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
- **2026-06-05:** layout bunker-naming re-key (`5c578ba6` — display-names keyed by `masterId||id`, fixes two-same-named-obstacles-rename-collision on "NXL EUROPE #2 - UK" Dykta; lazy overlay migration, no global write) · B4 Settings-never-landing (`0c4852a2`) · Read-volume C Stage 2 tenant-isolation CG scoping (`73aba833`, rules `d5242ec7`). **Owed Jacek (manual):** base-rename UK layout `XtQQKhVIegdTylygsbVX` bunker [0] "Dykta"→"Palma" (safe anytime; recoverable via overlay legacy `bunkerNames["b_…ix3m"]="Palma"`) + naming smoke.

See `DEPLOY_LOG.md` (newest first). 2026-06-03/04 block: search/filter A–D (§104) · global-first CRUD (§105) · admin-parity 1–3 (§106) · team branding Phase 1–2 (§107) · SW precache trim · read-volume A · productization doc (DEFERRED) · §94 FIT magic-link access (verified, `afc37f17`) · adminUid repoint (B22) · §98 layout-config build.
