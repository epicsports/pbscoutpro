# Discovery — Tactics two-store consolidation (read-only, 2026-06-16)

**Status:** read-only discovery → brief-ready for Opus/Jacek to size the full consolidation. The **safe Tier-1 sub-fix** (field-shape drift) was shipped separately the same night — see DEPLOY_LOG. Full consolidation = Tier-2, NOT started (needs a prod count + GO).
**Context:** registered backlog ticket "[FUTURE] tactics two-store consolidation" — orthogonal follow-up to ITEM-1 (drawing-tools unify, shipped `4ae31cfc`).

## 1. The two stores
- **Layout-level** (reusable across tournaments on a layout): `workspaces/{slug}/layoutOverlays/{layoutId}/tactics/{id}` — `subscribeLayoutTactics` (dataService.js:1585).
- **Tournament-level** (event-specific): `workspaces/{slug}/tournaments/{tid}/tactics/{id}` — `subscribeTactics` (dataService.js:1610).

## 2. Dual CRUD + field-shape DRIFT (the bug)
`addLayoutTactic` (dataService.js:1591) writes `name/squadCode/players/shots/bumps/myTeamId/createdAt`. `addTactic` (1617) writes `name/myTeamScoutedId/steps/freehandStrokes/createdAt`.

| Field | addLayoutTactic | addTactic |
|---|---|---|
| `freehandStrokes` | ❌ **MISSING** | ✓ |
| `players`/`shots`/`bumps` | ✓ | ❌ missing |
| `squadCode`/`myTeamId` | ✓ | ❌ |
| `steps` (legacy) | ❌ | ✓ |
| `myTeamScoutedId` | ❌ | ✓ |

**The data-loss bug:** `LayoutDetailPage.duplicateTactic` (LayoutDetailPage.jsx:355) calls `addLayoutTactic(layoutId, { name, steps, freehandStrokes })` — but `addLayoutTactic` drops `freehandStrokes` (not in its field list). So **duplicating a layout tactic silently loses its freehand drawing.** (Update via `updateLayoutTactic` passes `...data` so edits persist — only CREATE/DUPLICATE drops it.) Made more visible by ITEM-1 (drawings are now richer). → **Safe Tier-1 sub-fix: add `freehandStrokes` to `addLayoutTactic` (+ players/shots/bumps symmetry to `addTactic`).**

## 3. Dual hooks
`useLayoutTactics(layoutId)` (useFirestore.js:429) and `useTactics(tournamentId)` (369) are structurally identical — divergence is purely the Firestore path.

## 4. Consumers
- **Layout store:** `TacticPage` (layout route) + `LayoutDetailPage` (list/create/duplicate/delete — the PRIMARY create surface).
- **Tournament store:** `TacticPage` (tournament route) only. **No UI creates tournament tactics** (`addTactic` has no caller button — effectively dead/rare). This is the key consolidation signal.

## 5. Rationale (DESIGN_DECISIONS § 96 / § 97.5)
Layout tactics = coach playbook, reusable, travel with the OVERLAY (not the global base; "19 across ranger"). § 97.5 explicitly lists "tactics stores to consolidate (layout-overlay primary; retire the parallel `/tournaments/{tid}/tactics`)". So consolidation toward the layout-overlay store is the ratified DIRECTION.

## 6. Consolidation options (analysis — Tier-2, needs GO)
**PROD AUDIT (admin-SDK read, 2026-06-16):** `collectionGroup('tactics')` = 54 total → layout-store **21**, tournament-store **9** (ranger1996, across 5 tournaments), other **24** (a third `tactics` path — likely `layouts/{id}/tactics` global or legacy; investigate at brief time). **Tournament store is NON-empty (9 real docs) → Option A is Tier-2** (needs a `--live` migrate+backfill, not a free path-retire).
- **Option A (recommended, matches § 97.5):** single layout-overlay store + optional `tournamentId` tag; unify CRUD + hook. **Tier-2** — `--live` migrate the 9 tournament-store docs (set `tournamentId`, move to overlay path) + backfill + rollback window + emulator e2e. Opus brief + Jacek GO.
- **Option B:** keep two stores, unify the writer layer (one CRUD wrapper, fixes drift) — Tier-1 but leaves the dual-store debt.
- **Pre-req for either:** an admin-SDK read counting docs under `tournaments/*/tactics/` (autonomous) to decide A's tier.

## 7. Recommendation
1. **Ship now (Tier-1):** the field-shape drift fix (`freehandStrokes` on `addLayoutTactic`). ✅ shipped.
2. **Audit (autonomous read):** count prod tournament-tactics → decides Option A's tier.
3. **Opus brief:** Option A (retire the tournament store per § 97.5) once the count is known.

_Pairs with DESIGN_DECISIONS § 96 / § 97.5 + the ITEM-1 drawing-unify (`4ae31cfc`)._
