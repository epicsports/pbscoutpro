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
**PROD AUDIT (admin-SDK read, 2026-06-16):** `collectionGroup('tactics')` = 54 total. It's actually a **THREE-store** situation, not two:
- `layoutOverlays/{id}/tactics` = **21** — the live layout store (read by `subscribeLayoutTactics`).
- `tournaments/{tid}/tactics` = **9** (ranger1996, 5 tournaments) — the live tournament store (read by `subscribeTactics`).
- `layouts/{id}/tactics` = **24** (ranger1996) — a THIRD path with **NO reader in the current code** (dataService only subscribes to the two above). Almost certainly **ORPHANED legacy** (pre-`layoutOverlays`-split). Verify at brief time; likely a cleanup-delete (super-admin, after confirming no reader + a backup), not a migrate.

**Tournament store is NON-empty (9 real docs) → Option A is Tier-2** (`--live` migrate+backfill). The consolidation brief must also decide the fate of the 24 orphaned `layouts/{id}/tactics` (cleanup vs migrate).
- **Option A (recommended, matches § 97.5):** single layout-overlay store + optional `tournamentId` tag; unify CRUD + hook. **Tier-2** — `--live` migrate the 9 tournament-store docs (set `tournamentId`, move to overlay path) + backfill + rollback window + emulator e2e. Opus brief + Jacek GO.
- **Option B:** keep two stores, unify the writer layer (one CRUD wrapper, fixes drift) — Tier-1 but leaves the dual-store debt.
- **Pre-req for either:** an admin-SDK read counting docs under `tournaments/*/tactics/` (autonomous) to decide A's tier.

## 7. Recommendation
1. **Ship now (Tier-1):** the field-shape drift fix (`freehandStrokes` on `addLayoutTactic`). ✅ shipped.
2. **Audit (autonomous read):** count prod tournament-tactics → decides Option A's tier.
3. **Opus brief:** Option A (retire the tournament store per § 97.5) once the count is known.

_Pairs with DESIGN_DECISIONS § 96 / § 97.5 + the ITEM-1 drawing-unify (`4ae31cfc`)._

---

## 8. Orphan verdict — `layouts/{id}/tactics` (24 docs) — code+git diagnosis 2026-06-16 (TRACK 2)

**VERDICT: DEAD legacy → DELETE (super-admin, GO'd). NOT a migrate** — copies already exist at the live path. This answers §6's "cleanup vs migrate" open question.

- **Schema:** orphan shape (`name / myTeamId / steps / freehandStrokes / createdAt`, from `git show 5de2b438:src/services/dataService.js:223-228`) is a strict **subset** of today's `layoutOverlays` `addLayoutTactic` shape (`name/squadCode/players/shots/bumps/myTeamId/freehandStrokes/createdAt`). Old `steps` is the precursor to `players/shots/bumps`. Same store, earlier schema — not a distinct data class.
- **Write-path history:** `layouts/{id}/tactics` was the sole layout-tactics path through v0.11.0 (`5de2b438`). Commit **`67b95df5`** ("§96 STAGE 1", 2026-05-31) retargeted **all four CRUD fns in one diff** (`subscribe/add/update/deleteLayoutTactic`) → `layoutOverlays/{id}/tactics`. **Since `67b95df5`, zero code reads or writes the old path.** Writer fully removed (not dormant); the only surviving `'layouts'` refs (`dataService.js:395, 2044, 2180`) are base-doc geometry `getDoc`s, never the subcollection.
- **Copies already exist:** commit **`46497d3a`** ("§96 STAGE 3") ran `phase_96_layout_globalization.cjs`, whose `copySub()` (lines 64-72) does `dstCol.doc(d.id).set(d.data())` — copy-by-id, full shape, doc-id preserved — and **explicitly does NOT delete the source** (lines 15-16, 137: "legacy `/layouts` docs NOT deleted (rollback safety) — a later cleanup removes them once verified"). The 24 orphans **are** those rollback-safety copies. Their content lives at `layoutOverlays/{id}/tactics` under the same ids.
- **Count drift (19 copied vs 24 source vs 21 live):** verify at execution time — any of the 24 with NO id-match under `layoutOverlays` was created on the old path post-STAGE-3 and flips to MIGRATE (trivial: same `copySub` by-id, shape is a clean subset, no key remap).

**Proposed plan (do NOT execute — Jacek + Opus decide; `--live` DELETE = Hard ESCALATE / task-GO per Firebase policy):**
1. (autonomous read) per-doc id-coverage check: each `layouts/{id}/tactics/{tid}` has a same-id twin at `layoutOverlays/{id}/tactics/{tid}`. Expect full coverage.
2. any uncovered subset → MIGRATE forward first (`copySub` by-id).
3. JSON backup of all 24 (reuse `phase_90_2b3_dry_backup.cjs` pattern).
4. DELETE the `layouts/{id}/tactics` subcollections under a GO'd brief — this is the "later cleanup" the migration script anticipated.

_Anchors: `dataService.js:1584-1611` (live) · `git show 5de2b438:…:223-228` (orphan shape) · `67b95df5` (writer retargeted) · `46497d3a` + `scripts/migration/phase_96_layout_globalization.cjs:64-72,137` (copy-not-move)._

### 8.1 Per-doc coverage check (read-only, 2026-06-16) — `scripts/diag/tactic-orphan-coverage.cjs`
`collectionGroup('tactics')` census + per-orphan id-twin lookup (zero writes). Census confirmed: **24** orphan · **21** layoutOverlays-live · **9** tournament-live. Twin check of the 24:
- **19 DELETE-able** — same-id twin present at `layoutOverlays/{lid}/tactics/{tid}` (the §96 STAGE-3 `--dry` "19 copied"; content already live, safe to delete from the orphan path).
- **5 FLIPS-TO-MIGRATE** — no twin (created on the old path AFTER STAGE-3; the 24−19=5 drift). Must `copySub`-by-id forward, then delete. Across 3 layouts: `AH6dEG1yZcZFc5lap3uQ` (×2) · `OajoxCMTnf1eK5wDV1Ji` (×1) · `kwamYyvZ7th8WYLTHokJ` (×2).

→ DELETE-brief = migrate the 5 (trivial, subset shape, no key remap) → backup all 24 → delete all 24. (layoutOverlays = 21 = 19 copied + 2 created natively, consistent.)

### 8.2 OP2 EXECUTED — `--live` 2026-06-17 (Jacek GO)
**DONE.** `scripts/migration/tactics_orphan_cleanup.cjs --live`. Coverage stable vs §8.1 (no drift). Backup all 24 (outside-repo, gitignored) → migrated the 5 stranded (twins verified) → deleted all 24. **Final census: `layouts/tactics` 0 · `layoutOverlays` 26 (21+5) · `tournaments` 9 (untouched).** No code/rules/deploy (dead path, no reader). The 5 migrated tactics now surface on 3 ranger1996 layouts (intentional recovery; reversible via backup). Detail: DEPLOY_LOG 2026-06-17.

**OP1 STILL OPEN** — retire the tournament-tactics store (`tournaments/{tid}/tactics`, 9 live). This is code+data (live reader `subscribeTactics` + `addTactic` + TacticPage tournament route + per-doc layout resolution), NOT a pure data migration. Needs the brief's exact reader-migration + target-layout rules before execution.
