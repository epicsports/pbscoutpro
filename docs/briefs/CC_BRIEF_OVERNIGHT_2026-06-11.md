# CC BRIEF — OVERNIGHT RUN (2026-06-11→12): everything that needs no Jacek action

> Saved to repo per the §F4 process decision (repo = source of truth for in-flight orders). Faithful copy of Jacek's pasted brief + addendum. Execution status tracked in `NEXT_TASKS.md` → "Overnight 2026-06-11→12" and the morning READY report.

**Role:** CC. Authorization per §7.6 throughout: doc-only + logic-only-zero-UI + read-only ⇒ autonomous (post-factum notes); ALL UI work ⇒ BUILD on branches overnight, MERGE only after Jacek's morning smoke + GO. One consolidated READY report in the morning with a single smoke checklist. Jacek may send the 4.1 GO tonight — handle per §A whenever it arrives.

## A — Rollout continuation (gated trigger, autonomous execution)
ON Jacek's 4.1 GO (tonight or morning): archetype locked → execute 4.2 (ScoutedTeamPage) + 4.3 (MatchPage review) per CC_BRIEF_DAY2_PART2 — same pattern, by-reference, fail-first e2e each, NO further design gates, NOTHING merged. If GO doesn't arrive, skip; do not nag.

## B — Rail/panel tab rework (UI build — include in morning smoke)
Replace the expanded-rail/overlay tab row with the icon-segment pattern (Jacek 2026-06-11):
- Inactive tabs: ICON ONLY (same Lucide icons as the 56px strip — one icon language), ≥44px.
- Active tab: icon + full label (always labeled; width animates, transform/opacity-friendly).
- Applies wherever CanvasRailLayout renders tabs (full rail + overlay panel). Plus prior flagged fixes: compact list rows (min-44, no dead vertical space), section paddings per mockup-1.
- e2e: active tab shows label, inactive show icons, switching moves the label; targets ≥44.

## C — Hitability: delete targets + positions (UI build — morning smoke)
Config mode gains delete for positions and targets (today only connections are deletable):
- Affordance consistent with existing connection-delete (× / long-press — match what exists, don't invent).
- Cascade (Opus decision): deleting a position/target removes its connections; if recorded hits reference it, ConfirmModal first: "«Cel A» ma N trafień — usunięcie skasuje je wraz z połączeniami." Zero-hit deletes skip the modal.
- Fail-first e2e: add target → connect → record hits → delete target ⇒ modal w/ count ⇒ confirm ⇒ target, connections, hits gone from Tracking + Summary; counts consistent.

## D — Cluster-fix batch (UI build on `fix/audit-v2-clusters` — morning smoke; honor §2 verdicts)
1. profile `useUserWorkspaces` Null-value error (root-cause + fix; console-error→0).
2. profile + team-detail stress-name text-broken-clip → wrap/ellipsis.
3. players 48× empty-label icon buttons → ≥44 hit areas (+ aria labels).
4. team-detail division chips → ≥44 hit areas.
5. §2a/§2b verdict outcomes (shared off-canvas false-positive ⇒ fix the CHECK; real spill ⇒ fix the component).
6. Backlog 4–6: event-type chips on closed events in the switcher; team names 2-line clamp (match list + scouting header); Quick Log hidden in tournament context.
7. B26 UX: state-aware box (collapsed/"OK · ostatnia naprawa: X" when healthy) + explicit "nic do naprawy" feedback; do NOT run the repair on prod.
8. View-as placeholder label → "Podgląd jako — wkrótce".

## E — Read-only discoveries (autonomous, report in the morning)
1. THREE SHOT-CAPTURE MODES (corrects the Part-B STOP): precision / zone / DIRECTION. Locate capture UI + stored shape (field:line), especially direction (type tag? endpoint? angle? per-phase). Feeds the Opus phase-view mockup.
2. Zone→lane note only if still relevant after E1 (likely obsolete).
3. Workspace-logo delivery check, desktop-side: final URL, status, CORS, cache-control, PWA precache 404. Phone session only if desktop is clean.
4. defaultWorkspace prod-impact: count prod users/members lacking defaultWorkspace (read-only) — FIT-criticality verdict.
5. team-league after CDF import: model location of team↔league, what import writes, the CDF team doc on prod, verdict BUG vs BY-DESIGN.

## F — Doc/maintenance (autonomous)
1. Backlog-ingestion doc-sync (incl. Lane-3 records: view-as revival [arc E]; phase-view updated per E1; nav-restructure [arc B]; avatar gen; profile IA [arc D]; follow-teams; groups; division filter; barrel-angle capture [future]).
2. §116 manual-collapse ("focus mode") paragraph + session-scoped persistence note + e2e toggle if not already on branch.
3. Merge `docs/roadmap-sync` (doc-only, autonomous).
4. Commit briefs+mockups to `docs/briefs/` + `docs/mockups/` (repo as source of truth for in-flight orders).

## G — Wave-3 seed (audit branch; build now, RUN only if the emulator is otherwise idle)
Build seed-completeness extensions per CC_TRIAGE_V2_FINAL §4 (real layout geometry incl. bunkers; points linked to visited players; tournament + sparing events with matches; context column in the register; coverage manifest). Run only if it fits without contending with branch e2e.

## Morning hand-off (one report)
- Consolidated READY: branches + what's on each + test status.
- ONE smoke checklist covering: 4.1 (+4.2/4.3 if GO), icon-segment tabs, hitability deletes, cluster-fix visuals — per device (phone-landscape, phone-manual-collapse, tablet-strip+overlay, desktop, portrait-unchanged).
- Discovery verdicts E1–E5 (E1 first — gates the Opus phase-view mockup).
- Anything [ESCALATE] — list, don't act.

Priority if time runs short: B → C → A(if GO) → D → E1 → E4 → rest.

---

# ADDENDUM — arc-B mechanical work + arc-C/quality prep (slots AFTER B→C→A→D→E1→E4)

## H0 — Pixel-diff proof harness (PREREQUISITE for H1/H2)
Repurpose the audit crawler as visual-regression: BASELINE set (coach, all routes, phone-portrait + desktop) on pre-sweep commit → re-capture after each batch → per-screenshot pixel compare (0 diff; document any AA tolerance). Output `sweep-diff-report.md` per batch. ANY non-zero diff = STOP that batch.

## H1 — arc B: i18n string extraction (mechanical, pixel-identical)
i18n coverage inventory first (% through i18n.js vs hardcoded) → extraction worklist by screen. Extract in ~5–8-file batches → i18n tables, existing key convention, NO copy changes. Per batch: build/lint/e2e/pixel-diff=0 → commit. Skip canvas-draw strings, fixtures, DEBUG.

## H2 — arc B: hex→token sweep (mechanical, pixel-identical)
PAGE-LEVEL literals only (~280; ScoutedTeamPage 37, PlayerStatsPage 15, MatchPage 15, QuickLogView 13). Canvas-draw literals EXCLUDED. Each literal → the token with the SAME value; no-match = STOP-list (don't invent tokens). Batch discipline as H1. After: precommit hex-literal guard for swept page files.

## H3 — no-eternal-loading pattern rollout (logic + approved error-state UI)
Apply the ScoutedTeamPage bounded-wait → shared EmptyState error+retry to remaining data-gated loaders. Inventory first; one fail-first e2e per loader family. Lands on branch for the morning batch.

## H4 — Small quality fillers (autonomous)
1. Motion tokens in theme.js (150/250/400 + easings) — exported, unconsumed (arc C prep).
2. e2e UAT #4 — roster picker spec.
3. i18n precommit guard: warn on NEW hardcoded PL strings in JSX.
4. NEXT_TASKS hygiene: close rows shipped this week (rail-LEFT, hero-fix, auto-enter, insights guard, scouted-team loader).

Priority within addendum: H0 → H1 → H2 → H3 → H4. If time ends mid-batch: finish or revert the open batch — never leave a half-swept file.
