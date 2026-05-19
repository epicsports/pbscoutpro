# Phase 0 Discovery — Orthogonal Findings (2026-05-19)

> **Source:** CC desktop discovery session 2026-05-19, parallel audit of `CANVAS_ARCHITECTURE.md` § 5 + DESIGN_DECISIONS § 63 open questions. HEAD at audit: `7508ea8`.
>
> **Purpose:** capture findings that were NOT in the original "Open questions for CC discovery" lists but emerged during code reading. These shape architecture decisions in Etap 4 (canvas) and Phase 1+ (multi-tenant) without being directly answers to any single question.
>
> Findings cited as `file:line` are anchored to HEAD `7508ea8`.

---

## Canvas — orthogonal findings

### C1. LayoutAnalyticsPage has a hidden third canvas implementation

The canvas audit § 2 anticipated rows #6 (deaths heatmap) and #7 (breakouts heatmap) would use `HeatmapCanvas`. They do not.

`LayoutAnalyticsPage.jsx` has its **own `useRef` canvas** with **manual `ctx` drawing** (L93-131 ResizeObserver setup, L213-267 death+shooter rendering, L261 `ctx.scale(2,2)` DPR). It does NOT import `HeatmapCanvas` or `FieldCanvas`. Two rendering modes (`deaths`, `breaks`) share one bespoke canvas with mode-switched draw calls.

**Implication for Etap 4 architecture decision:** the codebase has **three** canvas implementations, not two. Unification scope is bigger than expected if LayoutAnalyticsPage is in scope; smaller if it stays bespoke (which may be the right call — its scope-pill UI and shooter-attribution overlays don't map cleanly to the FieldCanvas/HeatmapCanvas prop set).

### C2. Gesture asymmetry is intentional, not technical debt

- `FieldCanvas`: gesture-rich (pinch / pan / loupe / drag, all wired via `createTouchHandler`)
- `HeatmapCanvas`: **strictly gesture-free** (no `touchHandler` import, no pinch/pan/loupe code)
- `LayoutAnalyticsPage` custom canvas: gesture-free

This asymmetry is design intent (heatmaps are read-only aggregations, scouting/editing canvases are interactive) — but it's the load-bearing answer for the **landscape coach view** feature size:

You cannot just "enable pinch-zoom on existing HeatmapCanvas" — gesture support is not present at all. Three paths:
1. Add gesture state + touchHandler import to HeatmapCanvas (substantial)
2. Migrate the coach summary heatmap view to FieldCanvas in a new "read-only heatmap mode" with `viewportSide`/zoom enabled
3. Extract gesture concerns to a shared base canvas (architecture decision in Etap 4)

This finding directly informs § 4 known divergence item 5 (HeatmapCanvas gestures `❓`).

### C3. FieldView is alive but adoption is selective

`FieldView.jsx` (207 lines) still exists and is actively used by `ScoutedTeamPage.jsx:4`. It's a mode-based dispatcher (`mode='heatmap'` → HeatmapCanvas, else → FieldCanvas) with layer toggle props.

But: `MatchPage.jsx:8-9` and `TacticPage.jsx:13` **bypass FieldView** and import `FieldCanvas`/`HeatmapCanvas` directly.

This inconsistency is structural drift, not a bug. The Etap 4 architecture decision needs to make a call: is FieldView the intended universal wrapper (and MatchPage/TacticPage should migrate to it), or is FieldView a leftover (and ScoutedTeamPage should migrate away from it)? Both are defensible.

### C4. Landscape handling is JavaScript-driven, no CSS media queries

Zero `@media (orientation: landscape)` anywhere in `src/`. All landscape branching is runtime JS via `device.isLandscape && !device.isDesktop` from `useDevice`.

Pattern (e.g. `MatchPage.jsx:1750-1835`, `LayoutDetailPage.jsx:258-393`, `TacticPage.jsx:407-435`):
```jsx
maxCanvasHeight: isLandscape ? window.innerHeight : window.innerHeight - 200
```

Implication: a future `useLandscapeMode()` hook (proposed in Etap 4) would consolidate this pattern but not replace any CSS. The cost of "introduce landscape support" is JS plumbing, not stylesheet changes.

### C5. DPR scaling is hardcoded `×2`, not runtime `window.devicePixelRatio`

All three canvas implementations use:
```javascript
canvas.width = w * 2;
canvas.height = h * 2;
ctx.scale(2, 2);
```

Sites: `FieldCanvas.jsx:261-262`, `HeatmapCanvas.jsx:49`, `LayoutAnalyticsPage.jsx:261`.

No `window.devicePixelRatio` reads anywhere. Works on 2x/3x mobile devices today; may not be optimal on future high-DPR displays. Out of scope for Phase 0 — flagged as latent design debt.

### C6. Safe-area inset is app-wide, never on canvas

`env(safe-area-inset-*)` appears in ~23 files but applied at **page-container level** (e.g. `MatchPage.jsx:1919` bottom panel, `LayoutDetailPage.jsx:261` `100dvh` container, `TacticPage.jsx:415` `100dvh` container).

Canvas elements themselves never read safe-area. They compute height from `window.innerHeight - N` and assume the page container handles inset padding. This works in practice but is implicit; document for refactor.

### C7. drawZones.js i18n debt

`src/components/field/drawZones.js` L38, L45, L66-72 (also L70-72 edit mode) still has hardcoded English labels: `DISCO`, `ZEEKER`, `DANGER`, `SAJGON`, `BIG MOVE`. The i18n migration in commit `66b856a` (2026-04-15) did NOT touch this file.

Should be cleaned up before § 63.9 i18next migration begins — getting it into i18n.js first makes the i18next conversion mechanical.

### C8. CalibrationView is image-only, not a canvas

The layout wizard calibration step (`LayoutWizardPage` step 2) uses `CalibrationView` (`src/components/CalibrationView.jsx`) — an interactive **image viewer** with two tappable calibration points (homeBase, awayBase). No `<canvas>` element.

This corrects canvas audit § 2 row #10 assumption that calibration step was a FieldCanvas branch. Drop from canvas migration scope; keep as a separate concern.

### C9. `viewportSide` half-field prop has no current callers

`FieldCanvas.jsx:60, 202-214` implements a `viewportSide` (left/right) prop that clips the canvas to one side and adjusts pan accordingly. L333 also disables loupe when set.

Grep finds no caller passing this prop today. Infrastructure exists, no consumer. Probably useful for the eventual "scout this half" half-field zoom mode but currently dormant — don't forget it during refactor.

---

## Multi-tenant — orthogonal findings

### M1. Zero direct consumers of `users/{uid}.workspaces` — material for § 63.3

`users/{uid}.workspaces: string[]` is written (`useWorkspace.jsx:77-95, 102-105` via `arrayUnion`) and live-mirrored (`useWorkspace.jsx:64-72` via `onSnapshot`), but **no code reads it directly**. Grep across `src/` for `.workspaces`, `user.workspaces`, `userProfile.workspaces`, `currentUser.workspaces` returns zero matches.

All role/membership decisions flow through `workspace.userRoles[uid]` (workspace doc, not user doc) — `roleUtils.js:49-52`, `MoreTabContent.jsx:248-250`, `TrainingMoreTab.jsx:365-367`, `firestore.rules:26,35`.

**This is material to the § 63.3 schema sub-option a/b/c decision.** Option (a) — migrate `workspaces: string[]` → `workspaceMemberships: [{slug,role,joinedAt}]` — was framed as "richest, breaking change to existing reads." With no existing reads, the breaking-change cost is effectively zero in app code: refactor one `arrayUnion` writer + write a one-shot migration script. External tooling/dashboards reading user docs from the Firebase Console may need to know about the rename, but in-app impact is minimal.

The choice between (a)/(b)/(c) becomes about preferred shape going forward, not migration risk.

### M2. `rolesVersion` migration mechanism is live precedent

`useWorkspace.jsx:143` checks `workspace.rolesVersion !== 2` and auto-triggers `migrateWorkspaceRoles()` if a workspace is at an older schema version. This pattern is already in production and survived the security-roles-v2 merge into main.

Future schema migrations (§ 63.3 schema choice, § 63.2 events unification, etc.) can adopt the same versioning + auto-migrate pattern — tooling + UX precedent exists.

### M3. `NewTournamentModal` is already the unified 3-type wizard

§ 63.7 spec proposes `NewEventWizard` with shared steps + type-specific sub-flows. The existing `NewTournamentModal.jsx` (145 lines) **already has a 3-way type selector** (`'tournament' | 'sparing' | 'training'`) at L23 with branching form state (L39-67) and branching submit handlers (L94-145).

The Phase 7 refactor is therefore **rename + extract steps + add opposing-team step for sparing**, not "build from scratch." Saves significant scope on the original § 63.7 estimate.

### M4. Sparing has live write path with zero readers — actionable hazard

`addTournament({ eventType: 'sparing', ... })` works end-to-end (UI in `NewTournamentModal.jsx:107-122`, write in `dataService.js:182`). Users creating a "sparing" event today write a Firestore doc with `eventType: 'sparing'` set.

But: **nothing reads it.** `useTrainings()` queries only `trainings/`. No aggregator/dashboard/stats inspect `eventType`. Created sparings are invisible.

Risk if § 63.7 wizard refactor is rolled out before § 63.2 events unification: more dead data accumulates. Mitigation options:
- Hide the sparing option in the type selector until § 63.2 lands
- Surface sparings in tournament-list-with-`eventType==='sparing'` filter (Phase 0+1 quick win)
- Accept dead data, clean up post-§ 63.2

### M5. Sparing flow is missing opposing-team field

Per § 63.7 spec, `SparingSubFlow` should include opposing team selection. Current `NewTournamentModal` sparing branch (L107-122) collects only: type, name, date, layout, isTest. No opposing-team input.

Net-new work for Phase 7 (or earlier if sparing surfaces are unblocked sooner).

### M6. Workspace switcher UI is fully missing — but data layer ready

§ 63.3 calls out "missing at UI layer: workspace switcher." The data model (`users.workspaces: string[]` + `defaultWorkspace`) supports multi-membership, but no UI exposes it. There is no current "Switch workspace" affordance in More tab or anywhere else.

This means **multi-workspace users today have no way to switch** even though their data supports membership in multiple workspaces. Today's super-admin workaround presumably involves direct localStorage edit or `enterWorkspace(code)` re-entry.

Implication: Phase 1 (schema foundation) could ship a minimal workspace switcher in parallel with the schema migration — small UI but unblocks immediate utility.

### M7. PBLI is per-workspace, but ready to bridge to global identity

PBLI (`pbliId`, `pbliIdFull`, `linkedUid`) lives on workspace-scoped player docs (`/workspaces/{slug}/players/{pid}`). Two workspaces with the same real person have separate player records with separate `pbliId` links — no cross-workspace identity today.

But the `pbliId` field is itself a stable external identifier. § 63.14's parked "Player identity cross-workspace" decision has a **ready-made bridge**: promote players to global `/players/{pid}` keyed by `pbliId`, with workspace-overlay docs (mirroring the § 63.4 layout pattern) holding workspace-specific notes/scouting. Plumbing exists; only the architectural decision is missing.

### M8. `feat/security-roles-v2` already merged into main

`git log feat/security-roles-v2 --oneline` reaches `50434fb` "Firestore rules v2 + legacy cleanup (§ 38.9)" + Commit 3 `fb049ac` "view switcher § 38.5-38.6". Both are in main's history; `git log main..feat/security-roles-v2` is empty.

**No conflict with § 63.3 schema decision.** Security-roles-v2 was about role-array shape (`workspace.userRoles[uid]`), not about `users.workspaces` membership registry. Confirmed orthogonal.

HANDOVER + NEXT_TASKS should mark "security-roles-v2 finish" as DONE rather than "Commits 3+4 pending."

### M9. Currently on Spark plan — Blaze upgrade is a Jacek prerequisite

`firebase.json` has no `functions` config block. `.firebaserc` lists project `pbscoutpro`. No `functions/` directory. Currently free-tier Spark plan.

**§ 63.5 Phase 5 (aggregation Phase 1) is gated on Blaze upgrade** — Jacek owns the billing decision. Cost is bounded: aggregation is batch + tier-gated, so per-workspace cost stays low even on Blaze.

### M10. Sentry is shipped + Function-ready

`src/services/sentry.js` (52 lines) ships since 2026-04-17 with hardcoded EU DSN + `VITE_SENTRY_DSN` env override + 10% trace sampling + workspace/role user-context tagging.

Cloud Functions can import the Node.js Sentry SDK independently and write to the same project DSN. § 63.5 Phase 5 just needs to add Function-side init + workspace/event/aggregation-phase context enrichment.

### M11. `pbscoutpro_activeTournament` localStorage key not found

§ 63.6 mentions migrating away from `pbscoutpro_activeTournament`. Grep finds no such key in current code. Possibly already removed in an earlier refactor (the actual active-workspace key today is `pbscoutpro-workspace` per `useWorkspace.jsx:18` storing `{slug, name}` JSON).

Phase 3 localStorage migration script should account for this — the key may exist in user browsers from older app versions but not in current code.

---

## Cross-cutting notes

### X1. Both work tracks are independently executable

Canvas Architecture audit (Etap 4 decision pending) and Multi-Tenant § 63 (Phase 0 done, Phase 1+ ready) have no direct dependencies. Both can proceed in parallel:

- Canvas: rozkmina session needed to choose A/B/C component model + write Etap 4 decision section
- Multi-Tenant: rozkmina session needed to choose § 63.3 schema sub-option (a/b/c) + write `MULTI_TENANT_MIGRATION_PLAN.md`

### X2. Phase 0 cleared the path for plan-writing, not for implementation

This audit answered "what is the current state" — the next blocker is "what is the desired state" for both tracks. Implementation work cannot begin until both rozkminy land (canvas Etap 4 + § 63.3 schema choice).

### X3. Findings consistency check — no surprises that break § 63

All findings either confirm or refine § 63 decisions; none contradict. The biggest delta is M1 (zero `users.workspaces` consumers), which **strengthens** the migration story rather than weakening it.

The biggest delta on the canvas side is C1 (LayoutAnalyticsPage custom canvas), which **expands** the migration scope decision but doesn't invalidate any existing decision since the canvas Etap 4 decision hasn't been made yet.

---

**Last updated:** 2026-05-19, desktop session (CC Phase 0 discovery). HEAD: `7508ea8`.
