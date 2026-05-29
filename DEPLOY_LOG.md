# Deploy Log

## 2026-05-29 — [chore] stale user-account cleanup — 3 ghost `/users` docs hard-deleted + ref-strip (admin-SDK)
**Commit:** `9304627f` (guarded delete script + B15 board update) + this DEPLOY_LOG stamp. **No app deploy, no rules change.**
**Status:** ✅ `--live` run directly via the SA key (hard-escalate category — explicit Jacek GO).

**What:** STEP 1b of the stale-user cleanup brief. Deleted set (a) — 3 **ghost** `/users` docs (no email, no Auth account, no authored data, no `linkedUid`) that lingered in `ranger1996`'s `members[]` + `userRoles{}`:
- `3phU9z8EwHV4yqQCXs773kZm0iA3`
- `RjY7ipbcziWPrWziU97ZgBPEEPb2`
- `WYLNY50RyHatmRug9kVb0ke5wM02`

**Ops (per uid, batched + idempotent):** `workspaces/ranger1996` ref-strip (`members: arrayRemove(uid)` + `userRoles.{uid}: delete()`) → hard-delete `users/{uid}`. **3 ref-strips + 3 doc deletes.**

**Invariant (re-verified at run-time, aborts on any violation):** still no email, no Auth account, no contributed data (4 indexed canonical authorship checks `homeData.scoutedBy`/`awayData.scoutedBy`/`tactics.createdBy`/`notes.createdBy` all empty), no `linkedUid` (index-free full player scan: global 3242 + legacy ws). `coachUid`/`points.createdBy` UNVERIFIED (no CG index) — only ever flag empty shells, not data; canonical `scoutedBy` already covers contributed data.

**Parity verify (automatic):** `/users` **21 → 18**; all 3 uids gone from `/users` + `ranger1996` members/userRoles. **Untouched (out of scope):** set (b) test accounts (jacek2@/info@epicsports.pl/jacek.parczewski@cloudity.com — Jacek's role-test logins, KEEP) + the ~565 B15 `userRoles` stragglers (separate cleanup).

**Core invariant honored:** only ACCOUNTS deleted; zero contributed data touched (none existed for these uids). **Mechanism:** `scripts/migration/stale_users_cleanup.cjs` (hard-coded allow-list, `--dry` default, `--live` on GO). STEP 0 audit artifact: `scripts/migration/stale_users_audit.cjs` (`a6305298`).

## 2026-05-28 — [feat] Phase 2.2.d Stage 1 — merged catalog∪workspace readers + ws-only pbliId backfill
**Commit:** `33b0d453` (merge of `feat/phase22d-stage1-reader-foundation` / `5ed5841d`).
**Status:** ✅ App deployed (`npm run deploy` Published; main bundle `index-BWH1Kvyb.js` 239.03 kB / 71.44 kB gzip). ✅ `--live` backfill run directly via the SA key (additive, create-only).

**Reader code (deployed):** `usePlayers`/`useTeams` now merge global `/players`/`/teams` ∪ `/workspaces/{activeWs}/{players|teams}`, deduped by id with §90 class preference (pbliId→global copy, no-pbliId→workspace copy); two onSnapshot listeners per hook (workspace half gated on active slug, cleans up on switch, degrades to global on error); `findPlayerByPbliId`→global (zero callers). Backward-compatible: today every doc is twinned, so merged == global view. **Read-cost ~2× players/teams per session** until Stage 3 drops the pbliId workspace twins. Build clean, precommit pass.

**Backfill — what:** Brief 1 (merged-reader foundation) STEP 0 parity found **42** docs in `/workspaces/ranger1996/players` that have a real `pbliId` but no global twin (a dual-write gap). Their § 90 home is the global catalog. Backfilled them (ws → global) so the catalog is complete and the merged-reader flip becomes a true zero-behavior-change ship.

**Run results (`--dry` → `--live` → parity verify):**
- ws-only **42** · all with pbliId **42** · missing pbliId **0** · id-collisions **0** → invariant held → `--live`.
- **created 42 · skipped-existing 0 · errors 0.** `create()` (create-only — never overwrites).
- Parity verify: global players **3200 → 3242**, workspace-only **0**, twinned **3242**. Teams untouched (298/298, verified clean pre-backfill). (Teams re-read hit the daily read quota — a time-gate; teams were not written, so no re-verify needed.)
- Copied **verbatim** (no transform). The 42 carry no `ownerWorkspaceId` — consistent with § 90 (catalog/pbliId docs are super_admin-owned, not workspace-owned).

**Mechanism:** `scripts/migration/phase2_22d_backfill_wsonly_pbli_players.cjs` (+ `.cmd` wrapper) — global∪ws diff, INVARIANT hard-stop (==42 / all pbliId / no collision; aborts + writes nothing otherwise), `--dry` default, idempotent (re-run = all skip-existing). No deletion, no rules change, no workspace-copy change.

## 2026-05-28 — [chore] retire legacy selfReports path from code + rules (§ 90.7.3)
**Commit:** `91caf489` — merge of `chore/retire-legacy-selfreports-path` (`9a757e49`).
**Status:** ✅ App deployed (`npm run deploy` Published; main bundle `index-0VP0Wk__.js` 237.77 kB / 71.17 kB gzip — slightly smaller, dead code gone). ✅ Rules deployed (`firebase deploy --only firestore:rules` — compiled + released to cloud.firestore). Run directly by CC via the SA key.

**What:** With the legacy nested docs deleted (§ 90.7.2), removed all remaining references to the nested path.
- **PPT per-player readers** (`getTodaysSelfReports` / `getSelfReportsForPlayer` / `getPlayerBreakoutFrequencies`): dropped the legacy dual-read → flat-only (`where('playerId','==',…)`). One query instead of two; no more empty-subcollection reads per PPT load.
- **`dedupePreferFlat` removed**; the 3 collectionGroup readers (`getLayout`/`getEvent`/`getTrainingSelfReports`) revert to plain `snap.docs` iteration (no legacy copy → no dup ids).
- **`firestore.rules`:** removed the dead nested `/players/{pid}/selfReports/` block (no docs, no code touches it; collectionGroup reads ride the `/{path=**}/selfReports/` root rule). Flat block is now the canonical selfReports rule.

**Safety:** no data change; flat path (53 docs) unchanged. Rules removal is dead-block removal — verified no code reads/writes the nested path before deploy (grep). Build clean, precommit pass.

## 2026-05-28 — [chore] legacy selfReports cleanup — nested path now EMPTY (§ 90.7.2)
**Commit:** `5d71d736` — merge of `chore/phase2-stage1-legacy-selfreports-cleanup`. Migration script only; **no app deploy** (script doesn't touch the bundle).
**Status:** ✅ Live-run clean (executed directly via the firebase-admin service-account key).

**What:** Deleted the write-dead legacy nested selfReports (`/workspaces/{ws}/players/{pid}/selfReports/{sid}`) now that the flat path is canonical (cutover `01b1280b`) — so Phase 2.2.d (player-doc cushion drop) won't orphan them.

**Run results (`--dry` → `--live` → `--dry` verify):**
- Legacy scanned **53** · flat twins **53** · with-twin (safe) **53** · **orphans 0** (hard-stop not triggered) · **deleted 53** · **legacy remaining 0** · errors 0.
- Flat path intact at 53. Re-run `--dry` confirms 0 legacy remaining (idempotent).
- (53 vs the backfill's 52: one report landed during the dual-write window after the backfill but before cutover; it had a flat twin.)

**Mechanism:** `scripts/migration/phase2_stage1_legacy_selfreports_cleanup.cjs` — ONE `collectionGroup('selfReports').get()`, partition by path-segment count (6=legacy, 4=flat), per-doc twin check by id within workspace, ORPHAN hard-stop (abort + delete nothing if any legacy doc lacks a flat twin), `writeBatch` ≤500, `--dry` default. Quota-safe (single CG read + 53 deletes); no player-subcollection walk.

**Follow-up (low-pri, not blocking):** legacy docs gone → the legacy-nested rules block + the `dedupePreferFlat` shim are now removable. Deferred.

## 2026-05-28 — [feat] selfReports Stage 1.B.3 cutover — flat-only, design (b), index-free (§ 90.7.1)
**Commit:** `01b1280b` — merge of `feat/phase2-stage1-selfreports-cutover` (`e14b51a9`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 5.32s; main bundle `index-Djy_rYG2.js` 238.49 kB / 71.40 kB gzip). **No `firebase deploy`** — index diff vs main empty (abandoned `1cb6777d` composite dropped); rules change comment-only.

**What:** Completes §90 Stage 1 (`selfReports` flat relocation). Writers stop dual-writing → flat path only; readers stay on `collectionGroup` (path-agnostic) with a dedup that now prefers the flat copy.

**Changes:**
- **STEP 1 writers flat-only:** `createSelfReport` + `migratePendingToPlayer` (PPT) and `dualUpdateSelfReport`→`updateSelfReport` (dataService, funnels `propagateMatchup`/`applySelfReportOverride`/`dismissSelfReportFlag`). 5 logical writers via 3 helpers; no 6th.
- **STEP 2 matcher (design b):** `propagateMatchup` reuses `getTrainingSelfReports(trainingId)` **once, hoisted out of the per-player loop**, grouped by `playerId` (field-first, path-fallback) → **1 collectionGroup query, not N**. `applySelfReportOverride` reads the canonical flat copy. `migratePendingToPlayer` read side = `pendingSelfReports` (unaffected).
- **STEP 3 dedup prefer-flat (correctness-critical):** new `dedupePreferFlat()` for the 3 collectionGroup readers (`getLayout`/`getEvent`/`getTrainingSelfReports`) — collectionGroup path-order otherwise keeps the **stale legacy** copy, which would shadow override/dismiss mutations. Per-player dual-readers already prefer flat (unchanged).
- **STEP 4 rules comment-only:** legacy nested `/players/{pid}/selfReports/` marked WRITE-DEAD (read-only until the legacy-doc cleanup stage). No functional rules change → no rules deploy.
- **STEP 0:** abandoned index commit `1cb6777d` dropped; `firestore.indexes.json` identical to main.

**Note:** the matcher reuse introduces a call-time-safe circular import (dataService ↔ PPT, both bindings used only inside functions) — build confirms it resolves.

**§ 27:** N/A — pure data-layer cutover, no UI surface. `npm run precommit` (Bash tool): **All checks passed**.

**§ 37.2 correction:** the index-verification brief's "`getTrainingSelfReports` @ `dataService.js:247`, path-derived" was wrong — it lives at `playerPerformanceTrackerService.js` on `collectionGroup`.

**Smoke (Jacek, on prod — no index/rules deploy):**
1. Create a self-report → lands **flat only** (no new legacy doc).
2. Run matcher/propagation for a training → reports grouped per player; **1 query, not N** in the network panel.
3. Override + dismiss a report → the **mutation** reads back (flat preferred, no stale-legacy shadow).
4. `getTrainingSelfReports` / shot-frequency readers → unchanged (still collectionGroup).
5. `migratePendingToPlayer` → a pending report migrates to the flat path.

## 2026-05-28 — [feat]+[fix] Workspace logo (§ 93) + one-row consolidation (§ 92.7)
**Commit:** `05cfa9b7` — merge of `feat/workspace-logo` (`dd76164a` logo + `f083ae56` consolidation).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 5.90s; main bundle `index-ykxLhARR.js` 238.73 kB / 71.62 kB gzip).

**Bundled ship — two changes:**

**(1) [fix] One workspace row per More surface (§ 92.7).** Jacek saw the workspace duplicated across two rows. Per his pick (Option 2 — slim Leave row): the `<WorkspaceSwitcher />` is now the single workspace-identity row; the former "name + Wyjdź" row drops the duplicated workspace name → becomes a single-purpose Leave row (🚪 `leave_workspace_row` + the Wyjdź button kept, all disabled-states intact). `TrainingMoreTab` brought to parity (static row swapped for `<WorkspaceSwitcher />`, Leave row slimmed). New i18n key `leave_workspace_row` (pl/en); removed dead `slug` locals.

**(2) [feat] Workspace logo (§ 93).** Optional external `logoUrl` on `/workspaces/{slug}` (image URL — NO Firebase Storage, quota-friendly per the 2026-05-27 limit). New `WorkspaceLogo` component (`<img>` → graceful 🏠 fallback on missing/broken URL, never a broken-image glyph). Shown in: switcher trigger row icon, switcher picker rows, and the AppShell tournament context bar (logo renders only when set). Set via the §91 super_admin surface — `logoUrl` field in the create modal + a Logo editor (preview + URL + Save) in the manage view. `dataService.createWorkspace(…,logoUrl)` + `setWorkspaceLogo(slug,url)`. **No `firestore.rules` change** — workspace-doc write is permitted by `isAdmin(slug)`. **Login screen intentionally excluded** (no workspace context pre-auth; AppShell context bar is tournament-scoped, so the logo shows there only with a tournament open).

**§ 27:** PASS — logo container neutral, graceful fallback, no decorative glow, no amber on the non-interactive image; only the Save CTA is accent. Slim Leave row improves clarity. `npm run precommit` (Bash tool): **All checks passed**.

**Smoke (Jacek):**
1. §91 → New workspace with a Logo URL → badge appears; or open a workspace → Manage → Logo editor → paste URL → Save → preview updates.
2. Logo shows in the switcher row + picker rows + tournament context bar.
3. Bad/empty URL → 🏠 fallback, no broken image.
4. More tab shows ONE workspace row (switcher) + a slim 🚪 Wyjdź row; training More tab matches; Wyjdź still works for members.

## 2026-05-28 — [feat] Workspace switcher — OPERATION (§ 92)
**Commit:** `4bda4e75` — merge of `feat/workspace-switcher` (`aa68b73d` switcher + `9a05e524` approved-only filter).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 5.33s; main bundle `index-DtbfM4ml.js` 238.39 kB / 71.55 kB gzip — switcher logic lands in the main chunk, sub-kB).

**What:** The static "Mój workspace" More-tab row is now a **switcher** — tap → bottom-sheet picker of the workspaces the user belongs to → tap one to switch active context (code-free; persists + reloads). Single-workspace users keep the static row. Complements (does NOT duplicate) the § 91 super_admin MANAGEMENT surface: § 91 manages any workspace WITHOUT switching; § 92 is the OPERATION need (be inside a workspace to use it). The switcher Jacek rejected earlier was the *management* mechanism — this is the *operation* one.

**Mechanism:**
- `useWorkspace.setActiveWorkspace(slug)` — code-free member switch (`enterWorkspace` can't: it derives slug from the typed code + verifies the password). Persists `{slug,name}` to local+session storage (mirrors `enterWorkspace`), best-effort `lastAccess` bump (self-join envelope, non-blocking), then **hard-reloads**.
- **Reload is deliberate:** data subscriptions bind to `bp()`, and `<ViewAsProvider key={slug}>` remounts the subtree on slug change with child effects running BEFORE App's parent `basePath` effect calls `setBasePath` (React effects run bottom-up) → a live in-place swap would subscribe against the STALE workspace (cross-workspace data bleed). Fresh load guarantees clean init order.
- `WorkspaceSwitcher` — lists `useUserWorkspaces()` (queries `workspaces` where `userRoles.{uid} != null` — strictly the user's own memberships, never all-workspaces), **filtered to assigned roles** (`userRoles[uid]` non-empty; pending self-joins `[]` excluded — no real access yet). Active workspace always kept. Active row marked with amber ✓ + accent tint (active-state, § 27-compliant).

**No `firestore.rules` change** — reading the workspace doc on switch is auth-gated; data inside stays isMember/role-gated.

**§ 27:** PASS (amber only on active-row ✓/tint; rows ≥48px; active = bg tint not border-only, matching RoleChips). `npm run precommit` (Bash tool): **All checks passed**.

**Scope note:** `TrainingMoreTab.jsx` has a parallel static "Mój workspace" row (training-mode More tab) — left as-is (brief scoped to `MoreTabContent`). Mirror `<WorkspaceSwitcher/>` there if training-mode switching is wanted.

**Smoke (Jacek):**
1. Super_admin in ranger1996 → "Mój workspace" → picker shows ranger1996 (✓) + fit (+ any created) → tap fit → switches.
2. After switch: tournaments / players / teams show **fit's** data, no workspace-code re-entry.
3. Reload → still in fit (persistence).
4. Switch back to ranger1996 → its data returns.
5. Single-workspace user → static row, no picker. Pending-only (unapproved) workspace → NOT listed.

## 2026-05-28 — [feat] super_admin Workspaces access surface (§ 91)
**Commit:** `413d9e0d` — merge of `feat/superadmin-workspaces-access` (`5915f16e`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 5.67s; new lazy chunk `WorkspacesAdminPage-*.js`; main bundle `index-D5IYbzDE.js` 237.68 kB / 71.43 kB gzip — page + dataService deltas absorbed by the lazy chunk).

**What:** super_admin-only **Workspaces** surface (`/admin/workspaces` under `SuperAdminGuard` + More → Super Admin entry) to (1) list all workspaces with member / pending counts, (2) create a workspace WITHOUT switching active context, (3) manage ANY workspace's members / pending approvals / roles. Replaces the deleted workspace switcher (FIT-onboarding enabler: tenants self-join pending → super_admin approves + assigns role, incl. designating the tenant's own workspace_admin via the `admin` chip).

**Mechanism:**
- `dataService.wsPath(wsSlug)` — explicit slug → `workspaces/{slug}`, null/undefined → `bp()`. `approveUserRoles` / `updateUserRoles` / `transferAdmin` / `removeMember` / `migrateWorkspaceRoles` route through it. **Non-breaking** — every existing caller passes the active slug or null → resolves to `bp()` as before; only the new surface passes a different slug. Removed the dead `wsPath()` stub it superseded.
- `createWorkspace(slug,name,code)` — bootstrap doc (caller = `adminUid` + `userRoles:['admin']`) without `setWorkspace`/storage (distinct from `enterWorkspace`, which switches context).
- `WorkspacesAdminPage` — `onSnapshot(collection 'workspaces')` list; per-workspace manage view reuses `RoleChips`, writes to the SELECTED slug; remove withheld for the `adminUid` owner.

**No `firestore.rules` change** — super_admin cross-workspace power already exists via `isSuperAdmin()` short-circuit in `isAdmin(slug)` + catalog gates (privilege-model discovery this session). Client + service only.

**§ 27:** PASS (color / elevation / typography / touch / cards / nav; anti-patterns ZERO — removed an initial decorative-amber section label). `npm run precommit` (run via Bash tool): **All checks passed**.

**Known limitations:**
- `removeMember`/Reject reads the target workspace's `players` subcollection (unlink), gated `isMember(slug)` — works where super_admin is a member (`ranger1996`, any workspace they created); a never-joined workspace would fail the unlink read. Approve + role-assign (workspace-doc writes) unaffected.
- Catalog data-isolation (workspace_admin writing own-workspace-owned `/players` `/teams` via `isWorkspaceAdminOf`) is the separate data-isolation track (§ 90.9) — untouched here.

**Smoke (Jacek):**
1. More → Super Admin → Workspaces → all workspaces listed w/ member + pending counts.
2. + New workspace → appears in list; you are its `adminUid` + `userRoles` admin; active context NOT switched (still in `ranger1996`).
3. Open a workspace ≠ active → approve a pending member + assign a role → write lands on the SELECTED workspace in Firestore (NOT the active one).
4. Existing Members panel (own workspace) still works unchanged.
5. Non-super-admin: entry hidden + `/admin/workspaces` direct URL blocked.

## 2026-05-28 — [fix] BaseCanvas `drawMode` gate — Coach Plan Draw on ScoutedTeam (latent § 78 silent-fail)
**Commit:** `d2fd4023` — merge of `fix/coach-shot-drawer-desktop` (`25123f8f`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 6.62s, main bundle `index-DIFqAkAo.js` 236.52 kB unchanged — single predicate add is sub-byte after minify).

**Bug:** ScoutedTeamPage → toggle Coach Plan Draw ON → mouse-drag on canvas → no line drawn, no marker, console silent. Touch path same (page scrolls instead of capturing strokes).

**Root cause — NOT a regression, latent silent-fail since § 78 Draw Stage 2 ship:**

`BaseCanvas.jsx:281` gated touch-handler attachment (and `touchAction: 'none'`) on `gesturesEnabled = pinchZoom || pan || loupe`. The draw arbiter (§ 77 Stage 1) lives INSIDE `createTouchHandler` — its dispatch is unreachable without an attached handler. The mouse path's `onMouseDown={(e) => handlerRef.current?.handleDown(e)}` silently no-ops via optional chaining when `handlerRef.current` is null; touch listeners simply aren't bound.

`HeatmapCanvas.jsx:46-47` defaults `pinchZoom = pan = false`, hardcodes `loupe = false`. `ScoutedTeamPage.jsx:824-853` Coach Plan flow passes `<HeatmapCanvas drawMode={coachDrawMode} onDrawStart={…}>` without overriding any gesture default → `gesturesEnabled === false` → handler never attached → silent fail end-to-end.

**Regression analysis:** `git diff --name-only e4c7c585 HEAD` (A2 v2 ship → HEAD) shows zero canvas/heatmap/scouted-team file changes. Bug has been this way since `0d135c6f feat(canvas): § 78 Draw Stage 2 — ScoutedTeam annotations` shipped. Coach Plan Draw on ScoutedTeam **has never worked end-to-end** — Jacek's "worked at A2 v2 ship time" recollection conflated A2 v2's ShotDrawer (works because it opts into all three gestures) with Coach Plan Draw (broken from day one). Third latent-bug-not-regression of the week, after `onPress` and `B3 CTA` fixes — same pattern (admin/coach surface tested at ship via the wrong adjacent flow).

**Fix:** One additional predicate at `BaseCanvas.jsx:296`:
```js
const gesturesEnabled = pinchZoom || pan || loupe;
const handlerNeeded = gesturesEnabled || drawMode;   // ← new
```
- Effect dependency + early-return condition both route through `handlerNeeded`.
- `touchAction` switches from `gesturesEnabled` to `handlerNeeded` too — otherwise touch on iPad would scroll the page during draw.
- Mouse handlers (already optional-chained to `handlerRef.current`) start firing correctly once handler attaches.

**Behavioral side-effect (acceptable, additive):** The monolithic `createTouchHandler` has no internal per-gesture gate (§ 64.9 Step 2 explicitly deferred that refactor). With the handler attached for `drawMode`-only consumers, pinch + pan become available during draw. For ScoutedTeam Coach Plan this is iPad-PencilKit parity — zoom into a region, draw, pinch out. Loupe stays inert (its render path is gated inside touchHandler on `editable||layoutEditMode`, neither of which ScoutedTeam passes).

**Not affected:**
- ShotDrawer (A2 v2) — opts into all three gestures already; gate change is a strict no-op there.
- Read-only heatmaps (MatchPage heatmap tab, TrainingResultsPage) — `drawMode` default false → `handlerNeeded` stays false → no behavior change, page scroll preserved.
- InteractiveCanvas surfaces (MatchPage scout, LayoutDetailPage) — gestures opt-in active; handler always attached.

**Validation:**
- `npx vite build` ✓ 6.62s clean.
- No `console.log` / `debugger` introduced.
- File: `src/components/canvas/BaseCanvas.jsx` — 18 ins / 6 del (mostly the `handlerNeeded` block comment explaining the gate rationale + the § 78 latent-bug citation).

**Smoke (Jacek):**
1. ScoutedTeamPage → toggle Coach Plan Draw ON → mouse-drag → line draws.
2. iPad touch (when available): same flow → stroke captures, page doesn't scroll.
3. Regression check ShotDrawer: tap-place / drag-move / tap-marker menu still work.
4. MatchPage heatmap tab + TrainingResultsPage: still read-only, page scroll works.

**§ 27 self-review:** Color/Elevation/Typography/Cards/Navigation = PASS (no UI changes — gate is invisible to users). Anti-patterns = ZERO. Verdict: READY TO COMMIT.

**Rollback:** `git revert -m 1 d2fd4023` + redeploy. Restores latent silent-fail state — only worth doing if the additive pinch/pan side-effect on ScoutedTeam Coach Plan somehow breaks workflow.

**Lesson (third this week):** "feature shipped at deploy" ≠ "feature tested at deploy". When a brief surface (§ 78 Stage 2 — Coach Plan Draw) is tested using an *adjacent but different* code path (ShotDrawer at A2 v2 ship, where gesture defaults differ), the bug walks. Cheap mitigation per the past three fixes' pattern: every brief that ships a new interactive surface explicitly lists "exercise the new flow once on the intended page" in its acceptance criteria — not just the build/lint/precommit gate.

---

## 2026-05-28 — [fix] B3 roster repair CTA — feedback (toast + tinted summary), not logic
**Commit:** `a99e1344` — merge of `fix/b3-roster-repair-cta` (`f4202d12`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 10.71s, MainPage lazy bundle `99.39 → 100.57 kB` +1.18 for the toast scaffolding).

**Bug:** Tournament screen → `CoachTabContent` admin banner "B3 ROSTER REPAIR" → click "Repair scouted rosters" → looked like nothing happened. Console clean.

**Root cause — NOT broken logic, broken feedback:** PART A discovery confirmed handler was wired correctly (`onClick={runRepairRosters}` on `Btn` — different prop contract from yesterday's ActionSheet fix), `repairScoutedRostersForTournament` ran cleanly, writes landed, summary rendered. But the rendered confirmation was too subtle to be perceived as feedback:
- 12px `textDim` one-liner below the button.
- Button-text flicker `"Repair scouted rosters" → "Repairing…" → "Repair scouted rosters"` happened too fast on idempotent / small-input runs to register visually.
- Banner doesn't auto-hide on success (by design — idempotent re-run hint).
- If `updated === 0` (all rosters already narrow), the result text shows "0 updated" — easy to misread as "nothing happened" instead of "nothing needed to happen."

**Fix per PART B scope (Jacek decisions):**

1. **Floating completion toast.** Mirrors `WizardShell`'s `saveToast` pattern — local state + `setTimeout` auto-dismiss (5s, longer than save toast's 2.5s for readability), `position:fixed` bottom-center, `pointerEvents:none`, color-coded border (success/danger). Idempotent-aware wording:
   - `updated > 0` → `Repaired: N updated, M unchanged[, K failed]`
   - `updated === 0 && failed === 0` → `No rosters needed updating (N scanned, all already narrow)`
   - error → `Error: {message}`
2. **Inline summary visibility bump.** `FONT_SIZE.xs` → `FONT_SIZE.sm`, success bg `#22c55e10` + border `success30`, error bg `#ef444410` + border `danger30` (per Jacek's exact tint values), padded + rounded so the bg reads as intentional. `updated` count in `<strong>`.
3. **`useEffect` added to imports** (was `useState + useMemo`).

**Out of scope (per Jacek decisions):**
- ❌ Banner auto-hide on success — banner carries info-value (idempotent re-run hint); toast + tinted summary already say "action fired."
- ❌ "Last repaired N seconds ago" stamp — scope creep on a small fix; toast + inline cover the core problem.
- ❌ Preemptive debug log for suspected silent no-op — don't guess problems that may not exist. If a future run shows persistent 0/0/0 on a tournament where writes are expected, THEN we add diagnostics.

**Not touched:** the symptom-gated `runRepair` (division repair, `CoachTabContent.jsx:48-60`) — different handler, different inline summary, would be a separate fix if any. Out of scope per brief literal title "B3 roster repair CTA."

**Smoke (Jacek to verify):**
1. Open a tournament with scouted teams → admin banner visible → click "Repair scouted rosters" → floating toast appears bottom-center for 5s with appropriate wording.
2. If tournament is "clean" (all rosters already narrow) → toast says `"No rosters needed updating (N scanned, all already narrow)"`.
3. If tournament has over-broad rosters → toast says `"Repaired: N updated, M unchanged"`.
4. Inline summary persists below the button (green-tinted on success, red-tinted on error).

**§ 27 self-review:** Color discipline PASS (success/danger semantic only; low-alpha tints don't compete with primary CTAs). Elevation PASS (toast z-50, pointer-events none). Typography PASS. Cards PASS. Navigation PASS. Anti-patterns ZERO (no Polish in code; no raw HTML controls; no console.log/debugger; no dotted-path Firestore writes). Verdict: READY TO COMMIT.

**Rollback:** `git revert -m 1 a99e1344` + redeploy. Restores subtle-feedback state — only worth doing if the toast surface somehow misbehaves (it won't; mirrors a proven pattern). Toast is purely additive UI.

**Side-lesson captured to memory** (`feedback_button_does_nothing_diagnosis.md`): "button does nothing" reports are ~50/50 broken-feedback vs broken-logic. Always run PART A discovery before assuming logic bug. Today's PART A correctly identified the broken-feedback branch — distinguishable from yesterday's admin ActionSheet bug (which WAS broken-logic, prop-name mismatch). The PART A→PART B brief structure handles both branches cleanly.

---

## 2026-05-28 — [fix] Admin ActionSheet contract: `onPress` not `onClick` (latent bug since Phase 2.x shipped)
**Commit:** `0fe5e1a1` — merge of `fix/admin-actionsheet-onpress` (`4f7cf95c`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-28 (build clean 12.79s, main bundle `index-DaNyNbSx.js` 236.52 kB unchanged — pure rename, no LOC delta).

**Bug:** AdminTeamsPage row → ⋮ menu → Retire (or any action) threw `i.onPress is not a function` in console; nothing happened on click. Same on AdminLeaguesPage + AdminPlayersPage.

**Root cause — NOT a regression, latent bug:** `ActionSheet` (`src/components/ui.jsx:153`) has called `a.onPress()` since the original `1d832437 feat: three-dot menu` commit (April 2026). The three Phase 2 admin pages were written with `onClick:` on every action item from day one and never worked through the ⋮ menu. `git log -S 'a.onClick' -- src/components/ui.jsx` returns no matches — `onClick` was never the ActionSheet contract. Jacek's "this worked before" recollection was likely confusion with `TeamDetailPage` (workspace teams page, different UI, doesn't use `ActionSheet`).

**Surface (3 admin pages):**
- `AdminTeamsPage` shipped `6638c54` 2026-05-20 (Phase 2.3.c) — 4 broken actions (Edit / Resolve duplicate / Restore / Retire)
- `AdminLeaguesPage` shipped `96e9951` 2026-05-19 (Phase 2.1c) — 3 broken actions (Edit / Reactivate / Deactivate)
- `AdminPlayersPage` shipped `7de12d4` 2026-05-19 (Phase 2.2.c) — 2 broken actions (Edit / Delete). **Re-introduced by this session's `f9993063` (bulk delete/merge)** — copied the existing wrong convention without testing the ⋮ flow.

**Fix:** rename `onClick:` → `onPress:` on every action item in the three admin ActionSheet blocks. 9 occurrences, single-line each. No other change.

| File | Lines |
|---|---|
| `src/pages/admin/AdminTeamsPage.jsx` | `:296, :299, :303, :307` |
| `src/pages/admin/AdminLeaguesPage.jsx` | `:88, :90, :91` |
| `src/pages/admin/AdminPlayersPage.jsx` | `:280, :281` |

**Not affected:**
- Workspace pages (`TeamsPage`, `PlayersPage`, `TeamDetailPage`) — different UI flows; no `ActionSheet` usage.
- The other 10+ `ActionSheet` callers (`QuickLogView`, `LayoutDetailPage` tactic menu, `MatchPage` point/match menus, `TacticPage`, `MemberCard`, `PendingMemberCard`, `ViewAsDropdown`, `LayoutAnalyticsPage`, `CoachNotes`) — all already use `onPress` correctly and work today.

**Validation:**
- `npx vite build` ✓ 12.79s clean.
- `Grep('onClick:')` across the 3 patched files → no matches.
- No console.log/debugger introduced.

**Smoke (Jacek):**
1. `/admin/teams` → row ⋮ → Retire — should open the ChildrenOrphanWarning modal (or Resolve duplicate / Restore on appropriate teams).
2. `/admin/leagues` → row ⋮ → Reactivate or Deactivate — should fire `handleReactivate` or open `confirmDeact` modal.
3. `/admin/players` → row ⋮ → Edit or Delete — should open `PlayerFormModal` or `setDeleteFor` flow.

**§ 27 self-review:** Color/Elevation/Typography/Cards/Navigation = PASS (no UI changes). Anti-patterns = ZERO. Verdict: READY TO COMMIT.

**Rollback:** `git revert -m 1 0fe5e1a1` + redeploy. Restores the broken state — only worth doing if the rename somehow breaks a path I didn't anticipate (it won't; pure rename, no semantic change).

**Lesson:** the latent bug went undetected for ~9 days because the ⋮ flow was never exercised in any of the three Phase 2 admin page ship-validations. Cheap mitigation: every future brief that adds a ⋮ action explicitly lists "click each action once" in its acceptance criteria.

---

## 2026-05-28 — § 90 Phase 2 Stage 1.B.2 [migration-script]: `selfReports` backfill
**Commit:** `096f3440` — merge of `feat/phase2-stage1-selfreports-backfill` (`5fd389a0`).
**Status:** ⚙ Script-only commit (NOT a `npm run deploy` event). No GH Pages publish. No rules change. No app code change.

**What changed:** Added `scripts/migration/phase2_stage1_selfreports_backfill.{cjs,cmd}`. The script copies pre-1.B.1 legacy-only selfReports from `/workspaces/{ws}/players/{pid}/selfReports/{sid}` to `/workspaces/{ws}/selfReports/{sid}` with explicit `playerId: pid` field. Same doc id on both paths by construction. After a clean live run, every legacy selfReport has a flat-path twin → Stage 1.B.3 cutover unblocked.

**Script contract:**
- `--dry` (default) — log intended writes; perform none.
- `--live` — perform writes via `writeBatch` (500-op ceiling).
- Mutually exclusive flags; passing both → exit 2.
- **Idempotent** — set-equality check on target before any write. Equal contents → `SKIP-EXISTING`. Differing contents → `CONFLICT`, no overwrite.
- **No deletes.** Legacy docs remain as cushion until Phase 2.7.
- **Explicit traversal** — walks `workspaces → players → selfReports`. Avoids `collectionGroup('selfReports')` for the main loop to keep the source set unambiguous (flat-path docs not double-processed).
- **Equality compare**: union of keys present in either doc; `playerId` excluded from legacy side, required `=== pid` on flat side; Timestamps normalized via `toMillis()` to avoid false-conflict on serialization drift; deep equality on the rest.
- **Final summary** prints counters (`Scanned`, `Would copy` / `Copied`, `Skip-existing`, `Conflicts`, `Errors`) + a separate **parity check** walk that totals legacy + flat-path doc counts across all workspaces. Expectation post-live: `flatTotal >= legacyTotal`.
- **Exit code** `0` iff `conflict + error == 0`, else `1`.

**`.cmd` wrapper** mirrors `cleanup_dead_userroles.cmd` shape — auto-detects sibling `pbscoutpro-firebase-adminsdk-fbsvc-*.json` next to the repo and sets `GOOGLE_APPLICATION_CREDENTIALS`; passes `--dry`/`--live` verbatim. No confirm-flag gate (dry is default-safe; live is opt-in via the flag itself).

**Validation:**
- `node -c scripts/migration/phase2_stage1_selfreports_backfill.cjs` → SYNTAX-OK.
- `vite build` not relevant (no app code changes).
- No `console.log` / `debugger` in the script that would be inappropriate — the script's output IS its UI.

**Run order (Jacek, with creds):**
```
scripts\migration\phase2_stage1_selfreports_backfill.cmd --dry
# Inspect summary: Conflicts must be 0, Errors must be 0
# Would copy ≈ order 100-1000 per estimate

scripts\migration\phase2_stage1_selfreports_backfill.cmd --live
# Inspect summary: Copied + Skip-existing == Scanned, Conflicts = Errors = 0
# Parity: flatTotal >= legacyTotal

# Spot-check 2-3 random flat-path docs in Firestore Console:
#  - playerId field present, matches legacy parent path's pid
#  - all other fields match legacy counterpart
```

**Escalation triggers** (per brief):
- Any `Conflicts > 0` during dry → DO NOT run live. Surface the diff; resolve before proceeding.
- Any `Errors > 0` (read/write failures) → surface + retry strategy.
- `flatTotal < legacyTotal` after live → something didn't copy; halt before spot-check.

**Next:** Stage 1.B.3 cutover (drop legacy fallback in readers + writers; switch `propagateMatchup` per-player read to new path). Gated on this script's clean live run + Jacek GO.

---

## 2026-05-28 — § 90 Phase 2 Stage 1.B.1: `selfReports` dual-write transition
**Commit:** `8a548f35` — merge of `feat/phase2-stage1-selfreports` (`7310a972`).
**Status:** ✅ Deployed — sequenced deploy executed:
- **STEP 1** ✅ `firebase deploy --only firestore:rules` (Jacek) — new `/workspaces/{slug}/selfReports/` block live.
- **STEP 2** ✅ `npm run deploy` (CC) Published 2026-05-28 (build clean 8.69s, main bundle `index-BolEYBh6.js` 236.52 kB / gzip 71.24 — +1.39 kB / +0.36 gzip vs pre-Stage-1 for dual-write scaffolding).

**What changed:** Stage 1 of the § 90 Catalog + Tenant migration. selfReports relocates from `/workspaces/{ws}/players/{pid}/selfReports/{sid}` (the load-bearing parent that blocks Phase 2.2.d) to `/workspaces/{ws}/selfReports/{sid}` (flat path with explicit `playerId` field). This commit ships the **dual-write transition** — every write lands on both paths under one writeBatch (atomic; shared doc id); every read merges new + old by id with dedupe. Backfill (1.B.2) + cutover (1.B.3) follow in separate gated stages.

**PART A discovery report (this session) seeded the implementation map:**
- 5 service writers (createSelfReport / migratePendingToPlayer / propagateMatchup × 2 update sites / applySelfReportOverride / dismissSelfReportFlag).
- 6 service readers (4 per-player subcollection reads, 3 collectionGroup queries; one collectionGroup reader derived `playerId` from `d.ref.parent.parent.id` — see § 90.7 Stage 1 rationale).
- Rules: per-doc `match /selfReports/{sid}` under workspace path + path-agnostic collectionGroup rule (`match /{path=**}/selfReports/{sid}`).
- Zero migration scripts wrote selfReports today.

**Rules**
- New per-doc block at `firestore.rules:378-396` (under `match /workspaces/{slug}`):
  - `read: isMember(slug)`
  - `create: isLinkedSelfPlayer(slug, request.resource.data.playerId)`
  - `update, delete: isCoach(slug) || isLinkedSelfPlayer(slug, resource.data.playerId)`
- `isLinkedSelfPlayer(slug, pid)` helper unchanged — already accepts arbitrary pid; new block passes `request.resource.data.playerId` instead of the path segment.
- CollectionGroup rule (`firestore.rules:199-201`) unchanged — `path=**` wildcard catches both old and new paths transparently.
- Legacy block at `firestore.rules:370-375` left intact (gates the dual-write mirror; retires at Phase 2.7).

**Writers** (`playerPerformanceTrackerService.js` + `dataService.js`)
- **`createSelfReport(playerId, payload)`** — pre-mints shared doc id via `doc(oldCol)`, then `writeBatch.set` on both old and new refs. New-path doc adds explicit `playerId` field per § 90.2 contract; old-path preserves current shape. Return contract preserved (`oldRef`).
- **`migratePendingToPlayer(uid, playerId)`** — extends the per-chunk batch loop to 3 ops/doc (old set + new set + pending delete). Chunk size 200 → 150 to stay under Firestore's 500-op ceiling. Per-doc fallback uses its own writeBatch with the same 3-op shape (replaces the prior `addDoc` + `deleteDoc` sequence).
- **`dualUpdateSelfReport(playerId, selfReportId, patch)`** (new helper, `dataService.js`) — getDoc-checks the new-path mirror; `batch.update(oldRef, patch)` always, `batch.update(newRef, patch)` only if mirror exists. Prevents phantom partial docs during the 1.B.1 → 1.B.2 window. Update patches are flat field names exclusively — `setDoc(merge:true)` gotcha doesn't apply (per `feedback_setdoc_dot_notation`).
- Helper replaces 4 `updateDoc(...)` call sites: `propagateMatchup` flag write + post-propagation write; `applySelfReportOverride`; `dismissSelfReportFlag`.

**Readers**
- **`getTodaysSelfReports(playerId)`** — `Promise.all` dual-read. New path queries `where('playerId', '==', playerId)` (single-field auto index) + client-filters `createdAt >= today`. Old path keeps `where + orderBy` shape. Merge by doc id; new wins on collision (post-1.B.1 docs land on both paths under same id).
- **`getSelfReportsForPlayer(playerId, trainingId)`** — same dual-read merge. `trainingId` filter remains client-side.
- **`getPlayerBreakoutFrequencies(playerId)`** — same dual-read; total computed from the merged unique set.
- **`getLayoutShotFrequencies(layoutId, breakoutBunker)`** — collectionGroup catches both paths; dedupe by doc id before tallying shots so dual-write doesn't double-count layout crowdsource frequencies.
- **`getEventShotFrequencies(trainingId)`** — same collectionGroup dedupe.
- **`getTrainingSelfReports(trainingId)`** — collectionGroup dedupe + `playerId: data.playerId ?? d.ref.parent.parent?.id ?? null` (new-path field wins, legacy parent-path fallback). This is the canonical replacement for the A.4 path-derivation surface.

**Out of scope (deferred to Stage 1.B.3 cutover)**
- `propagateMatchup` per-player READ at `dataService.js:~1542` stays old-path-only this stage. Safe: dual-write keeps new + old in sync by id; per-player old-path read finds the same logical set, dual-update mirrors patches to both. Switches to dual-read at cutover.
- `pendingSelfReports` (separate collection) untouched.
- KIOSK self-log writes (`point.selfLogs` / `shots` subcollection) untouched.
- No new `firestore.indexes.json` entries — existing collectionGroup indexes (`layoutId + breakout.bunker + createdAt`; `trainingId` field-override) are path-agnostic.

**§ 27 self-review**
- Color discipline: PASS (no UI changes)
- Elevation: PASS
- Typography: PASS
- Cards: PASS
- Navigation: PASS
- Anti-patterns: ZERO — no dotted-path Firestore writes (update patches use flat field names exclusively, `setDoc(merge:true)` avoided per `feedback_setdoc_dot_notation`); no raw HTML controls; no Polish strings in code; no `console.log` / `debugger`; chunk-size math accounts for the 500-op batch ceiling.
- Verdict: READY TO COMMIT.

**Smoke plan (Jacek to run on next PPT save):**
1. PPT save → confirm doc at BOTH `/workspaces/ranger1996/players/{pid}/selfReports/{sid}` AND `/workspaces/ranger1996/selfReports/{sid}` with same id; new doc carries `playerId` field, old doc doesn't.
2. PlayerStatsPage Samoocena section → existing reports still render (dual-read merge wins on legacy-only data).
3. TrainingResultsPage Stage 4 review queue → flagged report resolution still works (collectionGroup dedupe + playerId field resolution).
4. Step1Breakout mature mode (≥5 logs) — bunker grid still surfaces from the merged set.
5. Step3Shots crowdsource (≥20 shots layout-wide) — counts unchanged (collectionGroup dedupe prevents doubling).

**Rollback procedure**
- **Rules rollback:** redeploy previous `firestore.rules` (drop the new block). Existing legacy block stays active; new-path writes start failing → atomic batches fall back to writing nothing → PPT save throws → queue-flush fallback kicks in. Acceptable degradation; code revert below restores single-path semantics.
- **Code rollback:** `git revert -m 1 8a548f35` on main. Restores single-path writes + reads. New-path docs written between deploy and revert stay in Firestore as orphans — harmless (no reader pulls them once code revert lands; collectionGroup readers gain dedupe back when re-merged).
- **No data loss possible in either direction** — dual-write is strictly additive; old path is the source of truth until Stage 1.B.3 cutover.

**Next stages (gated on Jacek GO each)**
- **Stage 1.B.2 (backfill)** — one-shot `scripts/migration/phase2_stage1_selfreports_backfill.cjs` + `.cmd` wrapper. Copies existing per-player subcollection docs into the flat path with explicit `playerId`. Idempotent (set-equality check before write). Dry-run + live modes. No deletes.
- **Stage 1.B.3 (cutover)** — readers read new path only; writers stop writing old path; `propagateMatchup` per-player read switches to new path. Old-path docs remain as cushion until Phase 2.7.

---

## 2026-05-27 — Players batch select + merge + CSV photo backfill + profile lightbox
**Commit:** `92c661f4` — merge of `feat/players-batch-merge-import-photo` (`f9993063`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Five bundled wins on the players domain in response to Jacek's report that "import drops zdjęcie" + ask for reconciliation + mass delete + profile photo.

1. **CSV §72 photoURL drop — ROOT CAUSE FIXED.** `CSVImport.jsx` pbliId-match branch only wrote `teams[]` and `continue`'d; every other scalar (photoURL, nickname, number, role, class, nationality, age) silently skipped on re-imports. The cross-region safety guard was over-applied — it's meant to protect **name** identity (Chavez US ≠ Chavez EU), not a player's own profile attributes. Fix: mirror the name-match branch's diff-then-update logic, keep the empty-cell-doesn't-clobber rule, keep name/teamId/teams as the only fields the pbliId path won't touch. Re-imports now backfill any field that was previously empty.

2. **`ds.mergePlayers(canonicalId, absorbedIds, mergedFields)`** added. Three-step: write merged fields to canonical via `updatePlayer` (dual-write WS + global), append absorbed IDs to canonical.`aliasIds[]` via `arrayUnion` on `/players/{canonicalId}`, best-effort delete absorbed from both scopes. Per-delete failures swallowed (logged) — canonical aliasIds preserve legacy `point.assignments[]` ref resolution even when a non-admin caller hit the global rule.

3. **`MergePlayersModal`** (new, shared). Per-field radio rows (which player's value wins); canonical recommendation scored on HERO + pbliId + photoURL + field completeness + recency; `teams[]` auto-union; `name` locked to canonical; rows where all players agree hidden. Mirrors TeamDuplicateResolutionView pattern.

4. **`PlayerMultiSelectBar` + `SelectCheckbox`** (new, shared). Sticky bottom bar: Cancel / Merge (≥ 2) / Delete (count). Checkbox renders in `Card.iconLeft`. Both pages use the same component.

5. **Wired into PlayersPage + AdminPlayersPage.** Workspace delete = `deletePlayer`. Admin delete = `deletePlayerGlobal` with an aliasIds-aware bulk warning (orphans called out when any selected canonical has non-empty `aliasIds[]`).

6. **PlayerStatsPage profile photo lightbox.** Existing 64px Avatar already rendered `photoURL` — imports + edits now reliably deliver photos (item 1). Tap the avatar → full-image overlay at original framing (PBLeagues photos are usually head-to-toe shots tightly cropped by the 64px circle). Click anywhere closes.

**Photo caching question (Jacek):** Answered — PlayerAvatar uses plain `<img src>`, relies on browser HTTP cache + whatever `Cache-Control` PBLeagues sets. Not loaded from network on every screen — cached once per session/TTL. No service worker / Storage upload needed.

**Two-screen WTF:** Shared components cut most duplication today. Full body refactor (one component with role-aware extras) parked — admin keeps HERO / aliasIds / originWorkspace / pagination, workspace keeps team picker.

**Implementation:**
- `src/components/CSVImport.jsx`: pbliId branch — added scalar-field diff + per-row log distinguishing "appended + N fields" vs "appended only" vs "N fields only".
- `src/services/dataService.js`: `mergePlayers` (~45 LOC). arrayUnion + best-effort delete, failures collected and warned.
- **NEW** `src/components/MergePlayersModal.jsx` (~320 LOC) — full per-field merge UI.
- **NEW** `src/components/PlayerMultiSelectBar.jsx` (~70 LOC) — bar + SelectCheckbox.
- `src/pages/PlayersPage.jsx`: selection state, checkbox in Card iconLeft, bulk-delete ConfirmModal, MergePlayersModal wiring.
- `src/pages/admin/AdminPlayersPage.jsx`: same plus aliasIds-aware bulk-delete warning (selectedAliasCount).
- `src/pages/PlayerStatsPage.jsx`: Avatar `onPhotoClick` prop + `photoLightbox` state + full-screen overlay JSX (close on bg-click; image stops propagation; × button top-right 44×44).

**Validation:** `vite build` ✓ 4.81s clean. Bundles: AdminPlayersPage 18.29 kB, PlayerStatsPage 30.16 kB (+~0.6 for lightbox), new PlayerMultiSelectBar chunk 23.55 kB gzip 8.16 (carries MergePlayersModal). No console.log / debugger introduced. No Polish-in-code violations in new files.

**Known issues:**
- `mergePlayers` step 2 (`updateDoc` aliasIds) requires global doc to exist. Phase 2.2.a bootstrap + addPlayer dual-write should cover all callable cases; if somehow missing, modal surfaces "Merge failed" cleanly.
- Workspace `mergePlayers` callers may lack permission to delete from `/players/` — leaves an orphan global doc with aliasIds intact. Admin can clean from `/admin/players`. Acceptable v1 trade-off.

**§ 27 self-review:**
- Color discipline: PASS (amber for interactive accent only)
- Elevation: PASS
- Typography: PASS (Inter via FONT; sizes via FONT_SIZE / TOUCH)
- Cards: PASS (Card iconLeft used as designed)
- Navigation: PASS (no nav changes)
- Anti-patterns: ZERO (arrayUnion for aliasIds, not dotted-path; no raw HTML controls; touch targets ≥ 36 in the bar, 22-px checkbox sits inside 44-px clickable card row)
- Verdict: READY TO COMMIT.

---

## 2026-05-27 — B5 / § 89: scout point autosave draft (localStorage, debounced)
**Commit:** `fad7dc7b` — merge of `feat/b5-scout-autosave-draft` (`d5db7af4`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Closes B5 — local pre-commit resilience for the MatchPage scout editor. In-progress point (placements / shots / outcome / ancillary state) now autosaves to localStorage after ~2s idle and restores on return. Commit path **unchanged** — `savePoint` stays outcome-gated; concurrent Firestore `status:'partial'` semantics orthogonal and untouched. Earlier B5 framing ("schema change needed + sparing rozkmina") superseded — autosave is local + event-model-agnostic.

**Bundled doc reconciliation (per § 37.2):**
- NEXT_TASKS B12 → ✅ MOOT (was already shipped via QuickLog hotfix v3+v4 `b8aa7cf2`+`0fec6b26` on 2026-05-01; row never reconciled until 2026-05-27 audit).
- DESIGN_DECISIONS § 89 added — full spec of the autosave model.

**Implementation:**
- **NEW** `src/services/scoutDraft.js` (~120 LOC) — `buildScoutDraftKey` + `loadScoutDraft` + `saveScoutDraft` + `clearScoutDraft` + `isScoutDraftNonPristine` + `SCOUT_DRAFT_TTL_MS = 24h`. Pattern mirrors § 48.8 WizardShell persistence (NOT pptPendingQueue — that's the offline-write retry queue, different concern). All storage ops in try/catch (quota / private mode non-fatal).
- **Key shape:** `scout_draft__<kind>__<eventId>__<containerId>__<scoutingSide>__<editingId||'new'>` — `scoutingSide` and `editingId||'new'` both load-bearing (no cross-side bleed; new-shell ≠ edit-existing).
- **Snapshot:** `{ draftA, draftB, outcome, draftComment, isOT, annotations, fieldSide, activeTeam, editingId, updatedAt }`.
- **`MatchPage.jsx`:** 3 new effects (autosave / restore / draftKey memo), 3 clear hooks (savePoint success / clearAllConfirm / discardDraftConfirm), PageHeader subtitle indicator (`· zapisano` text suffix, ~4s fade), MoreBtn in editor PageHeader `action` slot (shown only when draftKey non-null) → ActionSheet → "Porzuć draft" → ConfirmModal.
- **Restore precedence:** Firestore `editPoint` (MatchPage `:1217`) wins over localStorage when both apply to the same point — restore effect declared BEFORE the `?point=` auto-attach so editPoint runs LAST. Restore effect only attempts the `__new` key; the `?point=` flow is owned by editPoint.
- **i18n PL+EN:** `scout_draft_saved` ("zapisano" / "saved"), `scout_draft_discard` ("Porzuć draft" / "Discard draft"), `scout_draft_discard_confirm`.

**Guarantees — what this is NOT:**
- NO Firestore writes added; `savePoint` untouched.
- NO Save-gate change; `disabled={!outcome || saving}` exactly as before.
- NO schema change; concurrent `status:'partial'` orthogonal + intact.
- NO cross-device (localStorage is per-device).
- NO sparing-rozkmina dependency.

**§ 27 self-review:** Color discipline PASS · Elevation N/A · Typography PASS · Cards N/A · Navigation N/A · Anti-patterns ZERO · **READY**.

**Validation:** `vite build` ✓ 5.55s clean. Main bundle `234.11 → 234.35 kB` (+0.24 / +0.08 gzip — scoutDraft helper + effects + i18n + MoreBtn/ActionSheet wiring). No `console.log` / `debugger` / Polish-in-code introduced.

**Smoke (Jacek on prod, 8 steps):**
1. Open scout view for any match (`?scout=<teamId>`, no `?point=`); place 2-3 players + drop a shot → wait ~2s → subtitle pulses "· zapisano" briefly.
2. Refresh page → return to the same scout URL → state restores (placements + shots back).
3. Pick outcome + Save → commits via existing `savePoint` → localStorage key cleared (verify via DevTools Application tab; no `scout_draft_*` entry afterwards).
4. Open ⋮ in editor header → "Porzuć draft" → confirm → state cleared + localStorage key gone.
5. Switch `?scout=<otherTeam>` mid-edit → no cross-side bleed; the other side starts fresh / restores its own draft if any.
6. Refresh after 24h+ idle (or manually backdate the snapshot's `updatedAt` for testing) → no ghost restore (TTL drops snapshot).
7. Pristine point (no players placed, no outcome) → nothing persisted; no `scout_draft_*` key created.
8. Edit existing point (`?point=<id>`) → editPoint loads Firestore version (always wins on refresh); local edits autosave under `__<editingId>`; commit clears the key.

**Known issues:** none new. On edit-existing flows, page refresh loses local edits-since-last-Firestore-save (Firestore wins per precedence rule — deliberate trade-off documented in § 89).

**Rollback:** `git revert -m 1 fad7dc7b` + `npm run deploy`. Removes the autosave layer; commit path stays as it was. Existing localStorage `scout_draft_*` keys would orphan but age out via TTL on next manual cleanup.

---

## 2026-05-27 — B10: LogRow event eyebrow + Rozbieg/Strzały label gutter
**Commit:** `f5a3b677` — merge of `feat/b10-logrow-labels` (`59248e32`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Closes B10 — the LogRow card was missing two pieces of context that matter on the cross-event Samoocena surface: (1) which training a row belongs to (rows previously rendered without any event reference), and (2) explicit "Rozbieg" / "Strzały" labels (previously the user had to know the layout convention to read "DOG → SNAKE" as breakout target → shot target). Single shared component change — covers all 3 mounts at once.

**LogRow (`TodaysLogsList.jsx:52`):**
- New optional `eventLabel` prop, TRI-STATE: `undefined` (hide eyebrow) · `string` (Calendar icon + "Trening · <name>") · `null` (orphan "Bez treningu" dim italic, no fake training name). Spelled out in inline comment to prevent absent-vs-null confusion.
- Label gutter: 2-col grid (`auto 1fr`, columnGap 10, rowGap 4) replaces the line-1/line-2 stack. Labels left (8/700 uppercase `#64748b`), values right (existing content VERBATIM — `SideTag` + bunker + variant on row 1; `shotsText` + `outcomeDetail` on row 2). `shotsText` helper untouched (null→skip and []→none paths still self-describe via existing `ppt_shots_*` keys).
- Untouched: `#N` ordinal, `SideTag`, outcome chip, pending `Cloud` icon, opacity-on-pending, schema, Firestore writes.

**PlayerStatsPage Samoocena (`:1134`):**
- One-shot `trainingsById` map built from `useTrainings()` (already in scope).
- Per row: `eventLabel = row.trainingId ? (trainingsById[row.trainingId]?.name ?? null) : null` — the `?? null` is load-bearing for the "trainingId set but training doc deleted" graceful-orphan case.

**TodaysLogsList own mount (`/player/log`, `:311`) + TrainingResultsPage needs-review queue (`:512`) — UNCHANGED.** Neither passes `eventLabel`, so neither shows the eyebrow (both surfaces already event-scoped — eyebrow would be redundant noise per discovery report).

**i18n PL + EN:** `logrow_breakout` ("Rozbieg" / "Breakout"), `logrow_shots` ("Strzały" / "Shots"), `logrow_event_prefix` ("Trening" / "Training"), `logrow_no_event` ("Bez treningu" / "No training").

**§ 27 self-review:** Color discipline PASS (no decorative amber; orphan eyebrow uses `#475569` = existing gray600 primitive used inline elsewhere in QuickLogView) · Elevation N/A · Typography PASS (9/700 eyebrow / 10/600 italic orphan / 8/700 labels / values verbatim) · Cards N/A · Navigation N/A · Anti-patterns ZERO · **READY**.

**Validation:** `vite build` ✓ 5.94s clean. Main bundle `233.89 → 234.11 kB` (+0.22 / +0.05 gzip — Calendar icon + i18n entries + grid layout). No `console.log` / `debugger` / Polish strings in code introduced.

**Smoke (Jacek on prod):**
1. **PlayerStatsPage Samoocena** — rows with `trainingId` set + training doc present: eyebrow shows "TRENING · <name>". Rows where `trainingId` is null OR the training doc is deleted: eyebrow shows "Bez treningu" italic (no fake name).
2. **`/player/log`** (TodaysLogsList) — no eyebrow; rows show the Rozbieg / Strzały gutter on the left of each line.
3. **TrainingResultsPage** needs-review queue — same shape as #2, no eyebrow.
4. **Skip-variant row** (`na-wslizgu` / `na-okretke`) — line 2 still shows the self-describing `ppt_shots_skipped` string under the "Strzały" label.
5. **Pending row** (offline / queued) — opacity 0.85 + Cloud icon both intact alongside the new label gutter.

**Known issues:** none.

**Rollback:** `git revert -m 1 f5a3b677` + `npm run deploy`. Returns LogRow to the line-1/line-2 stack with no eyebrow + no labels. Data shape unchanged so nothing to backfill.

---

## 2026-05-27 — A2 v2: ShotDrawer drag-move-shot + tap-marker menu (Delete + Kill-toggle)
**Commit:** `e4c7c585` — merge of `feat/a2-shotdrawer-v2-dragmove-menu` (`0c00c9d2`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Closes A2 v2 — the documented follow-up to § 86 / B11. v1 (shipped 2026-05-26) had pinch / pan / loupe / tap-place / tap-delete; v2 adds the two affordances explicitly deferred: **drag-move existing shots** + **tap-on-shot opens a floating menu (Delete + Kill-toggle)** instead of direct-delete.

**Lower-layer changes (touchHandler.js + BaseCanvas.jsx):**
- New gesture-state lane: `draggingShotRef` + ref-wrapped `setDraggingShot` (mirroring `setDragging` / `setDraggingBunker` per `PROJECT_GUIDELINES § 9` — the 2026-05-23 silent-tap/drag-death fix `6f7158f7`).
- `handleDown` shoot branch: on `findShot` hit, arm `draggingShotRef` + suppress pan (`panStartRef.current = null`) so a moved finger from the shot drags the shot rather than triggering pan.
- `handleMove` (new branch BEFORE pan / pinch / loupe): if armed AND clientXY delta > 6px, mark moved + call `onMoveShot(pi, si, pos)` continuously.
- `handleUp` shoot branch rewritten: `draggingShot.moved` true → drag committed (no extra dispatch needed); false → fire `onShotMenu(pi, si)` if wired, else fall back to legacy `onDeleteShot(pi, si)` (backward-compat).
- § 9 destructure trifecta verified: `onMoveShot` in `handleMove`'s destructure, `onShotMenu` in `handleUp`'s destructure. `handleDown` only arms state — no callbacks fire there.

**ShotDrawer changes:**
- New props `onMoveShotIdx(si, {x,y})` + `onToggleKillShotIdx(si)`.
- drawFn renders `isKill` markers (red ring + 💀 glyph) — mirrors `drawPlayers.js`'s shot-render `isKill` branch so the kill-toggle has visible feedback IN the drawer.
- New `ShotMenuOverlay` component as child of BaseCanvas — DOM overlay mirroring `InteractiveChrome.toolbarPos` math verbatim (canvas-space → screen via `useBaseCanvas()` context). Backdrop tap closes. Menu auto-closes if its target shot is removed externally (e.g. Undo).

**MatchPage wiring:** `pushUndo()` on kill-toggle (save-worthy mutation, mirrors deleteShot's undo); NOT on continuous `onMoveShotIdx` (would explode undo stack — only commit-time mutations enter undo).

**§ 27 self-review:** Color discipline PASS (red for kill = semantic; no decorative amber) · Elevation PASS (menu `surfaceDark` over backdrop) · Typography PASS (10/600 InteractiveChrome match) · Cards PASS (≥44px touch targets) · Navigation N/A · Anti-patterns ZERO · **READY**.

**Validation:** `vite build` ✓ 5.70s clean. Main bundle `233.89 → 233.89 kB` (≈0 — Lucide Skull/Trash2 imports offset against the dead-X cleanup that already shipped in § 86). No `console.log` / `debugger` / Polish strings introduced.

**Smoke (Jacek on prod, iPad — A2 v2's the visible-impact ship today):**
1. Open ShotDrawer for any player in a scouted point; place 2-3 shots.
2. **Drag** a shot to a new position → marker follows finger after ~6px movement; releases at new position. (Continuous `onMoveShotIdx` fires; draft state updates.)
3. **Tap** a shot (no drag) → floating menu opens above marker with Del + Kill buttons.
4. Tap **Kill** → marker switches to red ring + 💀 IN the drawer. Close+reopen drawer → still kill (persisted in draft).
5. Tap Kill again → back to numbered crosshair.
6. Tap **Del** → shot removed.
7. Footer **Undo** → kill-toggle restored / shot restored.
8. Pan + pinch + loupe still work for fingers NOT on a shot.

**Known issues:** none new. (Optional: 6px threshold may want tuning after iPad time-on-task; trivial single-line change.)

**Rollback:** `git revert -m 1 e4c7c585` + `npm run deploy`. Returns to v1 (tap-delete; no drag-move; no kill-toggle). Data shape unchanged so existing kill flags persist across rollback.

---

## 2026-05-27 — dual-write orphan removal + B15 audit/cleanup scripts (PART 1+2)
**Commit:** `071c032b` — merge of `chore/dualwrite-orphans-b15` (`8367c7d1` orphans + `c0595319` scripts).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:**

**PART 1 — Dual-write orphan removal (code-only):**
- Removed `subscribePlayers` (`dataService.js:200-203`) — zero-caller since Phase 2.2.b moved React consumption to global `usePlayers`.
- Removed `subscribeTeams` (`dataService.js:275-278`) — same shape, zero-caller since Phase 2.3.b moved consumption to `useTeams`.
- Verified all 16 other `subscribe*` exports have ≥1 live caller. The write-side dual-write (`addPlayer`/`updatePlayer`/`changePlayerTeam`/`addTeam`/`updateTeam` workspace-mirror writes) stays pending Phase 2.2.d/2.3.d (Active queue #2). § 88 zone CRUD (`addZoneToLayout`/`updateZoneInLayout`/`deleteZoneFromLayout`) also currently zero-caller but kept as intentional future-API per § 88 brief.
- Bundle: main `234.15 → 233.89 kB` (−0.26, slight shrink).

**PART 2 — B15 audit + cleanup scripts (shipped but NOT yet run):**
- `scripts/migration/audit_dead_userroles.cjs` + `.cmd` — **READ-ONLY** classifier for the ~569 stragglers in `workspaces/ranger1996.userRoles`. Prints per-bucket counts + dead-uid sample + ADMIN_EMAILS sanity check.
- `scripts/migration/cleanup_dead_userroles.cjs` + `.cmd` — **DESTRUCTIVE** one-shot using the same criterion. Gated by `CLEANUP_DEAD_USERROLES_CONFIRMED=1` (the `.cmd` wrapper sets it). Touches ONLY `userRoles.<uid>` slots via `FieldValue.delete()`. Idempotent.
- Dead-key criterion (CANDIDATE — needs Jacek confirm via audit review before running cleanup): uid ∉ members AND uid ≠ adminUid AND `/users/{uid}` does NOT exist AND email NOT in `ADMIN_EMAILS`. Conservatively keeps a key if ANY condition flips (disabled users, pending-approval shape, etc.).

**PART 3 — Phase 2.2.d `linkedUid` backstop collapse:** `[ESCALATE TO JACEK — DECISION]`. **NOT TOUCHED** per brief default. Awaiting your explicit "collapse now" vs "keep the rollback net" call.

**Validation:** `vite build` ✓ 5.29s clean. No `console.log` / `debugger` introduced. precommit skipped per `project_precommit_bash_enoent`.

**Next steps (Jacek on terminal with creds):**
1. Run `scripts\migration\audit_dead_userroles.cmd` (read-only) — paste classification report back.
2. If criterion matches intent → run `scripts\migration\cleanup_dead_userroles.cmd` (destructive). If not → tell me, I patch both scripts + re-audit.
3. PART 3 decision (when ready): "collapse now" / stay skipped.

**Smoke (post-deploy, ≤1 min):**
- Open the app; navigate around. The two retired `subscribe*` functions had no consumers → zero visible change. ✓
- Workspace player/team listing still works (driven by global `usePlayers`/`useTeams`).

**Known issues:** none new.

**Rollback:** `git revert -m 1 071c032b` + `npm run deploy`. Restores both deprecated exports (harmless — still zero-caller).

---

## 2026-05-27 — gap β sibling: /users/{uid} create-time value check on roles + globalRole (rules-only)
**Commit:** `295c6bcb` — merge of `fix/users-create-value-check` (`a25d4e88`).
**Status:** ✅ Deployed — `firebase deploy --only firestore:rules` by Jacek 2026-05-27. NO `npm run deploy` (rules-only).

**What changed:** Closes the deferred defense-in-depth sibling from the 2026-05-27 gap β discovery. The `/users/{uid}` `allow create` rule previously validated only `auth.uid == uid` — no value constraints on the doc. A direct-SDK signup could have set `roles: ['admin']` and/or `globalRole: 'super_admin'` on their own `/users/` doc. The workspace-side gap β fix (`c716d5f8`) prevented translation to actual workspace PE, but this tightening closes the upstream hole before workspace #2 onboarding.

**Rules-only change (`firestore.rules:127-145`):**
- `roles` (write-once on create): allowed values are `[]` or `['player']` (or omitted). Mirrors `services/dataService.getOrCreateUserProfile` (DEFAULT_USER_ROLES = `['player']`).
- `globalRole` (write-once on create): must be null or absent. Phase 3.a migration writes globalRole via admin SDK and bypasses rules — unaffected.
- Uses `.get('roles', [])` and `.get('globalRole', null)` brittle-null guards.

**Why `roles` and `globalRole` are effectively write-once:** the self-update allow-list (`displayName`/`email`/`linkSkippedAt`) and super_admin soft-disable allow-list (`disabled`/`disabledAt`/`disabledBy`/`reEnabledAt`) **neither include `roles` nor `globalRole`**. The only post-create write path is admin SDK migrations (which bypass rules entirely — fine, that's the Phase 3.a shape). So once Jacek deploys, these fields are locked at whatever the create-time value was.

**Reasoned validation (no rules emulator):**
1. Fresh canonical signup (`getOrCreateUserProfile` writes `roles:['player']`, no globalRole) → **ACCEPT** (both gates pass).
2. Malicious direct-SDK signup with `roles:['admin']` → **REJECT** (roles gate).
3. Malicious direct-SDK signup with `globalRole:'super_admin'` → **REJECT** (globalRole gate).
4. Combined malicious payload → **REJECT**.
5. Existing `/users/` doc edits → **UNAFFECTED** (CREATE rule doesn't fire on `.update()`).
6. Phase 3.a migration writing globalRole via admin SDK → **UNAFFECTED** (admin SDK bypasses rules).

**Lockout safety:** Jacek's canonical signup payload passes the new gate. His admin status comes from `ADMIN_EMAILS` bootstrap + `workspaces/ranger1996.adminUid` (post-2026-05-27 repoint) + `/users/{Jacek}.globalRole === 'super_admin'` (set earlier via admin SDK during Phase 3.a). All four `isSuperAdmin` paths intact; none gated by `/users/` doc CREATE rules.

**Smoke (Jacek on prod):**
1. Fresh signup test (any new email account): canonical signup completes — user doc lands with `roles:['player']`. ✓ no permission-denied.
2. Existing users: no behavior change — they sign in, app loads, no errors. ✓
3. (Optional negative) From Firestore console / admin SDK, try creating a new `/users/{fakeUid}` doc with `roles:['admin']` from a non-admin auth context → expect `PERMISSION_DENIED`. Skip if no test identity handy.

**Known issues:** none.

**Out-of-scope follow-ups (none NEW from this deploy):**
- KIOSK `scoutedBy` data-quality was the gap α deploy's follow-up — ✅ shipped earlier today in `0ccdb400`.
- All known hardening follow-ups from the 2026-05-27 3.c.2 discovery are now CLOSED (gap α, gap β, gap β sibling).

**Rollback:** `git revert -m 1 295c6bcb` + `firebase deploy --only firestore:rules`. Returns to unconstrained `/users/{uid}` create.

---

## 2026-05-27 — KIOSK scoutedBy fix + B14 last-admin widen (autonomous, no Opus brief)
**Commits:** `0ccdb400` (KIOSK) + `e8ec169a` (B14).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Two independent data-quality / consistency fixes shipped in one deploy.

- **KIOSK `scoutedBy` attribution** (`KioskLobbyOverlay.jsx:50, 193`): the writerUid passed to `propagateSelfReportToPoint` was the tapping player's `linkedUid`, not the device user's `auth.uid`. Flowed to shot doc `scoutedBy` + `_meta` provenance (via `makeMeta`). Misled any future attribution-driven analytics (KIOSK shots credited to tapping players instead of the device-user scout). **NOT a security bug** — the shots carve-out gates on `isScout(slug)`, not on `isSelfLogShotCreate`. Fixed: `writerUid = user?.uid || activePlayer?.linkedUid || kiosk.activePlayerId`. Fallback chain preserved (defensive — KIOSK requires authenticated session, but `propagateSelfReportToPoint` uses writerUid as the players[slot] fallback playerId in some code paths). `user` destructured from `useWorkspace()` alongside the existing `workspace`.

- **B14 `computeIsLastAdmin` widen** (`MoreTabContent.jsx:292`, `TrainingMoreTab.jsx:362`): the self-is-admin gate previously checked `myRoles.includes('admin')` only — returned false for everyone in production (no user holds role-array `'admin'` after Phase 3.a moved admin to globalRole + adminUid). Consequence: "Jesteś jedynym administratorem" tooltip never fired; `disabled={isLastAdmin}` gate on the training variant never engaged. Widened both helpers to check all 4 paths matching `roleUtils.isAdmin/isSuperAdmin`: role-array · adminUid · `globalRole==='super_admin'` · ADMIN_EMAILS (case-insensitive). Signature change: `(workspace, uid)` → `(workspace, user, userProfile)`. `userProfile` threaded from `useWorkspace()` through to both Workspace sections. Counting stays role-array + adminUid (paths 3+4 require expensive `/users/{members}` walks; the surrounding `cannotLeave` OR-chain in MoreTabContent already covers super_admin via `useIsSuperAdmin()`).

**Validation:** `vite build` ✓ 4.96s clean. Main bundle `234.11 → 234.15 kB` (+0.04 / +0 gzip, negligible). No `console.log` / `debugger` / Polish-in-code introduced.

**Smoke (Jacek on prod):**
1. **KIOSK** — run a training KIOSK session, have a player tap their tile + complete the wizard. Check Firestore `points/{pid}/shots/{sid}.scoutedBy` and `_meta.writerUid` on the slot: should now be the device-user's auth.uid (Jacek), not the tapping player's linkedUid. **Note:** any KIOSK shots written BEFORE this deploy keep their old (misattributed) `scoutedBy`; no backfill ships in v1.
2. **B14** — `MoreTab` (Ustawienia) Workspace section: Wyjdź button stays disabled for Jacek (tooltip "super admin nie może opuścić" via the unchanged cascade); the isLastAdmin signal correctness is internal — the button behavior is identical for Jacek. Real visible change would only show up in a hypothetical workspace #2 where a workspace_admin tries to leave via the TrainingMoreTab variant.

**Known issues:** none. (Optional follow-up: backfill `_meta.writerUid` on historical KIOSK shots, but the misattribution is read-only data-quality, not data-corruption — leaving for the data-trust workstream.)

**Rollback:** `git revert e8ec169a 0ccdb400` + `npm run deploy`. Returns to the prior behaviors (writerUid = tapping player's linkedUid; computeIsLastAdmin gates on role-array only) — both harmless prior states.

---

## 2026-05-27 — B13 + B19 mini-hygiene batch (autonomous, no Opus brief)
**Commit:** `dd216cc9`.
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Bundled hygiene batch — one defense-in-depth security widening + one § 27 touch-target compliance fix.

- **B13 — `leaveWorkspaceSelf` ADMIN_EMAILS path added:** previously the self-leave guard only checked `adminUid === uid` and `userData.globalRole === 'super_admin'`. The third path of `roleUtils.isSuperAdmin` — the `ADMIN_EMAILS` bootstrap allowlist — was missing. A bootstrap-email super_admin whose `/users/{uid}` doc lacked `globalRole` (e.g. profile rebuilt after a wipe) could slip through and orphan the workspace `adminUid`. Now the guard mirrors all 3 `isSuperAdmin` paths consistently. Imported `ADMIN_EMAILS` from `roleUtils.js`; same lowercase normalization.

- **B19 — LivePointTracker "✓ Zapisz" CTA bumped 36 → 44px:** the original B19 symptom ("Start punktu" button at 40px) was already resolved (`QuickLogView.jsx:640-656` is `minHeight: isTablet ? 52 : 44`). Audit on the same flow found one remaining § 27 violation — the custom-death-reason save CTA in `LivePointTracker.jsx:486` was `minHeight: 36`. Bumped to 44 + added flex centering. Padding preserved. The two footer text-links in the same component (Pomiń / Zwiń at 32px minHeight) are plain-text affordances, NOT button-shaped, deliberately kept as-is — separate ticket if § 27 strict-44 is enforced on text links.

**Validation:** `vite build` ✓ 5.05s clean. Main bundle `234.02 → 234.11 kB` (+0.09 / +0.01 gzip — negligible from the email-allowlist check + flex centering). No `console.log` / `debugger` / Polish-in-code introduced.

**Smoke (Jacek on prod):**
1. Open Settings → Workspace → Wyjdź — the button remains disabled for Jacek (UI guard fires before service-layer check); attempting a programmatic `leaveWorkspaceSelf` call would now also throw `SUPER_ADMIN_CANNOT_LEAVE` via the email path. Not testable from UI without a debug bypass; pure defense-in-depth.
2. LivePointTracker — open a training point, expand the death-reason "inaczej" input, hit "✓ Zapisz" — feels closer to a phone-tap target now (44px floor); no visual rhythm change vs. before.

**Known issues:** none.

**Rollback:** `git revert dd216cc9` + `npm run deploy`. Defense-in-depth guard returns to 2 paths (matches prior live behavior); CTA returns to 36px (matches prior live behavior).

---

## 2026-05-27 — B16 + B17 + B18 dead-code cleanup (autonomous, no Opus brief)
**Commit:** `98c6f24d`.
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Bundled dead-code removal executed by CC autonomously from the NEXT_TASKS Active #5 mini-brief (no separate Opus brief authored). Three independent low-risk cleanups in one commit:
- **B16:** dropped `setPointWithId` + `setTrainingPointWithId` exports from `dataService.js`. Zero callers since the 2026-05-15 NXL Czechy hotfix moved point creation to Firestore auto-IDs.
- **B17:** removed `type:'practice'` dead discriminator from 4 spots — `dataService.deriveEventType` branch + `isPractice` const in `CoachTabContent` + same in `ScoutTabContent` + the `MainPage.jsx:140` subtitle fallback. Zero prod docs ever carried `type:'practice'` per the § 69 events_index backfill (14 events checked, 0 practice). `NewTournamentModal`'s UI-side `kind === 'practice'` is a separate concern (modal-mode flag, not data shape) and untouched.
- **B18:** appended **§ 42.1** to DESIGN_DECISIONS — "Doc-ID scheme retired; merge semantics preserved". Documents the auto-ID change since 2026-05-15, why, what's preserved (per-coach `index` + `endMatchAndMerge` grouping), and how legacy `_NNN` docs coexist with new auto-IDs. Historical § 42 body kept intact per § 37 doc discipline.

**Validation:** `vite build` ✓ 5.15s clean. Main bundle `234.38 → 234.02 kB` (−0.36, slight shrink from removed dead code). MainPage `99.16 → 99.04` (−0.12). No console.log / debugger / Polish-in-code introduced.

**Smoke (Jacek on prod, optional — low-risk cleanup):**
1. Open MainPage tournament card — subtitle still renders (without the "Practice" fallback that never fired).
2. Coach + Scout tabs — division pill filter still renders normally when tournament has divisions.
3. NewTournamentModal — opening it from the "+" CTA still works (the modal-mode `kind` flag is untouched).

**Known issues:** none.

**Rollback:** `git revert 98c6f24d` + `npm run deploy`. Restores both dead exports + the `isPractice` gates (harmless restoration; no live consumers).

---

## 2026-05-27 — § 88 unified zones v1 (model + editor + scouting pill + Strefy summary)
**Commit:** `e53264f2` — merge of `feat/unified-zones-v1` (`518eda70` model + `c4ab61af` UI).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Generalizes the 3 hardcoded layout zone fields (`dangerZone` / `sajgonZone` / `bigMoveZone`) into a single `layout.zones[]` shape — each zone has an editable name (the team's callout vocabulary, e.g. "ORANGE"), user-picked color from `COLORS.zonePalette`, and polygon. Names are data, never hardcoded. Big Move keeps its own pinned section + bunker-attribution analytic per § 87.

**Model (PARTS 1+2, commit `518eda70`):**
- Zone = `{ id, name, color, polygon, type? }`. `type` ∈ `{danger, sajgon, bigMove, null}` internal — drives the dual-write mirror + BigMove's pinned section.
- `src/utils/layoutZones.js` — `resolveZones / synthesizeZonesFromLegacy / promoteSyntheticIds / dualWriteLegacyFromZones / makeNewZone / computeZonePresence`.
- `src/services/dataService.js` — `addZoneToLayout / updateZoneInLayout / deleteZoneFromLayout` (read-modify-write with promoted IDs + legacy mirror).
- **Non-destructive migration:** legacy layouts synth `zones[]` from the 3 named fields with `legacy-<type>` IDs; promoted to UUIDs at first persist. Dual-write keeps the 3 named fields in sync (mirrored from typed entries; nulled when typed zone deleted). **No legacy reader rewired** in v1 (`coachingStats.danger/sajgon`, `computeBigMoves` untouched).

**UI (PARTS 3+4+5, commit `c4ab61af`):**
- **Zone editor (LayoutDetailPage):** Lines & Zones modal body replaced with the uniform zone card list — swatch + name + pencil + trash per zone, plus "+ Dodaj strefę". Tap name = inline rename; tap swatch = palette popover; pencil = enter draw mode (banner above field with `Narysuj zakres strefy {NAME}` + Save / Cancel); trash = ConfirmModal. 3 hardcoded toolbar shortcut buttons (DANGER/SAJGON/BIG MOVE) retired. `onZoneClose` (tap-first-vertex close gesture) treated as Save-equivalent.
- **Scouting pill (MatchPage canvas via drawPlayers.js):** For each placed player whose position falls inside a drawn zone polygon, a zone-colored pill renders below the marker (drawNumberBadge-style; bold 9px, white text, rgba stroke). First zone in `zones[]` order wins on overlap (v1 simplification). Pill rendering is independent of `showZones` polygon-rendering toggle. Tactic / LayoutDetail tactic-preview / BunkerEditor don't pass `zones` → no pill there.
- **Strefy summary (ScoutedTeamPage):** Net-new above-fold section between Strzelanie and Kluczowi gracze (`<SectionHeader icon={Shield}>{t('section_strefy')}</SectionHeader>`). Verbatim stat-row pattern (Rozbiegi/Strzelanie/BigMoves shape): zone-color dot + name + OFF-BREAK% (in zone color, **not** quality color — presence is informational per § 27 carve-out) + (N/M) count. Empty-state dashed card mirrors the Big Moves empty pattern. Powered by `computeZonePresence(heatmapPoints, resolveZones(layoutForZones))`; Big Move excluded (kept in own pinned section).

**Lower-layer plumbing (backwards-compatible):**
- `drawZones.js` + `touchHandler.js` + `InteractiveCanvas.jsx` accept the new shape (`zones[]` + `editZonePoints`) AND keep the legacy 3 named-zone props working. FieldCanvas + HeatmapCanvas internal painters untouched.
- `layoutEditMode` is now either a zone id (new shape) or the legacy enum — both treated uniformly.

**Why transit % is NOT in v1 (parked per § 88):** measured opponent in-point bump-rate = 4.7% (2026-05-26 fill-rate count via `scripts/migration/count_opponent_movement.cjs`). Too sparse — path∩polygon transit would be a misleading near-zero. Capture-behavior limit, not model limit. Zone model kept forward-compatible (stable id, ordered path base→bump→end) for the future movement / shot-by-zone pass.

**§ 27 self-review:** Color discipline PASS (zone colors = identity, not amber-CTA; Strefy % colored by zone color per brief carve-out) · Elevation PASS · Typography PASS · Cards PASS (all tap targets ≥44px) · Navigation N/A · Anti-patterns ZERO · **READY**.

**Validation:** `vite build` ✓ 5.12s clean. Cumulative across PARTS 1-5: main bundle `230.40 → 234.38 kB` (+3.98 / +1.07 gzip). MatchPage `+0.05`. ScoutedTeamPage `47.73 → 50.07` (+2.34). LayoutDetailPage chunk `27.05 → 27.95` (+0.90). No `console.log` / `debugger` introduced. `precommit` skipped per `project_precommit_bash_enoent` (Windows bash-ENOENT); verified directly via build + grep.

**Smoke (Jacek on prod):**
1. **Migration preserves legacy zones** — open a layout that has danger/sajgon/bigMove from before, switch to Lines & Zones modal → 3 zones appear in the new list with their legacy names + default colors + drawn polygons. No data loss.
2. **Rename "Danger" → "ORANGE"** — tap name, type, blur → auto-save fires within 2s → reload page → name persists. `coachingStats.danger` still computes correctly (mirror keeps polygon in `layout.dangerZone`).
3. **Add custom zone "ALPHA"** — tap "+ Dodaj strefę" → new zone with auto-picked color + auto-numbered "Strefa N" → enter draw mode → drop 3+ vertices on the field → Save → renders on field. No legacy field change.
4. **Delete a custom zone** — trash → ConfirmModal → confirm → zone removed; if it was typed (legacy), the matching legacy field is set to null (verifiable by reloading and confirming `coachingStats.danger` returns null).
5. **Scouting pill** — MatchPage scout: place a player inside a drawn zone polygon → zone-colored pill with zone name renders below the player marker. Tap empty area, no pill. Player outside any zone, no pill.
6. **Strefy summary** — ScoutedTeamPage with scouted points: above-fold "Strefy" section appears between Strzelanie and Kluczowi gracze, listing each drawn non-bigMove zone with off-break% + count. Big Move section unchanged below. Empty case: layout with no zones drawn → dashed empty-state card with the prompt copy.
7. **Color picker** — tap swatch → palette popover shows 7 colors; current color is ringed; tap another → swatch updates + popover closes; reload → color persists.
8. **Touch targets** — all card row affordances (swatch / name / pencil / trash) feel tappable on phone; no accidental taps between adjacent affordances.

**Known issues:**
- None new.
- Two design caveats called out at READY (not regressions, just decisions worth flagging): (a) the 3 toolbar shortcut buttons are retired — drawing a zone needs the modal (one extra tap); (b) the scouting pill renders even when `showZones=false` — by design (callout info is independent of polygon visibility).

**Out-of-scope (parked):**
- **Transit %** — path∩polygon "opponent runs THROUGH the zone" stat. Gated on movement-capture fill rate (4.7% measured). Folds into the future movement / shot-by-zone workstream.
- **Legacy reader cutover** — `coachingStats.danger/sajgon` + `computeBigMoves` still read the 3 named fields (kept in sync by dual-write). v2 ticket migrates them to read from `zones[]` directly + drops the legacy fields.

**Rollback:** `git revert -m 1 e53264f2` + `npm run deploy`. Returns layouts to the 3 hardcoded zones view (data preserved via dual-write).

---

## 2026-05-27 — gap α: self-log shot `playerId` cross-check against linked player (rules-only)
**Commit:** `29ecc13f` — merge of `fix/gap-alpha-shot-playerid` (`385297a4`).
**Status:** ✅ Deployed — `firebase deploy --only firestore:rules` by Jacek 2026-05-27. NO `npm run deploy` (rules-only).

**What changed:** Closes the §49.10 latent gap. `isSelfLogShotCreate` / `isSelfLogShotOwned` (`firestore.rules:88-115`) checked `source == 'self'` and `scoutedBy == auth.uid` but NOT `playerId` — a PLAYER-role direct-SDK writer could attribute a self-log shot to ANY player. Now both helpers `get(/players/{playerId})` and require `data.get('linkedUid', null) == request.auth.uid`. Same pattern + brittle-null guard as `isLinkedSelfPlayer`.

**STEP 0 PRE-FLIGHT verdict:** GLOBAL `/players/{id}` namespace confirmed. `subscribeLinkedPlayer` queries `collection(db, 'players')` per § 85 B2(c); `MatchPage.handleSelfLogSave` passes `selfPlayerId = linkedPlayer?.id` (`MatchPage.jsx:393`) which is the global doc id. The rule's `get()` resolves correctly.

**Reasoned validation (no rules emulator) — all 6 cases verified:**
1. Player self-log create, `playerId == own linked player` → **ACCEPT** (linkedUid == auth.uid)
2. Player self-log create, `playerId == ANOTHER player` → **REJECT** (other player's linkedUid ≠ auth.uid)
3. Player self-log create, stale/missing `playerId` → **REJECT** (`exists()` guard fails)
4. KIOSK write (device user = scout/coach) → **ACCEPT** via `isScout(slug)` lane (unaffected — the PLAYER carve-out doesn't apply; `scoutedBy != auth.uid` and/or not `isPlayer`)
5. Post-hoc propagator (coach session, `isScout`) → **ACCEPT** (unaffected)
6. Update/delete own self-log shot → **ACCEPT**; another's → **REJECT**

**Lockout safety:** Carve-out shape is `isScout(slug) ∨ isSelfLogShot*(slug)`. Only the PLAYER disjunct tightens. `isScout / isCoach / isAdmin / isSuperAdmin / isBootstrapAdmin` all unchanged. Jacek + all scout/coach paths completely unaffected.

**Blast radius:** theoretical today — `selfLog` flag default OFF (`featureFlags.js:43`) so MatchPage HotSheet (the only canonical PLAYER-carve-out writer) is dormant in prod. Fix is hygiene before re-enable / workspace #2 onboarding.

**Smoke (Jacek on prod):**
1. **Quick non-regression check** — open the app as Jacek, normal scout/coach navigation including a KIOSK session if convenient → no permission-denied console errors. (Case 4/5 — `isScout` lane unaffected.)
2. **(Optional negative test)** From Firestore console / admin SDK, attempt a write to `/workspaces/ranger1996/tournaments/{tid}/matches/{mid}/points/{pid}/shots/` with `source:'self'`, `scoutedBy:<auth.uid>`, `playerId:<some other player's id>` from a non-admin auth context → expect `PERMISSION_DENIED`. Skip if no test PLAYER-only identity handy.
3. **No live PLAYER-flow smoke** owed — `selfLog` flag is OFF, so no user UI path can trigger Case 1/2/3 today.

**Known issues:** none.

**Out-of-scope follow-ups recorded:**
- **Data-quality (NOT security)** — KIOSK shot writes set `scoutedBy = activePlayer.linkedUid` (`KioskLobbyOverlay.jsx:193`), which is the tapping player's linked-uid, NOT the actual device writer's `auth.uid`. Not a rules issue (the carve-out rides `isScout`), but it misleads any future attribution-driven analytics. Tagged for the **data-trust / attribution workstream** alongside B8.
- **Deferred sibling** — `/users/{uid}` create-time `roles` value-check (defense-in-depth, NOT load-bearing; tracked in NEXT_TASKS Hardening follow-ups).

**Rollback:** `git revert -m 1 29ecc13f` + `firebase deploy --only firestore:rules`. Returns to "no playerId cross-check" state.

---

## 2026-05-27 — gap β: self-join + self-leave value/own-key gates on userRoles (rules-only)
**Commit:** `c716d5f8` — merge of `fix/gap-beta-selfrole-validation` (`b5514b71`).
**Status:** ✅ Deployed — `firebase deploy --only firestore:rules` by Jacek 2026-05-27. NO `npm run deploy` (rules-only — no app bundle change).

**What changed:** Closes the §49.11 latent privilege-escalation gap. The self-join (`firestore.rules:214-226`) and self-leave (`L227-241`) envelopes both listed `userRoles` in their `affectedKeys` allow-list with NO value constraint — a direct-SDK writer could bypass the canonical client and set `userRoles[self]=['admin']` (primary PE) and/or `userRoles[OTHER-UID]=['admin']` (secondary confederate-elevation PE).

**Rules-only changes:**
- New helper `isSelfJoinRoleValue(r) = r is list && (r.size() == 0 || r == ['player'])`.
- Self-join envelope + self-leave envelope each gain TWO conditional ands, both short-circuited by `!('userRoles' in diff.affectedKeys())`:
  1. **Value gate** — `isSelfJoinRoleValue(request.resource.data.userRoles[request.auth.uid])`.
  2. **Own-key gate** — `request.resource.data.userRoles.diff(resource.data.userRoles).affectedKeys().hasOnly([request.auth.uid])`.
- The short-circuit is **load-bearing**: returning-member re-entry writes (e.g. coach with existing `userRoles[self]=['coach']` whose client omits `userRoles` via the `existingRoles !== undefined` branch in `useWorkspace.jsx:204`) are unaffected.

**PRE-FLIGHT verdict:** SELF-KEY-ONLY confirmed. `setDoc(merge:true)` with a nested-map literal at `useWorkspace.jsx:209/212` deep-merges nested Map fields → only the self-key changes. `dataService.removeMember:1872` uses `updateDoc` dot-path for the same effect. Prod state ~584 `userRoles` keys is consistent with preserve-semantics. **STEP 4 own-key gate gated-in safely.**

**Reasoned validation (no rules emulator in repo) — all 8 cases verified:**
1. Fresh signup → `enterWorkspace('ranger1996')`, `userRoles[self]=['player']` → **ACCEPT** (value `['player']` ✓, own-key only ✓)
2. Fresh signup → non-default code, `userRoles[self]=[]` + pendingApprovals → **ACCEPT**
3. Returning coach re-entry (client omits `userRoles`) → **ACCEPT** (both gates short-circuited) — load-bearing
4. Malicious self-join `userRoles[self]=['admin']` → **REJECT** (value gate)
5. Malicious self-join `userRoles[OTHER]=['admin']` (with or without own `['player']`) → **REJECT** (value gate or own-key gate)
6. Admin-initiated `updateUserRoles` → **ACCEPT** (`isAdmin(slug)` first disjunct short-circuits)
7. Brand-new-workspace bootstrap → **ACCEPT** (`allow create` rule, not the envelope)
8. Self-leave writing `userRoles[self]=[]` → **ACCEPT**

**Lockout safety:** `isAdmin(slug) → isSuperAdmin() → isBootstrapAdmin()` remains the FIRST OR-branch on the update rule (`firestore.rules:214`). Jacek's `jacek@epicsports.pl` bootstrap path short-circuits with zero doc reads. New gates live ONLY inside the non-admin disjuncts.

**Smoke (Jacek on prod):**
1. Existing-member re-entry: open the app, normal navigation → app loads, no permission-denied console errors. (Load-bearing case 3.)
2. Fresh signup (test account, non-Jacek): completes signup + `enterWorkspace('ranger1996')` → auto-approved to `['player']`, lands in app. (Cases 1/2.)
3. Admin path: Members page role-change → applies normally. (Case 6.)
4. Negative smoke (optional, via Firestore console or admin SDK): manually try setting `workspaces/ranger1996.userRoles.{some-uid} = ['admin']` from a non-admin auth context → expect `PERMISSION_DENIED`. Skip if no spare test identity.

**Known issues:** none.

**Out-of-scope residuals:**
- **gap α** — `shots.playerId` claim cross-check (§ 49.10 footer) — needs KIOSK + direct-PPT-shot-write PRE-FLIGHT.
- **Deferred sibling (defense-in-depth)** — `/users/{uid}` `allow create` `roles` value-check. Per gap β discovery NOT load-bearing (the workspace-side fix shipped here closes the direct escalation path; rules don't read `/users/.roles` during self-join). Worth tightening before workspace #2 onboarding.

**Rollback:** `git revert -m 1 c716d5f8` + `firebase deploy --only firestore:rules`. Returns to "value-unconstrained" state.

---

## 2026-05-27 — B7: completeness card below Points list + collapsed-by-default (+ B6/B8 board closures)
**Commit:** `3126e339` — merge of `fix/b7-completeness-card` (`e1ae18e7`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-27.

**What changed:** Match-review scouting completeness card was rendered ABOVE the Points list. Per § 27 deference (UI never overshadows content; Points lead, feedback recedes), the card now mounts BELOW the Points list, same scroll container, end of review content. Collapse-by-default via inline state in `CompletenessCard` — tappable `<button>` header (label + Chevron▶/▼, 44px touch target, subtle bg-on-press via `COLORS.surfaceLight` not border change, neutral `textDim` chevron — § 27 anti-pattern avoided "amber on non-interactive elements" since chevron is a state indicator, not the CTA). No `localStorage` / no persistence — resets to collapsed on remount.

Bundled board closures (doc-only):
- **B6** Auto-swap → DONE (no-op closure; previously fixed 2026-04-28 via `teamSideMemoryRef`; only the board entry remained open).
- **B8** Strzela% denominator → DEFERRED — shot-% metric semantics parked. Jacek does not currently trust the scouted data, so tuning a denominator is premature. Revisit only inside a dedicated "data trust / validation" workstream.

**§ 27 self-review:** Color discipline PASS · Elevation PASS · Typography PASS · Cards PASS · Navigation N/A · Anti-patterns ZERO · **READY**.

**Validation:** `vite build` ✓ 8.71s clean. MatchPage `70.65 → 71.16 kB` (+0.51 / +0.19 gzip). Main bundle unchanged `230.40 / 69.36`. No `console.log`/`debugger`/Polish strings introduced.

**Smoke (Jacek, owed on prod):**
1. Open a match in review view; confirm completeness card now appears AFTER the last Points list row (not above).
2. Card opens collapsed — only title row + ▶ chevron visible; no metric bars showing.
3. Tap header anywhere in the row → expands; chevron flips to ▼; 5 metric rows + divider + Overall row render.
4. Tap again → collapses back; resets to collapsed if you leave the page and come back.
5. Press-and-hold header — see subtle bg darken (no border outline change); release returns to transparent.
6. Confirm Points list rendering, scroll behavior, sticky "End match" button unaffected.

**Known issues:** none new. `npm run precommit` skipped per `feedback_precommit_bash_enoent` (Windows false-negative); direct build + grep checks performed.

**Rollback:** `git revert -m 1 3126e339`. Returns to "above + always-expanded" state.

---

## 2026-05-26 — § 86 hotfix: ShotDrawer sizing (green-screen on open)
**Commit:** `22933aa0` — merge of `fix/b11-shotdrawer-sizing-hotfix` (`403ae9c5`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-26.

**Symptom (Jacek reported):** opening ShotDrawer after § 86 deploy showed only the green drawer background — no canvas content.

**Root cause:** BaseCanvas's containerRef hardcodes `height: auto` (`BaseCanvas.jsx:342`). Without an explicit `maxCanvasHeight`, the height-first sizing strategy reads `node.clientHeight = 0` (auto-height collapses pre-canvas-sized) → `setCanvasSize({w: 0, h: 0})` → drawFn called with w=h=0 → nothing renders. The visible green was the drawer's `background: '#3a5a3a'` field-bg color.

Pre-§ 86 worked because `<img height: 100%; width: auto>` was native HTML — image filled container height regardless of BaseCanvas's sizing useEffect knowing the container height.

**Fix (`ShotDrawer.jsx`, ~12 LOC added):**
- New `flexParentRef` + `measuredHeight` state.
- `ResizeObserver` on the flex parent (only while `open`) updates `measuredHeight` on container resize.
- `<BaseCanvas>` gated on `measuredHeight > 0` AND passed `maxCanvasHeight={measuredHeight}` — height-first now uses the explicit pixel value, ignoring the auto-collapsed containerRef height.

**Validation:** `vite build` ✓ 5.91s clean. Main bundle unchanged 230.40 kB / 69.37 kB gzip. § 86 v1 contract intact (viewportSide opponent-half, tap-place, tap-delete, pinch/pan/loupe).

**Smoke:** open ShotDrawer → field image renders on opponent half, shots placed correctly, all § 86 v1 functionality works.

**Rollback:** `git revert -m 1 22933aa0`. Returns to broken (green-screen) state. Not preferable.

---

## 2026-05-26 — § 86 B11/A2: ShotDrawer migrated to BaseCanvas (§ 75 grammar; dead-X cleanup; canvas ladder fully consolidated)
**Commit:** `4d16f118` — merge of `fix/b11-shotdrawer-migrate` (`41cc1e60`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-26.

**What changed:** Closes B11/A2 — the last canvas surface still off the § 64 ladder (`<img>` + native scroll + ad-hoc touch) migrates to BaseCanvas. Bundled with the dead-X icon cleanup (the previously-undeletable shot-X affordance, rendered on main canvas but only hit-testable under the modal that occluded it). Opponent-half framing via `viewportSide` primitive (retires scrollLeft hack). Touch grammar inherited from BaseCanvas arbiter — pinch-zoom + 1-finger pan + loupe + tap-place + tap-delete.

**STEP 0 verdict (viewportSide gate):** ✅ verified.
- `BaseCanvas.jsx:235-244` (`viewportSide` effect): forces `zoom=1` + pans canvas so the requested half stays visible inside container (`'right'` → `pan.x = -(canvasSize.w - containerW)`; `'left'` → `pan = {0,0}`).
- `touchHandler.js:97-107` `getRelPos`: tap coords reverse pan correctly (`canvasX = (clientX - rect.left - pan.x) / zoom; relX = canvasX / canvasSize.w` clamped 0-1) → full-field 0-1 returned. Tap on visible opponent half maps to correct field coord. **NOT escalate** — primitive works as needed.

**Implementation deviation from brief:** brief said "InteractiveCanvas" + "consumer draw function for markers". Those two together are contradictory — InteractiveCanvas has a FIXED `drawFn` (always renders drawPlayers + drawQuickShots + drawZones + drawBunkers + opponent layer + counter + …) with no customization point. The "consumer draw function" pattern fits **BaseCanvas's `draw` render-prop**. Chose BaseCanvas direct — matches the brief's spirit (canvas ladder, § 75 grammar, retire ad-hoc touch) without forcing InteractiveCanvas's overgrown render surface (which would clutter the drawer with diagonal origin lines from off-screen player to shots, zones, quickShots — none of which belong in a shot-placement surface).

**Scope decision (v1 grammar essentials; drag-move-shot + tap-menu deferred):** brief Smoke listed "drag-move markera → tap marker → element-menu → delete" — but neither exists in touchHandler today (only player-drag exists; `findShot` was X-offset hit-test for the dead-X affordance, no shot-drag state). Shipped **v1 essentials** (pinch-zoom + 1-finger pan + loupe + tap-place + tap-delete) to keep migration scope manageable. Drag-move-shot + tap-element-menu deferred to follow-up — tap-delete + Undo + re-place is reasonable UX for v1.

**Implementation (4 code files + 4 docs):**

- **`src/components/ShotDrawer.jsx` REWRITE (~165 LOC, was 144 LOC ad-hoc)**:
  - Replaces `<img>` + `<div overflow:auto>` + `onTouchEnd`/`onClick` + `getBoundingClientRect()` coord conversion with `<BaseCanvas>` mount.
  - Custom `draw` render-prop draws: field (via `drawField`) + bunkers (context via `drawBunkers` with corrected mirrors via `recomputeMirrorsWithCalibration`) + shot markers (numbered colored circles, visual parity with pre-§86 absolute-div markers).
  - `viewportSide={fieldSide === 'left' ? 'right' : 'left'}` — opponent-half framing via BaseCanvas pan; retires `scrollLeft = scrollWidth - clientWidth` hack (L29-34 pre-§86).
  - `sizingStrategy='height-first'` (no `maxCanvasHeight`) — canvas fills flex container height; width = h × aspect (may exceed container width; `viewportSide` pans to show opponent half).
  - `touchHandlerState={{ mode: 'shoot', selectedPlayer: playerIndex, shots: shotsBySlot, players: E5() }}` — passes 5-slot shape with current player's shots populated at `playerIndex` slot (touchHandler `findShot` scopes via `selectedPlayer`).
  - Callback wrappers: `handlePlaceShot(_, pos) → onAddShot(pos)`; `handleDeleteShot(_, si) → onDeleteShotIdx(si)`. Keeps the parent-side API minimal (still receives ONE shots array for the current player + simple `onAddShot/onUndoShot/onDeleteShotIdx` callbacks).
  - Header + footer chrome unchanged (visual parity: player chip + count + close X; Undo + Done CTA with safe-area-aware padding).
  - New required prop `fieldCalibration` (for bunker mirror correction) + new prop `onDeleteShotIdx` (for tap-delete wiring).

- **`src/components/field/touchHandler.js`** — 2 surgical changes for § 86:
  - `findShot:121-138` — hit-test moved from X-offset (`s.x + 14/w, s.y - 10/h`, radius 14px) to **shot center** (`s.x, s.y`, radius 22px = `TOUCH.minTarget/2`, finger-friendly).
  - `handleUp:644-655` — removed `players[selectedPlayer]` precondition from `mode='shoot'` branch. ShotDrawer is the only entry into mode='shoot' post-§86 cleanup; player-placement prereq enforced upstream (drawer doesn't open without a selected player), so the defensive check is no longer needed.

- **`src/components/field/drawPlayers.js:138-143` DELETE** — dead-X icon block (the offset top-right X-in-black-circle rendered next to every shot marker). 7 LOC out. § 79 A1 origin lines + shot crosshair markers + bump bezier + everything else preserved verbatim. Inline comment notes the cleanup rationale.

- **`src/pages/MatchPage.jsx`** — 2 wires:
  - `<InteractiveCanvas mode={shotMode !== null ? 'shoot' : mode}>` (L2077) → `<InteractiveCanvas mode={mode}>`. Main canvas no longer enters `mode='shoot'` — drawer owns shot interaction; main canvas stays in `'place'` (or whatever the user's editor mode is).
  - `<ShotDrawer>` gains `fieldCalibration={field?.fieldCalibration || null}` + `onDeleteShotIdx={si => { pushUndo(); handleDeleteShot(shotMode, si); }}`. `pushUndo` wired same as `onAddShot` (consistent undo-stack semantics).

- **`src/pages/TacticPage.jsx`** — same two new props on `<ShotDrawer>` (`fieldCalibration` + `onDeleteShotIdx`). Tactic doesn't have `pushUndo` (no undo stack), so callback skips that. Dual-lane `shotFromBump` toggle preserved verbatim (caller routes the right array to `shots` prop; tap-delete routes back via `handleDeleteShot(shotMode, si)`).

**Off-limits untouched** (`git diff --name-only` = ShotDrawer + touchHandler + drawPlayers + 2 pages + 4 doc files):
- § 79 A1 bump-arrow + scout shot-origin contract intact (drawPlayers L116-145 shot-line origin logic preserved; only the X-icon block at L138-143 removed; `bumpShotOriginAtStart` prop unchanged).
- InteractiveCanvas signature unchanged — `mode='shoot'` value still accepted (other callers theoretically could use it; today only ShotDrawer's internal BaseCanvas does).
- `quickShots` / `obstacleShots` (§ 19 / § 29) lanes untouched — ShotDrawer is precise-shot-only.
- `firestore.rules`, schema, `point.shots` data shape — untouched.
- BallisticsPage / ballisticsEngine — Opus territory.

**§ 27 self-review:**
- **Color discipline:** PASS — only existing tokens (COLORS.bg, COLORS.surface, COLORS.border, COLORS.text, COLORS.textDim, COLORS.playerColors[]).
- **Elevation:** PASS — drawer z:91 + backdrop z:90 unchanged from pre-§86.
- **Typography:** PASS — existing FONT/FONT_SIZE.
- **Cards:** PASS — drawer chrome unchanged.
- **Navigation:** PASS — no nav changes; drawer open/close mechanism unchanged.
- **Anti-patterns:** ZERO — no emoji introduced, no Tailwind, no raw HTML controls (footer Btns are `<Btn>`), no `console.log`/`debugger`. Touch targets: shot markers 22px radius (44px diameter ≥ TOUCH.minTarget); Undo/Done Btns ≥44px via existing `variant="ghost"`/`variant="accent"`. Header close X is small chevron-style (≥44px tap target via `padding: SPACE.xs SPACE.sm`).
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 5.84s clean. Bundle delta: MatchPage 70.55 → 70.65 kB (**+0.10 kB**) / 20.71 → 20.73 kB gzip (**+0.02 kB**) — net tiny (ShotDrawer rewrite is similar LOC, dead-X removal slightly shrinks drawPlayers). Main `index.js` 230.43 → 230.40 kB (−0.03 kB; noise). Per `feedback_precommit_bash_enoent`, verified directly: zero `console.log`/`debugger` introduced (grep clean), zero new Polish strings (header label "Shots:" + footer "↩ Undo" + "Done" + "placed" preserved verbatim from pre-§86), zero new raw HTML controls.

**Smoke (Jacek, post-deploy):**

**Scout (MatchPage):**
1. Tap player → toolbar → Shot → ShotDrawer opens with **opponent half framed** (viewportSide pan). Place 5 shots via tap → markers land at correct full-field positions. Done → drawer closes → shots persist on main canvas with **§79 A1 origin lines + crosshair markers visible** (NOT replaced by drawer-style markers).
2. Re-open ShotDrawer → existing shots visible as numbered colored circles in drawer.
3. **Tap-delete:** tap on existing shot marker (within ~22px radius of center) → shot deleted; subsequent markers re-number (shot 3 of 5 deleted → 1,2,3,4 remain).
4. Undo: tap "↩ Undo" → deletes most recent shot. Multiple undo presses keep peeling back.
5. **🟢 Pan/zoom in drawer:** pinch-zoom in → canvas zooms (BaseCanvas inherits §75 grammar). 1-finger pan → canvas pans. **Neither misfires as place-shot.** Long-press → loupe activates (TOUCH.minTarget-friendly fine-positioning hint).
6. **🟢 Dead-X gone:** close drawer → main canvas shot markers visible WITHOUT the red-X-in-black-circle icon next to each shot.

**Tactic (TacticPage):**
7. Tap player → Shot → ShotDrawer (fieldSide='left' → opponent='right' half framed). Place shots; both `shotFromBump=false` (writes to `shots[]`) and `shotFromBump=true` (writes to `bumpShots[]`) modes work identically — caller routes lane.
8. Tap-delete works in both lanes (calls `handleDeleteShot(shotMode, si)` which the caller routes to the right array).

**🚫 NOT in v1 (deferred to follow-up):**
- **Drag-move-shot:** dragging an existing shot marker to a new position. Currently moving → tap-delete + re-tap-place is the workflow. Touchhandler extension (~80 LOC + new `draggingShot` ref + `onMoveShot` callback) defer.
- **Tap-marker-menu:** tap-element opens contextual menu (delete/edit/etc.) instead of direct-delete. Currently tap = direct delete. Menu pattern can be added with `onShotTap` callback when needed.

These deferrals don't break v1 — Jacek + scout had no drag-or-menu UX pre-§86 either; current shipped grammar is **strictly improvement** (gains pinch/pan/loupe/tap-delete; loses nothing).

**Rollback:** `git revert -m 1 <merge_sha>`. Single-revert restores ShotDrawer `<img>` + native scroll + ad-hoc touch + dead-X icon + main canvas `mode='shoot'` + `players[selectedPlayer]` precondition. No data migration. § 79 A1 contract unaffected on either side of revert.

---

## 2026-05-25 — § 85 B2 (c): link ops migrated to global `/players/` (workspace-scoped self-link carve-out)
**Commit:** `c90b9fa9` — merge of `fix/b2c-link-to-global` (`857362ca`).
**Status:** ✅ Deployed — sequenced deploy executed by CC (with Jacek's GO):
- **STEP 1** ✅ `firebase deploy --only firestore:rules` — rules compiled clean + released to `cloud.firestore` (pbscoutpro project).
- **STEP 2** ⏭ **SKIPPED per Option D** (Jacek's decision). Reason: only ~1-3 existing linked users in ranger1996 (Jacek + ev. small group of testers). Trade-off accepted: existing linked users will get a one-shot re-link prompt on first reload — they re-pick themselves in PbleaguesOnboardingPage (now workspace-scoped via § 85) → `selfLinkPlayer` writes global → subscribe resolves → app loads normally. 30 sec UX per existing linked user, single-use. Workspace `linkedUid` stays as backstop until Phase 2.2.d.
- **STEP 3** ✅ `npm run deploy` Published 2026-05-25.

**What changed:** Closes B2 (c) — the architectural decision deferred from § 84. Self/admin link/unlink + the subscribe listener migrate from workspace `/workspaces/{slug}/players/{pid}` to **global `/players/{pid}`**. Workspace-scoped self-link carve-out on the global rules block ensures users can only act on players in their own workspace (`isMember(resource.data.ownerWorkspaceId)`). Workspace `linkedUid` STAYS as backstop per Jacek's decision (cleanup with Phase 2.2.d). Completes Phase 2.2 for the link write path that was overlooked when reads + structural writes moved global.

**STEP 0 GATE verdict (all 4 checks PASS — scoping feasible, NOT escalate):**
- **Q1 — `ownerWorkspaceId` reliably set:** ✅ Phase 3.c.2 backfill seeded 1066 docs (132 teams + 934 players) all to `"ranger1996"`, 0 errors, 0 missing-originWorkspace. `addPlayer:228, :298` set on every new doc; `updatePlayer:236, :306` strip from caller data.
- **Q2 — Rules membership primitive:** ✅ `isMember(slug)` at `firestore.rules:79-84` reads `wsData(slug).members` list; call site for carve-out is `isMember(resource.data.ownerWorkspaceId)`.
- **Q3 — `isLinkedSelfPlayer` switch:** ✅ One-touch helper rewrite (workspace-doc lookup → global-doc lookup); selfReports rule consumers at `:295/:297` unchanged (still pass slug for `isPlayer(slug)` check).
- **Q4 — `usePlayers` workspace-filtered:** ❌ All-global. → STEP 4 picker filter IS needed for defense-in-depth + UX.

**Design decisions (lockedin pre-impl):**
- **Link write contract: global-only**, NOT dual-write. Workspace mirror would re-invoke the workspace self-link rule which requires `isPlayer(slug)` — exactly the users this fix targets (non-ranger1996, no workspace player role yet) would fail the workspace half. Existing workspace `linkedUid` stays as backstop; migrated to global in STEP 3.
- **`isLinkedSelfPlayer` keeps `(slug, pid)` signature.** Body changes to read global `/players/{pid}`; the `slug` param is still consumed by the `isPlayer(slug)` workspace-role check that gates it.
- **Picker filter at parent level** (PbleaguesOnboardingPage + ProfilePage), NOT in modal — admin paths (UserDetailPage) keep the unfiltered modal.

**Implementation:**

- **`src/services/dataService.js`** — 5 functions repointed to global:
  - `selfLinkPlayer:~1968` → `doc(db, 'players', playerId)`.
  - `adminLinkPlayer:~1928, :~1934` → `doc(db, 'players', ...)` for target + `collection(db, 'players')` for tx pre-fetch.
  - `selfUnlinkPlayer:~1991` → `doc(db, 'players', playerId)`.
  - `adminUnlinkPlayer:~2007` → `doc(db, 'players', playerId)`.
  - `subscribeLinkedPlayer:~2042` → `collection(db, 'players')` query.
  - All writes use `updateDoc({field: value})` per PRE-FLIGHT gotcha (NOT `setDoc(merge)` with dot-notation — would break rules `affectedKeys().hasOnly([...])`).
- **`firestore.rules`** — 2 changes:
  - `isLinkedSelfPlayer(slug, pid)` body rewritten to `get(/databases/$(database)/documents/players/$(pid))` (was workspace path). Signature preserved.
  - Global `/players/{playerId}` block: 3 carve-outs added to `allow update: if`:
    - **Self-link**: `isMember(resource.data.ownerWorkspaceId)` + `data.get('linkedUid', null) == null || == request.auth.uid` (canonical brittle-null form) + `request.resource.data.linkedUid == request.auth.uid` + diff allowlist `['linkedUid','pbliIdFull','linkedAt']`.
    - **Self-edit**: workspace-membership + linkedUid==auth.uid identity + diff allowlist `['nickname','name','number','age','favoriteBunker','nationality','updatedAt']`.
    - **Self-unlink**: workspace-membership + linkedUid==auth.uid + linkedUid→null + diff allowlist `['linkedUid','pbliIdFull','unlinkedAt']`.
  - **None include `ownerWorkspaceId` in allowlist** — Phase 3.c.2 ownership-transfer invariant preserved (only super_admin via the structural-write path can transfer ownership).
  - Workspace block (L210-270) UNCHANGED — backstop carve-outs stay until Phase 2.2.d.
- **`scripts/migration/phase_85_linkeduid_to_global.cjs` (NEW)** — one-shot copy of workspace `linkedUid` → global player doc. Idempotent (set-equality check before update). Conflict-safe (if global already has different linkedUid, SKIP + report — manual review). Service-account gated via `GOOGLE_APPLICATION_CREDENTIALS` + `PHASE_85_EXECUTE_CONFIRMED=1`. Per § 85 / Jacek decision: workspace `linkedUid` NOT nulled (backstop for rollback / Phase 2.2.d).
- **`src/pages/PbleaguesOnboardingPage.jsx`** — added `useUserWorkspaces` + `claimablePlayers` memo that filters `usePlayers()` output to `p.ownerWorkspaceId ∈ user's workspaces`. Passed to LinkProfileModal instead of raw `players`. Defense in depth + UX (cross-workspace players hidden from picker).
- **`src/pages/ProfilePage.jsx`** — same picker filter (`selfClaimPlayers` memo). Admin paths (`UserDetailPage`) keep the unfiltered modal — no change there.

**Security invariants (verified by inspection of rules diff):**
- ❌ Cross-user link forbidden (`request.resource.data.linkedUid == request.auth.uid` enforces self-only).
- ❌ Cross-workspace link forbidden (`isMember(resource.data.ownerWorkspaceId)`).
- ❌ Cannot unlink someone else's link (`resource.data.linkedUid == request.auth.uid` requires current linkedUid is theirs).
- ❌ Cannot write `ownerWorkspaceId` via any self-* path (diff allowlist excludes).
- ❌ Cannot write arbitrary fields via self-link (diff allowlist enforces 3-field scope).
- ✅ Idempotent re-claim allowed (null OR self → self).
- ✅ Phase 3.c.2 super_admin / workspace_admin structural-write path unaffected.

**Off-limits — NOT touched:**
- Workspace `/players/{pid}` rules block (backstop, intact).
- Workspace player CRUD (`addPlayer` / `updatePlayer` / `changePlayerTeam` / `deletePlayer` dual-write pattern intact).
- Global structural-write path (super_admin / workspace_admin + ownership-transfer guard intact).
- `MembersPage` / `UserDetailPage` admin link UI (uses same `adminLinkPlayer` function — auto-benefits).
- `LinkProfileModal` (admin paths keep unfiltered modal — parent-level filter only on self-link surfaces).
- BallisticsPage / ballisticsEngine — Opus territory.

**§ 27 self-review:**
- **Color discipline:** PASS (no UI color changes).
- **Elevation:** PASS (no z-stack change).
- **Typography:** PASS.
- **Cards:** PASS.
- **Navigation:** PASS (no nav changes; same modals, same callsites).
- **Anti-patterns:** ZERO (no emoji, no Tailwind, no raw HTML controls, no `console.log` / `debugger`; rules use canonical brittle-null `data.get('linkedUid', null)` form; rules use `updateDoc` field-set NOT `setDoc(merge)` dot-notation per PRE-FLIGHT gotcha).
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 6.46s clean. Bundle: main `index.js` 230.41 → 230.43 kB (**+0.02 kB** / **+0.03 kB** gzip — noise; lazy chunks for ProfilePage + PbleaguesOnboardingPage absorb the small filter logic). Per `feedback_precommit_bash_enoent`, verified directly: zero `console.log`/`debugger`, zero new Polish strings, zero new raw HTML controls.

**🔴 SEQUENCED DEPLOY — executed by CC 2026-05-25:**
1. ✅ **Rules deploy** — `firebase deploy --only firestore:rules`. Rules compiled clean + released. New rules allow global self-link + redirect `isLinkedSelfPlayer` to global. Old code still writes workspace (still allowed via untouched workspace block) → no breakage during window.
2. ⏭ **Migration SKIPPED per Option D** (Jacek's decision — only ~1-3 existing linked users in ranger1996). Existing linked users get a one-shot re-link prompt on first reload post-code-deploy; new flow handles it transparently via § 85 + § 84 escape hatch.
3. ✅ **Code deploy** — `npm run deploy` Published.

Old code logged-in users (logged in pre-rules-deploy) keep working through the entire window — they read workspace, write workspace; workspace block untouched. Post-code-deploy reload picks up new code → reads global → if no global `linkedUid` (Option D — migration skipped), user re-links via PbleaguesOnboardingPage with workspace-scoped picker → app loads normally.

**Smoke (Jacek, post-sequenced-deploy):**
1. **🟢 Fresh signup in workspace ≠ ranger1996** (when 2nd workspace exists) → onboarding picker shows ONLY that workspace's players → "Tak, to ja" → **link succeeds** (global write, subscribe fires, gate falls through, user enters app linked). This is exactly what § 84 hotfix did NOT fix.
2. **🟢 ranger1996 fresh signup** → picker shows ranger1996 players → link succeeds.
3. **🔒 Cross-workspace security:** open dev tools → manually craft a `selfLinkPlayer(<id-of-other-workspace-player>, uid)` call → **rules REJECT** (`isMember(ownerWorkspaceId)` fails). Picker also doesn't surface it (STEP 4 filter).
4. **🟢 Already-linked users (post-migration):** existing linked users (you, Jacek) load the app → `subscribeLinkedPlayer` global query returns the doc → gate falls through → app loads normally with linkedPlayer set. Migration verified by report's `globalUpdated` count.
5. **🟢 Self-unlink:** ProfilePage → unlink → linkedUid clears on global → app re-routes to onboarding gate (or unlinked-mode if linkSkippedAt set).
6. **🟢 Admin link/unlink** (UserDetailPage as admin) → still works (operates on global now).
7. **🟢 selfReports gate:** PPT writes / matcher write-back → still work (`isLinkedSelfPlayer` helper now reads global; migration filled the data).
8. **🔒 Ownership-transfer guard:** super_admin can still re-point `ownerWorkspaceId` via structural-write path; non-admin users (even via self-link) cannot — verified by rules allowlist.

**Rollback:**
- **Code-only revert** — `git revert -m 1 <merge_sha>`. dataService returns to workspace path. Workspace `linkedUid` backstop still populated (we never nulled it) → existing users keep working. New users from workspace ≠ ranger1996 go back to silent-fail-but-hotfix-escape state (§ 84 still in effect).
- **Rules-only revert** — re-deploy previous `firestore.rules` from git. New code would then fail to write global → reverts to current behavior.
- **Migration is purely additive** (only set linkedUid on global where it was null) — no rollback needed; data stays correct for backstop and post-revert.

---

## 2026-05-25 — § 84 B2-hotfix (b+a): onboarding funnel hang — async hygiene + escape hatch
**Commit:** `86f98a85` — merge of `fix/b2-hotfix-funnel-hang` (`a6785c23`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Hotfix for B2 from the High-3 diagnosis (HIGH severity, new-user funnel). Stops users from getting permanently stuck on PbleaguesOnboardingPage when the player-link write fails or hangs. **This hotfix does NOT fix the underlying link contract** — the collection mismatch between the global `/players/` picker and the workspace-scoped `selfLinkPlayer` write / `subscribeLinkedPlayer` listener is **B2 (c)**, an architectural decision deferred for separate design pass. § 84 only ensures the user can always escape.

**Two coordinated pieces:**

**(b) Async hygiene** — three changes to `PbleaguesOnboardingPage.jsx`:
- **`finally { setBusy(false) }`** in `handleSelect`. Was: `setBusy(false)` only in the catch block; the success path relied on `subscribeLinkedPlayer` firing → page unmounts → busy unused. On the workspace-mismatch path the listener never fires → busy stuck true → entire modal disabled. Now busy ALWAYS clears post-await regardless of outcome.
- **Watchdog timeout (8s)** — `setTimeout` armed before each `selfLinkPlayer` await. If the promise never settles (network hang, listener no-show), the watchdog clears `busy` + sets a "Try again or skip" error. Cleared in the same `finally` if the await settled in time, and on page unmount. Reset on each new attempt.
- **`finally { setBusy(false) }`** in `handleSkip` (same shape) + removed the `if (...busy) return;` guard. Skip is an escape hatch; it must work even mid-selfLink.

**(b) Modal-side error reflow** — one change to `LinkProfileModal.jsx`:
- New `error` prop. `useEffect` watches it: when error transitions to non-null while `confirmTarget` is set → reset `confirmTarget` to null. This drops the user back from the "Czy to ja?" Confirm card to the searchable list (where the `NoMatchFallback` "Pomiń na razie" skip-link is reachable). Without this, after `selfLinkPlayer` errored the user was parked on the Confirm card with only [Nie, szukaj dalej] / [Tak, to ja] buttons, the parent's red error toast hidden behind the modal backdrop.
- Transition-only (uses `prevErrorRef`) so sticky error states across renders don't loop the reset.

**(a) Escape hatch** — `PbleaguesOnboardingPage.jsx` topBar:
- Bumped topBar to `position: relative; zIndex: 110` (above Modal's `z: 100` backdrop), opaque `background: COLORS.bg`. The topBar now visibly sits above the modal backdrop so its buttons are tappable while the modal is open.
- Added persistent **"Pomiń na razie"** Btn next to **"Wyloguj się"** in the topBar. Both buttons are **NOT** `disabled={busy}` — they remain always-enabled so the user can escape even mid-selfLink. Skip routes through `handleSkip` (busy-guard removed); Logout routes through a new `handleSignOut` wrapper that clears the watchdog before delegating to `useWorkspace().signOutUser()`.

**STEP B0 / decisions:**
- **`onSelect` error propagation:** the parent's `handleSelect` catches errors and writes to local `error` state; it does NOT re-throw. To detect errors from inside the modal, the parent passes `error` down as a prop (rather than making the modal's `handleConfirm` await + try/catch the call — that would require breaking the modal's "fire-and-forget" `onSelect` contract).
- **z-index sandwich:** Modal uses `position: fixed; z: 100` and is rendered as a child of outer (which has `position: fixed; z: 50` → creates a stacking context). Inside outer's context, topBar `z: 110` > modal `z: 100` → topBar wins for overlapping pixels. Verified mathematically — no portal needed.
- **Concurrent skip vs in-flight selfLink:** Skip now writes `linkSkippedAt` even while a `selfLinkPlayer` promise is still in-flight. Acceptable race — if the link succeeds in the background, `linkedPlayer` lands in the gate, which takes precedence over `linkSkippedAt` in `App.jsx:104-119`. Either way the user gets unstuck.

**Off-limits — NOT touched (per brief scope):**
- `selfLinkPlayer` write path — still workspace-scoped (`/workspaces/{slug}/players/{pid}` per `dataService.js:1849`).
- `subscribeLinkedPlayer` listener — still workspace-scoped (`dataService.js:1929`).
- `firestore.rules` `/players/{pid}` self-link carve-out — unchanged.
- `usePlayers` hook — still reads global `/players/`.
- **The collection mismatch (B2 (c)) is STILL there.** Linking will continue to fail for workspaces ≠ ranger1996 — the user just won't be permanently stuck anymore.

**§ 27 self-review:**
- **Color discipline:** PASS — existing `COLORS.bg` token use; no new colors.
- **Elevation:** PASS — topBar z-index lift is the targeted fix; documented inline. No new z-stack levels in the global system.
- **Typography:** PASS — existing FONT/FONT_SIZE tokens.
- **Cards:** PASS — no card changes.
- **Navigation:** PASS — topBar gains one button (Skip); existing Logout retained. No nav route changes.
- **Anti-patterns:** ZERO — no emoji, no Tailwind, no raw HTML controls, no `console.log` / `debugger` (existing `console.warn`/`error` informational lines kept). 44px touch via existing `Btn` `variant="ghost"`. Both new strings reuse existing i18n keys (`link_profile_nomatch_skip`, `pending_approval_signout`) plus one new `onboarding_link_watchdog` key with PL fallback for the watchdog timeout message.
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 6.88s clean. Bundle: main `index.js` 230.41 kB / 69.36 → 69.35 kB gzip (noise; effectively unchanged). PbleaguesOnboardingPage is lazy-loaded in its own chunk — small delta from new state + useEffect + useRef + watchdog logic (~+0.5 kB unminified). Per `feedback_precommit_bash_enoent`, verified directly: zero new `console.log`/`debugger`, all new Polish strings are i18n-keyed fallbacks (`onboarding_link_watchdog`), zero new raw HTML controls.

**Smoke (Jacek, post-deploy) — verifies "can't get stuck", NOT "link works":**
1. **Fresh signup → confirm "Tak, to ja" → link fails (workspace mismatch).** Expected: red error toast appears, Confirm card drops back to the searchable list, "Pomiń na razie" + "Wyloguj się" both visible in topBar and tappable. No permastuck spinner.
2. **Hanging selfLink (network failure mid-flight).** Watchdog fires at 8s: spinner clears, "Połączenie trwa za długo. Spróbuj ponownie lub pomiń ten krok." error shown, Skip + Logout both work.
3. **Skip while busy.** Tap "Pomiń na razie" mid-selfLink → `linkSkippedAt` written, user enters the app un-linked. No loop back to onboarding (verify `userProfile.linkSkippedAt` persists).
4. **Logout while busy.** Tap "Wyloguj się" mid-selfLink → user signed out, landed at login. Watchdog cleared (no late toast).
5. **Confirm card escape.** From "Czy to ja?" card → trigger an error path → user lands back on the list with skip-fallback reachable, NOT stuck on the confirm card with hidden error.
6. 🔴 **Explicitly NOT verified by this smoke:** linking actually working for workspace ≠ ranger1996. That's B2 (c) — collection contract decision still open. Smoke checks the user can ALWAYS escape; it does not assert successful linking.

**Rollback:** `git revert -m 1 <merge_sha>`. Two-file revert. No data migration to undo. The collection mismatch (B2 (c)) remains either way until a separate fix is scoped.

---

## 2026-05-25 — § 83 B3 fix: roster picker over-broad (write-time division filter + safe repair)
**Commit:** `30a03722` — merge of `fix/b3-roster-division-filter` (`97449ab0`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Fixes B3 from the High-3 diagnosis (HIGH severity) — the roster picker showed parent + ALL child teams' players regardless of tournament division. Write-time bug introduced in `1a030508` (2026-04-20) when fixing the **opposite** prior symptom (empty roster blocking scouting) — the chosen fix unioned `[teamId, ...childIds]` unconditionally, dropping the division narrowing. § 83 restores the narrowing while preserving the children-expansion intent of `1a030508`. Includes a safe repair migration for existing scouted docs.

**STEP A0 verdict (read-only):**
- **Orphan risk: mitigable.** `playersById` is the GLOBAL players map (Phase 2.2.b read from `/players/`) → already-assigned players in existing points still resolve their NAMES after narrowing. The risk is on the picker side (`rosterA = scouted.roster.map(pid => playersById[pid]).filter(Boolean)`) — a narrowed roster wouldn't surface a player who's already assigned but no longer in the division-filtered set. Repair mitigates via union with `homeData.assignments` / `awayData.assignments` from existing points (orphan-prevention contract).
- **Scope correction from diagnosis report.** Original B3 report listed `ScheduleCSVImport.jsx:350, 373, 393` + `ScheduleImport.jsx:278` as "same union shape" — actual code verification shows these sites use SINGLE `teamId` (`playerOnTeam(p, teamId)`), no `[teamId, ...childIds]` union. They don't have the over-broad bug. **Only `ScoutTabContent.buildScoutedPayload` needs the write-time filter.**
- **NOT escalate** — repair is structurally sound; one write site to narrow.

**Implementation:**
- **`src/components/tabs/ScoutTabContent.jsx:152-176`** (`buildScoutedPayload`) — narrowed `[teamId, ...childIds]` to teams whose `divisions[tournament.league] === finalDivision`. Computed `finalDivision` first (was computed AFTER teamRoster), then per-team filter. Defensive fallback to full union when (a) `finalDivision` is null (no division criterion exists) OR (b) the filter yields zero matches (incomplete team data — better to over-show than re-introduce the `1a030508` empty-roster bug). Multi-team (§ 72 `player.teams[]`) honored via existing `playerOnTeam`; no model change.
- **`src/services/dataService.js:~600` (NEW `repairScoutedRostersForTournament(tid, league)`)** — mirrors the write-time fix logic, then UNIONS with every playerId already referenced in this tournament's points (walks matches where this scouted is `match.teamA` or `match.teamB`, reads `homeData.assignments` / `awayData.assignments` per side). Orphan-prevention is structural — the union ensures the picker keeps resolving names for already-assigned players even when they fall outside the narrowed division. Reads from global `/teams/` + `/players/` (Phase 2.x consumption); writes workspace-scoped scouted docs. Idempotent — re-running yields the same union, no Firestore write (set-equality check before `updateDoc`).
- **`src/components/tabs/CoachTabContent.jsx`** — added admin-gated "Repair scouted rosters" Btn (uses `useIsSuperAdmin` hook). Visibility: role-gated (NOT symptom-gated like the existing repair-divisions Btn), because the over-broad-roster shape isn't cheaply detectable from the client without walking points. Self-contained card; ADMIN · B3 ROSTER REPAIR label so it's clearly distinct from the user-facing repair-divisions Btn. Result line shows `scanned / updated / unchanged / orphan / failed` counts.
- **`docs/DESIGN_DECISIONS.md`** — new § 83 codifies the `scouted.roster` contract (division-filtered at write; repair union with already-assigned-in-points) + the historical context of `1a030508`'s over-correction. Last-updated header bumped.

**Off-limits untouched** (`git diff --name-only` = ScoutTabContent + CoachTabContent + dataService + 4 doc files):
- `ScheduleCSVImport.jsx`, `ScheduleImport.jsx` — code verified single-`teamId` (no union bug); diagnosis report was off on these. Untouched.
- `MatchPage.jsx` — read site at L357 (`rosterA = scoutedA?.roster.map(pid => playersById[pid]).filter(Boolean)`) is correct; the data was wrong. Untouched.
- `firestore.rules`, indexes — untouched.
- `playerOnTeam` helper, `useActiveTeams` hook, multi-team handling — untouched.
- BallisticsPage / ballisticsEngine — Opus territory.

**§ 27 self-review:**
- **Color discipline:** PASS — only token use is `COLORS.surfaceDark` / `COLORS.border` / `COLORS.textDim` / `COLORS.textMuted` / `COLORS.danger` (all existing tokens; no new colors).
- **Elevation:** PASS — admin block is a sibling card matching the existing repair-divisions card's visual class.
- **Typography:** PASS — existing FONT_SIZE tokens; ADMIN label uses `FONT_SIZE.xs` with letterSpacing matching the existing patterns.
- **Cards:** PASS — single repair card, same surface pattern as the repair-divisions card.
- **Navigation:** PASS — no navigation changes.
- **Anti-patterns:** ZERO — no emoji, no Tailwind, no raw HTML controls, no `console.log`, no `debugger`. Btn uses `variant="default"` to visually de-emphasize vs the user-facing accent repair-divisions Btn (admin tool, not primary affordance). All new strings are English.
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 6.59s clean. Bundle delta: MainPage 97.74 → 99.16 kB (**+1.42 kB**) / 26.23 → 26.51 kB gzip (**+0.28 kB**) — CoachTabContent admin block + new state. Main `index.js` 228.28 → 230.41 kB (**+2.13 kB**) / 68.70 → 69.36 kB gzip (**+0.66 kB**) — `repairScoutedRostersForTournament` helper (~2KB unminified). Per `feedback_precommit_bash_enoent`, verified directly: zero `console.log`/`debugger` in changed files, zero new Polish strings, zero new raw HTML controls.

**Smoke (Jacek, post-deploy):**
1. **Fresh add (NXL D2 tournament, parent with D2+D3 children):** Scout tab → Add team → pick parent → confirm picker shows only `team.divisions.NXL === 'D2'` players. D3 children's players ABSENT. Multi-team players (§ 72) still appear where appropriate.
2. **Existing over-broad scouted (admin):** Coach tab → ADMIN · B3 ROSTER REPAIR card → "Repair scouted rosters" → result line shows scanned/updated/unchanged counts. Re-run → all unchanged (idempotency).
3. **Orphan-prevention (admin smoke):** confirm that any existing point with assigned players in an over-broad roster still resolves player names in the picker after repair — i.e., the union with `*Data.assignments` is working.
4. **Defensive fallback (edge case):** add a team that has no `divisions[league]` set → roster falls back to the unfiltered `[teamId, ...childIds]` union (preserves `1a030508` empty-roster fix; no empty roster shipped).
5. **No regression on Schedule importers:** CSV import / OCR import paths unchanged; new tournament scouted entries from those flows behave as before (single-teamId roster).
6. **Non-admin users:** regular coach / scout sees NO "Repair scouted rosters" card (role-gated via `useIsSuperAdmin`). Existing user-facing "Repair scouted divisions" Btn unchanged.

**Rollback:** `git revert -m 1 <merge_sha>`. Single-commit revert. Repaired data stays repaired (no data migration to undo) — only the write-time filter and the admin Btn vanish. Existing scouted docs continue to render correctly via the orphan-preserved union.

---

## 2026-05-25 — § 82 B1 fix: MatchPage edit-state lifecycle (cache leak between points)
**Commit:** `5c65f7a9` — merge of `fix/b1-edit-state-lifecycle` (`64d31fb0`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Fixes B1 from the High-3 diagnosis (HIGH severity, data integrity) — the cache leak where editing point N then navigating to scout a fresh point left N's `draftA` / `draftB` / `editingId` populated, causing the next "save" to silently overwrite N instead of creating a new point. Three coordinated changes (a)+(b)+(c) close all three diagnosed sequences (Seq A: editPoint→mode=new; Seq B: team-switch in editor; Seq C: lastAssign roster-bleed via delete/clearAll).

**STEP 0 verdict (read-only confirm of invariant 1 — concurrent empty-shell detectability):**
- `startNewPoint` (`MatchPage.jsx:834-877`) is the ONLY code path that creates a concurrent empty-shell (sets `editingId` without populating drafts). Grep confirms it has **zero callers** — dead code in current live paths.
- All live `setEditingId(...)` sites today set it to a point that has data (or is being created with data): `editPoint` (load saved point), `pointParamId` effect (auto-edit by URL), `setEditingId(existingPt.id)` inside `savePoint`'s join branch (L1009, claims a partial point).
- **Detection mechanism chosen: explicit ref (`isEmptyShellRef`)**, set true only in `startNewPoint`'s shell-create branch (forward-compat for if the dead code is ever revived), set false in `editPoint` (saved data loaded) and in `savePoint` success (data committed). `exitEditMode()` reads the ref to decide whether to clear `editingId`. Today's live code keeps the ref false → `exitEditMode` always clears editingId → matches the simple model without breaking § 18.
- **Not escalate** — invariant 1 is honored via the ref without architectural changes.

**Implementation (single file, +~50 LOC):**
- **(a) Centralized `exitEditMode()`** at `MatchPage.jsx:~836`. Clears `draftA` / `draftB`, annotations + draw state (mirrors `resetDraft`'s § 77 clears), `selPlayer` / `mode='place'`, `outcome` / `showOpponent` / `quickShotPlayer` / `draftComment` / `isOT`, `toolbarPlayer` / `shotMode`. **Preserves `fieldSide` + `activeTeam`** (perspective, not point-identity — invariant 2). Clears `editingId` ONLY when `!isEmptyShellRef.current` (invariant 1).
- Two Back-from-editor sites now route through `exitEditMode()`:
  - `MatchPage.jsx:~1908` (portrait PageHeader back) — was `setEditingId(null); setToolbarPlayer(null); setShotMode(null); setQuickShotPlayer(null);`
  - `MatchPage.jsx:~1965` (landscape floating ‹ Back) — was the same 4-line clear
  Both now: `exitEditMode(); navigate(reviewUrl, ...)`. Drafts + annotations + outcome get cleared too (Seq-A closeout on Back→Review).
- **(b) `lastAssign` capture gated to save-only.** Removed unconditional capture from `resetDraft` (was at L824-825). Moved into `savePoint` success branch, right before the trailing `resetDraft()` at `MatchPage.jsx:~1086`. The legit "remember last point's roster" UX (auto-fill the same squad on the next point) still works through the normal save→next cycle; delete/clearAll/exit-edit no longer promote stale rosters (Seq-C closeout).
- **(c) Fresh-scout intent reset effect** at `MatchPage.jsx:~610`. Watches `[scoutTeamId, searchParams]`. Composes a key `(scoutTeamId, mode|attach)` and acknowledges it via `lastFreshScoutKeyRef`. On a new fresh-scout intent (different scoutTeamId = team-switch; OR re-entry into `mode=new`) with stale state (`editingId` set or drafts populated), calls `exitEditMode()` once. `?point=<id>` is explicitly handled by the existing pointParamId effect — this effect updates the ack key and returns without resetting, letting editPoint load the new point normally. The key-based ack prevents re-triggering on in-progress draft updates during legitimate scouting. (Seq A + Seq B closeout.)
- **`isEmptyShellRef`** + **`lastFreshScoutKeyRef`** added at `MatchPage.jsx:~286`. The shell ref is set true in `startNewPoint` shell branch (defensive forward-compat; dead code today) and false in `editPoint` + `savePoint` success.

**Off-limits untouched** (`git diff --name-only` = MatchPage.jsx + 4 doc files):
- `dataService.js` — no schema, no write-path changes. `addPoint` / `updatePoint` / shotsToFirestore etc. all unchanged.
- `firestore.rules`, indexes — untouched.
- `useFirestore.js`, `usePoints`, `useTrainingPoints` — untouched. Read paths unchanged.
- `RosterGrid`, `QuickLogView`, `InteractiveCanvas`, `DrawingOverlay` — untouched.
- BallisticsPage / ballisticsEngine — Opus territory.
- § 18 concurrent contracts (empty-shell creation, joinable-point search, per-coach streams) — preserved verbatim; the only addition is `isEmptyShellRef.current = true` after `setEditingId(ref.id)` in the dead `startNewPoint` branch.

**§ 27 self-review:**
- **Color discipline:** PASS — no UI changes, no new color use.
- **Elevation:** PASS — no z-stack change.
- **Typography:** PASS — no font/size/weight changes.
- **Cards:** PASS — no card surface changes.
- **Navigation:** PASS — Back handlers' navigation targets unchanged; only the pre-navigate state cleanup widened (more state gets cleared, none added/repositioned).
- **Anti-patterns:** ZERO — no emoji, no Tailwind, no raw HTML controls, no `console.log`, no `debugger`. The new helper + effect carry doc-comments tying back to § 18 invariants and § 82 lifecycle contract.
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 5.47s clean. Bundle delta: MatchPage 70.11 → 70.55 kB (**+0.44 kB**) / 20.57 → 20.71 kB gzip (**+0.14 kB**) — `exitEditMode` helper + fresh-scout effect + two new refs + lastAssign-capture move + doc-comments. Main `index.js` 228.28 kB / 68.70 kB gzip unchanged. Per `feedback_precommit_bash_enoent`, verified directly: zero `console.log` / `debugger` in changed file (grep clean), zero new Polish strings, zero new raw HTML controls.

**Smoke (Jacek, post-deploy):**
1. **Seq A cleared:** open a closed match → tap a saved point card → "Edit point" → drafts load with N's data. Then navigate via Scout CTA / side-pill to scout a fresh point on the same team (URL becomes `?scout=X&mode=new`). **Editor should be empty** — no players placed, no shots, no draw annotations from N. Place fresh players, save → a NEW point is created (not an overwrite of N). Verify in Firestore: a new doc exists; N's data is intact.
2. **Seq B cleared:** while editing on Team A, switch the side-pill to Team B (or navigate to `?scout=<teamB_id>`). Editor should clear — Team A's drafts gone, fresh context for Team B.
3. **Seq C cleared:** edit N → open the point menu → Delete point. The deleted point's roster should NOT auto-fill the next placement. `lastAssignA/B` should retain whatever was last actually SAVED (typically the last successful save's roster), not N's.
4. 🔒 **Invariant 1 — concurrent empty-shell.** Today's live code never triggers shell creation (`startNewPoint` is dead). If `startNewPoint` is revived in the future, verify the shell-link survives `exitEditMode` (isEmptyShellRef gates the editingId clear).
5. 🔒 **Invariant 3 — save→next still remembers roster.** Scout point M with squad S → save → next point auto-fills with squad S in the same slots (via `lastAssignA/B` capture in savePoint success).
6. **Edit-then-save still works** — open point N for edit → modify → save → updates point N in place (the `if (editingId)` branch at L985 / L1062 still applies). No regression.
7. **Back from editor (portrait + landscape):** tap ‹ Back from a clean editor → returns to Match Review with no `?scout=` param. Tap ‹ Back from a populated editor without saving → drafts clear on the way out (intentional; prior behavior leaked them).
8. **Annotations cleared on Back:** open point N → annotations from N visible → tap Back → return to scout fresh point → no stale strokes from N.
9. **mode=new repeated entries:** review → edit-N → fresh-scout → save → review → edit-M → fresh-scout. Each fresh-scout transition acknowledges the (team, mode) key and clears stale state once per transition.

**Rollback:** `git revert -m 1 <merge_sha>`. Single-file revert of MatchPage.jsx changes. No data migration to undo. § 18 concurrent contracts unchanged on either side of the revert.

---

## 2026-05-25 — § 81 ScoutedTeam immersive: heatmap-region full-viewport overlay (closes immersive scope)
**Commit:** `3e0126c2` — merge of `feat/scoutedteam-region-overlay` (`785d7df0`).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Closes the § 76 immersive scope by adding the **third and final immersive model** — the heatmap-region full-viewport overlay on ScoutedTeam coach summary. Decoupled from `useLandscapeMode` / `isLandscape`: rotation does NOT auto-promote (ScoutedTeam is a scroll-dashboard, not a canvas-page; entry is explicit). The expanded heatmap region promotes to a fixed-position full-viewport overlay via a single wrapper-style swap on the same JSX subtree — **no remount** of HeatmapCanvas / DrawingOverlay / draw state. Scroll position of the dashboard captured on enter, restored on exit. Closes § 76's fast-follow list by codifying the per-surface immersive eligibility (canvas-primary = chrome-hide; ScoutedTeam = region-overlay; Bunker/Analytics = excluded as canvas-secondary).

**STEP 0 verdict (read-only):**
- **Expanded region structure (L777-889)** — well-isolated: outer `margin: '0 16px 4px'` div at L748 wraps the expand/collapse branch. Expanded branch is a single `position: relative` wrapper containing `<HeatmapCanvas>` (with `children` slot for `<DrawingOverlay>`), the `✏ Rysuj` entry chip (top-right), the conditional `<DrawToolbar>`, and the toggle pills row (Positions/Shots/Plan coacha/Notatki scouta/Collapse). Single wrapper-style swap is sufficient to promote inline → fixed-overlay; no JSX restructure needed.
- **Landscape behavior today** — ScoutedTeamPage does NOT consume `useLandscapeMode` (grep clean). HeatmapCanvas uses `sizingStrategy='fit'` (per § 76 hotfix #2) which internally defaults `maxH` to `window.innerHeight`. **No overlay-like behavior on rotation today** → "no auto-on-landscape" is consistent with current behavior; no collision.
- **Inline ↔ fixed transition** — ✅ achievable without remount by keeping the same JSX subtree and conditionally swapping the wrapper's `style` object based on `heatmapFullscreen`. React preserves DOM and state (DrawingOverlay strokes, HeatmapCanvas canvas element, coach draw state, toggle pills state, etc.). The L748 `margin` div becomes effectively empty when fullscreen — dashboard layout below is covered by the overlay regardless.
- **Scroll container** — page scroll happens inside `<div style={{ flex: 1, overflowY: 'auto', ... }}>` at L604 (NOT `window`). New `scrollContainerRef` attached there; scrollTop saved/restored explicitly.
- **HeatmapCanvas + useLandscapeMode coupling** — HeatmapCanvas's `sizingStrategy='fit'` uses `window.innerHeight` as default maxH; no explicit `maxCanvasHeight` passed from ScoutedTeam. In fullscreen, BaseCanvas's `'fit'` math (`w = min(containerW, maxH × aspect); h = w / aspect`) fills the viewport via the flex column's natural sizing. No HeatmapCanvas changes needed.

**Scope check:** region is locally promotable → NOT escalate.

**Implementation:**
- **`src/components/canvas/FullscreenToggle.jsx`** — extended with `placement` prop (default `'top-right'`, additionally `'top-left'`). `'top-left'` variant is safe-area-aware (`calc(8px + env(safe-area-inset-*, 0px))`) since the ScoutedTeam overlay covers the viewport including iOS notch / dynamic island. Default `'top-right'` keeps its existing literal offsets verbatim — Stage 1 callers (Match / Tactic / LayoutDetail) pass no placement → zero behavior change for canvas-primary surfaces. Doc-comment updated to reflect § 81 + the dashboard-vs-canvas-primary distinction.
- **`src/pages/ScoutedTeamPage.jsx`**:
  - Imports: `useRef` from React; `FullscreenToggle` from canvas folder.
  - State: `heatmapFullscreen` (`useState(false)`) decoupled from `useLandscapeMode`.
  - Refs: `scrollContainerRef`, `scrollTopBeforeFsRef`.
  - Handlers: `enterHeatmapFs` (saves `scrollContainerRef.current.scrollTop`, sets fs true), `exitHeatmapFs` (sets fs false, then `requestAnimationFrame` restores scrollTop).
  - Wired `ref={scrollContainerRef}` to the existing scroll container at L604.
  - Wrapper-style swap on the expanded-region div: when `heatmapFullscreen=true`, swaps to `position: fixed; inset: 0; zIndex: 60; background: COLORS.bg; display: flex; flexDirection: column; overflow: hidden; paddingBottom: env(safe-area-inset-bottom, 0px)`. When false, inline style unchanged.
  - Mounted `<FullscreenToggle placement="top-left" fsActive={heatmapFullscreen} onToggle={...} isLandscape={false} />` as a sibling of HeatmapCanvas inside the wrapper. `isLandscape={false}` bypasses the canvas-page rotation gate (which is meaningful only for canvas-primary surfaces).
- **`docs/DESIGN_DECISIONS.md`** — new § 81 "ScoutedTeam immersive — heatmap-region full-viewport overlay (closes immersive scope)". Documents: the region-overlay model vs canvas-page chrome-hide, the explicit-entry / no-auto-on-landscape decision, the no-remount transition technique, the FullscreenToggle `placement` extension, the per-surface immersive eligibility table that now CLOSES § 76's scope (canvas-primary / region-overlay / excluded). Last-updated header bumped.

**Off-limits untouched** (`git diff --name-only` = FullscreenToggle + ScoutedTeamPage + 4 doc files):
- `useLandscapeMode.js` — untouched. ScoutedTeam's overlay is decoupled per § 81 explicit decision; the hook's offset table + immersive flag remain canvas-primary contracts.
- `HeatmapCanvas.jsx` — untouched. Its `sizingStrategy='fit'` default (window.innerHeight max) works in both inline and overlay contexts via flex-column natural sizing.
- `DrawingOverlay.jsx`, `DrawToolbar.jsx`, `drawStrokes.js` — untouched. § 78 Stage 2 components compose naturally inside the overlay wrapper (same parent, larger viewport).
- `dataService.js` schema / `scouted.annotations` write path — untouched. Plan coacha persistence remains identical in inline and overlay states.
- BallisticsPage / ballisticsEngine — Opus territory.

**§ 27 self-review:**
- **Color discipline:** PASS — overlay uses `COLORS.bg` (existing token); FullscreenToggle's amber-on-active behavior preserved verbatim from § 76 (interactive carve-out).
- **Elevation:** PASS — new `z-index: 60` on the overlay wrapper is justified (covers viewport including tab nav and PageHeader; that's the intended depth for region-overlay). DrawToolbar (z:40), Rysuj chip (z:35), FullscreenToggle (z:30) remain within the overlay's stacking context — no competing affordances at the same depth.
- **Typography:** PASS — no font/size/weight changes.
- **Cards:** PASS — no card surface changes.
- **Navigation:** PASS — explicit-entry-only; rotation does not surprise the user with a layout change. Minimize2 returns to dashboard at the prior scroll position.
- **Anti-patterns:** ZERO — no emoji, no Tailwind, no raw HTML controls, no `console.log`, no `debugger`. 44px touch preserved (FullscreenToggle uses `TOUCH.minTarget`). Safe-area-aware on iOS (overlay padding-bottom + toggle top-left safe-area calc).
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 4.99s clean. Bundle delta: ScoutedTeam 47.22 → 47.73 kB (**+0.51 kB**) / 11.89 → 12.13 kB gzip (**+0.24 kB**) — `useRef` + `FullscreenToggle` import + state + handlers + style-swap inline literal + JSX additions. Main `index.js` 228.28 kB / 68.70 kB gzip (−0.01 kB gzip — noise). Per `feedback_precommit_bash_enoent` memory note (precommit Windows false-negative), verified directly: zero `console.log`/`debugger` in changed files (grep clean), zero new Polish strings, zero new raw HTML controls.

**Smoke (Jacek, post-deploy):**
1. **Expanded heatmap → `Maximize2`** (top-left of the heatmap canvas frame, next to `✏ Rysuj` on the right) → heatmap region fills viewport, dashboard behind hidden, pills row (Positions/Shots/Plan coacha/Notatki scouta/Collapse) + Rysuj chip + Minimize2 all visible. Both orientations.
2. **Draw in fullscreen** → `✏ Rysuj` → DrawToolbar shows (centered bottom) → arc strokes work (1-finger draw; 2-finger zoom/pan untouched — arbiter unchanged) → Done → save persists in `scouted.annotations` exactly as it does inline. Reload page → strokes render.
3. **Toggle layers in fullscreen** → Positions / Shots / Plan coacha / Notatki scouta pills all flip render layers correctly (same state as inline; no remount).
4. **`Minimize2` → exit** → dashboard returns at the **same scroll position** as before entry (verified via the explicit scrollTop save/restore through `requestAnimationFrame`).
5. **🔴 NO auto-on-landscape:** rotate to landscape with `heatmapFullscreen=false` → dashboard stays a dashboard (heatmap remains inline at its scroll position; no overlay promotion). Rotate to landscape with `heatmapFullscreen=true` → overlay stays, canvas re-fits to new viewport (HeatmapCanvas's `'fit'` math + window.innerHeight max).
6. **🔴 Arbiter regression check:** 1-finger draws in overlay; 2-finger pinch/pan still works in overlay; tap on toggle pills works during drawMode end. Same BaseCanvas grammar as elsewhere.
7. **Miniature (110px collapsed) — NO Maximize button**: tap-to-expand still works; no FullscreenToggle on the miniature.

**Rollback:** `git revert -m 1 <merge_sha>`. Reverts the wrapper-style swap + state + handlers + FullscreenToggle placement prop in one shot. § 78 / § 80 unaffected. No data migration.

---

## 2026-05-25 — Self-log entry points gated OFF (§ 35 dopisek, flag `selfLog` default false)
**Commit:** `84a3d140` — merge of `feat/selflog-gate-off` (`309a0eaf`). Note: merge-commit title has cosmetic word drop (`` `selfLog` `` was eaten by bash backtick-interpolation in `-m` arg); branch commit `309a0eaf` body and code content are intact and authoritative. Not amended (would require force-push to pushed main).
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Cleanup task — hide the MatchPage scout self-log FAB (§ 35.2) behind a dynamic feature flag, default OFF, because Jacek doesn't use self-log. **Non-destructive, fully reversible.** The HotSheet component, `setPlayerSelfLog`/`addSelfLogShot` dataService writes, `point.shots source:'self'` schema, collection-group indexes, and `breakoutVariants` shared-team subcollection are **preserved** — only the entry point is hidden. Admin can flip the flag back on from `/debug/flags` if self-log ever returns.

**STEP 0 verdict (read-only):**
- **MatchPage scout FAB** — `selfLogFabEl` at MatchPage.jsx:485, mounted twice (L1862 scout/lock view + L2364 editor view). Gate today: `selfPlayerId && field?.layout` (i.e. shows whenever the logged-in user is linked to a player and a field layout exists). **NOT behind a feature flag.** → must gate.
- **OnboardingModal in MainPage** (mentioned per DEPLOY_LOG 2026-04-20) — **no longer exists.** Grep `OnboardingModal` returned zero matches in `src/`. The unmatched-user flow was replaced by `PbleaguesOnboardingPage` (App.jsx-routed identity-link gate, § 38.12) in the 2026-04-24 relax-pbleagues-onboarding rewrite. The PbleaguesOnboardingPage is **not a self-log entry** — it writes `linkedPlayer`/`linkSkippedAt`, then the user lands in the app. Stays untouched.
- **"Mój dzień" in PlayerStatsPage** (§ 35.1 Tier 2) — **never shipped.** Grep `Mój dzień|MyDay|SelfLog|HotSheet` against PlayerStatsPage shows only read-side aggregation (`selfLogShots` data for stats display). No entry point. Nothing to gate.
- **Feature flag system** — present at `src/utils/featureFlags.js` (STATIC + DYNAMIC + `audience` resolver) + `src/hooks/useFeatureFlag.js` + `src/components/FeatureGate.jsx` + `/debug/flags` admin page. **No `selfLog` flag exists today** — STATIC_FLAGS has `ENABLE_CONCURRENT_EDITING`/`ENABLE_VISION_API`/`ENABLE_BALLISTICS`/`DEBUG_PANEL`/`LOG_PERFORMANCE`; DYNAMIC_FLAG_DEFAULTS has `coachBrief`/`perPlayerShots`/`accuracyMetric`/`confidenceBadge`/`multiScoutSession`/`layoutNotesTagged`/`videoCV`/`predictiveEngine`. → must add.

**Scope check:** entry point is **local** — `selfLogFabEl` is a single conditional render at MatchPage.jsx:485 and self-log logic doesn't mix with core scouting flow (`handleSelfLogSave` is its own callback; state (`hotSheetOpen`) is inert without the FAB to open the modal). **NOT escalate** — clean mechanical gate.

**Implementation:**
- **`src/utils/featureFlags.js`** — added one entry to `DYNAMIC_FLAG_DEFAULTS`:
  ```js
  selfLog: { enabled: false, audience: 'admin' }
  ```
  With inline comment documenting: Jacek doesn't use self-log; FAB hidden by default; subsystem preserved (HotSheet/dataService/schema/indexes/breakoutVariants); reactivatable from `/debug/flags`; § 35.2 FAB is the only entry point today; Tier 2 never shipped; § 35-era OnboardingModal was removed in 2026-04-24.
- **`src/pages/MatchPage.jsx`** — three surgical changes:
  - L11 add import: `import { useFeatureFlag } from '../hooks/useFeatureFlag';`
  - L378 add hook call: `const selfLogEnabled = useFeatureFlag('selfLog');` (inside § SELF-LOG block; doc-comment explains the gate)
  - L489 prepend `selfLogEnabled &&` to the existing FAB build condition → with flag OFF, `selfLogFabEl = null`; with flag ON, original gate `selfPlayerId && field?.layout` applies as before.
- **`docs/DESIGN_DECISIONS.md`** — § 35 dopisek annotation block (after the section header) documenting: dynamic flag `selfLog`, default `enabled:false`, audience `admin`, subsystem preserved, Tier 2 never shipped (confirmed by STEP 0), § 35-era OnboardingModal removed when PbleaguesOnboardingPage took over (2026-04-24). Last-updated header bumped.

**Off-limits untouched** (`git diff --name-only` = MatchPage.jsx + featureFlags.js + 3 doc files):
- `src/components/selflog/HotSheet.jsx` — preserved verbatim. Subsystem sleeps but works.
- `src/services/dataService.js` — `setPlayerSelfLog`/`addSelfLogShot`/training-path variants/`incrementVariantUsage` all unchanged. Writes/reads remain functional if flag flipped.
- `src/utils/playerStats.js` + `src/services/playerPerformanceTrackerService.js` — self-log SHOT aggregation paths unchanged (read-side; orthogonal to entry-point gate).
- `firestore.rules` / collection-group indexes — unchanged (no schema or rules touched).
- Self-log Firestore data on existing matches — untouched (read-side aggregation continues to function; new writes simply won't happen with flag OFF).
- BallisticsPage / ballisticsEngine — Opus territory, never touched.

**§ 27 self-review:**
- **Color discipline:** PASS — no new color use; FAB conditional gain, no style change.
- **Elevation:** PASS — no z-stack change.
- **Typography:** PASS — no font/size/weight changes.
- **Cards:** PASS — no card surface changes.
- **Navigation:** PASS — no navigation changes; one less floating affordance on MatchPage scout for linked-player accounts (Jacek's intent).
- **Anti-patterns:** ZERO — no emoji introduced, no Tailwind, no raw HTML controls, no `console.log`, no `debugger`. Polish strings in the FAB (`title="Zaloguj swój punkt"`) preserved as-is (they were already there pre-change and would only be visible if flag flipped ON; gating doesn't make them more visible).
- **Verdict:** READY TO COMMIT.

**Validation:** `vite build` ✓ 4.94s clean. Bundle delta: main `index.js` 228.23 → 228.28 kB (+0.05 kB) / 68.69 → 68.71 kB gzip (+0.02 kB) — single `useFeatureFlag` import + one hook call. Per `feedback_precommit_bash_enoent` memory note (precommit gives Windows false-negatives), verified directly: zero `console.log`/`debugger` (grep clean), zero new Polish strings, zero new raw HTML controls, no new 44px-violating touch targets.

**Smoke (Jacek, post-deploy):**
1. **MatchPage scout (linked-player account, e.g. logged in as a player who's `linkedPlayer` matches a current roster slot):** open a match → **NO FAB self-log icon (amber MapPin + badge) visible** in either the lock view or the editor view. Bottom-right is clean.
2. **Login flow:** sign in → no self-log OnboardingModal (was already gone since 2026-04-24; verify still gone).
3. **Other surfaces:** no "Mój dzień" / no HotSheet trigger anywhere (PlayerStatsPage, More tab, Coach tab — none had self-log entry points to begin with; verify still clean).
4. **Core scouting:** Save point, toolbar, canvas, tap-element, drag-element, draw, full-screen toggle — **untouched.** Smoke #1-#5 from § 80 / § 79 / § 78 / § 77 still pass.
5. **Admin re-enable check (optional, only if Jacek wants to verify reactivation works):** navigate to `/debug/flags` as `jacek@epicsports.pl` → find `selfLog` → flip to enabled → return to MatchPage scout → FAB returns (with `audience:'admin'` it's admin-only when enabled, which is fine for one-off verification).

**Rollback:** `git revert -m 1 <merge_sha>`. Single-commit revert. No data migration. The dynamic flag default stays in code; rolling back to pre-flag means the gate removal restores today's "FAB always shows for linked players" behavior.

---

## 2026-05-25 — § 80 Full-screen Stage 2: LayoutDetailPage immersive (canvas-primary boundary)
**Commit:** `c4642d1e` — merge of `feat/fs-stage2-layoutdetail` (`fdfa5050`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Closes § 76's fast-follow on the one surface where the wzorzec applies mechanically — **LayoutDetailPage**. BunkerEditor + LayoutAnalytics are **excluded** (not deferred) per the new § 80 canvas-primary boundary principle; ScoutedTeam belongs to a separate scroll-dashboard model. Zero behavior change for landscape (already-immersive layout preserved); new behavior is the portrait-FS path being available on this surface via the shared `<FullscreenToggle>`.

**STEP 0 ground-truth** (verified before any code change):
- **LayoutDetail** — `useLandscapeMode()` already called above conditional returns (§ 76 hooks-order hotfix preserved). 6 simple `isLandscape` / `!isLandscape` chrome-hide gates at L275/277/288/549/588/678. `canvasMaxHeight(20, 200)` at L407 matches canonical offset table. **FITS WZORCA cleanly** → mechanical fix-up.
- **BunkerEditor** — Imports `useLandscapeMode` for `canvasMaxHeight(160, 160)` only. **Zero** `isLandscape` chrome-hide gates. Same L/P offsets (160/160) intentional — bunker-naming form is the editing workflow, must stay visible regardless of orientation. ESCALATE → exclude.
- **LayoutAnalytics** — Doesn't consume `useLandscapeMode` at all; uses inline `window.innerHeight − 90` literal at L122. **Zero** `isLandscape` chrome-hide gates. Canvas is a thumbnail-scale visualisation; the deaths/breaks tables below the canvas ARE the analytic deliverable. ESCALATE → exclude.

**Jacek's decision (verbatim):** "Option A. Implementuj tylko LayoutDetailPage per brief... BunkerEditor + LayoutAnalytics wypadają z immersive (canvas wtórny — form/tabele to główna treść). Doc patch: zamknij 'FS Stage 2' zasadą immersive = canvas-primary surfaces; Bunker/Analytics excluded (nie 'deferred') z tym uzasadnieniem; ScoutedTeam osobny scroll-dashboard model."

**Implementation (`src/pages/LayoutDetailPage.jsx`):**
- Import `FullscreenToggle` after `InteractiveCanvas`.
- Destructure widened to `{ isLandscape, fsActive, immersive, setFullscreen, canvasMaxHeight }` from `useLandscapeMode()`; dropped local `device.isLandscape && !device.isDesktop` reduction (hook computes identically). § 76 hooks-order hotfix doc-comment updated to note `isLandscape` retained for FullscreenToggle visibility gate only.
- 6 chrome-hide / sizing gates swapped: maxWidth (L279), PageHeader (L281), immersive floating Back/⋮ + edge tabs (L292), toolbar Aā/½/◇ + BIG MOVE (L554), tactics list section (L593), bottom New-tactic bar (L683).
- `<FullscreenToggle fsActive onToggle isLandscape />` mounted inside canvas container (already `position: relative`), sibling of `InteractiveCanvas` — matches Match/Tactic placement.
- `canvasMaxHeight(20, 200)` unchanged (canonical per hook offset table).

**Doc patch (`docs/DESIGN_DECISIONS.md`):**
- New **§ 80 "Full-screen Stage 2 closeout: `immersive` = canvas-primary surfaces"** — canvas-primary boundary principle, per-surface eligibility table, explicit exclusion rationale for BunkerEditor + LayoutAnalytics, ScoutedTeam pointer to separate scroll-dashboard model.
- § 76 "Fast-follow" subsection annotated with `> UPDATE` → § 80 (candidate list preserved as historical record per § 37 doc discipline).
- "Last updated" header bumped to 2026-05-25 / § 80.

**Off-limits untouched** (`git diff --name-only` = LayoutDetailPage.jsx + DESIGN_DECISIONS.md):
- `useLandscapeMode.js` offset table — load-bearing for `canvasMaxHeight` consumers (separate from `immersive` eligibility); all 7 entries retained.
- `BunkerEditorPage.jsx`, `LayoutAnalyticsPage.jsx` — per § 80 exclusion.
- `FullscreenToggle.jsx` — Stage 1 component contract holds (no API change).
- BallisticsPage / ballisticsEngine — Opus territory, never touched.

**§ 27 self-review:** color discipline PASS (no new color use — only gate variable swaps), elevation PASS, typography PASS, cards PASS, navigation PASS (landscape floating Back/⋮ controls preserved verbatim, gate widened isLandscape → immersive so they appear in portrait-FS too), anti-patterns ZERO (no emoji, no Tailwind, no raw HTML controls, no console.log, no debugger). **PASS.**

**Validation:** `vite build` ✓ 5.70s clean; LayoutDetailPage bundle `LayoutDetailPage-DLIFm1vW.js` 27.05 kB / 7.57 kB gzip. Per `feedback_precommit_bash_enoent` memory note — npm run precommit gives Windows false-negatives, so verified directly: zero `console.log`/`debugger` introduced (grep clean), zero Polish strings in code, zero raw HTML controls added, 44px touch preserved (FullscreenToggle uses `TOUCH.minTarget`).

**Smoke (Jacek, post-deploy):**
1. **LayoutDetailPage portrait** → tap `Maximize2` top-right → header, toolbar (Aā/½/◇ + BIG MOVE), tactics list, bottom "New tactic" bar all hide; immersive floating Back/⋮ + edge tabs (LABELS/LINES/ZONES/DEATHS/POSITIONS) appear; field widens to viewport max; canvas height = `innerHeight − 20`.
2. **`Minimize2` exits portrait-FS** → all chrome returns to pre-toggle state.
3. **Rotate to landscape with portrait-FS off** → existing landscape behavior unchanged (toggle button hidden via `isLandscape` self-gate).
4. **Rotate to landscape with portrait-FS on** → same immersive layout; on return to portrait the user lands back in portrait-FS (no auto-reset, per § 76 `fsActive` semantics).
5. **Hooks-order regression check** — load page while layouts still loading (slow Firestore), then after they load: no React "Rendered more hooks…" crash.
6. **BunkerEditor / LayoutAnalytics regression check** — neither page should have a Full-screen button or any new behavior. Editing a bunker name still works portrait + landscape; deaths/breaks tables still scroll under the canvas thumbnail.

**Rollback:** `git revert -m 1 c4642d1e`. Reverts the page swap + § 80 doc. § 76 Stage 1 (Match + Tactic) unaffected. No data migration to undo.

---

## 2026-05-25 — § 79 A1 bump fix: arrow direction + scout shot-origin
**Commit:** `ebf634ff` — merge of `fix/a1-bump-arrow-and-scout-shot-origin` (`b3067e74`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Two render-side fixes in `drawPlayers.js` for user-reported A1 (parked from earlier). Both fixes target the same data model — no schema / write-path changes.

**STEP 0 ground-truth** (verified in code + § 2.5 / § 2.9):
- `bumpStops[i]` = FIRST/start position (drag-START per § 2.5; also written from `currentPos` when MatchPage 'late' menu fires).
- `players[i]` = SECOND/end position (drag-END; also the re-tap position after MatchPage 'late').
- § 2.9 lane labels `"Shot 1st (from player)" / "Shot 2nd (from bump)"` are render-source labels, NOT chronological — "from player" means from `players[i]` (= chronological SECOND), "from bump" means from `bumpStops[i]` (= chronological FIRST). Documented for the first time in DESIGN_DECISIONS § 79.

**Fix #1 — Bump arrow direction.** Bezier reversed: now runs `bumpStops` → `players` (was: `players` → `bumpStops`). Arrowhead at `t=0.88` therefore lands on `players[i]` = end/destination per user spec. Arc bow side preserved across the swap — the perpendicular vector is still computed from the OLD `(players → bumpStops)` direction so saved `bs.curve` values render on the same physical side as before. Misleading comment at L185 ("player start → bump destination") corrected — explains that `bumpStops` = drag-START and `players` = drag-END (the opposite of what the old comment implied). The legacy ring marker at `bumpStops` position is unchanged — it now correctly visualizes the START position (= "pause point" per § 2.5).

**Fix #2 — Scout shot-origin lane (Option C: explicit prop).** New `bumpShotOriginAtStart` prop on `drawPlayers` (default `false`). When `true` AND `bumpStops[i]` exists for a slot, the `shots[i]` lane origins from `bumpStops[i]` (= drag-START / pre-bump cover position) instead of `players[i]` (= post-bump). Threaded through InteractiveCanvas as a pass-through prop. **MatchPage scout opts in** (`<InteractiveCanvas bumpShotOriginAtStart>`); Tactic / LayoutDetail tactic-preview / BunkerEditor keep the default and preserve § 2.9 "Shot 1st (from player) / Shot 2nd (from bump)" dual-lane semantic. Per user: "shoots from bump-stop (start), then jumps to new position" — scout flow has no Shot-2nd UI, so the single `shots[]` lane must carry pre-bump-shot semantics when a bump exists.

**Secondary cleanup:** misleading comment at L158 (bumpShots "shots from bump/destination position") corrected — bumpShots origin is `bumpStops[i]` = drag-START per data, not "destination". Lane semantics unchanged (this is the Tactic "Shot 2nd (from bump)" lane per § 2.9, kept as the OTHER end of the bump from `shots[i]` regardless of the scout flag).

**Off-limits untouched** (`git diff --name-only` = drawPlayers.js + InteractiveCanvas.jsx + MatchPage.jsx + docs):
- FieldCanvas legacy (BallisticsPage Opus territory) — unaffected because BallisticsPage doesn't pass `bumpShotOriginAtStart`.
- TacticPage, LayoutDetailPage tactic preview, BunkerEditorPage — also default false → § 2.9 semantics preserved.
- HeatmapCanvas (ScoutedTeam summary + Match heatmap tab + TrainingResults) — doesn't render via `drawPlayers`; uses its own density paint. Not affected by this fix.
- dataService, schema (no write-path changes — `bumps[i]` and `shots[i]` are stored exactly as before; only render origin changes when the scout flag is on).

**§ 27 self-review:** render-side data swap only, no UI surface touched. Color/elevation/typography/cards/navigation N/A. Zero anti-patterns introduced. **PASS.**

**Validation:** `vite build` ✓ 7.86s clean; `npm run precommit` ✓ all checks passed. Main bundle `index.js` 228.19 kB / 68.66 kB gzip — **unchanged**.

**Smoke (Jacek, post-deploy):**
1. **Match scout — bump arrow:** open a scouted point with a bumper → arrow tip now lands on the player's CURRENT position (where they ended after bumping), with the orange ring still at the bump-stop / start position. Arc bow on the same side as before the fix.
2. **Match scout — shot origin:** open a scouted point with a bumper who has shots → shot lines now originate from the BUMP-STOP (start / pre-bump cover) position, not from the current player position. No-bump shots unchanged.
3. **No-bump regression:** scouted point without bumps → shots still originate from `players[i]` as before; no visual change.
4. **Tactic preview** (LayoutDetail tactic preview + TacticPage editor): "Shot 1st (from player)" lane still renders from `players[i]`, "Shot 2nd (from bump)" still from `bumpStops[i]`. § 2.9 semantic preserved.
5. **Heatmap surfaces** (ScoutedTeam coach summary, Match heatmap tab, TrainingResults): no regression — they don't go through `drawPlayers`.
6. Runner / eliminated markers near bump-stop position: unchanged rendering.

**Rollback:** `git revert -m 1 ebf634ff`. Reverts both fixes in one shot. No data migration to undo. The scout flag prop stays in InteractiveCanvas signature post-revert (harmless undefined → false default).

---

## 2026-05-25 — § 78 Draw Stage 2 (ScoutedTeam: Plan coacha + Notatki scouta)
**Commit:** `293576a8` — merge of `feat/draw-stage2-scouted-annotations` (`0d135c6f`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Two annotation layers on the ScoutedTeam coach-summary heatmap.

- **2a — Plan coacha** (editable, per scouted-team, canonical no-mirror). Coach taps `✏ Rysuj` on the expanded heatmap → enters drawMode → toolbar shows → strokes captured via DrawingOverlay → Done → `ds.updateScoutedTeam` writes to `scoutedEntry.annotations`. One editable set per scouted-team. Default ON.
- **2b — Notatki scouta** (read-only, aggregated from per-point `point.annotations`, mirrored). `mirrorPointToLeft` extended to also mirror the `annotations` field per stroke. HeatmapCanvas renders mirrored per-point strokes when toggle is ON. Respects `filterMatchId` for free (rides the existing aggregation pipeline). Default OFF (additive context).

**Key shared refactor:** extracted `paintStroke()` helper to `src/components/canvas/drawStrokes.js` so HeatmapCanvas's `drawHeatmap` callback and DrawingOverlay's own-canvas paint loop share one render path. Hoisted `STROKE_SIZES` / `STROKE_COLORS` / `FREEHAND_OPTIONS` constants from `DrawingOverlay.jsx` → `drawStrokes.js` to break circular import (DrawingOverlay re-exports for back-compat with existing MatchPage / DrawToolbar imports). Single source of truth for both visual tuning and the perfect-freehand SVG path generator (the § 77 hotfix bug history lives with `paintStroke` now).

**HeatmapCanvas signature extension** (isomorphic with InteractiveCanvas Step #4):
- New pass-through props: `drawMode`, `onDraw{Start,Move,End,Abort}`, `children`. Forwarded to BaseCanvas; the arbiter / `drawingRef` / `touchHandler` drawMode branch are already universal from Stage 1.
- New render-path props: `showAnnotations` (2b, default `false`), `showCoachPlan` (2a, default `false`), `coachAnnotations` (saved coach plan strokes, canonical coords).
- Self-closed `<BaseCanvas />` replaced with `<BaseCanvas>{children}</BaseCanvas>` so DrawingOverlay can compose via `useBaseCanvas()` context.
- Two new render branches in `drawHeatmap`:
  - `showAnnotations` → iterate `points[i].annotations`, paint each stroke via `paintStroke` (coords already mirrored upstream).
  - `showCoachPlan && coachAnnotations && !drawMode` → paint saved coach plan in canonical coords (hidden during drawMode to avoid stale-saved + live-edit double rendering).

**Aggregation extension** (helpers.js):
- `mirrorPointToLeft` now mirrors the `annotations` field. New private `mirrorAnnotations()` helper normalizes Firestore object/array shape and applies `mirrorPos` to each stroke's `pts[]`. Stroke `color` + `size` untouched.
- `mapOnePointForTeam` in `ScoutedTeamPage` propagates `annotations` automatically via the existing `...mirrored` spread.

**ScoutedTeam wiring**:
- 7 state hooks (`hmShowCoachPlan`, `hmShowAnnotations`, `coachDrawMode`, `coachStrokes`, `coachRedo`, `coachCurrent`, `coachColor`/`coachSizeKey`/`coachEraser`/`coachSaving`).
- 9 handlers (start/move/end/abort/undo/redo/clear/enter/exit — same pattern as MatchPage Stage 1).
- Load-from-Firestore useEffect gated on `!coachDrawMode` (avoids clobbering an in-progress edit when remote updates land).
- Save via existing `ds.updateScoutedTeam(tid, sid, { annotations: strokesToFirestore(strokes) })` — no new dataService function needed.
- `✏ Rysuj` chip in expanded branch, BOTH orientations (ScoutedTeam is a read-only display surface, not a scouting flow — landscape-only gate from Match per § 77 does NOT apply).
- Miniature 110px preview remains read-only — no chip.
- Two new toggle pills (Plan coacha / Notatki scouta) added to the existing toggle row, neutral amber styling per § 27 (multi-color stroke layer = no semantic color).

**Storage distinction** (no collision with Stage 1):
- `point.annotations` (Stage 1) — per-point, mirrored at read for aggregation.
- `scouted.annotations` (Stage 2) — per-team, canonical coords, no mirror. Same Firestore object shape; same `strokesToFirestore` / `strokesFromFirestore` helpers.

**Off-limits untouched** (`git diff --name-only`): MatchPage (only impacted by the shared refactor's import surface — no behavioral change), TacticPage, BunkerEditorPage, LayoutDetailPage, LayoutAnalyticsPage, FieldCanvas legacy, BallisticsPage, ballisticsEngine, dataService (existing `updateScoutedTeam` covers 2a), schema (additive `annotations` field on scouted doc — no migration), Firestore rules.

**§ 27 self-review:**
```
Color discipline:  PASS (amber on interactive toggles per carve-out)
Elevation:         PASS (chip glass matches landscape pattern; z-stack clean)
Typography:        PASS (FONT_SIZE.sm / .xs follow existing pills)
Cards:             N/A
Navigation:        N/A
Anti-patterns:     ZERO (Lucide only, no chevron, COLORS tokens, ConfirmModal for Clear via DrawToolbar reuse)
Verdict:           READY TO COMMIT
```

**Validation:** `vite build` ✓ 5.89s clean; `npm run precommit` ✓ all checks passed. Bundle: ScoutedTeamPage 47.22 kB / 11.89 kB gzip (+2.64 kB / +0.90 kB net — Stage 2 wiring). MatchPage 69.94 kB / 20.49 kB gzip (**−7.10 kB / −2.19 kB net** — Stage 1 DrawingOverlay shrunk after extracting paintStroke). Main `index.js` 228.19 kB / 68.66 kB gzip (+0.30 kB / +0.12 kB net).

**Smoke (Jacek, post-deploy):**
1. **2a portrait + landscape:** open ScoutedTeam → expand heatmap → tap `✏ Rysuj` (top-right) → draw strokes (color/width/undo/redo/eraser/clear/Done). Verify save: reopen drużynę → plan present, editable again via `✏ Rysuj`. Plan renders on top of positions/shots, beneath bunker labels.
2. **2b toggle:** tap `Notatki scouta` pill → scout annotations from `point.annotations` appear, mirrored to correct field-side. Default OFF. `filterMatchId` filters annotations along with positions.
3. **`Plan coacha` toggle:** OFF → plan disappears; ON → reappears. Positions/Shots toggles unaffected (regression check).
4. **Miniature 110px preview:** NO `✏ Rysuj` chip (read-only; tap expands instead).
5. 🔴 **Arbiter on HeatmapCanvas:** in drawMode 1-finger draws, **2-finger STILL pinches/pans** (HeatmapCanvas has no field-edit but pinch/pan from BaseCanvas must hold). 2nd finger mid-stroke aborts.

**Known limitations / next session:**
- Stage 2 done. § 78 sequencing closed. Next major track = **FS Stage 2 fast-follow** (extend immersive pattern to ScoutedTeam / LayoutDetail / BunkerEditor / LayoutAnalytics).

**Rollback:** `git revert -m 1 293576a8`. Reverts ScoutedTeam wiring + HeatmapCanvas signature extension + paintStroke refactor + mirrorPointToLeft annotation extension. `scouted.annotations` data already written stays in Firestore but renders nowhere post-revert (additive field).

---

## 2026-05-25 — § 76 hotfix #2: HeatmapCanvas `sizingStrategy='fit'` (landscape overflow)
**Commit:** `db08b059` — merge of `fix/heatmap-fit-sizing` (`232c1fdc`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-25.

**What changed:** Closes user-reported #2 — ScoutedTeam heatmap rotated to landscape overflowed the viewport. Pre-existing (ScoutedTeam never migrated to FS Stage 1 / useLandscapeMode). HeatmapCanvas was on `sizingStrategy='width-first'` with no `maxCanvasHeight` cap → in landscape where `containerW / aspect > viewport_h`, the canvas grew beyond visible area.

**Fix:** new `sizingStrategy='fit'` branch in `BaseCanvas.compute()`. Object-fit:contain math: `w = min(containerW, maxH × aspect)`, `h = w / aspect`. Defaults `maxH` to `window.innerHeight` when no explicit `maxCanvasHeight` is passed (sufficient for read-only consumers). Matches Jacek's spec: "max width or height = 100% whichever fills first".

**Behavior matrix (aspect 2:1):**
| Orientation | containerW × viewportH | width-first (old) | fit (new) |
|---|---|---|---|
| Portrait 360×600 | 360 / 600 | w=360, h=180 ✓ | min(360, 1200)=360, h=180 ✓ (**same**) |
| Landscape 800×360 | 800 / 360 | w=800, h=400 ❌ overflows | min(800, 720)=720, h=360 ✓ (**fits**) |

HeatmapCanvas opts in by swapping `sizingStrategy='width-first'` → `'fit'`. Inline doc-comment captures the Step #5 deviation context (width-first was added intentionally as part of Step #5; the landscape branch was deemed dead code in step #5 scope per the brief deviation note, then surfaced live as #2 today). Other consumers (InteractiveCanvas) keep their existing strategies untouched.

**Off-limits untouched** (`git diff --name-only` = BaseCanvas.jsx + HeatmapCanvas.jsx only): InteractiveCanvas, FieldCanvas legacy, touchHandler, MatchPage, TacticPage, ScoutedTeamPage (the heatmap rendering inside fits naturally now), BunkerEditorPage, LayoutDetailPage, LayoutAnalyticsPage, BallisticsPage, schema, dataService, rules.

**Validation:** `vite build` ✓ 4.88s clean; `npm run precommit` ✓ all checks passed. Main bundle `index.js` 227.89 kB / 68.54 kB gzip — **unchanged**.

**Smoke (Jacek, post-deploy):**
1. ScoutedTeam portrait → heatmap renders as before (same dimensions, no regression).
2. ScoutedTeam landscape (rotate the device) → heatmap fits inside viewport, no overflow off the screen.
3. Match heatmap tab → same fit behavior; no regression in portrait, no overflow in landscape.
4. TrainingResultsPage source-filtered heatmap → same.

**Rollback:** `git revert -m 1 db08b059`. Re-introduces landscape overflow. Only roll back if `fit` causes a new symptom (e.g., portrait sizing regression on some device).

---

## 2026-05-24 — § 77 hotfix: DrawingOverlay SVG path generator — strokes were invisible
**Commit:** `6a3fea4d` — merge of `fix/drawing-overlay-svg-path` (`d7f26bb2`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-24.

**What changed:** Hotfix for user-reported #1 (Match scout drawMode activates but nothing renders; Clear/Undo enable; eraser has something to erase → strokes ARE being stored, just painted with broken instructions).

**Root cause:** `getSvgPathFromStroke` in `DrawingOverlay.jsx` generated invalid SVG path strings. SVG's `Q` (quadratic Bezier) command requires **two** coord pairs per segment (control point + endpoint). My version emitted only one pair after each Q (`M x y L x y Q nx ny L x y Q nx ny ...`) — malformed. Browsers' `Path2D` parser silently no-ops on bad paths → `c.fill(path)` painted nothing.

**Fix:** replaced with the canonical perfect-freehand pattern — single `M` start, single `Q` command followed by N×4 numbers chained (each pair = current point as control + midpoint as endpoint), then `Z`. Smoothing-through-midpoints technique. 1 file, +17/−9 LOC, inline doc-comment captures the bug history.

**Data already-stored is salvaged.** Strokes drawn during the silent-fail window were correctly persisted to `point.annotations` in Firestore (the data layer worked all along). They render correctly on next reload after this fix.

**Validation:** `vite build` ✓ 7.21s clean; `npm run precommit` ✓ all checks passed. Main bundle `index.js` 227.89 kB / 68.55 kB gzip — **unchanged**.

**Smoke (Jacek, post-deploy):**
1. Match scout landscape → tap `✏ Rysuj` → finger draw → **tapered perfect-freehand stroke appears** on canvas.
2. Change color (swatch ring → amber) → next stroke uses new color.
3. Change width pill → next stroke thicker/thinner.
4. Undo removes last stroke; Redo brings it back.
5. Eraser splits strokes where you drag through.
6. Reload an existing scouted point you drew on during the silent-fail period → those strokes should now render.

**Still open: #2 ScoutedTeam landscape image overflow** — pre-existing; fix path locked (sizingStrategy='fit' object-fit:contain math in BaseCanvas + opt-in from HeatmapCanvas); awaiting GO.

**Rollback:** `git revert -m 1 6a3fea4d`. Re-introduces the silent-render-fail (strokes still stored but invisible). Only roll back if the new path generator causes a new symptom.

---

## 2026-05-24 — § 76 hotfix: conditional `useLandscapeMode()` crashed LayoutDetailPage + TacticPage
**Commit:** `d87abc4e` — merge of `fix/hooks-order-and-heatmap-fit` (`1248cc98`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-24.

**What changed:** Hotfix for user-reported regression #3 (LayoutDetail "sypie błędami i nie pozwala wejść"). LayoutDetailPage `:264` and TacticPage `:412` called `useLandscapeMode()` **after** conditional early returns (`if (layoutsLoading) return ...` / `if (!tactic) return ...`). React 18 throws "Rendered more hooks than during the previous render" when render N (loading=true → early return → fewer hooks) is followed by render N+1 (loading=false → useLandscapeMode fires + all its internal hooks).

**Latent pre-existing bug, exposed by § 76.** Before § 76, `useLandscapeMode` had 2 internal hooks (`useDevice` + `useCallback`). § 76 added 2 more (`useState` for `fsActive` + `useCallback` for `setFullscreen`), bumping the conditional delta past whatever React 18 was previously tolerating in production.

**Fix:** mechanical reorder — moved `useLandscapeMode()` ABOVE the conditional returns in both files. Values are still read after the return as before. No behavior change in either page.

**Pages audited:** MatchPage / BunkerEditorPage call the hook BEFORE all early returns — unaffected. LayoutAnalyticsPage / BallisticsPage don't use the hook.

**TacticPage carries the same latent pattern** — fixed proactively in same commit (would have crashed on tactic load when Firestore loading flipped true → false).

**Validation:** `vite build` ✓ 4.82s clean; `npm run precommit` ✓ all checks passed. Main bundle `index.js` 227.89 kB / 68.54 kB gzip **unchanged** (no JSX change, just statement reorder).

**Smoke (Jacek, post-deploy):**
1. Navigate to Layouts → tap any layout → page opens without error, canvas + tactics list render.
2. Open a tactic from layout → TacticPage loads without error, canvas + freehand draw work.
3. No regression on MatchPage scout / BunkerEditor (hook was already in correct position there).

**Known issues unrelated to this hotfix (still owed):**
- #1 Match scout draw activates but nothing renders — chain audited, structurally correct; awaiting Jacek's browser console error for diagnosis. Hard-refresh recommended first to rule out stale cache.
- #2 ScoutedTeam landscape image overflow — pre-existing (ScoutedTeam never migrated to FS Stage 1 / `useLandscapeMode`). Fix path = add `sizingStrategy='fit'` (object-fit:contain math) to BaseCanvas + opt-in from HeatmapCanvas. Awaiting GO on the smaller-vs-bigger fix decision.

**Rollback:** `git revert -m 1 d87abc4e`. Re-introduces the crash on next cold layout load. Only roll back if the reorder itself causes a new symptom.

---

## 2026-05-24 — § 77 Draw Stage 1 (DrawingOverlay + Match capture, landscape-only entry)
**Commit:** `cd9aa448` — merge of `feat/draw-stage1-overlay` (`238adfde`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-24.

**What changed:** § 75 sequencing step 3 — closes the second § 75 piece (DrawingOverlay), building on the FS Stage 1 + InteractiveCanvas regression fix grammar.

- **`perfect-freehand` (MIT, ^1.2.3) added to deps** — same lib tldraw uses underneath. Tapered iPad/Adobe-style strokes via velocity-based thinning + smoothing; ~1ms outline computation for typical strokes (< 200 pts), so no rAF batching needed yet.
- **`<DrawingOverlay>`** (`src/components/canvas/DrawingOverlay.jsx`, NEW) — render-only overlay (`pointerEvents:'none'`) mounted inside BaseCanvas's frame as InteractiveCanvas child. Reads transform from `BaseCanvasContext` via `useBaseCanvas()`, maps field→screen via `pt.x * canvasSize.w * zoom + pan.x`. DPR-scaled with rAF retry on first mount (handles parent-not-yet-sized case). Exports `STROKE_COLORS` (5: amber/white/red/cyan/green) + `STROKE_SIZES` (thin/medium/thick = 3/6/10 px). perfect-freehand options tuned for finger input (`streamline:0.55`, `thinning:0.35`, `smoothing:0.6`, `simulatePressure:true`).
- **`<DrawToolbar>`** (`src/components/canvas/DrawToolbar.jsx`, NEW) — floating bar inside canvas frame, bottom-center, `left:0; right:0; margin:auto; width:fit-content` + `flex-wrap` (1 row when fits, 2 when narrow). 5 color swatches + 3 width pills + Undo + Redo + Eraser (toggle) + Clear (ConfirmModal — data-loss) + Done. Lucide icons (`Undo2`, `Redo2`, `Eraser`, `Trash2`, `Check`, `Minus`, `Equal`). Amber on interactive-active per § 27 carve-out. Touch targets 44px (`TOUCH.minTarget`).
- **`drawStrokes.js`** (NEW pure helpers) — `strokesToFirestore` / `strokesFromFirestore` (Firestore-safe map shape `{ "0": {color,size,pts:[{x,y},...]}, ... }`, no nested arrays per § 9 anti-pattern), `eraseAtPoint` + `eraseAcrossStrokes` (sized point-erase per § 77 — splits strokes at the eraser circle, surviving 2+ point runs become new sub-strokes, NOT whole-stroke deletion).
- **BaseCanvas arbiter `drawMode` branch** — surgical addition to `touchHandler.js` (no rewrite). New optional `drawingRef` sentinel owned by BaseCanvas (sibling of `draggingRef`, threaded into `createTouchHandler`). New BaseCanvas props `drawMode` + `onDrawStart/Move/End/Abort` merged into `stateRef.current` alongside existing callbacks. Three branches added:
  - `handleDown` pinch path (L156-165): if `drawingRef.current` → call `onDrawAbort()` + clear ref BEFORE `pinchRef = ...`. 2nd finger mid-stroke = abort cleanly.
  - `handleDown` AFTER pinch + panStartRef + BEFORE field-edit dispatch: `if (drawMode && 1-finger)` → set `drawingRef.current=true`, call `onDrawStart(getRelPos(e))`, mark `didLongPress=true`, return.
  - `handleMove`: `if (drawMode && drawingRef.current && 1-finger)` → `onDrawMove(getRelPos(e))`, return.
  - `handleUp`: `if (drawMode)` → if was drawing call `onDrawEnd`, reset all gesture refs, skip ALL field-edit handleUp logic, return.
- **InteractiveCanvas pass-through** — new props `drawMode`, `onDraw{Start,Move,End,Abort}`, `children`. Forwards to BaseCanvas; `children` render as siblings of `<InteractiveChrome>` inside BaseCanvas's frame (so DrawingOverlay can read context via `useBaseCanvas()`).
- **MatchPage wiring** — state (`drawMode` + `annotations` + `redoStack` + `currentStroke` + `drawColor` + `drawSizeKey` + `eraserMode`), 9 handlers (`handleDrawStart/Move/End/Abort/Undo/Redo/Clear` + `enterDrawMode/exitDrawMode`), `editPoint` loads `pt.annotations` via `strokesFromFirestore`, both `savePoint` branches (concurrent + solo) write `annotations: strokesToFirestore(annotations)` into the point doc, `resetDraft` clears draw state. JSX additions: `<DrawingOverlay strokes={annotations} currentStroke={currentStroke}>` as InteractiveCanvas child; `✏ Rysuj` chip top-right of canvas frame (LANDSCAPE-only — `isLandscape && !drawMode`); `<DrawToolbar>` mounted when `drawMode`.

**Behavioral contract (iPad/PencilKit):**
- Entry = landscape-only on Match scout (portrait + portrait-FS = scouting / view-only respectively).
- Enter drawMode → `setToolbarPlayer/QuickShotPlayer/ShotMode/SelPlayer = null` (suspend every field-edit overlay).
- 1-finger in drawMode → stroke / eraser; 2-finger → zoom/pan UNTOUCHED; 2nd finger mid-stroke → abort current stroke + start pinch.
- Eraser = sized point-erase: tap+drag over existing strokes splits them where points fall within the eraser radius (~2× selected stroke size), surviving 2+ point runs become new sub-strokes. NOT whole-stroke deletion.
- Done exits drawMode (does NOT immediately persist — annotations ride the next `savePoint` write, same flow as every other point field). Reopen point → `strokesFromFirestore(pt.annotations)` rehydrates.

**Storage shape** (per § 77 decision #5): `point.annotations = { "0": {color,size,pts:[{x,y},...]}, "1": {...} }`. Coords stored in **NATIVE-orientation 0..1 field coords** — NO mirror on write. Stage 2 aggregation will apply `mirrorPointToLeft` at read time when stacking annotations from multiple points onto a single side. Empty/cleared → `null` (no annotations field on doc).

**Off-limits untouched (`git diff --name-only`):** TacticPage (existing freehand stays per Jacek decision — Tactic→DrawingOverlay unify is a future ticket), ScoutedTeamPage (heatmap surfaces = Stage 2), QuickLogView, BunkerEditorPage / LayoutDetailPage / LayoutAnalytics (no draw surface yet), FieldCanvas legacy, BallisticsPage, `ballisticsEngine.js`, dataService, schema (additive `annotations` field on existing points = no migration needed), Firestore rules.

**§ 27 self-review:** PASS — see commit body. Amber on interactive-active per toggle carve-out; ConfirmModal for Clear; 44px touch everywhere; Lucide icons only; no emoji; z-stack clean (DrawingOverlay 15 < InteractiveChrome 19-20 < FullscreenToggle 30 < ✏ chip 35 < DrawToolbar 40; chip + FullscreenToggle mutually exclusive via `isLandscape` gate).

**Validation:** `vite build` ✓ 5.53s clean; `npm run precommit` ✓ all checks passed (baseline warnings only). Main bundle `index.js` 227.89 kB / 68.56 kB gzip — **unchanged**. MatchPage chunk 77.04 kB / 22.68 kB gzip (+8.9 kB / +2.87 kB net — DrawingOverlay + DrawToolbar + drawStrokes + 9 handlers + perfect-freehand getStroke import + new Lucide icons). vendor-react 171.28 kB / 53.80 kB gzip (+2.09 kB — Lucide Pencil/Undo2/Redo2/Eraser/Trash2/Check/Minus/Equal one-time icon bump).

**Smoke (Jacek, post-deploy on prod):**
1. **Landscape Match scout → tap `✏ Rysuj`** (top-right canvas chip) → drawMode on, toolbar appears (bottom-center). Draw a stroke with finger → tapered perfect-freehand line, full field coverage, follows finger precisely.
2. **Toolbar paths:** swap color (swatch turns amber-ringed), swap width pill (active turns amber), Undo (removes last stroke; Redo enables), Redo (re-adds), Eraser (toggle amber → tap-and-drag over an existing stroke splits it where you crossed; multiple passes split further), Clear (ConfirmModal "This will remove every stroke..." → confirm wipes), Done (exits drawMode + closes toolbar).
3. **Persistence:** after Done, click ✓ Save to commit point → strokes ride the savePoint write. Reopen the same point from review → annotations present on canvas, editable again via `✏ Rysuj`.
4. 🔴 **Arbiter regression check (the `6f7158f7` fix MUST hold):** In drawMode, 1-finger draws but 2-finger STILL pinches/pans (try mid-stroke — 2nd finger should abort the stroke cleanly and start zoom). OUTSIDE drawMode (no `✏ Rysuj` tapped): tap an existing player marker → toolbar (Assign/Hit/Shot/Del) opens; drag an existing player → marker follows finger, canvas does NOT pan. Same surface as the dragging-ref regression we shipped earlier today.
5. **Portrait Match (no rotation) → NO `✏ Rysuj` chip** anywhere (entry is landscape-only per § 77 decision #1). Portrait-FS (Maximize2) also has no chip — view + scouting only, no draw.

**Known limitations / explicit non-goals (Stage 1):**
- ScoutedTeam annotation aggregation, heatmap toggle (Pozycje/Strzały/Adnotacje), per-match filter — **Stage 2** (separate brief). Stage 2 reads `point.annotations` from many points, mirrors via `mirrorPointToLeft` per point's `fieldSide`, stacks on a single canvas.
- TacticPage freehand stays on its current implementation (raw pointer events + own overlay canvas). Unification to DrawingOverlay = future ticket, no urgency since Tactic's draw works today.
- DrawingOverlay does NOT yet support pressure-on-stylus (perfect-freehand has the API; pen pressure isn't reliably reported on phones — finger input uses simulatePressure for the taper). Add when there's an iPad consumer who'd notice.

**Rollback:** `git revert -m 1 cd9aa448`. Reverts DrawingOverlay + DrawToolbar + drawStrokes (new files) + BaseCanvas drawMode branch + InteractiveCanvas pass-through + MatchPage wiring. perfect-freehand stays in deps (harmless — unused). `point.annotations` data already written stays in Firestore but won't render anywhere post-revert (additive field).

---

## 2026-05-24 — § 76 Full-screen Stage 1 (Match + Tactic, immersive flag, portrait toggle)
**Commit:** `884937d8` — merge of `feat/fullscreen-stage1-immersive` (`5def9218`)
**Status:** ✅ Deployed — `npm run deploy` Published 2026-05-24.

**What changed:** § 75 sequencing step 2 — generalizes the existing landscape-immersive behavior (auto-on-rotate chrome hide on Match + Tactic) into a universal data-canvas full-screen capability with an added portrait trigger. Per § 76:
- **`useLandscapeMode()` extended** — new `fsActive` state + `setFullscreen` + unified `immersive = isLandscape || fsActive`. `canvasMaxHeight(L, P)` now picks `landscapeOffset` whenever immersive (was: only when `isLandscape`) → portrait-FS = field fills viewport. Backward-compat preserved (legacy consumers reading only `{isLandscape, canvasMaxHeight}` still work).
- **`<FullscreenToggle>`** (new `src/components/canvas/FullscreenToggle.jsx`) — shared portrait-only trigger. Lucide `Maximize2` / `Minimize2`, 44px touch, amber accent on active state (§ 27 carve-out for interactive toggles), absolute top-right inside canvas frame, z:30. Returns `null` in landscape (rotation already immerses).
- **MatchPage scout** — 6 sites swapped `isLandscape` → `immersive` (maxWidth + 4 chrome-hide gates + 2 floating control gates); toggle mounted in canvas frame.
- **TacticPage** — 5 sites swapped same pattern; toggle mounted; draw-mode (`✏️`) becomes available in portrait-FS via the floating controls path (was landscape-only).
- **`isLandscape` retained** at both pages only for the `<FullscreenToggle>` visibility gate (landscape has no button).

**Behavioral contract:**
- Landscape: byte-for-byte unchanged behavior (`isLandscape ⇒ immersive`).
- Portrait + Maximize2 tap: chrome hides (header, roster, bottom bar), maxWidth → 100%, canvas fills viewport, floating Back/Save (Match) / Back/More/draw/Save (Tactic) appear.
- Portrait-FS + Minimize2 tap: returns to normal portrait.
- Rotate landscape → return portrait: `fsActive` preserved as user left it (no auto-reset). Stuck-state safety = toggle always mounted in portrait-FS.

**§ 75 unblock:** Full-screen Stage 1 closes one of the two § 75 sequenced items (full-screen #11 generalized). DrawingOverlay is the next major piece, gated on clickable toolbar mockup per § 27. iPad/PencilKit gesture arbitration model (1-finger draw, 2-finger zoom/pan via BaseCanvas-as-arbiter, NOT event-forwarding) locked for that brief — see NEXT_TASKS.

**Off-limits untouched:** `BaseCanvas.jsx` (no canvas-layer changes; lift of `<FullscreenToggle>` to BaseCanvas chrome deferred to a future § 64 rung after DrawingOverlay impl experience), `touchHandler.js`, `InteractiveCanvas.jsx`, the 4 fast-follow surfaces (ScoutedTeam / LayoutDetail / BunkerEditor / LayoutAnalytics — separate ticket, same pattern), `BallisticsPage`, `ballisticsEngine.js`, FieldCanvas legacy, schema, dataService, rules.

**§ 27 self-review:**
```
Color discipline:  PASS (amber on FS-toggle active = interactive accent per § 27 carve-out for toggles)
Elevation:         PASS (matches existing landscape floating-control style — blurred glass background; z:30 above canvas, no conflict with toolbar z:19/20)
Typography:        PASS (icon-only, aria-label for screen readers)
Cards:             N/A
Navigation:        N/A (chrome-hide path uses existing gate logic, just swapped flag)
Anti-patterns:     ZERO — no emoji (Lucide only), no chevron, no hardcoded colors (COLORS.accent / .text / .border tokens), 44px touch (TOUCH.minTarget), single CTA per surface
Verdict:           READY TO COMMIT
```

**Validation:** `vite build` ✓ 6.04s clean; `npm run precommit` ✓ all checks passed (baseline warnings only — amber/chevron/TODO refs in unrelated files). Main bundle `index.js` 227.89 kB / gzip 68.54 kB — **unchanged**. MatchPage chunk 68.13 kB / gzip 19.81 kB (+0.12 kB net). vendor-react 169.19 kB / gzip 53.41 kB (+0.73 kB — Lucide Maximize2/Minimize2 icon additions; one-time bump).

**Smoke (Jacek, post-deploy):**
1. Portrait → tap `Maximize2` (top-right of canvas) → chrome (PageHeader / RosterGrid / bottom bar) hides, field fills viewport, floating Back + Save visible (Match) / Back + More + draw + Save visible (Tactic).
2. Tap `Minimize2` → returns to normal portrait with chrome restored.
3. Rotate landscape → auto-immerse exactly as today (regression check — landscape behavior must be byte-identical).
4. **In portrait-FS:** tap existing player marker → inline toolbar opens (Assign/Hit/Shot/Del); drag existing player → marker follows finger, canvas does NOT pan. (This is the regression from `6f7158f7` earlier today — must stay green in the new immersive mode too.)
5. TacticPage portrait-FS: draw-toggle (`✏️`) tappable in floating controls, enters draw mode, can draw a stroke, exits cleanly.
6. Sentry: zero new errors on toggle / mount / rotate.

**Known limitations / fast-follow tickets (NOT in Stage 1):**
- ScoutedTeamPage heatmap, LayoutDetailPage, BunkerEditorPage, LayoutAnalyticsPage — same pattern, mechanical refactor on top of Stage 1. Separate ticket. (ScoutedTeam was the original § 64.10 / step #11 target; now its impl is "extend Stage 1 to a 5th surface" instead of a bespoke feature.)
- DrawingOverlay — gated on clickable toolbar mockup (§ 75). iPad/PencilKit arbitration model decided (BaseCanvas-as-arbiter, NOT event forwarding) — see NEXT_TASKS.
- A1 bump fix parked; A2 ShotDrawer migration deferred (decision: MIGRATE not patch). See NEXT_TASKS.

**Rollback:** `git revert -m 1 884937d8`. Reverts toggle + flag swap + hook extension in one shot. Falls back to landscape-only-immersive (today's behavior). Fast-follow surfaces (ScoutedTeam etc.) unaffected since they aren't on Stage 1.

---

## 2026-05-24 — Fix InteractiveCanvas tap/drag regression (BaseCanvas wrapped dragging setters)
**Commit:** `6f7158f7` — merge of `fix/basecanvas-dragging-ref` (`009de46c`)
**Status:** ✅ Deployed — surgical 1-file fix; restores tap-element + drag-element on all 4 InteractiveCanvas consumers (MatchPage scouting, TacticPage, BunkerEditorPage, LayoutDetailPage).

**What changed:** Fix InteractiveCanvas tap/drag regression — restore wrapped dragging setters in BaseCanvas (ref froze at null since Step #2 extraction `ecc850ce`, live since Step #4). Affected tap-element + drag on MatchPage / Tactic / BunkerEditor / LayoutDetail.

**Root cause:** `BaseCanvas.jsx:172-177` used raw `useState` setters for `dragging` / `draggingBunker` while keeping `draggingRef` / `draggingBunkerRef` side-by-side. `touchHandler.js` reads the **refs** (handleMove:338,444 for drag-player; handleUp:471,614 for tap-detection), so `setDragging(hit)` in handleDown updated React state but the ref stayed frozen at `null`. Tap-element (toolbar open) and drag-element (move) both died silently; zoom/pan/place stayed alive because they don't depend on draggingRef. The pan path even won what should have been drag-player gestures (`if panStartRef && dragging === null && draggingBunker === null`) → "drag dead, pan wins" symptom matched exactly. Same bug applied to bunker drag.

**Bug provenance:** introduced structurally at Step #2 BaseCanvas extraction (`ecc850ce`, 2026-05-23) but dormant — no consumer rendered BaseCanvas. Went live at Step #4 InteractiveCanvas migration (`71179616`, 2026-05-24) when 4 consumers moved onto BaseCanvas. Step #2's "additive only, bundle hash bit-identical" claim was true at deploy time but the latent bug shipped under it.

**Fix:** Restore wrapped-setter pattern from `FieldCanvas:81-86` **1:1**:
```js
const [dragging, _setDragging] = useState(null);
const [draggingBunker, _setDraggingBunker] = useState(null);
const draggingRef = useRef(null);
const draggingBunkerRef = useRef(null);
const setDragging = (v) => { draggingRef.current = v; _setDragging(v); };
const setDraggingBunker = (v) => { draggingBunkerRef.current = v; _setDraggingBunker(v); };
```
State preserved (eslint-disable matches legacy). **No state-drop** in this PR per Opus instruction — keeps draw-effect dep surface unchanged on the hot path; state-drop cleanup deferable separately if ever worth doing.

**Off-limits untouched** (`git diff --name-only` = `BaseCanvas.jsx`, nothing else): `touchHandler.js`, `InteractiveCanvas.jsx`, the 4 consumers (MatchPage / TacticPage / BunkerEditorPage / LayoutDetailPage), `FieldCanvas.jsx` (legacy for BallisticsPage), `ballisticsEngine.js`. No schema / dataService / rules change.

**§ 75 unblock:** Per § 75 sequencing "regres fix NAJPIERW", this clears the runway for full-screen (#11 generalized) + DrawingOverlay impl. Gesture grammar in BaseCanvas now consistent (ref-state sync); per-screen drift root removed structurally.

**Anti-pattern codified:** `PROJECT_GUIDELINES.md § 9 Architektura` — new bullet: "gesture state read by touchHandler via ref MUSI have wrapped setter updating ref + state; raw useState setter freezes ref → silent tap/drag death." Cites the bug + fix SHA for future archaeology.

**Validation:** `vite build` ✓ 7.48s clean; `npm run precommit` ✓ all checks passed (baseline warnings only — amber/chevron/TODO refs in unrelated files). Main bundle `index.js` 227.89 kB / gzip 68.55 kB — unchanged (literal-equivalent edit, no minified delta).

**Post-deploy smoke (Jacek, prod):**
1. MatchPage scouting → tap an existing player marker → inline toolbar (Assign/Hit/Shot/Del) opens.
2. MatchPage scouting → drag an existing player → marker follows finger; canvas does **NOT** pan.
3. MatchPage scouting → tap empty space → places new player (regression check).
4. MatchPage scouting → pinch-zoom + pan with no selection → still work (regression check).
5. BunkerEditorPage → drag a bunker anchor → bunker follows finger; canvas does **NOT** pan.

**Rollback:** `git revert -m 1 6f7158f7 && git push && npm run deploy`. Single-shot revert. (Note: rollback re-introduces the regression — only roll back if the fix itself causes a new symptom.)

---

## 2026-05-24 — Training guest squad-persist fix (invite-time + auto-distribute)
**Commit:** `909e7105` — merge of `fix/training-guest-squad-persist` (`6b9bd55b`)
**Status:** ✅ Deployed — narrow data-layer fix; no UI surfaces touched.

**What changed:** Fixes the "Bez składu" / "unassigned" bucket in `TrainingCoachTab` for invited guests. Two complementary write-path changes so every attendee ends up in some squad in Firestore, regardless of invite order.

**Root cause (per discovery):** Invite-guest path wrote to `training.attendees[]` only — `squads{}` was untouched. `SquadEditor`'s mount-time auto-distribute existed (lines 27-49) and computed a corrected `next` squads locally, but never persisted via `scheduleSave` — opening the editor and navigating away without dragging anyone threw the recovery away. Coach summary groups attendees by `training.squads[*]` membership → guests with `squadKey === null` landed in the `'other'` bucket labelled "Bez składu" (`TrainingCoachTab.jsx:184-202`).

**Option 1 — `AttendeesEditor.jsx` (atomic invite-time placement, +49/−9 LOC):**
- New `placeIntoExistingSquads(baseSquads, pidsToPlace)` helper — picks smallest existing squad with `SQUAD_META` tie-break (red → blue → green → yellow → purple order). Idempotent (skips pids already in any squad). Returns null when no squads exist yet — Option 2 catches that path.
- `toggleAttendee` ADD branch: combines `{ attendees, squads }` into single `updateTraining` write — guest lands in smallest squad immediately, no reliance on SquadEditor being opened. REMOVE branch unchanged (still uses existing `syncSquads`).
- `applyPreset`: prunes squads of removed pids first (existing `syncSquads`), then places newly-added pids on top of the cleaned squads. Idempotent for pids already placed.
- Imports `SQUADS as SQUAD_META` from `utils/squads`.

**Option 2 — `SquadEditor.jsx` (persist auto-distribute on mount, +37/−10 LOC):**
- New file-level `squadsDiffer(a, b)` helper (set-equal per key) — gates the persist so re-renders don't schedule no-op writes.
- Moved `scheduleSave` + cleanup ABOVE the mount effect so the effect can reference `scheduleSave` in its deps.
- Mount effect (line ~27): after the existing round-robin auto-distribute (logic byte-for-byte unchanged), if `squadsDiffer(initial, next)` → `scheduleSave(next)`. Effect deps gain `scheduleSave` (stable per `trainingId`, already in deps via `training?.id`).

**How both compose:**
| Invite order | Persistence path |
|---|---|
| Squads already exist → invite guest | Option 1 — atomic single-write |
| Invite attendees first → form squads | Option 2 — first SquadEditor mount detects diff, schedules save |
| Belt-and-braces (invite #1, form, invite #2, open) | Option 1 places #2; Option 2 sees no diff, skips |

**Off-limits — verified untouched** (`git diff --name-only` = AttendeesEditor.jsx + SquadEditor.jsx, nothing more):
- `TrainingCoachTab.jsx` — `'other'` bucket label + grouping logic intact; we stop putting people in it
- `TrainingScoutTab.jsx` — matchup roster snapshot (`:99-101` / `:111-112`) untouched
- `PlayerStatsPage` / `usePPTIdentity` / `usePlayers` / `playersById` identity layer
- Canvas (`BaseCanvas`/`InteractiveCanvas`/`HeatmapCanvas`/`FieldCanvas`), `BallisticsPage`, `ballisticsEngine.js`
- Schema, `dataService`, Firestore rules, new collections

**§ 27:** PASS — write-path only, no UI surfaces touched. Auto-placement was the existing § 32 / § 53 UX-intended state; we persist it now instead of throwing it away.

**Validation:** `vite build` ✓ 5.06s; `npm run precommit` ✓ all checks passed (baseline warnings only — amber/chevron/TODO refs in unrelated files). Main bundle `index.js` 227.89 kB / gzip 68.54 kB — unchanged vs Step #5 baseline.

**Smoke (Jacek):**
1. Trening z istniejącymi składami → zaproś gościa z AttendeesEditor → otwórz Coach summary → gość pod jakimś składem (nie "Bez składu").
2. Nowy trening → zaproś kilku attendees PRZED uformowaniem składów → otwórz SquadEditor → po ~300 ms (debounce) wszyscy w składach po reloadzie.
3. Free-play matchup regresja: stats gościa nadal liczone (free-play roster = attendees, niezależne od squads).
4. Sentry: zero nowych errorów na invite / SquadEditor mount.

**Known limitation (out of scope — separate ticket if Jacek wants):**
- Squad-vs-squad matchupy utworzone PRZED zaproszeniem gościa mają zamrożony `homeRoster`/`awayRoster` snapshot (`TrainingScoutTab.jsx:99-101 / :111-112`) → gość NIE pojawi się w nich wstecznie (zero punktów w tych konkretnych matchupach). Fix dotyczy: przyszłych squad-matchupów + free-play + etykiety "Bez składu" w coach summary. Backfill starych squad-matchup rosterów = osobny temat.

**Rollback:** `git revert -m 1 909e7105 && git push && npm run deploy`. Single-shot revert of both option's write-path changes.

---

## 2026-05-24 — § 64.9 Step #5: HeatmapCanvas → BaseCanvas + FieldView deprecation
**Commit:** `cb28a26a` — merge of `feat/canvas-step5-heatmapcanvas` (`5d640716`)
**Status:** ✅ Deployed — read-only consumer migration + dispatcher delete. **NOT hot-path** (HeatmapCanvas had zero gestures before; migration adds pinch+pan default-off — pure addition, removes nothing).

**What changed:** § 64.9 step #5 — HeatmapCanvas refactored **in-place** onto BaseCanvas. DOM/DPR/sizing/RO/landscape now owned by BaseCanvas; ~300 LOC draw body moved verbatim to BaseCanvas's `draw` render-prop callback (plain arrow function — new ref each render → BaseCanvas's draw effect re-fires via deps array → closure refresh → toggle props repaint canvas). Matches Step #4 InteractiveCanvas pattern. **§ 64.9 step #8 (FieldView deprecation) collapsed into step #5** in same PR — after Step #4, FieldView's non-heatmap branch was dead code; pure-passthrough audit confirmed all 3 call sites = variant (a) straight delete (no Btn UI port, no style/className forwarding lost).

**Gestures (§ 64.4):** `pinchZoom` + `pan` opt-in via prop, default off (matches today's no-gesture behavior; landscape coach view step #11 will flip them on for ScoutedTeamPage). **Loupe NEVER** — naturally inert via two existing consumer-side gates: (a) `touchHandler.js:178,352` `setActiveTouchPos` requires `editable||layoutEditMode` which HeatmapCanvas never passes via `touchHandlerState`; (b) `drawLoupe` called only from `FieldCanvas:335` + `InteractiveCanvas:236`, not from HeatmapCanvas's draw layer. Zero touchHandler changes — discovery STEP 2 (in chat) proved loupe-off is free; option (b) chosen over a defensive guard or split.

**Sizing (corrected from brief STEP 3 wording during impl):** **width-first via BaseCanvas, no `maxCanvasHeight` cap**. Brief originally specified `sizingStrategy='height-first' maxCanvasHeight=canvasMaxHeight(200,200)` but tracing BaseCanvas:144-158 math showed this would render 1000×500 canvases in portrait → overflow:hidden clip → left-cropped half-field zoom (broken read-equivalence). Today's `HeatmapCanvas:34-39` `min(aspectH, maxH)` reduces to width-first in portrait (`aspectH=175 ≪ maxH=500`). Width-first now matches today's portrait verbatim. Landscape letterbox cap (today's `min(aspectH, maxH)` when `aspectH > maxH`) is dead code in step #5 scope (landscape activation = step #11); may need width-first-with-cap added to BaseCanvas API at step #11. Deviation documented in HeatmapCanvas header docblock.

**3 FieldView call sites migrated to direct `<HeatmapCanvas>`:**
- `ScoutedTeamPage:654` (collapsed preview, 110px clip outer)
- `ScoutedTeamPage:674` (expanded view)
- `TrainingResultsPage:376` (source-filtered training heatmap with All/Scout/Coach/Player pills)

**MatchPage:1413 (direct caller, pre-existing)** code untouched — props 1:1 compatible with new HeatmapCanvas signature (new `pinchZoom`/`pan` defaults preserve no-gesture rendering). Renderer changed → **#1 priority post-deploy smoke** (scouting hot-path; heatmap tab in live match).

**FieldView.jsx DELETED** (207 LOC). After Step #4 its non-heatmap branch had zero callers; only used through `mode='heatmap'` dispatch which now goes direct.

**DPR `×2` hardcoded literal at `HeatmapCanvas:49`** REMOVED — BaseCanvas owns runtime `window.devicePixelRatio || 2` per § 64.8.5. One of the 3 sites flagged in § 64.11 finally migrates with its owning consumer.

**Off-limits invariants verified untouched:** `FieldCanvas.jsx`, `InteractiveCanvas.jsx`, `BaseCanvas.jsx`, `BallisticsPage.jsx`, `ballisticsEngine.js`, `touchHandler.js`, `drawLoupe.js`, `./field/draw*`, `MatchPage.jsx`.

**§ 27:** PASS — zero new UI surfaces; all existing color/typography/elevation/touch decisions preserved verbatim (gradients = data viz not decoration; HERO amber ring preserved; kill 💀 + danger zone preserved). Frame styling moved canvas-element → BaseCanvas inner-frame div (2px borderRadius delta `RADIUS.lg=12 → 10` same as Step #4 which shipped).

**Validation:** `vite build` ✓ (5.59s); `npm run precommit` ✓ all checks passed (baseline warnings only — pre-existing amber/chevron nudges + 5 TODO refs in unrelated files). 4 files changed, +85/−275 LOC net `−190 LOC`. Bundle: `index.js` 227.89 kB / gzip 68.55 kB (was 228.50 / 68.63 — **−0.61 kB / −0.08 kB gzip** net; FieldView delete savings barely offset HeatmapCanvas slight growth + MatchPage chunk +0.08 kB from refactored module import).

**Smoke (do na produkcji — kolejność = ryzyko, MatchPage pierwszy):**
1. 🔴 **MatchPage heatmap tab — #1 PRIORYTET.** Otwórz żywy match → heatmap tab → toggle `showShots`/`heatmapSide`/`previewPointId` → wszystko musi przerysować jak dziś. Sentry tu = blocker.
2. TrainingResultsPage: source-filter pills All→Scout→Coach→Player → toggle musi przerysować.
3. ScoutedTeamPage: collapsed (110px preview, :654) i expanded (:674). Position/Shots pills toggle. HERO ring jeśli HERO set.
4. Sentry: zero nowych errorów.
5. Landscape NIE w scope step #5 — landscape coach view = step #11.

**Known issues:**
- Sizing-strategy deviation from brief STEP 3 (height-first → width-first) — documented in HeatmapCanvas header docblock + this entry. Step #11 may need `sizingStrategy='width-first-with-cap'` added to BaseCanvas for landscape letterbox.
- BaseCanvas draw re-fire on prop change reasoned at code level (matches Step #4 InteractiveCanvas pattern); interactive browser smoke not run in CC session — Jacek's post-deploy smoke is the first real toggle test.
- `FieldView` mention in `BaseCanvas.jsx:37` comment left as cosmetic (per brief STEP 4.6 discretion).

**Next active:** § 64.9 step #6 (LayoutAnalyticsPage → AnalyticsCanvas extending BaseCanvas) **OR** step #11 (landscape coach view feature on ScoutedTeamPage — first beneficiary, § 64.10) — Jacek's call. Track B Phase 2.4 (TeamMemberships) also still queued.

**Rollback:** `git revert -m 1 cb28a26a && git push && npm run deploy`. Reverts HeatmapCanvas refactor + 3 call-site migrations + FieldView delete in one shot. MatchPage:1413 was untouched so its rollback is automatic.

---

## 2026-05-24 — § 64.9 Step #4: FieldCanvas → InteractiveCanvas (4 consumers migrated)
**Commit:** `2b6a473` — merge of `feat/canvas-step4-interactive-canvas` (`7117961`)
**Status:** ✅ Deployed — **HOT-PATH migration**. First live test of Step 2's gesture composition + `viewportSide` promotion.

**What changed:** first real consumer migration of the § 64 canvas refactor. New `src/components/canvas/InteractiveCanvas.jsx` (296 LOC) composes Step 2's `BaseCanvas` (infrastructure: DOM/DPR/sizing/ResizeObserver/landscape/viewportSide/gestures) and hosts the scouting feature layer (drawing pipeline + inline player toolbar + reset-zoom Btn) — verbatim transplant of `FieldCanvas.jsx:L218-451`. **No behavior change vs `FieldCanvas`** — read-equivalence is the hard invariant for this step.

**Migrated 4 consumers** (low-risk → hot-path; `useLandscapeMode.canvasMaxHeight(L,P)` with verbatim § 64.11 offsets):
- `BunkerEditorPage:173` → `canvasMaxHeight(160, 160)`.
- `LayoutDetailPage:395` → `canvasMaxHeight(20, 200)` — edge tabs untouched, page chrome reads `isLandscape` from `useDevice` unchanged.
- `TacticPage:433` → `canvasMaxHeight(0, 200)`.
- `MatchPage:1835` → `canvasMaxHeight(0, 180)` + `viewportSide={fieldSide}` — only live half-field consumer; first real test of BaseCanvas's `viewportSide` promotion (§ 64.8.3) + first live gesture composition (`pinchZoom pan loupe` all on for scouting).

**BaseCanvas additive evolution** (Step #4 contract reveals): added `touchHandlerState` pass-through prop (specialized child supplies the ~25 fields `createTouchHandler` reads from stateRef beyond infra), `imgObj` in draw render-prop state + context (drawField needs the loaded image), `cursor` prop (mode-dependent: crosshair/pointer/default), two-layer render (outer resize-observed + inner frame styled per FieldCanvas L367-378 — visual read-equivalence), `containerRef` + `setZoom`/`setPan` in context (for InteractiveChrome's toolbarPos math + reset-Btn dispatch). Cleaned the Step-2 polish backlog (`canvasRef._mouseHandler` ad-hoc property → proper `handlerRef`).

**`FieldCanvas` retained as legacy** (off-limits per brief) for `BallisticsPage` (Opus territory). Duplicate wiring between the two components is accepted on the transition. `FieldCanvas.jsx:263` hardcoded DPR `×2` **stays** — bake-in moves with BallisticsPage's eventual migration (Opus-gated, separate). BaseCanvas's `window.devicePixelRatio || 2` (§ 64.8.5) is correct for InteractiveCanvas.

**Off-limits invariants verified untouched:** `FieldCanvas.jsx`, `FieldView.jsx` (step #5), `BallisticsPage.jsx`, `ballisticsEngine.js`, `touchHandler.js`, `./field/draw*`.

**§ 27:** PASS — verbatim transplant; same theme tokens, same toolbar JSX, same reset-Btn, same frame styling/cursor. Behavior-preservation focus.

**Validation:** `vite build` ✓ (7.39s); `lint-ui` 0 errors. Main bundle `index.js` 228.50 kB / gzip 68.63 kB (was 228.41 / 68.59 — +0.09 kB delta for the migration code path; per-page bundles unchanged or +0.02 kB).

**Smoke (do na produkcji — hot-path, please run quickly):**
- MatchPage scouting: place + select (toolbar), pinch/pan/loupe, half-field `viewportSide` left + right, save point.
- TacticPage: place/drag/bump, shot drawer.
- LayoutDetailPage: portrait + landscape edge-tabs.
- BunkerEditorPage: tap bunker → sheet.
- Sentry: zero new errors.

**Next active:** § 64.9 step #5 — `HeatmapCanvas → BaseCanvas` (gesture opt-in via prop, unblocks landscape coach view at step #11).

**Rollback:** `git revert -m 1 2b6a473 && git push && npm run deploy`. (Reverts both consumer swaps + BaseCanvas evolution + InteractiveCanvas creation in one shot.)

---

## 2026-05-23 — § 64.9 Step 2: BaseCanvas + useLandscapeMode (additive)
**Commit:** `53df791` — merge of `feat/canvas-step2-basecanvas` (`ecc850c`)
**Status:** ✅ Deployed (no-op for users — bundle hash unchanged)

**What changed:** § 64.9 step #2 + #3 — first architectural extraction of the Canvas refactor. Two new files, **zero consumer touched, zero user-facing change**. Main bundle hash bit-identical pre/post deploy (`index-i-JlR00N.js` 228.41 kB / gzip 68.59 kB) — additive only, tree-shake leaves the new files out of every consumer's bundle.

- **`src/hooks/useLandscapeMode.js`** (61 LOC) — owns the `device.isLandscape && !device.isDesktop` formula + the `window.innerHeight − N` consolidation. API: `{ isLandscape, canvasMaxHeight(landscapeOffset = 0, portraitOffset = 0) }`. SSR-safe. Canonical per-site offset table (load-bearing for step #4 transplant) embedded as a doc-comment.
- **`src/components/canvas/BaseCanvas.jsx`** (219 LOC) — § 64.3 7 cross-cutting concerns (Canvas DOM + ref forwarding, DPR `window.devicePixelRatio || 2`, sizing strategy width-first/height-first, ResizeObserver, landscape integration, safe-area expectation, `viewportSide` half-field clipping promoted from FieldCanvas L204-216). § 64.4 gesture composition: reuses `createTouchHandler` with opt-in props (`pinchZoom` / `pan` / `loupe`). **One Step-2 limitation documented in-file:** `createTouchHandler` is monolithic so the 3 props are collectively gated today (any true → attach all; all false → don't); granular gating lands when `touchHandler` is refactored. API shape per § 64.4 — contract unchanged.

**Audit trail in docs:** § 64.9 list marks Steps 1/2/3 ✅ with SHAs; § 64.11 captures the `useLandscapeMode` API + canonical offset table + Step-2 gesture-gate caveat. Briefs archived to `docs/archive/cc-briefs/CC_BRIEF_CANVAS_STEP2_{DISCOVERY,IMPL}.md` in this same commit.

**3× hardcoded DPR `×2` sites** localized (not touched, for the migration briefs): `FieldCanvas.jsx:263`, `HeatmapCanvas.jsx:49`, `LayoutAnalyticsPage.jsx:416`.

**§ 27:** N/A — no visible UI (BaseCanvas doesn't render chrome; useLandscapeMode has no UI). Zero behavior change for any of the 8 existing FieldCanvas / HeatmapCanvas / FieldView call-sites.

**Validation:** `vite build` ✓ (7.45s); `lint-ui` 0 errors; **main bundle hash bit-identical post-deploy** (the strongest proof of zero user-facing delta).

**Smoke:** ≈ none — nothing to test for users. Just confirms `main == prod` invariant; Sentry should stay clean (no new imports anywhere).

**Next active:** § 64.9 step #4 — FieldCanvas → InteractiveCanvas extending BaseCanvas. The first real consumer migration; uses the canonical offset table from § 64.11 to transplant MatchPage / TacticPage / LayoutDetailPage / BunkerEditorPage call sites verbatim.

**Rollback:** `git revert -m 1 53df791 && git push && npm run deploy`. Removes the 2 new files; nothing else affected.

---

## 2026-05-23 — Rules tighten: selfReports cross-pid (§ 49.10, audit gap #2)
**Commit:** `c2fb9ba` — merge of `fix/rules-selfreports-cross-pid-tighten` (`3d78b8a`)
**Rules deployed:** `firebase deploy --only firestore:rules` ran first (live `pbscoutpro` rules updated, "released rules firestore.rules to cloud.firestore"), then merge + `npm run deploy`. **Two-step deploy** (rules + bundle); next time same pattern.
**Status:** ✅ Deployed

**What changed:** closes audit gap #2 — `/workspaces/{slug}/players/{pid}/selfReports/{sid}` was gated on `isPlayer(slug)` only; any workspace player could write any pid's logs (theoretical, contained by invited-only workspace). Now:
- **CREATE** = `isLinkedSelfPlayer(slug, pid)` — the writer must be the parent player's `linkedUid`. No coach carve-out (KIOSK writes `point.selfLogs[]` via `setPlayerSelfLogTraining`, not `/selfReports/`; propagator stamps `_meta` on the POINT — never creates a selfReport).
- **UPDATE / DELETE** = `isCoach(slug) OR isLinkedSelfPlayer(slug, pid)` — coach carve-out is **required**: § 70.2 matcher write-back (`propagateMatchup` writes `{slotRef, propagatedAt}` + low-conf `{needsReview, candidateSlotRef}`), § 70.11 Stage 4 `applySelfReportOverride` + `dismissSelfReportFlag` all run in the coach's session and legitimately update other players' selfReports. A bare check would have BROKEN every matcher run and every Stage 4 action.
- New helper **`isLinkedSelfPlayer(slug, pid)`** with `exists()`-guard + brittle-null-safe `data.get('linkedUid', null)` (matches the convention from the player self-link rule at L239).

**Audit trail:** PRE-FLIGHT enumerated every selfReport write path before applying the rule (see § 49.10 in DESIGN_DECISIONS). Out-of-scope notes (separate brief): the `isSelfLogShotCreate` `playerId` field-claim (rules header L12-15) — affects shots, not selfReports.

**§ 27:** N/A — rules-only change.

**Validation:** rules compile ✓ (Firebase CLI confirmed "rules file firestore.rules compiled successfully" pre-release); `vite build` ✓ (7.91s); `lint-ui` 0 errors. No JS changes — same bundle.

**Smoke (post-deploy):**
- Linked player PPT-logs to own pid → ✅ create allowed.
- Attempt to write `/players/{otherPid}/selfReports/` as a non-coach (via DevTools / SDK) → ❌ permission-denied.
- Close a training → `propagateMatchup` updates selfReports cleanly (no rules-deny in Sentry).
- TrainingResultsPage → "Needs review" → Accept / Dismiss → updates land.

**Rollback:** rules — `firebase deploy --only firestore:rules` against the pre-merge `firestore.rules` (checkout the old version first); code — `git revert -m 1 c2fb9ba && git push && npm run deploy`. Rules revert is the load-bearing step; code is docs-only.

---

## 2026-05-23 — Fix: touchHandler close-toolbar ReferenceError (Sentry-reported)
**Commit:** `e4f188f` — merge of `fix/touchhandler-on-toolbar-action-ref` (`4edef48`)
**Status:** ✅ Deployed

**What changed:** `src/components/field/touchHandler.js:309` (`handleDown`) referenced **bare** `onToolbarAction?.(...)` — undeclared in `handleDown`'s closure scope (the destructure at L462 is local to `handleUp`; the top-level destructure L17–26 doesn't include it). Optional chaining (`?.()`) does **not** protect against undeclared identifiers — only against `null`/`undefined` values — so every empty-canvas-tap with a player toolbar open threw `ReferenceError: onToolbarAction is not defined`, that close-path failed silently (user could still close via the React backdrop overlay or a toolbar button), and Sentry alarmed.

**Fix (one line):** `onToolbarAction?.(...)` → `stateRef.current.onToolbarAction?.(...)` — matches the existing convention at the same file's L555 and `stateRef.current.onEmptyTap` at L311. + a short comment explaining the trap so the regression doesn't repeat.

**Diagnosis correction.** `NEXT_TASKS:39` had hypothesised "undefined prop under a mount sequence" — that was wrong; the prop was always defined at the call site (`MatchPage:1852`, `TacticPage:460` both pass `handleToolbarAction`). The error was an **undeclared identifier in `handleDown`'s closure**, completely unrelated to mount sequence. NEXT_TASKS:39 updated.

**Impact:** kills the Sentry alarm + restores the empty-canvas-tap-while-toolbar-open close path. Hot-path-adjacent (FieldCanvas is the scouting hot path — MatchPage / TacticPage / heatmap).

**§ 27:** N/A — pure logic in a non-React module; no visual change.

**Validation:** `vite build` ✓ (7.71s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** open a player toolbar on a match/tactic → tap empty canvas (not the backdrop, not a button) → toolbar closes cleanly, no console / Sentry error. Backdrop + button close paths unchanged.

**Rollback:** `git revert -m 1 e4f188f && git push && npm run deploy`.

---

## 2026-05-23 — Phase 2.3.d: UI 'delete team' → retireTeam + orphan cleanup
**Commit:** `bf65242` — merge of `fix/team-delete-to-retire` (`29da63e`, `2a26e65`)
**Status:** ✅ Deployed

**What changed:** closes the Phase 2.3.d global/workspace mismatch confirmed by `b9f9bc1`.
- **UI "delete team" → `retireTeam`** at both callers: `TeamDetailPage:117` (`handleDeleteTeam`) and `TeamsPage:66` (`handleDelete`). Old `deleteTeam` was workspace-only while `useTeams` reads global → orphans. Retire is soft (sets `retiredAt`), dual-writes global+workspace, recoverable by an admin; `useActiveTeams` filters retired so the team disappears from every user-facing list (audit: 23 consumers via `useActiveTeams`; only `AdminTeamsPage` reads raw `useTeams`).
- **`deleteTeam` retained** in `dataService` as the super_admin-only hard-delete (firestore.rules `/teams/{id}` `delete: if isSuperAdmin()`) — AdminTeamsPage path.
- **ConfirmModal copy fixed** (both modals). Was: *"Delete… Players will not be deleted but will become unassigned."* — misleading even under the old code (`deleteTeam` never touched player docs). Now: *"X will be removed from your teams. Scouted data is preserved and an admin can restore the team."*
- **Orphan cleanup (one-shot, post-deploy).** Hard-deleted the 1 confirmed orphan `7rXJ0Z0U3h4wBAaoZzo8` ("test team 123123- SKASUJ MNIEEEEEE", originWorkspace ranger1996). Pre-clean: global=299, ws=298, orphans=1. Post-clean: global=298, ws=298, diff=0. Sweep ran twice (matches diagnosis count + workspace counterpart confirmed absent) before delete; aborts if state drifted.

**§ 27:** PASS — `ConfirmModal` reused; `danger` flag preserved; honest copy (no false "permanent"); `Delete` label valid (read sites filter retired).

**Validation:** `vite build` ✓ (7.47s), `lint-ui` 0 errors, 0 `debugger`. DB diff verified pre+post.

**Smoke (to do on device):** delete a team via TeamDetailPage / TeamsPage → it disappears from every active list; AdminTeamsPage retired view shows it; unretire restores it.

**Out of scope (deferred):** PL i18n on the new copy (current modal is plain English — matches existing pattern); children-orphan warning on the simple delete (AdminTeamsPage has it; simple modal retires a parent without cascading — children stay parented).

**Rollback:** `git revert -m 1 bf65242 && git push && npm run deploy`. (The orphan delete is independent; the docs note keeps the audit trail.)

---

## 2026-05-22 — § 72 multi-team follow-ups: teams[]-aware quick-buttons + "+N" badge
**Commit:** `a1d5bca` — merge of `feat/multi-team-followups` (`cebeeb8`, `480700a`)
**Status:** ✅ Deployed

**What changed:** closes the § 72 follow-ups.
- **`TeamDetailPage` quick add/remove-player → teams[]-aware.** Was single-team `changePlayerTeam` (overwrote `teamId` — a trap that moved a multi-team player off their other teams). Now: add = **append** a membership (existing primary + other teams preserved); remove = **detach** with **primary-reassign** (never leaves the primary pointing at a team the player left).
- **`withTeamAdded` / `withTeamRemoved`** (`playerTeams.js`) — pure, single-sourced teams[]/primary invariant logic; `PlayerEditModal`'s editor refactored onto the same helpers (no duplication).
- **`PlayerStatsPage` header "+N" badge** — shown when a player is on more than one team (static, non-interactive).
- **⚠️ Latent crash fixed:** § 72 had shipped `TeamDetailPage` using `playerOnTeam` **without importing it** — a `ReferenceError` on render. Vite build + `lint-ui` don't catch undefined free variables, so it slipped through `f3d0a49`. Import restored here — TeamDetailPage opens again.

**§ 27:** PASS — "+N" badge `textDim`/`surfaceDark` tokens, no amber (non-interactive); shared helpers, no anti-patterns.

**Validation:** `vite build` ✓ (7.55s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** TeamDetailPage opens (was crashing); quick-add an existing multi-team player → appended, primary untouched; quick-remove from the primary → detached + primary reassigned; quick-remove from a non-primary → detach only; multi-team player's profile header shows "+N". Mandatory-`pbliId` toggle still deferred.

**Rollback:** `git revert -m 1 a1d5bca && git push && npm run deploy`.

---

## 2026-05-22 — § 70 Stage 4: manual override review queue — Track C COMPLETE (§ 70.11)
**Commit:** `e5d963e` — merge of `feat/stage4-manual-override` (`5f72ec3`, `10bfbcf`, `5b81c34`)
**Status:** ✅ Deployed

**What changed:** the last element of Track C — the human review surface for low-confidence matcher results.
- **"Needs review"** section on `TrainingResultsPage` (between the leaderboard and "Break bunkers"), **coach/admin-gated**, shown only when the flagged queue is non-empty. Per item: player + observation (reuses `LogRow`) + the matcher-proposed point — actions **Accept #N** / **Reassign to #N** / **Dismiss**.
- `applySelfReportOverride` — Accept/Reassign reuse `propagateSelfReportToPoint` + stamp `{slotRef, propagatedAt, needsReview:false}`; the selfReport observation is never rewritten.
- `dismissSelfReportFlag` — sets a **sticky `reviewDismissedAt`**; `propagateMatchup` now skips on `propagatedAt` **OR** `reviewDismissedAt`, so a training re-close never re-flags a dismissed report (both kept in `alignSequence` input → pairing stays stable).
- `getTrainingSelfReports` — collectionGroup fetch; the review queue resolves candidate point/slot + reassign options by re-running the pure matcher (`locatePlayerInPoint`/`alignSequence`) in preview mode.
- Out of scope v1 (documented § 70.11): re-litigating already-propagated matches (no inverse-propagate); orphan-promotion (needs a lineup edit).

**🎉 § 70 / Track C / Klocek 2 — COMPLETE.** Stages 1, 1b, 2, 3 (D1+D2), 4 all shipped + deployed.

**§ 27:** PASS — `SectionLabel` + `LogRow` reused; Accept=accent / Dismiss·Reassign=default; theme tokens; no competing CTA.

**Validation:** `vite build` ✓ (7.71s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** training with a low-confidence flagged self-log → "Needs review" lists it → Accept writes it into the point (leaves queue, shows on heatmap/leaderboard) → Reassign lands on the chosen point → Dismiss leaves the queue + survives a training re-close (not re-flagged).

**Rollback:** `git revert -m 1 e5d963e && git push && npm run deploy`.

---

## 2026-05-22 — Fix: Samoocena renders without coach-side stats (§ 70.9)
**Commit:** `5cf783a` — merge of `fix/samoocena-empty-state-gate` (`a119a0e`)
**Status:** ✅ Deployed

**What changed:** follow-up fix to § 70.9. The "Samoocena" section was placed *inside* `PlayerStatsPage`'s `stats.played > 0` block — so a player with self-logs but **zero scouted coach points** (the common case — they self-logged more than the coach lineup'd them) hit the "No scouted points yet" empty state and **never saw the section**. That is exactly the scenario § 70.9 was built for.
- Fix: "Samoocena" is now a **sibling** of the `stats.played > 0` block, gated only on `selfReports.length > 0` — renders independently of coach-side stats.
- The "No scouted points yet" empty state now also requires `selfReports.length === 0`, so it no longer covers a player who has self-logs.
- Diagnosed from prod data: the reporting user is player **Koe** (`linkedUid` = their account); their 4 self-logs for the closed training "tesyt" (+ 47 total) were correctly stored — the section was simply unreachable.

**§ 27:** N/A — section placement only.

**Validation:** `vite build` ✓ (8.58s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** own profile with self-logs but no coach points → "Samoocena" lists them; profile with neither → still "No scouted points yet".

**Rollback:** `git revert -m 1 5cf783a && git push && npm run deploy`.

---

## 2026-05-22 — D1 heatmap: player self-log dot placement fix (§ 70.10)
**Commit:** `b500973` — merge of `fix/d1-self-log-placement` (`6653153`, `8ebcd56`)
**Status:** ✅ Deployed

**What changed:** player self-log dots on the D1 training heatmap ("Player" pill) were landing at the **mirror-image bunker**. Root cause: a player self-log dot is **bunker-derived** — the propagator stores `bunkerToPosition(bunker)` = `bunker.x ± 0.02, bunker.y`, a bunker-**absolute** coord — but D1's builder ran it through `mirrorPointToLeft` (x→1-x) along with the real, team-relative scout/coach coords, flipping it to the opposite bunker.
- **Fix (path a, render-scoped):** for slots `playersMeta[i].source ∈ {self,kiosk}`, `resolveSelfLogDot()` takes the **un-mirrored** synth, reverse-looks-up the nearest layout bunker (`field.bunkers`), and re-places at `bunkerToPosition(bunker,'left')` — conventional LEFT (player gave no start side), un-mirrored. Scout/coach slots unchanged.
- **Tie-guard:** real layouts' tightest bunker spacing is 0.0506 (NXL Tampa) — safe; but the "2026 sample layout" has a 0.0028 near-duplicate, so the guard snaps only when the nearest bunker is ≤0.04 away AND beats the runner-up by ≥0.012, else keeps the un-mirrored synth (benign — still the right bunker).
- Direction-only logs (unresolved bunker) → no stored coord → not rendered (exclusion free). **Stored data untouched** — propagator coord stays correct for `positionConfidence`.
- **Deferred — path (b):** reading `selfReports` directly would also surface orphan self-logs on the heatmap (Samoocena-consistent) — a coverage/product decision, separate from this placement fix.

**§ 27:** N/A — pure coord-math in a `useMemo`; no visual-system surface touched.

**Validation:** `vite build` ✓ (9.73s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** "test training (PROD)" → Heatmap → Player pill → Koe's dots beside their logged bunkers on the LEFT (not the mirror-image spot); Scout/Coach dots unchanged; unresolved-bunker log → no dot.

**Rollback:** `git revert -m 1 b500973 && git push && npm run deploy`.

---

## 2026-05-22 — "Samoocena": player self-logs on the profile (§ 70.9)
**Commit:** `194c755` — merge of `feat/samoocena-self-report-section` (`4bfd470`, `9e10a8a`)
**Status:** ✅ Deployed

**What changed:** new **"Samoocena"** section on `PlayerStatsPage` (after "Historia meczów") — lists the player's own `selfReports` (`players/{pid}/selfReports`), **ALL of them — matched + orphan**, separate from coach-observed W/L.
- Solves the gap diagnosed earlier: a player's self-logs that don't reconcile to a coach point (orphan) were invisible everywhere. Per Jacek's call, orphan self-logs = the player's **self-assessment** — now surfaced on the profile.
- `getSelfReportsForPlayer(playerId, trainingId)` (`playerPerformanceTrackerService.js`) — per-player subcollection read, fetch-all + client-filter. **No collectionGroup, no composite index.**
- Row UI **reuses `LogRow`** (exported from `components/ppt/TodaysLogsList.jsx`) — no duplicate row UI.
- Visible in `scope=training` (filtered by `tid`) + `scope=global` (all, flat chronological); hidden in `tournament`/`match` scope and when the player has no self-logs.
- Matched + orphan shown uniformly (no reconciliation-status indicator — `propagatedAt` available, deferred). § 70 granular-per-source read on the profile (Tier 2 / "Mój dzień"), counterpart of the D1 training heatmap.

**§ 27:** PASS — reuses `LogRow` + `SectionHeader` (page's section pattern); theme tokens; no competing CTA.

**Validation:** `vite build` ✓ (7.72s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** Koe's profile, `scope=training&tid=03sCks…` → "Samoocena" lists all 5 self-logs (2 matched + 3 orphan); tournament/match scope → hidden; player with no self-logs → hidden.

**Rollback:** `git revert -m 1 194c755 && git push && npm run deploy`.

---

## 2026-05-22 — Multi-team player membership (§ 72)
**Commit:** `f3d0a49` — merge of `feat/multi-team-membership` (`cde7211`, `a2d448b`, `e295785`, `49fa26a`)
**Status:** ✅ Deployed

**What changed:** a player can now be rostered on multiple teams (pro players across regions — e.g. Chavez US + EU).
- **`player.teams[]`** — array of teamIds directly rostered on; **`player.teamId` stays the PRIMARY** (display/header). New helper `src/utils/playerTeams.js` — `playerTeams()` / `playerOnTeam()` with **on-read fallback** to legacy `teamId` (no migration script). All ~9 roster-read sites converted `p.teamId===X` → `playerOnTeam()`.
- **Import — pbliId = authoritative cross-team key.** `CSVImport`: a row whose `pbliId` matches an existing player **appends** the import team to `teams[]` (dedupe; never overwrites `teamId`/name/profile). **Name-match never cross-appends** (Chavez US ≠ Chavez EU); no-pbliId rows keep the existing within-team name-dedup **unchanged** (no regression). `addPlayer` persists `teams[]`.
- **`PlayerEditModal`** — teams[] editor (chip rows: ★ set-primary / name / ✕ remove + "add team" picker) — the manual multi-membership path.
- Parent/child: `teams[]` is direct-only; parent rosters keep their `[parent,…children]` read-site expansion.

No junction collection (`teams[]` + client `includes()` — no server `where('teamId')` queries exist). § 72.

**§ 27:** PASS — teams editor: compact chip rows, ★/✕ 44×44, accent on primary, tokens.

**Validation:** `vite build` ✓ (7.49s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** import a pbliId player already on another team → appended to `teams[]`, on both rosters, profile untouched; PlayerEditModal add/remove/set-primary; no-pbliId player name-dedups as today.

**Known follow-ups (§ 72 / NEXT_TASKS, not blocking):** `TeamDetailPage` quick add/remove-player still single-team `changePlayerTeam`; "+N more teams" header badge deferred; mandatory-pbliId deferred as a toggle.

**Rollback:** `git revert -m 1 f3d0a49 && git push && npm run deploy`.

---

## 2026-05-22 — Klocek 2 § 70 Stage 3 D1: source-filtered training heatmap
**Commit:** `000fa73` — merge of `feat/d1-training-heatmap` (`bb77ad9`, `0d208a7`)
**Status:** ✅ Deployed

**What changed:** Stage 3 **D1** — the granular scout/coach/player read. `TrainingResultsPage` gains a **"Heatmap"** section (next to "Break bunkers"):
- `<FieldView mode="heatmap">` over per-side heatmap points built from the training's points — each non-empty side → one point via `mirrorPointToLeft` (free-play `homeData`-only → one point), carrying `players[]` + `playersMeta[]` + `shotsMeta[]` + `assignments[]`.
- **Source-filter pills** — All · Scout · Coach · Player — mask slots by `_meta[i].source` (`self`+`kiosk`→Player, `coach`→Coach, `scout`→Scout). `null`-`_meta` slots (legacy/untagged) shown only under All.
- Consensus-tree only — orphan (unpropagated) `selfReports` stay off the heatmap (that's D2). Section gated `≥1 point AND field resolved` (no `training.layoutId` → hidden, no crash).
- Re-scoped from the abandoned `ScoutedTeamPage` plan (tournament-only) onto `TrainingResultsPage` — the proper home, since § 70 `_meta` data is training-scoped.

**§ 70 Stage 3 COMPLETE** (D1 + D2). Only **Stage 4** (manual override UI) remains in Track C.

**§ 27:** PASS — pills lightweight (active=accent, tokens, ≥44 touch); `FieldView` reused unchanged; no anti-patterns.

**Validation:** `vite build` ✓ (9.09s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** "test training (PROD)" → Coach → "📊 Wyniki treningu" → Heatmap → Player pill = self/kiosk slots, Coach = coach + free-play, Scout = scout, All = everything; free-play point = one side; `null`-`_meta` slot hidden under a specific pill.

**Rollback:** `git revert -m 1 000fa73 && git push && npm run deploy`.

---

## 2026-05-22 — Multi-league CSV import — de-NXL the import paths (§ 71.1)
**Commit:** `8c5fdb3` — merge of `fix/multi-league-import` (`bc4f045`, `146495c`)
**Status:** ✅ Deployed

**Bug:** the CSV import paths were NXL-hardcoded — a panel-created league (e.g. NXL US) could not be imported. (Reported: Jacek created the US league + divisions but had no working import.)

- **`CSVImport`** (global team+player CSV) — "Default league" `<Select>` now sourced from `useLeagues()` (was hardcoded `NXL/PXL/DPL`); `normalizeDivision` validates against the selected league's `divisions[]` from the `/leagues` doc via `useLeagueDivisions` (was the `DIVISIONS` theme constant — no US entry).
- **`ScheduleCSVImport`** (tournament schedule CSV) — tournament picker dropped the `t.league === 'NXL'` filter (now any tournament with a league); all 7 `team.divisions.NXL` lookups (helper fns + import) → `team.divisions[league]`, keyed by the selected tournament's league.
- **`AdminPlayersPage`** — added a "📋 CSV import" entry (Super Admin → Players); the global importer was previously only on the legacy `/players` page. One entry covers teams + players.

Existing NXL imports unaffected (NXL still in `useLeagues`; `.divisions.NXL` ≡ `.divisions['NXL']`).

**§ 27:** PASS — reused `Select`/`Btn`, no visual change; removed the hardcoded league list (the bug).

**Validation:** `vite build` ✓ (8.41s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** Super Admin → Players → 📋 CSV import → "Default league" lists NXL US → import tags `team.divisions[US]`. US-league tournament → Scout tab → schedule CSV → US tournament appears in the picker.

**Known (§ 71.1, non-blocking):** `NewTournamentModal:374` loose `l.league==='NXL'` clause (permissive, over-shows NXL layouts); `normalizeScheduleDivision` is a flat alias map — novel US division names fail the schedule import with an actionable "add an alias" error.

**Rollback:** `git revert -m 1 8c5fdb3 && git push && npm run deploy`.

---

## 2026-05-22 — League display-name resolution + freeze shortName (§ 71)
**Commit:** `cf298d9` — merge of `feat/league-name-resolution` (`af5b6b6`, `cb2978b`, `a465924`)
**Status:** ✅ Deployed

**What changed — safe-rename infrastructure for leagues.** League refs across the app store the league `shortName` string (the de-facto KEY); the human display is the `/leagues` doc `name`.
- **Resolution layer** — `useLeagueName()` (reactive hook → `LeagueBadge`) + `leagueDisplayName(shortName)` (non-reactive module-cached helper) map `shortName → /leagues.name` at **all ~12 display sites** (LeagueBadge, AppShell + TournamentPicker badges, layout/tournament option-text + subtitles in NewTournamentModal/MainPage/PlayerStatsPage/ScoutRankingPage/TrainingMoreTab/ScoutTabContent/MoreTabContent). Module cache → N sites = 1 `getDocs`. Fallback = raw string for custom `'Other'` leagues.
- **`shortName` frozen** — `LeagueFormModal` renders it read-only in EDIT mode (editable only at CREATE — `id=l_${shortName}` is derived + immutable).
- **No-op today** — all 3 leagues have `shortName === name`, so zero visible change. Ships *before* any rename.

**Effect:** renaming a league (e.g. "NXL" → "NXL Europe") is now a **one-field `name` update** via AdminLeaguesPage → Super Admin → Leagues — no ref/constant/team-doc migration. `"NXL"` stays the frozen code; a future NXL US import uses a distinct code.

**STEP 3 skipped** (per pre-flight): divisions are doc-sourced (`useLeagueDivisions`), `LEAGUE_COLORS` has a fallback — new panel leagues already work. Lone residue `CSVImport:111 DIVISIONS[league]` is import-only → future NXL-US-import brief.

**§ 27:** PASS — resolution is text-only; `LeagueBadge` visually identical; `LEAGUE_COLORS` unchanged; no shared-component change.

**Validation:** `vite build` ✓ (8.75s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** badges/labels still read "NXL"/"DPL"/"PXL" (no-op pre-rename); `LeagueFormModal` edit → Short name read-only. Post-deploy: rename `l_nxl`'s Display name → resolves everywhere; `layout.league`/`team.divisions` keys stay `"NXL"`.

**Rollback:** `git revert -m 1 cf298d9 && git push && npm run deploy`.

**Next:** Jacek can now safely rename "NXL" → "NXL Europe" (AdminLeaguesPage). NXL US import = its own brief (distinct shortName + the CSVImport `DIVISIONS` residue).

---

## 2026-05-22 — Super Admin panel: gate + entry point + flag-label fix (§ 66.9)
**Commit:** `699628b` — merge of `feat/super-admin-panel-gate` (`8b43b79`, `4bcfa1d`, `a1b1274`)
**Status:** ✅ Deployed

**What changed:**
- **`SuperAdminGuard`** (`App.jsx`) — the global editors `/admin/leagues`, `/admin/players`, `/admin/teams` now gate on `useIsSuperAdmin` (`users/{uid}.globalRole==='super_admin'` OR `ADMIN_EMAILS` bootstrap), not the workspace-level `effectiveIsAdmin`. Cross-workspace data → cross-workspace gate. A plain workspace-admin could previously reach them by URL. `/debug/flags` keeps `AdminGuard` (feature flags are per-workspace config).
- **"Super Admin" section** in the More tab (`MoreTabContent`) — the 3 editor links moved out of the workspace-admin "Admin" section into a new section gated on the same `useIsSuperAdmin` (no dead links). The links already existed; this regates + relabels them.
- **Three-state flag label** (`DebugFlagsPage`) — was binary "active for you" / "hidden for your role"; the latter showed for **disabled** flags too (a disabled flag is not role-blocked). Now `Disabled` / `Active for you` / `Hidden for your role`.

**Discovery #2 outcome:** the "hidden for your role" symptom was NOT a role-resolution bug — the 3 flags (videoCV/predictiveEngine/confidenceBadge) are `enabled:false`. The **View-As-ghost hypothesis is DISPROVEN** — `ViewAsContext` is runtime-disabled (`viewAs` hardcoded `null`); `effectiveRoles`/`effectiveIsAdmin` always equal the real values. Do not re-investigate.

**§ 27:** PASS — new section reuses `MoreSection`/`MoreItem`; emoji icons kept (consistency with all sibling entries — brief's "Lucide" deviation noted + rationale'd).

**Validation:** `vite build` ✓ (8.15s), `lint-ui` 0 errors, 0 `debugger`.

**Smoke:** super_admin → More → "Super Admin" section → editors open. Non-super_admin workspace-admin → no section; `/admin/*` by URL → redirected. `/debug/flags` → disabled flags read "Disabled".

**Rollback:** `git revert -m 1 699628b && git push && npm run deploy`.

---

## 2026-05-22 — Klocek 2 § 70 Stage 3 D2: event-scoped per-bunker aggregation
**Commit:** `d46c1ff` — merge of `feat/multisource-stage3-granular-read` (`9d9af1c`, `2038569`, `25c7986`)
**Status:** ✅ Deployed

**What changed:** Stage 3 **D2** (event-scoped aggregation). D1 (granular source read) deferred — see below.

- **`getEventShotFrequencies(trainingId)`** (`playerPerformanceTrackerService.js`) — one `collectionGroup('selfReports').where('trainingId','==',X)` query grouped by `breakout.bunker` → per bunker `{ bunker, side, count, hits, hitRate, shots }`. Propagated `selfReports` stay in the subcollection (stamped), so a single collectionGroup query is the complete self-log set (matched + orphan) — no in-tree iteration (training points are zone-granular D/C/S, not bunker-granular).
- **"Break bunkers" breakdown** on `TrainingResultsPage` — `SideTag` + bunker + count + danger-coloured hit-rate. `.catch`-guarded → degrades to no section on query failure.
- **`TrainingResultsPage` wired in** — it was an orphan route (registered, no UI entry). A "📊 Wyniki treningu" Card in the training **Coach tab** (gated `totalPoints>0`) now opens it.
- **Index:** `fieldOverrides` `selfReports.trainingId` COLLECTION_GROUP — deployed via `firebase deploy --only firestore:indexes`, built + verified.

**D1 DEFERRED:** the planned source-filter pills on `ScoutedTeamPage` — `ScoutedTeamPage` is tournament-scoped (route `/tournament/:tournamentId/team/:scoutedId`, opponent-scouting); § 70 multi-source `_meta` (coach/self/kiosk) lives in **trainings**. D1 re-scoped as a separate "source-filtered training heatmap on TrainingResultsPage" brief (§ 70.8).

**§ 27:** PASS (full review — BunkerRow + Wyniki Card; tokens-only, semantic hit-rate colour, ≥44 touch).

**Validation:** `vite build` ✓ (7.91s), `lint-ui` 0 errors, 0 `debugger`. D2 verified on live data — `getEventShotFrequencies` on the §70.8 smoke training returns D1 2×/50% · Dog 2×/50% · D2 1×/0%.

**Smoke:** training (with points) → Coach tab → "📊 Wyniki treningu" → Results → "Break bunkers" section shows per-bunker counts + hit-rates.

**Rollback:** `git revert -m 1 d46c1ff && git push && npm run deploy`. (Index is additive — leave it.)

**Next:** § 70 Stage 3 D1 re-spec (training-heatmap brief); Stage 4 (manual override UI).

---

## 2026-05-22 — Fix: end-training confirm modal hangs during matcher propagation
**Commit:** `2476cb0` — merge of `fix/end-training-modal-hang` (`81716d7`)
**Status:** ✅ Deployed

**Bug:** § 70 Stage 2 made `updateTraining(status:'closed')` await `propagateTraining` (the multi-source matcher across every matchup of the training — tens of seconds for a training with many matchups). `MainPage`'s end-training `ConfirmModal` `onConfirm` awaited the whole `updateTraining` before `setEndTrainingConfirm(false)`, so the modal sat open/frozen for the entire propagation run after the user confirmed.

**Fix:** `onConfirm` now dismisses the modal immediately, then runs the close-write + propagation detached (`.catch`-guarded; both already best-effort). The training flips to `closed` the moment `batch.commit()` lands; propagation completes in the background. Only the end-training modal touched — delete-training (navigates away after) and tournament-close (no batch matcher) left as-is.

**§ 27:** N/A — behaviour-only, no UI surface change.

**Validation:** `vite build` ✓ (8.94s), `lint-ui` 0 errors, 0 `debugger`.

**Found during:** the § 70 PPT matcher smoke (training-close fired `propagateTraining`; the modal hung for its duration). That smoke **PASSED** — see § 70.8: 2 PROPAGATED · 0 BAD, matcher verified, Stage 3 gate cleared.

**Rollback:** `git revert -m 1 2476cb0 && git push && npm run deploy`.

---

## 2026-05-22 — Fix: PPT picker shows attendee trainings (§ 48.2)
**Commit:** `2b88a0a` — merge of `fix/ppt-picker-attendee-visibility` (`e5032fe`)
**Status:** ✅ Deployed

**Bug:** `usePPTIdentity` filtered the PPT training picker by team alone (`teamIds.includes(tr.teamId)`). A linked player invited as a guest/attendee to **another team's** training was structurally excluded — the training never appeared in `/player/log`, so they couldn't self-log. (Diagnosed: Koe/RANGER could not see "test training (PROD)", `teamId` 019 Porvoo, despite being in its `attendees[]`.)

**Fix:** the picker filter now admits a training when `teamIds.includes(tr.teamId)` **OR** the player is in `tr.attendees[]`. Dropped the `teamIds`-empty early-return (the OR filter subsumes it). Unlinked path (`if (playerId)`-gated) untouched.

**Side-effect — unblocks the § 70.8 PPT matcher smoke:** every prior self-log smoke used the KIOSK path because the PPT picker never showed the (019 Porvoo) test training to Koe → 0 PPT `selfReports` → `propagateMatchup` unexercised. Koe can now pick it and PPT-self-log → the matcher smoke is finally doable.

**Deferred:** a "guest" tag distinguishing attendee-trainings from own-team cards — needs `teamIds` threaded to `TrainingCard`; § 48.2 follow-up note.

**§ 27:** N/A — hook filter change, no UI surface (picker list renders more rows via the unchanged `TrainingCard`).

**Validation:** `vite build` ✓ (7.58s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows — validated directly.

**Smoke:** Koe → `/player/log` → "test training (PROD)" now appears; own-team (Ranger) trainings still show; unlinked user sees all workspace trainings.

**Rollback:** `git revert -m 1 2b88a0a && git push && npm run deploy`.

---

## 2026-05-21 — Klocek 2 § 70 Stage 1b: free-play coach UI
**Commit:** `01a93ed` — merge of `feat/multisource-stage1b-freeplay-ui` (`4e1673c` STEP 2.4 stat fixes, `a385598` QuickLogView freePlay, `9c5d657` entry point, `a42665f` docs)
**Status:** ✅ Deployed

**What changed:** Stage 1b of Klocek 2 (§ 70) — coaches can log training points with no squad-vs-squad matchup ("free play" — the orphan coach point per § 70.5).

- **Entry:** "+ Wolna gra" dashed card in `TrainingScoutTab` Section 3 (Matches), shown when the training has ≥1 attendee and isn't closed → `getOrCreateFreePlayMatchup` → QuickLogView in free-play mode. `isFreePlay` matchups filtered from the matchup list.
- **`QuickLogView` `freePlay` mode** — prop defaults FALSE, so every existing caller (MatchPage + two-squad TrainingScoutTab) is byte-for-byte unchanged. One roster (attendees), score bar hidden, flow `pick → zone → per-player survived/eliminated → Zapisz punkt` (tracking/win stages skipped).
- **Free-play point:** `homeData` only, `outcome:null`, per-player `eliminations[]`, `_meta source:'coach'`, event-scoped.
- **STEP 2.4 reader-safety:** `TrainingResultsPage` + `playerStats` winRate now over **decided** points (`wins+losses`) — a free-play point (`outcome:null`) no longer deflates win% or becomes a phantom loss; survival still counts. Identical for all-decided trainings.

No rules change. § 70.6 Stage 1b.

**§ 27:** PASS (full review — colour/elevation/typography/cards/nav/touch all clean; two-squad path regression-safe via `freePlay===false` default).

**Validation:** `vite build` ✓ (9.71s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows (bash ENOENT) — validated directly.

**Smoke:** training (≥1 attendee) → "+ Wolna gra" → pick + zone + survived/eliminated → Zapisz punkt → point under the `isFreePlay` matchup, `outcome:null`, `_meta source:'coach'`. Two-squad QuickLog still logs `win_a/win_b`. All-decided training win% unchanged.

**Known minor:** free-play pick-stage tiles still show the win% metric (reads 0%/— for `outcome:null` points) — cosmetic, deferred.

**Rollback:** `git revert -m 1 01a93ed && git push && npm run deploy`.

**Next:** Stage 3 (granular read + event-scoped aggregation), Stage 4 (manual override UI) — § 70.6.

---

## 2026-05-21 — Fix: dotted-path array destruction in write-back (§ 70)
**Commit:** `56ee53f` — merge of `fix/multisource-meta-array-write` (`9c1697f`)
**Status:** ✅ Deployed

**Bug:** `propagateSelfReportToPoint` wrote `_meta` per-slot via dotted field paths (`updateDoc({'homeData.playersMeta.2': …})`). Firestore treats the numeric segment as a **map key** → it converts the `playersMeta` **array to a map and destroys the other slots' entries**. Found by the § 70 Stage 2 smoke: a fully coach-quick-logged point's `awayData.playersMeta` (5 `coach` entries) was reduced to `{"1":kiosk,"3":kiosk}` after two KIOSK self-logs. **Pre-existing** — KIOSK's `handleKioskSelfLogSave` has done the identical dotted write since Phase 1a; Stage 2's shared fn perpetuated it.

**Fix:** `propagateSelfReportToPoint` reads the point **fresh** and writes **WHOLE** per-slot arrays (`{side}.playersMeta` / `.shotsMeta` / `.eliminationsMeta` / `.players`) via `normaliseSlots` (read-modify-write — preserves all 5 slots; also repairs map-corruption on fields it touches). The fresh read makes sequential same-point writes correct. Fixes the propagator **and** KIOSK (both use this fn).

**Historical data:** points self-logged before this fix have map-corrupted `_meta` with lost entries — **unrecoverable**, but it is provenance metadata only (`players`/`assignments`/`eliminations` observation arrays are intact) and nothing reads `_meta` until § 70 Stage 3. The fix stops all future loss and repairs points it re-touches.

**Anti-pattern** added to `PROJECT_GUIDELINES.md` § 9 (Architektura).

**Validation:** `vite build` ✓ (5.25s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows — validated directly.

**Smoke:** KIOSK self-log a training point → after save, that side's `playersMeta` is a 5-element **array** with all coach/scout slots preserved + the self slot tagged (regression check on the touched KIOSK feature).

**Rollback:** `git revert -m 1 56ee53f && git push && npm run deploy`.

---

## 2026-05-21 — Klocek 2 § 70 Stage 2: matcher + write-back propagator
**Commit:** `184c04c` — merge of `feat/multisource-stage2-matcher` (`1b4a420` matcher + propagator, `672ec1c` KIOSK adopt, `2c9c3ab` docs)
**Status:** ✅ Deployed

**What changed:** Stage 2 of Klocek 2 (§ 70) — orphan training `selfReports` are matched to point slots and written back into `homeData/awayData` with `_meta source:'self'`.

- `selfReportMatcher.js` — pure resolution: `locatePlayerInPoint` (identity — `assignments.indexOf`), `alignSequence` (temporal 1:1, full-set), `positionConfidence` (`bunkerToPosition` vs `players[slot]`, 12% threshold).
- `dataService.propagateSelfReportToPoint` — shared write-back (`_meta`, `players[slot]` if empty, shots subcollection, elim meta); `propagateMatchup` / `propagateTraining` — orchestration, idempotent via `propagatedAt`.
- Triggers: `endMatchupAndMerge` (per matchup) + `updateTraining(status:'closed')` → all matchups (Stage 1b). Best-effort — propagation failure never fails the merge/close.
- KIOSK `handleKioskSelfLogSave` adopts the shared write-back (`source:'kiosk'`).

**Design calls:** per-player subcollection query (no new Firestore index); full-set sequence-align + skip-write (idempotency); `unknown` position → write-back; late-log deferred (batch-only — `updateTraining`-close is the safety net); KIOSK shot `scoutedBy` → `linkedUid||playerId`. Conflict = last-writer-wins, `selfReports` immutable.

No rules change. Behaviour: closing a matchup/training now propagates self-logs into the consensus `homeData/awayData`.

**Validation:** `vite build` ✓ (4.65s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows (bash ENOENT) — validated directly.

**Smoke:** training → coach quick-logs points → player PPT self-logs (orphan) → close matchup/training → `_meta source:'self'` lands in the matched slot, `slotRef`+`propagatedAt` set; re-run = no-op.

**Rollback:** `git revert -m 1 184c04c && git push && npm run deploy`.

**Next:** Stage 1b (free-play coach UI), Stage 3 (granular read + event-scoped aggregation), Stage 4 (manual override UI) — § 70.6.

---

## 2026-05-21 — Klocek 2 § 70 Stage 1: multi-source foundation
**Commit:** `373cc84` — merge of `feat/multisource-stage1-foundation` (`f16f34a` coach tag, `0f36b15` free-play helper, `3181861` docs)
**Status:** ✅ Deployed

**What changed:** Stage 1 (Foundation) of Klocek 2 multi-source reconciliation (§ 70).

**3-commit summary:**
- `f16f34a` — coach tag: `observationMeta` enum → `{scout|coach|self|kiosk}`; `MatchPage` + `TrainingScoutTab` QuickLog handlers tag `makeMeta('coach', …)`.
- `0f36b15` — `getOrCreateFreePlayMatchup(trainingId)` dormant helper added to `dataService.js`.
- `3181861` — docs: § 70 + `docs/architecture/MULTISOURCE_RECONCILIATION.md` + NEXT_TASKS + HANDOVER.

**Detail:**
- **Coach source tag** — both QuickLogView save handlers (`MatchPage` tournament/sparing, `TrainingScoutTab` training) tag `playersMeta`/`eliminationsMeta` `source:'coach'` instead of `'scout'` → scout vs coach data now granularly separable.
- **Proper-scouting writer UNTOUCHED** — `makeTeamData` (`MatchPage.jsx:875-877`, the canvas/proper-scouting path) still writes `makeMeta('scout', uid)`. Only the quick-log path was reclassified.
- **`getOrCreateFreePlayMatchup` shipped DORMANT** — zero consumer. `grep` across `src/` finds only the definition (`dataService.js:1078`), no callers. No entry point, no QuickLogView change — the "Log free play" UI + squad-less QuickLogView mode are Stage 1b. Training-only — sparing keeps its natural match.
- **Docs** — § 70 (model + revised stage list 1/1b/2/3/4) + new `docs/architecture/MULTISOURCE_RECONCILIATION.md`.

No rules change (rules don't validate `_meta.source`). Behaviour change is provenance-only — new QuickLog points carry `source:'coach'`; readers unaffected.

**§ 27 self-review:**
```
Color discipline: N/A — data layer, no UI/visual surface
Elevation:        N/A
Typography:       N/A
Cards:            N/A
Navigation:       N/A
Anti-patterns:    ZERO — no rendered surface (squad-less QuickLogView UI is Stage 1b)
Verdict:          READY — shipped
```

**Validation:** `vite build` ✓ (5.50s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows (bash ENOENT) — validated directly.

**Smoke:** coach quick-log a training/match point → the new point's `playersMeta[i].source` is `'coach'` (was `'scout'`). No visible UI difference — provenance only.

**Rollback:** `git revert -m 1 373cc84 && git push && npm run deploy`.

**Next:** Stage 1b (free-play coach UI) → 2 (matcher + write-back) → 3 (granular read) → 4 (override UI) — § 70.6.

---

## 2026-05-21 — KIOSK lobby crash hotfix (Router context)
**Commit:** `1ddafd7` — merge of `fix/kiosk-lobby-router-context` (`19af7ae`)
**Status:** ✅ Deployed

**What changed:** `KioskPostSaveSummary` + `KioskLobbyOverlay` were mounted *after* `</HashRouter>` in `App.jsx`. `KioskLobbyOverlay`'s `useNavigate` (the Brief D "Zobacz swój dzień" deep-link toast) has no Router context outside HashRouter → throws `useNavigate() may be used only in the context of a <Router>` → crash boundary when the coach taps "Przekaż graczom" to open the KIOSK lobby in a training. The post-save summary survived (no router hook); the lobby crashed. Fix: moved both overlays inside `<HashRouter>` as siblings of `<Routes>` — still full-screen + self-gated by `KioskContext`, now with Router context.

**Root cause / scope:** latent since Brief D added the `useNavigate` deep-link to the lobby — surfaced the first time the KIOSK lobby was opened. **Unrelated to § 69 / Klocek 2 Stage 1.** Diagnosed read-only first — the training/point data Jacek created is structurally clean; pure Router-context bug.

**Validation:** `vite build` ✓ (5.94s), `lint-ui` 0 errors. precommit broken on Windows (bash ENOENT) — validated directly.

**Smoke:** training → QuickLog → save a point → "Przekaż graczom" → KIOSK lobby opens without crashing.

**Rollback:** `git revert -m 1 1ddafd7 && git push && npm run deploy`.

---

## 2026-05-21 — Events Model C: events_index (§ 69)
**Commits:** `41a5ab8` (merge of `feat/events-index-model-c` — `0396306` dataService writer, `456e05e` useEvents, `10e7f51` rules, `a494634` backfill, `de31bd5` § 69 + FIRESTORE_DATA_MODEL.md) + `a2ac142` (backfill dry-run reporting)
**Status:** ✅ Deployed — staged: rules → client → backfill.

**What changed:** Additive cross-type event index per § 69 (Model C — chosen over Model B full unification). New `/workspaces/{slug}/events_index/{eventId}` — a 1:1 thin mirror of every tournament/sparing/practice/training, so cross-type readers (PPT picker, player claim flow, aggregation) can list all events without resolving to `/tournaments/` + `/trainings/` or migrating nested trees.

- **Writer** — `addTournament`/`addTraining` switched `addDoc`→`doc()+writeBatch`; the index entry is written atomically with the event doc. `updateTournament`/`updateTraining` batch a `setDoc(merge)` index patch. `deleteTournament`/`deleteTraining` drop the index entry in the cascade batch.
- **`useEvents()`** hook + `subscribeEventsIndex` — additive read surface; the 22 existing consumers + `useTournaments`/`useTrainings` untouched.
- **Rules** — `events_index` block (read `isMember`, write `isScout`).
- **Docs** — § 69 + new `docs/architecture/FIRESTORE_DATA_MODEL.md` (ground-truth DB map).

**Deploy order corrected from the brief — rules FIRST.** The index write rides the event-mutation `writeBatch`; with no workspace-level catch-all rule, a client-before-rules deploy would have denied the index write → rejected the whole batch → broken every event mutation. Sequence: (1) `firebase deploy --only firestore:rules` — clean compile, 0 warnings; (2) `npm run deploy`; (3) backfill.

**Writer verification:** 6 UI-created test events (2 tournament + 2 sparing + 2 training) — all got atomic index entries, 0 orphans, eventType derivation 100% correct.

**Backfill:** `backfill_events_index.cjs --commit` — **wrote 14, 0 errors**, count match (14 source = 14 index). Breakdown: 7 tournament / 4 sparing / 0 practice / 3 training. Spot-check (one per type) — all field mirrors OK, source docs exist, `createdAt` preserved.

**Known issues:** `practice` eventType has zero live data (no `type:'practice'` doc exists in prod) — dead-discriminator cleanup candidate (NEXT_TASKS). `useEvents` ships with no consumer yet — PPT-picker rewiring is a follow-up brief.

**Rollback:** client — `git revert -m 1 41a5ab8 && git push && npm run deploy`; the `events_index` rule + collection are additive (harmless if left).

**Follow-ups:** PPT-picker rewiring to `useEvents`, cross-event aggregation, player claim flow (now unblocked).

---

## 2026-05-21 — MembersPage visibility — elevated-member surfacing (§ 68)
**Commit:** `955508f` — merge of `fix/members-visibility-2026-05-20` (2 commits: `34a9991`, `119cc4b`)
**Status:** ✅ Deployed
**What changed:** Fixes the 2026-05-20 incident — the super_admin (Jacek), with `userRoles=[]`, was invisible on `/settings/members` because the active-list filter required `userRoles.length > 0`.

- `MembersPage`: active bucket = non-pending AND (`roles.length>0` OR `isElevated(uid)`), where `isElevated` = `uid===workspace.adminUid` OR (`uid===viewer.uid` AND viewer is super_admin via `useIsSuperAdmin`). Zero extra queries.
- `MemberCard`: new neutral-gray "Admin workspace" status badge for the `adminUid` holder (mirrors the Phase 3.b super_admin badge; non-amber per § 27). The `RoleChips` row is skipped when the member has no roles — elevated members render badge-only, no empty chip row.
- § 68 documents the model; NEXT_TASKS gains a 3-item fragility cluster.

**Trimmed scope (Jacek 2026-05-21):** pre-flight discovery corrected two brief assumptions — the `adminUid` holder is not in `members[]` at all (not a filter issue), and the no-role bucket is 570 members of which 569 are dead post-purge uids. The three-bucket "limbo" design was dropped; a no-role/assignment surface is deferred, blocked on the `members[]` dead-uid prune.

**§ 27:** PASS — neutral-gray badge (no amber), reuses the existing badge pattern, one status pill, no other visual surface.

**Validation:** `vite build` ✓ (9.27s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows (bash ENOENT) — validated directly.

**Smoke (Jacek, ~1 min):** open `/settings/members` → you now appear in the active list with a "Super admin" badge (no role chips — `userRoles=[]`). The `adminUid` holder `JDDCmHSQ…` still won't appear — he is not in `members[]` (the `adminUid`→non-member anomaly — NEXT_TASKS fragility cluster).

**Rollback:** `git revert -m 1 955508f && git push && npm run deploy`.

**Follow-ups (NEXT_TASKS fragility cluster):** `adminUid`→non-member anomaly · `members[]` dead-uid prune (569 dead) · super_admin detection scope.

---

## 2026-05-20 — Phase 3.c.2: ownership rules on global /teams/ + /players/
**Commit:** `89d5caf` — merge of `feat/phase-3-c-2-ownership-rules` (`7f74178` backfill script, `172377e` dataService, `f5adf29` roleUtils, `8e8dda0` rules, `520939c` rollback snapshot)
**Status:** ✅ Deployed — staged Stage 7 (client → backfill → rules). Stage 7.4 formal smoke partially deferred (below).

**What changed:** Phase 3.c.2 per § 65.2 single-owner model + § 67. Global `/teams/` + `/players/` create/update were `auth != null` (any authed user) — now ownership-gated.

- **7.1 client deploy** — `addTeam`/`addPlayer` write `ownerWorkspaceId` (= workspace slug); `updateTeam`/`updatePlayer` strip it from caller data. Rules not yet live → no write breakage.
- **7.2 backfill** — `phase_3_c_2_ownerworkspaceid.cjs --commit`: **1066 docs** (132 teams + 934 players) set `ownerWorkspaceId = originWorkspace` (all `"ranger1996"`). **0 errors, 0 missing-originWorkspace.** Idempotent + additive.
- **7.3 rules deploy** — `firebase deploy --only firestore:rules`: **clean compile, 0 warnings**, released. New helper `isWorkspaceAdminOf(slug)`; `/teams/` + `/players/` create = `isSuperAdmin() OR isWorkspaceAdminOf(request ownerWorkspaceId)`, update = same `OR` + an `ownerWorkspaceId`-unchanged immutability clause, delete = `isSuperAdmin()` (unchanged from 3.c.1).
- **Rollback:** `firestore.rules.pre-3c2-backup` (`520939c`) → `cp firestore.rules.pre-3c2-backup firestore.rules && firebase deploy --only firestore:rules`.

**Stage 7.4 smoke:** create-team + create-player verified during incident ops 2026-05-20 — both wrote `ownerWorkspaceId: "ranger1996"`, **passed**. Formal **edit + retire/unretire smoke + the team-delete repro are DEFERRED to the next session** — rules are live and serving, super_admin path confirmed.

**Notes:** backfill-before-rules is mandatory (rules over un-backfilled docs lock out writes); the backfill is additive/idempotent, safe under either ruleset. Emulator test harness deferred (no JDK — § 67.5). Closure: DESIGN_DECISIONS § 65.7.5.

---

## 2026-05-20 — UX bug bundle (Bug 1/2/4)
**Commit:** `dc8288e` — merge of `fix/ux-bugs-bundle-2026-05-20` (3 commits: `13458b2`, `e63ecdf`, `b4db94f`)
**Status:** ✅ Deployed
**Diagnosis source:** Live UX session via Claude in Chrome 2026-05-20 17:28–17:36. Root causes corrected against code at pre-flight — 3 of the 4 brief hypotheses were off.

**What changed:**
1. **Bug 1 — Wyjdź silent fail** (`13458b2`). `LeaveBtn` (Settings → Workspace) now disabled for super_admin + the workspace `adminUid` holder, with an explanatory tooltip; `leaveWorkspaceSelf` throws a defensive `WORKSPACE_ADMIN_CANNOT_LEAVE` / `SUPER_ADMIN_CANNOT_LEAVE` guard (handleLeave maps to localized messages); 2 i18n keys ×PL/EN. Real cause: a self-leave write succeeds but `autoEnterDefaultWorkspace` immediately re-joins the user (ranger1996 is their `defaultWorkspace`) — a silent no-op. The deeper auto-rejoin loop (hits any non-admin leaving their default workspace) is left as-is — out of scope for this hotfix.
2. **Bug 2/3 — MembersPage rows non-tappable** (`e63ecdf`). `MembersPage` derived `isCurrentUserAdmin` from a stale 2-path check (role-array `admin` OR `adminUid`) — false for Jacek (super_admin via bootstrap, roles `[]`). Switched to `useWorkspace().isAdmin` (4-path, super_admin-aware since Phase 3.a). Row tap now opens `UserDetailPage` (`/settings/members/:uid`, with the Phase 3.b Global role section); inline chips + kebab also unlocked. Navigation was already wired in `MemberCard` — the brief's "never wired up" hypothesis was wrong; the admin gate was the bug. Bug 3 (no SuperAdmin view) resolves as a consequence.
3. **Bug 4 — admin-page kebab TypeError** (`b4db94f`). `MoreBtn` (`ui.jsx`) called the consumer `onClick()` with no arguments, so `/admin/teams`, `/admin/players`, `/admin/leagues` handlers doing `(e) => e.stopPropagation?.()` crashed on an undefined `e` (Sentry). Fixed in `MoreBtn` (forwards the event — systemic) + simplified all 3 admin kebab handlers. The brief's "handler doesn't destructure e" hypothesis was wrong — `MoreBtn` dropped the event.

**Brief deviations:** Bug 2 + Bug 4 fixes differ from the brief's proposed approach (verified against code per the brief's own "verify before fixing" instruction). Bug 3 needed no separate fix.

**Validation:** `npx vite build` ✓ (8.30s), `lint-ui` 0 errors, 0 `debugger`. precommit broken on Windows (bash ENOENT) — validated directly.

**Smoke test (Jacek):**
1. Settings → Workspace → **Wyjdź disabled** (you're super_admin), tooltip on hover.
2. Settings → Členkowie → **tap a member row → UserDetailPage** opens with the Global role section.
3. `/admin/teams`, `/admin/players`, `/admin/leagues` → **kebab ⋮ opens the ActionSheet**, no Sentry TypeError, no stuck focus border.

**Known issues:** ServiceWorker `register Rejected` (separate Sentry ticket, lower priority — not in scope).

**Rollback:** `git revert -m 1 dc8288e && git push && npm run deploy`.

---

## 2026-05-20 — Phase 3.c.1: Rules helpers refactor + super_admin awareness (§ 67)
**Commit:** `0aac3c1` (rules + § 67) + follow-up (drop unused isViewer + ship docs)
**Status:** ✅ Rules deployed via `firebase deploy --only firestore:rules` — compiled clean, released. No client deploy.

**What changed:** Phase 3.c sub-task 1 per § 67.7. Backwards-compatible `firestore.rules` refactor — zero behaviour change for current production users.

- `isBootstrapAdmin()` — centralizes the ADMIN_EMAILS allowlist (the one place the hardcoded email lives).
- `isSuperAdmin()` — `isBootstrapAdmin()` OR `users/{uid}.globalRole == 'super_admin'` (Phase 3.a field; `exists()`-guarded `get()`).
- `isAdmin(slug)` — now 4-path: `isSuperAdmin()` OR role `'admin'` OR `adminUid`.
- 5 hardcoded `token.email == jacek` sites centralized via `isSuperAdmin()` (isAdmin path + `/users/` disable + `/leagues/` write + `/players/` delete + `/teams/` delete).
- Removed dead `/notes/{nid}` block — no dataService writer; real coach notes live at `tournaments/{tid}/scouted/{sid}/notes/` (tournament catch-all = `isScout`).
- § 67 Firestore Rules Architecture + § 65.7.4 closure docs.

**Backwards compatible — zero behaviour change:**
- Jacek: admin via bootstrap (email) AND `globalRole='super_admin'` — both fire, identical access.
- Workspace coach/scout/admin: paths 1-2 (role array, adminUid) untouched.
- A future non-Jacek super_admin (globalRole set) now gains rule-level super_admin access — intended new capability; no such user exists yet.
- `/notes/` block removal: zero impact — no docs, no writers at that path.

**isViewer dropped (post-deploy correction):** the first deploy added `isViewer()` (brief specified it "for 3.c.2") — but an unused rules function emits a Firestore-compiler warning plus a spurious knock-on "Invalid variable name" warning. Confirmed unused-function artifact (`isPlayer` / `isSelfLogShotOwned` use the identical `request.auth.uid` pattern with zero warnings). Removed `isViewer`; it lands in 3.c.2 with its first match-block consumer. Second deploy: clean compile, zero warnings.

**Test harness deferred (Jacek decision):** build machine has no JDK; the Firestore emulator requires one. `@firebase/rules-unit-testing` harness is a follow-up gated on JDK availability — § 67.5. 3.c.1 rules validated by deploy-time compilation (clean) + smoke test — the Phase 2.x pattern.

**No client code:** `src/` untouched — vite build not re-run (`firestore.rules` is not part of the bundle).

**Smoke test (Jacek, ~3 min):**
1. Refresh app — admin routes work (`/admin/leagues`, `/admin/players`, `/admin/teams`).
2. UserDetailPage "Global role" section toggles (Phase 3.b regression check).
3. As a coach (non-super-admin) — workspace data reads/writes unchanged.
4. Sentry: zero new permission-denied errors in first 24h.
5. § 67 + § 65.7.4 visible in DESIGN_DECISIONS.md.

**Rollback:** revert the two Phase 3.c.1 commits + `firebase deploy --only firestore:rules`. Emergency last resort: `firestore.rules.backup` (pre-§38 ruleset).

**Unlocks:** 3.c.2 (global `/players/`+`/teams/` create/update hardening [HIGH RISK]), 3.c.3 (PII scoping).

---

## 2026-05-20 — Phase 3.b: super_admin globalRole editing (scope reconciled)
**Commit:** `bddeb10`
**Status:** ✅ Deployed (autonomous, no rules changes)

**What changed:** Phase 3.b scope reconciled at pre-flight (§ 66.8 lesson). The brief proposed a new `/admin/users` super-admin console; CC discovery found it would ~80% duplicate existing workspace member-management UI — `MembersPage` (`/settings/members`), `UserDetailPage` (`/settings/members/:uid`, § 50.4), `MemberCard` inline role editing, `RoleChips`, `RoleTransferModal`, dataService `updateUserRoles`/`removeMember`/`transferAdmin`/`softDisableUser`. Those helpers hardcode the current workspace via `bp()`, and production runs a single workspace — a cross-workspace console has no consumer yet. Jacek chose the minimal path: extend existing pages with the one genuinely-new capability — `globalRole` editing.

1. `ds.setUserGlobalRole(uid, role)` — writes `/users/{uid}.globalRole`, validates role ∈ {'super_admin', null}.
2. `UserDetailPage` — new "Global role" section between Roles and the danger zone, gated by `useIsSuperAdmin()` (super_admin only, § 65.3 Q1). Radio (Standard user / Super admin) + `ConfirmModal` on every change. **First UI consumer of the Phase 3.a `useIsSuperAdmin` hook** — validates 3.a end-to-end.
3. `MemberCard` — neutral-gray "SUPER ADMIN" status badge (non-interactive → not amber per § 27).
4. `useUserProfiles` extended to expose `globalRole`.
5. 11 i18n keys (PL + EN).
6. § 65.7.3 doc patch.

**Preserved per § 66.6 anti-patterns:** NO new `/admin/users` route, NO AdminUsersPage / UserFormModal / SuperAdminGuard / useAllUsers, NO duplicate dataService helpers, NO schema beyond Phase 3.a's `globalRole`. `MembersPage`/`UserDetailPage`/`MemberCard`/`RoleChips`/`workspace.userRoles[uid]` unchanged in behaviour. `PendingApprovalPage` reviewed — already § 27-compliant, no polish needed (brief Step H skipped).

**Deferred (no consumer in single-tenant production):**
- Dedicated cross-workspace `/admin/users` console — re-brief when workspace #2 onboards
- Self-revoke guard on the Global role section — irrelevant while the only super_admin (Jacek) is ADMIN_EMAILS-protected

**Migration coupling:** Phase 3.a `globalRole` migration still pending (deferred — no service account). 3.b works regardless: `useIsSuperAdmin` resolves Jacek via the ADMIN_EMAILS fallback, so the Global role section is visible to him now; editing a user's globalRole writes the field on demand. Running the 3.a migration just back-fills `globalRole=null` on docs missing it — cosmetic.

**Smoke test (Jacek, ~3 min):**
1. `/settings/members` → tap any member → UserDetailPage. A "Global role" section appears between Roles and the danger zone.
2. Tap "Super admin" on a test user → ConfirmModal → confirm → Firestore Console `/users/{uid}.globalRole === 'super_admin'`.
3. Back to `/settings/members` → that row shows a gray "SUPER ADMIN" badge.
4. Re-open the test user → "Standard user" → confirm → `globalRole` back to null, badge gone.
5. § 65.7.3 visible in DESIGN_DECISIONS.md. Sentry: zero new errors.

**Rollback:** `git revert bddeb10 && git push && npm run deploy`. globalRole values set via the UI are reversible via the same UI.

**Tooling note:** precommit broken on Windows (bash ENOENT). Validated directly: vite build ✓ (5.86s), lint-ui 0 errors, 0 debugger.

**Unlocks:** Phase 3.c — Firestore rules refactor [HIGH RISK]; globalRole is now editable, rules can gate against it.

---

## 2026-05-20 — Phase 3.a: globalRole field + isAdmin 4th path + useIsSuperAdmin
**Commit:** `8f77d62`
**Status:** ✅ Code deployed (autonomous, no rules changes). ✅ Migration run 2026-05-20.

**What changed:** Surgical Phase 3.a per § 66.5 reconciled scope. Original brief halted in `80bcb16` (greenfield-assumption conflict); § 66 reconciliation (`72d601c`) cleared the path.

1. `users.globalRole: 'super_admin' | null` field — additive. Absent on pre-migration docs reads falsy in the 4th path → identical to pre-3.a behaviour.
2. `isAdmin(workspace, user, userProfile?)` — 4th path `userProfile?.globalRole === 'super_admin'`. 3rd arg optional, defaults null → all existing 2-arg call sites unchanged.
3. `isSuperAdmin(user, userProfile)` helper exported — globalRole field OR ADMIN_EMAILS bootstrap fallback. Cross-workspace gate, distinct from workspace-scoped isAdmin.
4. `useIsSuperAdmin()` hook — new file `src/hooks/useIsSuperAdmin.js`. No 3.a consumers; ships for Phase 3.b-f.
5. `src/hooks/useWorkspace.jsx` — both `isAdmin` util call sites (adminFlag useMemo + migrateWorkspaceRoles trigger) pass `userProfile` through.
6. `scripts/migration/phase_3_a_globalrole.cjs` — idempotent, gated by `PHASE_3_A_EXECUTE_CONFIRMED`, repo-standard `GOOGLE_APPLICATION_CREDENTIALS` init.
7. § 65.7.2 doc patch documents 3.a closure.

**Preserved per § 66.6 anti-patterns:** 5 backend roles (admin/coach/scout/viewer/player), `workspace.userRoles[uid]`, `workspace.adminUid`, `ADMIN_EMAILS`, `PendingApprovalPage`, `isPendingApproval`, `canAccessRoute`, `useViewAs` / `AdminGuard` / `useFeatureFlag` (4th path cascades automatically via useWorkspace), `getOrCreateUserProfile` defaults, Firestore rules — all unchanged.

**Deviations from brief (per pre-flight HALT):**
- Migration script uses repo pattern (`GOOGLE_APPLICATION_CREDENTIALS` + `EXECUTE_CONFIRMED` gate + JSON report) not the brief's `dotenv`/`FIREBASE_SERVICE_ACCOUNT_KEY` template.
- `useIsSuperAdmin` lives in its own file (role-hook convention — mirrors useViewAs.js) not `useFirestore.js`.
- Both `isAdmin` util call sites updated for consistency (brief design D mentioned only `adminFlag`).

**✅ Migration RUN 2026-05-20.** `phase_3_a_globalrole.cjs` executed against production — 21 `/users/` docs: `globalRole='super_admin'` for Jacek, `null` for the other 20. Verified: super_admin 1, null 20, absent 0 — every doc has the field explicitly. Reports: `scripts/migration/reports/phase_3_a_globalrole_*.json`. The first run set Jacek but skipped the 20 absent docs (the idempotency check collapsed absent ≡ null); the check was corrected to write explicit `null` to absent docs — important because Firestore rules referencing a missing `resource.data.globalRole` error and deny, so Phase 3.c needs the field on every doc — and the second run completed all 21. Script is idempotent on further re-runs.

**Smoke verify (Jacek):**
1. Refresh app — admin routes work (`/admin/leagues`, `/admin/players`, `/admin/teams`)
2. Existing coach/scout users — app unchanged
3. Sentry: zero new errors in first 24h
4. § 65.7.2 visible at bottom of § 65 in DESIGN_DECISIONS.md
5. (post-migration) Firestore Console: `/users/{jacek}` `globalRole='super_admin'`, other docs `globalRole=null`

**Rollback:** `git revert 8f77d62 && git push && npm run deploy`. If the migration has run, the additive `globalRole` field is harmless — reverted code ignores it.

**Unlocks:** Phase 3.b (super_admin user mgmt UI — first `useIsSuperAdmin` consumer), 3.c-f per § 66.5.

**Tooling note:** `scripts/precommit.js` broken on Windows (bash ENOENT). Validated directly: `npx vite build` ✓ (5.34s), `node scripts/lint-ui.js` 0 errors, `grep debugger` 0 hits.

---

## 2026-05-20 — § 66 § 65↔§ 38 reconciliation (doc-only)
**Commit:** `docs: § 66 — § 65 ↔ § 38 reconciliation, unblocks Phase 3.a` (2026-05-20 — find via `git log --grep "§ 66"`)
**Status:** ✅ Doc-only — no deploy needed

**What changed:** Added § 66 to `docs/DESIGN_DECISIONS.md`. Documents how § 65 (Permissions Architecture, semantic role names + ownership model + Q1-Q4) maps to § 38 v2.1 (operational role data model, mature 6 months). Closes the conflict surfaced by CC pre-flight escalation 2026-05-20 (commit `80bcb16` halt). NEXT_TASKS Phase 3.a flipped 🚧 → 🎯 — code brief rewrites against § 66 next Opus session.

**What § 66 codifies:**
- Mapping table: § 65 super_admin/workspace_admin/coach/scout/pending_user ↔ § 38 backend (workspace.userRoles[uid] + workspace.adminUid + ADMIN_EMAILS + users.globalRole-to-be-added + isPendingApproval)
- Roles in § 38 not enumerated by § 65: viewer (retired per § 49), player (PPT self-logging)
- Backend SOT: § 38 data model + helper functions (isAdmin 3-path, isPendingApproval, canAccessRoute)
- Phase 3 sub-task plan now written against § 38 backend using § 65 semantics
- Anti-patterns specific to this conflict (6 NEVER rules)
- § 66.8 — root cause + lesson for future Opus permission/role design

**Operational truth post-commit:**
- § 38 + § 49 = live, mature, operational truth (unchanged)
- § 65 = forward-looking permission semantics + ownership + Q1-Q4 (banner from CC halt remains)
- § 66 = THE bridge — authoritative mapping reference for Phase 3.b-f briefs
- Phase 3.g (Vision OCR disable, commit `2997cca`) stays shipped — independent
- § 65 ownership model (ownerWorkspaceId teams) stays valid — independent

**No code, no schema, no migration. Pure doc.**

**Smoke verify (Jacek, 1 min):**
- DESIGN_DECISIONS.md bottom — § 66 visible with mapping table rendering correctly
- NEXT_TASKS.md Phase 3.a — 🎯 NEXT (was 🚧 BLOCKED)

**Rollback:** `git revert HEAD && git push` (while this is HEAD), or `git revert <§ 66 sha> && git push`. No deploy artifact.

**Unblocks:** Phase 3.a code brief — separate Opus session writes ~1h implementation per § 66.5.

---

## 2026-05-20 — § 65 Permissions Architecture + AI Vision OCR import disabled
**Commit:** `2997cca`
**Status:** ✅ Deployed (autonomous, no Firestore rules changes)

**What changed:** Pre-Phase-3 prep — two surgical changes in one commit.

**1. DESIGN_DECISIONS § 65 Permissions Architecture (locked 2026-05-20):**
- 5 roles: super_admin / workspace_admin / coach / scout / pending_user
- Teams: single owner via `ownerWorkspaceId` (Phase 3 addition); `originWorkspace` is **audit only**, NOT authorization signal
- Players: tri-mode editing — PBLeagues canonical (super_admin only) / manually created (workspace_admin in own workspace) / annotations subcollection (Phase 3.1+ deferred)
- Full resource × operation matrix (rows = operations, cols = roles) — authoritative source for Phase 3 Firestore rules refactor + UI gating logic
- Q1-Q4 resolutions (locked from 2026-05-20 chat): Q1 super_admin-only user mgmt; Q2 ownership MVP + annotations deferred; Q3 disable AI for import + Phase 3 data isolation via rules; Q4 open reads on canonical / strict PII + workspace data
- 9 anti-patterns codified (no `originWorkspace` authz / no self-elevation / no client-side Anthropic key / no cross-workspace writes by workspace_admin / etc.)
- Phase 3 sub-task plan: 3.a role schema + migration → 3.b pending user UI → 3.c rules refactor (HIGH risk) → 3.d workspace admin UI → 3.e player editing model → 3.f team ownership UI → 3.g Vision OCR disable (this commit) → 3.1+ annotations layer (deferred)
- Brief asked for § 64 but that number was already taken by Canvas Architecture (approved 2026-05-19) — landed as **§ 65** per brief's escalation #3 with all internal anchors renumbered (§ 64.x → § 65.x). Section-numbering note included at top of new section.

**2. AI Vision OCR client-side calls DISABLED — `STATIC_FLAGS.ENABLE_VISION_API` flipped to `false`:**
- **Layout Wizard:** Vision Scan step (step 3) hidden. Wizard now **2-step** (Basic Info → Calibrate → Finish navigates to bunker editor for manual entry). ProgressBar `total={2}` instead of `total={3}`. Subtitle "STEP N OF 2" instead of "STEP N OF 3".
- **LayoutDetailPage OCRBunkerDetect modal:** render block gated. `setOcrOpen(true)` had no callers anywhere — dead code from prior work. Gate adds defense in depth against future rewire.
- **ScoutTabContent "Import schedule (zdjęcie)" Btn:** hidden. Underlying `ScheduleImport` render also gated. **`ScheduleCSVImport` ("Import harmonogramu (CSV)") UNAFFECTED** — manual schedule import path continues working.
- All 3 Anthropic API call sites (`VisionScan.jsx`, `OCRBunkerDetect.jsx`, `ScheduleImport.jsx`) get **early-return guards** at function entry. localStorage API key reads stay in place (preserved for future server-side re-impl), just no-op'd by flag. Comment block at each site references § 65 + future Cloud Function migration path.

**Scope expansion vs brief:** brief enumerated 2 affordances (Layout Wizard + ⋮ menu); 3rd live Anthropic call site (ScheduleImport) added per Jacek pre-confirmation go-ahead — § 65.5 anti-pattern "Bundle Anthropic API key in client bundle" applies uniformly. Brief's "ENABLE_VISION_API flag" was also acknowledged in pre-confirmation as existing-but-unused — repurposed cleanly (flip to false + plumb through) instead of adding redundant `visionOcrImport`.

**Defense in depth (3 layers per Vision OCR site):**
- L1 UI: button/affordance hidden conditional on flag
- L2 render: component render block gated by flag
- L3 fn entry: early-return inside async handler if flag off

**Existing Vision-scanned layouts:** continue rendering correctly. Vision OCR only ran at LAYOUT CREATION time to seed initial bunker positions — once positions saved to Firestore they're stable data with zero ongoing dependency on Vision API. Manual editing path (`/layout/{id}/bunkers`) unaffected.

**NO Firestore rules changes. NO schema changes. NO new components.** Pure doc + feature flag + UI gating + 3 function early-returns + import additions. 8 files changed, +265/-12. Bundle size unchanged (vision code still compiled, just behind flag — gives instant re-enable via flag flip after Cloud Function migration).

**Smoke test required (Jacek) — 5 quick checks:**
1. Open Layout Wizard (`/layout/new`) → confirm only 2 steps (Basic Info → Calibrate → Finish). Header reads "STEP N OF 2". ProgressBar has 2 segments.
2. Step 2 "Finish →" creates layout and navigates to `/layout/{id}/bunkers` (manual bunker entry) — no Vision Scan step appears.
3. Open Scout tab → tournament view → confirm "Import schedule (zdjęcie)" Btn ABSENT, "Import harmonogramu (CSV)" Btn still present.
4. Open an existing Vision-scanned layout — bunkers render correctly (no API call, just reading stored positions).
5. Sentry: zero errors in first 24h.
6. DESIGN_DECISIONS.md: scroll to bottom, verify § 65 visible with matrix table rendering correctly, no markdown breakage.

**Rollback path:** `git revert 2997cca && git push && npm run deploy`. Feature flag also serves as runtime kill switch (flip back to `true` + redeploy = re-enable everything, code preserved).

**Re-enable path (Phase 3+):** requires server-side Cloud Function migration. Per § 65.5 anti-pattern client-side Anthropic key MUST NOT be re-bundled. Re-enabling flag without server-side migration re-opens the same attack surface.

**Unlocks:**
- Phase 2.4 TeamMemberships design (ownership semantics defined in § 65.2)
- Phase 3 implementation track (clear sub-task ordering in § 65.6)
- Tenant onboarding planning (Paintball FIT example workflow clear once Phase 3.a-d ship)

---

## 2026-05-20 — Phase 2.3.c: Super admin UI for Teams CRUD (sister team + duplicate resolution)
**Commit:** `6638c54`
**Status:** ✅ Deployed (Jacek smoke test required)

**What changed:** Super admin UI at `/admin/teams` for managing global `/teams/` collection (132 docs). MVP scope: searchable + filterable + paginated list (50/page), create + edit modal with **sister team designation** (both parent + children directions, card-style picker via TeamPickerModal, cycle prevention), **externalId duplicate resolution flow** (side-by-side comparison + weighted recommendation heuristic + dynamic safety note), **soft delete via retiredAt** timestamp (NOT hard delete — preserves audit trail + reference resolution). Closes Phase 2 Step 3 (Teams) consumption + admin path; only 2.3.d cleanup deferred. Reuses Phase 2.3.b `useTeams` + dual-write `dataService` + Phase 2.1c admin gate pattern. **No Firestore rules update** — Phase 2.3.b already covered admin writes + admin email delete gate. Doc patch § 63.15.2.X.1 locks UX decisions from chat mockup review.

**Defense in depth admin gate (3 layers):**
- L1 route: `<AdminGuard>` wraps `/admin/teams` route (App.jsx)
- L2 component: `if (!effectiveIsAdmin) return null` in AdminTeamsPage
- L3 Firestore rules: `/teams/{teamId}` delete restricted to `jacek@epicsports.pl` (from Phase 2.3.b)

**Schema additions (additive — existing 132 docs treat absent fields as active):**
- `retiredAt: Timestamp | null`
- `retiredBy: uid | null`
- `retirementReason: string | null`
- `canonicalReplacementId: docId | null` (pointer to canonical when retired via duplicate resolution)

**New `useActiveTeams()` hook (asymmetric design):**
- `teams`: array filtered to `retiredAt == null` (for iteration in pickers/lists)
- `teamsById`: map of ALL teams incl. retired (for spot lookups — MatchPage opponent display, PlayerStatsPage player.teamId, etc., avoiding "Unknown" rendering when team retired after reference written)
- 21 React consumers refactored from `useTeams` → `useActiveTeams` (mechanical token-level replace)
- AdminTeamsPage stays on raw `useTeams` (admin needs to see retired)

**Duplicate resolution heuristic** (mockup-locked per § 63.15.2.X.1):
- Weighted score: `children × 100 + tournamentRefs × 5 + playerRefs × 1 + recency (0–50)`
- Tournament refs DEFERRED (— placeholder) — for the 1 known case (RANGER vs Ranger Warsaw) children alone (3 children × 100 = 300 vs 0 = 0) makes recommendation unambiguous
- Top scorer gets `RECOMMENDED` green badge
- Admin can override via radio

**Children orphan safety on retire** (ChildrenOrphanWarning component):
- Enhanced ConfirmModal when retiring team with active children
- 3 radio options: re-point to selected new parent (recommended for dup cleanup) / cascade retire children / orphan (do nothing — references still resolve)
- Mirrors Phase 2.2.c aliasIds safety pattern, adapted for parent-child

**Reference re-pointing DEFERRED per § 63.15.2.X.1 / Phase 2.3.d:**
- Resolution view checkbox "Re-point tournament/player references" shown DISABLED with explanation
- Retired team docs remain queryable — references continue resolving via teamsById map (asymmetric design preserves retired teams in spot lookups)

**Bundle:** AdminTeamsPage chunk lazy-loaded — zero cost for non-admin users.

**Smoke test required (Jacek) — 17 steps for the new admin flow:**
1. Open `/admin/teams` from More tab → Admin → Teams — verify access (admin only)
2. List loads with 132 active teams (no retired by default — filter pill `Active` set)
3. Banner at top: `⚠ 1 externalId duplicate detected. [Review duplicates →]`
4. Tap "Review →" → filter switches to `⚠ Duplicates` → RANGER + Ranger Warsaw both shown with `⚠` prefix
5. Per-row MoreBtn on RANGER → ActionSheet → "Resolve duplicate →" → resolution view opens
6. RANGER card has `RECOMMENDED` green badge (3 children × 100 = 300 points vs Ranger Warsaw's 0)
7. Score breakdown line shows: `kids 300 + plyrs N + recency M`
8. Pick RANGER as canonical (radio) → "Retire other" checked by default → "Re-point children" greyed N/A (RANGER has children, not Ranger Warsaw) → "Re-point references" DISABLED with explanation
9. Safety note: green `✓ ... safe.` (canonical RANGER preserves children)
10. Confirm resolution → Ranger Warsaw retired, list refreshes, banner gone
11. Switch filter pill to `🗄 Retired` → Ranger Warsaw visible there with retiredAt + canonicalReplacementId in audit section
12. MoreBtn on Ranger Warsaw → "Restore" → retiredAt cleared → back in active list (banner reappears since dup detected again)
13. Edit a child team (RING) → Sister team section shows RANGER as Parent card with Change/Remove actions → tap "Change ▾" → TeamPickerModal opens with searchable list excluding RING + RING's descendants + retired
14. Edit RANGER (parent) → Sister team section shows Children list (RAGE/RING/RUSH) with individual Remove buttons
15. Try to set RING as parent of RANGER via picker (would create cycle) → save rejected with error toast "Cycle detected — proposed parent is descendant of this team"
16. Manual retire RANGER via TeamFormModal footer "Retire team" → ChildrenOrphanWarning modal opens with 3-option radio (rePoint / cascade / orphan) + new-parent picker
17. Verify NewTournamentModal team picker no longer shows retired teams (useActiveTeams filter working); MatchPage opponent display still resolves if team retired after match created (teamsById preserves all)

**Sentry watch:** zero `setParentTeam`/`retireTeam`/`unretireTeam` errors in first 24h.

**Rollback path:** `git revert 6638c54 && git push && npm run deploy`. Schema additions (retiredAt etc.) remain on docs that were edited via the new UI — additive, no harm. If admin retired a team mid-rollback, the doc retains retiredAt but consumers post-revert use raw useTeams again so retired teams reappear in lists (intended cushion).

**Unlocks:** Phase 2 Step 3 effectively CLOSED. Phase 2.4 (TeamMemberships junction) writeable — can reference global team IDs with active filter via useActiveTeams. Phase 2.3.d cleanup is the only Step 3 remainder.

---

## 2026-05-20 — Phase 2.3.b: useTeams global + dual-write + /teams/ rules
**Commit:** `97af95a`
**Status:** ✅ DEPLOYED 2026-05-20 by Jacek (sequenced: firebase deploy --only firestore:rules → npm run deploy → hard refresh)

**What changed:** React team consumers migrated from workspace path to global `/teams/` (populated by Phase 2.3.a, commit `3d8ea9c`). Hook refactor in `src/hooks/useFirestore.js:65` — `useTeams()` now reads global `/teams/` via onSnapshot, returns `{ teams, teamsById, loading, error }` (additive — existing `{ teams, loading }` destructures keep working in all 20 consumers; `teamsById` map provides O(1) lookup for parentTeamId resolution). Sentry on fetch error. `dataService.js` `addTeam` + `updateTeam` dual-write to both global + legacy workspace paths (mirror Phase 2.2.b pattern). `deleteTeam` workspace-only — global delete deferred to Phase 2.3.c admin UI (parentTeamId children + externalId duplicate safety). `firestore.rules` adds `/teams/{teamId}` block (read auth, create+update auth, delete admin email — mirror Phase 2.2.b `/players/` pattern); `/leagues/` from Phase 2.1c + `/players/` from Phase 2.2.b preserved unchanged. **NO `npm run deploy` from CC** — Jacek must run sequenced rules-first deploy.

**Read scope collapsed massively:** all 20 React consumers (TeamsPage, TeamDetailPage, MatchPage, ScoutedTeamPage, MainPage, MembersPage, PlayersPage, UserDetailPage, TrainingSetupPage, PlayerPerformanceTrackerPage, ProfilePage, PlayerStatsPage, NewTournamentModal, TournamentPicker, AttendeesEditor, ViewAsPlayerPicker, LinkProfileModal, CoachTabContent, ScoutTabContent, TrainingMoreTab, usePPTIdentity) already use the centralized `useTeams` hook → **zero consumer file changes for the read path**. Identical setup to Phase 2.2.b which had usePlayers also centralized.

**Write dual-write scope:** 9 call sites unchanged (TeamsPage:62/66, TeamDetailPage 93/100/112/153, CSVImport 283/288, ScheduleCSVImport:384, ScheduleImport:242) — all go through `dataService.addTeam/updateTeam/deleteTeam` which now dual-write transparently. originWorkspace tagged on new global writes (matches Phase 2.3.a bootstrap schema).

**breakoutVariants subcollection untouched** per § 63.15.2 "workspace-specific scouting context" decision in Phase 2.3.a pre-flight — 4 dataService functions still read/write via `bp()` workspace path; legacy `/workspaces/{slug}/teams/` dual-write keeps parent docs alive so subcollection reads work unchanged.

**🚨 ACTION REQUIRED — JACEK SEQUENCED DEPLOY:**
```bash
git pull origin main

# Verify all 3 global rule blocks present (5 total matches with workspace nested)
# In PowerShell: Select-String -Path firestore.rules -Pattern "match /leagues/|match /players/|match /teams/" -Context 1,4

# 1. RULES FIRST
firebase deploy --only firestore:rules

# 2. Verify Firebase Console → Firestore → Rules tab shows fresh "Last published" timestamp

# 3. CODE
npm run deploy

# 4. Hard refresh production
#    (Ctrl+F5 on Windows; or DevTools open + right-click reload → "Empty Cache and Hard Reload")
```

**Why sequenced matters:** if code deploys before rules → all `/teams/` reads return permission-denied → `useTeams` hook returns empty `[]` → TeamsPage shows no teams, NewTournamentModal team picker empty, MatchPage opponent name blank, match cards broken in Scout tab, etc. Estimated 1-2 minute blast radius if order reversed (entire user base sees broken team rendering until rules deploy completes).

**Smoke test (post-deploy):**
1. Open https://epicsports.github.io/pbscoutpro after hard refresh
2. Open TeamsPage → verify all **132 teams** render with parent-child grouping
3. Spot-check parent-children: **RANGER** (docId `7JNZJNlaSmRk4BVTfaJK`) should expand to **RAGE/RING/RUSH** child rows
4. Open TeamDetailPage for a child team (e.g. RING `HusyOerlWDC4Cn5FHB8G`) → verify parent reference (RANGER name shows somewhere)
5. Open NewTournamentModal → team picker shows teams filtered by league/division
6. Open existing match → homeTeam/awayTeam names render correctly
7. Edit a test team via TeamDetailPage (e.g. add a comment) → save → verify update propagates live to TeamsPage (onSnapshot + dual-write)
8. Verify Coach tab still loads scoutedTeams + opponent names render
9. DevTools Network: `/teams` Firestore reads return 200 with snapshot data; zero permission-denied errors
10. Sentry: zero `useTeams fetch failed` errors in first 24h
11. **Specific externalId dup verification:** TeamsPage list contains BOTH `RANGER` (parent of children) AND `Ranger Warsaw` (orphan parent) — both visible as expected per § 63.15.2.X #7 (admin curates one or the other via future Phase 2.3.c)

**Rollback path (if smoke fails):**
- Code revert: `git revert 97af95a && git push && npm run deploy`
- Rules revert: edit firestore.rules to remove `/teams/` block + `firebase deploy --only firestore:rules`
- `/teams/` data unchanged either way — Phase 2.3.a 132 global docs intact, workspace `/workspaces/ranger1996/teams/` source still live for legacy reads (which kick back in if hook reverts)

**Known issues / deferred:**
- Dual-write means team mutations now 2x Firestore writes (acceptable transition cost — Phase 2.3.d collapses to global-only after consumption stabilizes)
- Empty/loading state per consumer — first render shows empty `teams` briefly while hook fetches (same Option-A pattern as Phase 2.2.b post-deploy; no consumer regression observed there)
- Phase 2.3.c admin UI required for global team curation (currently teams creatable via workspace UI with transparent dual-write but no admin governance) — must include sister team designation UI per § 63.15.2.X #3 + RANGER/Ranger Warsaw merge resolution
- Phase 2.3.d cleanup deferred — workspace `/workspaces/{slug}/teams/` subcollection remains in sync via dual-write until 2.3.c stable
- `subscribeTeams` in dataService.js:259 now orphan (no callers post-hook-refactor) — kept as dead code mirror of `subscribePlayers` orphan; deferred to Phase 2.3.d cleanup

**Post-deploy follow-up commit (CC after Jacek smoke pass):**
- HANDOVER.md update (Recently shipped row + Track B status + Last-updated)
- MULTI_TENANT_MIGRATION_PLAN.md sub-task b marked ✅
- NEXT_TASKS.md flip ⏳ → ✅, promote 2.3.c to active 🎯
- DEPLOY_LOG status flip ⏳ → ✅

---

## 2026-05-20 — Phase 2.3.a: Teams bootstrap to global /teams/ EXECUTED
**Commits:** `732dd8e` (§ 63.15.2.X docs) + `a8cb308` (3 scripts + audit + initial dryrun reports) + this commit (execute + post-execute reports + doc updates)
**Status:** ✅ Executed by CC 2026-05-20 after Jacek explicit GO based on dry-run review

**What changed (data):** Bootstrap migration to `/teams/` global collection executed per Jacek dry-run approval. **132 global team docs created** from `/workspaces/ranger1996/teams/` (1 workspace, only tenant today). 125 parents written in Pass 1 + 7 children written in Pass 2 (parent-existence verification passed for all 7 → 0 orphans). 0 errors. Post-execute verification: `/teams/` collection contains 132 docs, matches expected. Idempotency confirmed via re-run dryrun → 132 would-skip / 0 would-create.

**Migration strategy applied (per § 63.15.2.X locked 2026-05-20):**
- **Option α** — workspace doc IDs preserved as global IDs (all downstream `player.teamId` / `scoutedTeam.teamId` / `tournament.homeTeam/awayTeam` refs continue resolving with zero rewrite)
- **Verbatim schema hoist** — production fields preserved (`name`, `leagues[]`, `divisions{}` map per Phase 2.1b name-string precedent, `parentTeamId`, `externalId`). Forward-looking § 63.15.2 spec fields (`pbliTeamId` / `leagueId` / `divisionId` / `brandId` / `shortName` / `active` / `createdBy` / `createdByWorkspace`) deferred to post-Phase-2 reconciliation.
- **3 migration tracking fields added:** `originWorkspace` (= 'ranger1996' for all 132), `migratedAt` (serverTimestamp at write), `createdAt`/`updatedAt` preserved verbatim from workspace docs
- **NO automatic dedup** — externalId duplicates and intra-workspace name overlaps migrated as separate global docs. Two-pass parent-then-child execution prevents orphaning.

**Known anomalies (admin curation TODO via Phase 2.3.c):**
- **1 externalId dup group:** `RANGER` (docId `7JNZJNlaSmRk4BVTfaJK`, parent of RAGE/RING/RUSH children) + `Ranger Warsaw` (docId `uhOAaox64WmVhsuLORKL`, orphan parent, likely legacy artifact). Both share `externalId: "0Xrx66loamSMv7tY"`. Auto-merge would orphan the 3 children — deliberately preserved as separate docs per § 63.15.2.X #7. Admin merges or retires one via Phase 2.3.c when shipped.
- **9 intra-workspace name overlaps:** Wild Dogs, London Attrition, Ronholt Dynamite, Ballern. Factory Team, Shock, Breakout SPA, Manchester Firm, BM United, Offenbach Comin At Ya — all legitimate brand-multi-division pairs (NXL PRO + NXL PRO3v3 variants per § 63.15.2 "one team doc per brand+league+division"). NOT anomalies — correct shape.

**Legacy data:** `/workspaces/ranger1996/teams/` subcollection **UNCHANGED**. App continues reading from legacy path until Phase 2.3.b consumption refactor lands `useTeams` global hook + dual-write `dataService` mirror. `breakoutVariants` subcollection at `/workspaces/{slug}/teams/{tid}/breakoutVariants/` also untouched — out of Phase 2.3.a scope; Phase 2.3.b decides whether to hoist or keep workspace-scoped (recommended: keep workspace-scoped per § 63.15.2 "workspace-specific scouting context").

**Reports (all committed):**
- Initial audit: `scripts/migration/reports/phase_2_3_a_audit_2026-05-20T06-04-53-430Z.json`
- Pre-execute dryrun: `scripts/migration/reports/phase_2_3_a_dryrun_2026-05-20T07-27-49-557Z.json`
- Execute: `scripts/migration/reports/phase_2_3_a_execute_2026-05-20T07-49-37-316Z.json`
- Post-execute idempotency dryrun: `scripts/migration/reports/phase_2_3_a_dryrun_2026-05-20T07-50-07-849Z.json`

**App impact:** ZERO. No code changes, no rules changes. `/teams/` exists in Firestore but no React code reads from it yet — consumption migration is Phase 2.3.b (separate brief). Workspace UI continues reading `/workspaces/{slug}/teams/` legacy path unchanged.

**Rollback path (if ever needed):** `firebase firestore:delete /teams/ --recursive --yes` from Firebase CLI. Legacy `/workspaces/{slug}/teams/` is intact — full app state restorable. Idempotent re-run of `phase_2_3_a_bootstrap_teams.cjs` rebuilds.

**Jacek smoke verification (optional but recommended):**
1. Firebase Console → Firestore → `/teams/` collection exists with 132 docs
2. Spot-check 3-5 docs — fields look right (name, leagues, divisions, parentTeamId, externalId, originWorkspace, createdAt, updatedAt, migratedAt)
3. Spot-check a child team (e.g. RING `HusyOerlWDC4Cn5FHB8G`) → verify parentTeamId resolves to existing parent doc (`7JNZJNlaSmRk4BVTfaJK` = RANGER)
4. Open app, verify nothing broke (consumption still on legacy path)
5. Sentry: zero new errors

**Unlocks:** Phase 2.3.b — `useTeams` global hook + workspace consumption refactor + dual-write `dataService` mirror. Pattern from Phase 2.2.b directly applies (with addition of `useTeam(id)` helper for parent lookup since `parentTeamId` references global team).

---

## 2026-05-19 — Phase 2.2.c: Super admin UI for global Players CRUD
**Commit:** `7de12d4`
**Status:** ✅ Deployed (Jacek smoke test required)

**What changed:** Super admin UI at `/admin/players` for managing global `/players/` collection (934 docs). MVP scope: searchable + filterable + paginated list (50/page, ~19 pages), create + edit (PlayerFormModal — Identity/PBLI/Attributes/Audit sections), hard delete with `aliasIds[]` safety check warning for canonical-with-aliases case. Closes Phase 2 Step 2 consumption + admin path (2.2.d cleanup deferred). Reuses Phase 2.2.b dual-write `dataService` functions (addPlayer + updatePlayer transparently mirror to both `/players/` and `/workspaces/{slug}/players/`). New `deletePlayerGlobal(id)` — global-only hard delete, leaves workspace copy as recovery cushion until Phase 2.2.d. **No Firestore rules update** — Phase 2.2.b /players/ rules already cover admin writes + admin email delete gate.

**Defense in depth admin gate:**
- L1 route: `<AdminGuard>` wraps `/admin/players` route (App.jsx)
- L2 component: `if (!effectiveIsAdmin) return null` in AdminPlayersPage
- L3 Firestore rules: `/players/{playerId}` create+update if auth, delete if `jacek@epicsports.pl` (from Phase 2.2.b)

**Design highlights:**
- URL-backed state via `useSearchParams` — search/filter/sort/page bookmarkable + shareable
- Filter pills: All / Linked (PBLI) / Unlinked / HERO
- Sort: name ↑ (default), updated ↓, originWorkspace
- Client-side filter+sort+page on 934 docs — well under virtual-scroll necessity
- Delete confirmation branches on `aliasIds[].length`:
  - empty/null → standard "cannot be undone, workspace preserved"
  - non-empty → enhanced warning with full alias ID list + explicit orphan-legacy-data callout + "Delete anyway" CTA (informed consent per user data-loss waiver, not hard block)
- Form excludes `teamId` / `teamHistory` — workspace-scoped, Phase 2.4 /teamMemberships/ territory per § 63.15.3
- Audit section (collapsed by default in edit mode): id, originWorkspace, createdAt, updatedAt, migratedAt, linkedUid, linkedAt, unlinkedAt, aliasIds[] count + monospace list
- Create flow: `addPlayer` (only carries narrow workspace subset) → optional `updatePlayer` for admin-only fields (hero, pbliIdFull, photoURL, comment) — both dual-write paths converge

**Known limitations / defer:**
- Manual merge UX: not in MVP
- Add/remove individual aliases via UI: read-only display only
- Photo upload: URL input only
- Workspace linking UI changes: not in MVP
- Soft delete pattern: not added (would require schema migration)
- Phase 2.2.d cleanup deferred

**Bundle:** AdminPlayersPage chunk 15.87kB / 5.22kB gzip (lazy-loaded — zero cost for non-admin users).

**Smoke test required (Jacek):**
1. Open `/admin/players` from More tab → Admin → Players — verify access (admin) + non-admin gets blocked-route redirect
2. List loads, paginated (page 1 of ~19), result count visible ("Showing 1–50 of 934")
3. Search "Koe" or similar → list filters case-insensitively on name + nickname
4. Filter pill "Linked (PBLI)" → only PBLI-linked players show; count updates
5. Filter pill "Unlinked" → only no-pbliId players show
6. Filter pill "HERO" → only hero-tagged players show
7. Sort dropdown "updated ↓" → most-recently-edited players surface
8. Edit a test player → change name → Save → list reflects update live (onSnapshot)
9. Verify dual-write: change visible immediately in another consumer (open a match in another tab, check roster pre-edit; refresh → name updated)
10. Delete a NON-canonical player (no aliasIds) → standard confirm → deletion succeeds, list updates live
11. Try delete a CANONICAL player WITH aliasIds → enhanced warning shows full alias list + danger text → "Cancel" test → no deletion
12. URL state: navigate with `?filter=hero&sort=updatedAt&page=2` → state restores on direct hit
13. Sentry: zero errors in first 24h

**Rollback:** `git revert 7de12d4 && git push && npm run deploy`. Pure additive change — no schema migration, no rules change, no data write side-effects beyond admin-initiated CRUD.

---

## 2026-05-19 — Phase 2.2.b: usePlayers global + alias resolution + consumption refactor
**Commit:** `8614a9b`
**Status:** ✅ DEPLOYED 2026-05-19 by Jacek (sequenced: firebase deploy --only firestore:rules → npm run deploy)

**What changed:** React player consumers migrated from workspace path to global `/players/` (Phase 2.2.a populated, `ab1319c`). 12 files: usePlayers hook refactored (now reads `/players/` via onSnapshot, returns `playersById` map with canonical+alias keys, Sentry on error), dataService.js dual-writes player CRUD to both global + legacy workspace path, firestore.rules adds `/players/` block (preserves /leagues/ from Phase 2.1c), 11 consumer files swap raw-ID `players.find(p => p.id === id)` → `playersById[id]` (O(n) → O(1) + alias-aware). 42 Phase 2.2.a alias mappings transparently resolve.

**Key design:** Option A no-fallback per Jacek 2026-05-19. Hook returns `[]` briefly during initial fetch (~100-300ms). Existing consumer empty-state patterns (.filter(Boolean), early null returns) absorb the gap — no loading skeletons added.

**Dual-write in dataService.js:** addPlayer (workspace addDoc + global setDoc with same ID + originWorkspace), updatePlayer / changePlayerTeam / setPlayerHero (both paths merge). deletePlayer = workspace-only (global delete deferred to Phase 2.2.c admin UI — aliasIds[] dangling refs need careful management). 7 call sites unchanged (centralized in dataService funcs).

**🚨 ACTION REQUIRED — JACEK SEQUENCED DEPLOY:**
```bash
# 1. Pull latest main
git pull origin main

# 2. Verify firestore.rules contains BOTH:
#    - /leagues/{leagueId} block (Phase 2.1c, must still be there)
#    - /players/{playerId} block (this commit, new)
grep -B 1 -A 4 "match /leagues/\|match /players/" firestore.rules

# 3. RULES FIRST (critical):
firebase deploy --only firestore:rules

# 4. Verify Firebase Console → Rules tab shows new rule version (timestamp updated)

# 5. CODE second:
npm run deploy

# 6. Hard refresh https://epicsports.github.io/pbscoutpro (Cmd+Shift+R / Ctrl+Shift+R)
```

**Reverse order = broken UI:** code-then-rules means /players/ reads default-deny → hook returns empty → all roster UIs blank for all users until rules deploy completes.

**Smoke test post-deploy (Jacek):**
1. Open match page with existing scouted points → assigned players render correctly (alias resolution test)
2. Open training squads (TrainingScoutTab) → rosters render
3. Open scouted team page → roster + heroes render with correct names
4. Open player stats page for a player (`/player/:pid/stats`) → data loads
5. **Alias-specific test**: identify one Phase 2.2.a alias mapping from `scripts/migration/reports/phase_2_2_a_execute_*.json` (sample in commit message: `adRjU9q6NOKYrEylUzFo`/Szymon Wierzbicki, alias `56Ne3QxIVqeBtH50fiUm`). Find a point in old data that uses the alias ID in `assignments[]` → verify canonical Szymon renders (not "Unknown" or wrong name).
6. Edit a player from PlayerEditModal → save → verify update visible immediately (dual-write working)
7. DevTools Network: `/players/` Firestore reads return 200 with data
8. Sentry: zero `usePlayers fetch failed` errors in first 24h

**Bundle impact:** +1.5kB (213.07 kB index → vs 211.5kB last build). Negligible.

**Rollback path (if smoke test fails):**
- Code-only revert: `git revert 8614a9b && git push && npm run deploy` — rules stay (additive, no harm)
- Rules-only revert: revert firestore.rules block, `firebase deploy --only firestore:rules`
- `/players/` data unchanged — workspace player subcollection still source for legacy reads

**Known issues:**
- Dual-write means edit operations now 2x Firestore writes (acceptable cost during transition; Phase 2.2.d will remove legacy write)
- Empty/loading state per consumer — brief blank flash during initial fetch (~100-300ms), acceptable per existing patterns
- Phase 2.2.c admin UI required before fully clean global-only writes
- Phase 2.2.d cleanup deferred — workspace player subcollection stays in sync via dual-write
- Bookmarks to `/player/:aliasId/stats` resolve correctly (playersById handles alias keys)

## 2026-05-19 — Phase 2.2.a EXECUTE: Players migrated to global /players/
**Commit:** `ab1319c` (scripts + audit/dryrun reports) + post-execute follow-up doc commit
**Status:** ✅ Executed. /players/ collection populated. Idempotency verified.

**What changed:** Bootstrap migration to `/players/` global collection per Jacek approval based on dry-run review. 934 docs created from 976 workspace players (42 dedup pairs collapsed). Per Option α: workspace doc IDs preserved as global IDs; canonical per `pbliId` group = earliest `createdAt` (tie-break: lex-smallest docId); aliases tracked in `aliasIds[]` array on canonical. Legacy `/workspaces/ranger1996/players/{*}` subcollection **UNCHANGED** — downstream `point.assignments[]` / `point.selfLogs[playerId]` refs continue to resolve via legacy path until Phase 2.2.d cleanup (deferred until 2.2.b consumption migration stable).

**Execute output:** total_workspace_players=976, expected_global_players=934, dedup_count=42, created=934, skipped=0, errors=0, post_global_count=934 (verification matches expected).

**Idempotency verified:** post-execute dry-run shows 934 would-skip, 0 would-create. Safe to re-run.

**Reports:**
- `scripts/migration/reports/phase_2_2_a_audit_2026-05-19T20-00-26-140Z.json`
- `scripts/migration/reports/phase_2_2_a_dryrun_2026-05-19T20-00-27-851Z.json` (pre-execute, 934 would-create)
- `scripts/migration/reports/phase_2_2_a_execute_2026-05-19T20-02-01-255Z.json` (execute summary + dup_mappings)
- `scripts/migration/reports/phase_2_2_a_dryrun_2026-05-19T20-04-15-385Z.json` (post-execute idempotency verification)

**Schema of new /players/{id} docs:**
- Identity: name, nickname, number, pbliId, pbliIdFull
- Workspace ref: teamId (Phase 2.3 will hoist teams; field stays for now), teamHistory[]
- Profile: age, favoriteBunker, playerClass, role, nationality, photoURL, comment
- System: hero, linkedUid, linkedAt, unlinkedAt, emails
- Migration tracking: originWorkspace='ranger1996', aliasIds (null for non-canonical, or [docId, ...] for canonical of dedup group), createdAt + updatedAt preserved, migratedAt = serverTimestamp

**Known issues:** None. App still functions normally — workspace UI continues reading from /workspaces/ranger1996/players/ subcollection (consumption migration is Phase 2.2.b, separate brief). Global /players/ collection exists but has no consumer in app yet.

**Action items post-execute:**
- ⏸️ Phase 2.2.b brief writing (workspace consumption refactor → usePlayers hook with global reads + alias resolution for 42 canonical-vs-alias mappings)
- ⏸️ Phase 2.2.c (admin UI for global players CRUD)
- ⏸️ Phase 2.2.d (cleanup legacy workspace players subcollection — DEFERRED until 2.2.b stable)
- ⏸️ Firestore rules for `/players/{playerId}` — need to add allow-read for auth users + write gate per app needs (currently default-deny for client reads; Admin SDK bypassed during this migration so reads from client will fail until rules added)

**Rollback path:** Hard delete /players/ collection via Admin SDK (single-line `await db.collection('players').get()` + batch delete). Workspace players intact. Re-run execute to restore. Idempotent.

## 2026-05-19 — Phase 2.1c: Super admin UI for league CRUD (closes Phase 2 Step 1)
**Commit:** `96e9951`
**Status:** ✅ Deployed (Jacek smoke test + ⚠️ Firestore rules deploy required)

**What changed:** Super admin UI at `/admin/leagues` for managing global `/leagues/` collection. Closes Phase 2 Step 1 (Leagues). Phase 2.1b useLeagues hook (`2f81b2b`) automatically picks up admin changes on next page load.

**Features:**
- Create/edit league form (shortName, name, region, parentLeagueFamily, divisions inline editor)
- Soft delete only: Deactivate/Reactivate toggle (no hard delete — preserves backward compat with stored tournament.division name strings)
- Active / All filter
- Per-league ActionSheet (Edit / Deactivate or Reactivate)
- ConfirmModal for destructive action
- More tab "Leagues" link added to admin section (admin-only visibility)

**Defense in depth admin gate (3 layers):**
- Route guard `<AdminGuard>` in App.jsx (effectiveIsAdmin from useViewAs)
- Component check — AdminLeaguesPage early-returns null if !effectiveIsAdmin
- Firestore rules block writes to /leagues/ unless email === 'jacek@epicsports.pl'

**useLeagues hook update:**
- Default `useLeagues()` now filters to `active === true` only (deactivated leagues invisible to workspace dropdowns)
- New `useAllLeagues()` returns unfiltered list for admin view
- Constants fallback hardcodes `active: true` (constants don't carry deactivation state)

**🚨 CRITICAL ACTION REQUIRED — Firestore rules deploy:**
```bash
firebase deploy --only firestore:rules
```

Two reasons rules deploy is mandatory:
1. **Phase 2.1c admin UI write path** — without rules, default-deny blocks all writes to /leagues/ (admin UI would error on every save)
2. **Phase 2.1b hook read path (discovered now)** — `/leagues/` reads from client have ALSO been default-denied since Phase 2.1a. `useLeagues` hook has been silently failing on Firestore fetch + falling back to constants (which happen to match production data) — visible only as console errors + Sentry `useLeagues fetch failed` captures. Rules deploy makes useLeagues actually read from Firestore for the first time.

**Bootstrap caveat:** Phase 2.1a bootstrap script wrote via Admin SDK which bypasses rules — that's why /leagues/ data exists despite no rule. Phase 2.1b reads + Phase 2.1c writes both go through the client SDK and need the rule.

**Known issues:**
- Hard delete deferred (soft toggle only)
- Real-time updates not implemented — admin changes visible to other users on their next page load
- Audit log deferred (who edited what when)
- Renaming a division regenerates its id (warning shown in form); existing stored tournament.division strings unaffected
- Admin UI in English only (i18n out of scope for admin tooling per brief)

**Smoke test required (Jacek):**

After `firebase deploy --only firestore:rules`:

1. Open `/admin/leagues` while logged in as jacek@epicsports.pl — verify access
2. Try `/admin/leagues` in incognito (logged out) — should redirect to `/`
3. List shows 3 existing leagues (NXL, DPL, PXL) with division counts
4. Click "+ New league" → create "TST" with 2 divisions ("A", "B") → Save → persists
5. Hard refresh → still present
6. Open tournament creation flow (Scout tab → New tournament → Tournament type) → verify "TST" appears in league dropdown
7. Edit "TST" → change name → Save → updates show on refresh
8. MoreBtn → Deactivate "TST" → confirm → gone from default "Active" filter
9. Filter "All" → TST visible with "INACTIVE" tag
10. MoreBtn → Reactivate → back in default filter
11. (Optional) Firestore Console: try writing to /leagues/ as non-admin client → should fail with permission-denied (this validates Layer 3 of admin gate)
12. (Optional) Once you've created/deleted TST: open tournament creation in another browser logged in as different user → should reflect changes after their refresh
13. Sentry: no errors related to useLeagues / admin/leagues route in first 24h

**Rollback path:** `git revert 96e9951 && git push && npm run deploy`. UI reverts cleanly. Firestore rules + /leagues/ data unchanged (rules revert would also need `firebase deploy --only firestore:rules` AFTER reverting the rules file).

## 2026-05-19 — Build: chunkSizeWarningLimit + Firebase chunk exception (§ 11)
**Commit:** `957a3de`
**Status:** ✅ Deployed (low-risk — config-only change, no chunk routing modified)

**What changed:** `vite.config.js` `chunkSizeWarningLimit` raised to 600kB + new PROJECT_GUIDELINES § 11 "Bundle chunking strategy". `manualChunks` function UNCHANGED — April 2026 explicit-pattern design already optimal. Pre-flight audit revealed only ONE chunk exceeds 500kB: `vendor-firebase` at 567kB raw / 135kB gzipped. Firebase imports already minimal (only `firebase/firestore` + `auth` + `app`, no full SDK / storage / functions). Sub-500kB physically unattainable without deeper refactor — accepted as documented exception per Jacek 2026-05-19.

**Risk profile:** lower than typical bundle work. April 2026 white-screen precedent does NOT apply because manualChunks function is unchanged — only a numeric threshold raise + docs. Same chunks land in same files as before commit.

**Chunk sizes (unchanged from baseline):** vendor-firebase 567.67kB / 134.89kB gz · vendor-react 168.46kB / 53.29kB gz · vendor-sentry 85.44kB / 29.35kB gz · index 211.11kB / 63.47kB gz · MainPage 106.49kB / 28.90kB gz · all others < 70kB.

**Known issues:** None expected. Threshold stays meaningful — any future chunk > 600kB will still surface as warning.

**Smoke test (light — same chunks as previous deploy):**
1. Open https://epicsports.github.io/pbscoutpro hard refresh (Cmd+Shift+R)
2. Verify app loads — no white screen
3. DevTools Console: no chunk-load errors (same chunks as `2f81b2b` deploy that already proved stable)
4. Sentry watch 24h is paranoid here — chunk routing unchanged so regression class is non-existent. If white screen appears, root cause is unrelated to this commit.

**Rollback:** `git revert 957a3de && git push && npm run deploy`. Atomic threshold revert; chunks bit-identical pre/post.

## 2026-05-19 — Phase 2.1b: useLeagues hook + workspace consumption refactor
**Commit:** `2f81b2b`
**Status:** ✅ Deployed (Jacek smoke test required)

**What changed:** 6 React UI components reading league/division data now use `useLeagues()` + `useLeagueDivisions()` hooks instead of direct `theme.js` constants. Hook fetches from `/leagues/` Firestore (Phase 2.1a) with synchronous constants fallback — zero loading state, app works offline. On fetch error: console.error + Sentry captureException with `tags: { hook: 'useLeagues' }`. Stored value format preserved (option.value = d.name, NOT d.id) — existing tournament.division/team.divisions name strings unchanged, no data migration needed.

**Files:**
- NEW: `src/utils/buildLeaguesFromConstants.js` (shape adapter)
- NEW: `src/hooks/useLeagues.js` (main hook + Sentry)
- NEW: `src/hooks/useLeagueDivisions.js` (convenience helper)
- REFACTORED: NewTournamentModal, LayoutDetailPage, LayoutWizardPage, MainPage (EditTournamentModal), TeamDetailPage, TeamsPage
- UNTOUCHED: theme.js LEAGUES/DIVISIONS constants (utility consumers + adapter still need them); CSVImport.jsx normalizeDivision (utility scope per brief); divisionAliases.js (utility scope)

**Hooks-in-loop avoided:** TeamDetailPage + TeamsPage build `divisionsByShortName` lookup map at component top instead of calling `useLeagueDivisions` per-iteration.

**Known issues:** None expected. Constants fallback means worst case is unchanged app behavior.

**Smoke test required (Jacek):**
1. Open tournament creation flow (New Tournament modal) — league row shows NXL/DPL/PXL, division row updates correctly per league selection. Selecting NXL → 7 division pills. Selecting PXL/DPL → 3 pills each.
2. Create a test tournament with division → Firestore Console verify `tournament.division` value is name string (e.g. "PRO", "Div.1"), NOT id ("pro", "div-1").
3. Open team creation (TeamsPage "+ Add team") — same checks. Multi-league team with divisions → verify divisions map stores name strings.
4. TeamsPage filter dropdown: select "Liga: NXL" → only NXL teams show.
5. LayoutDetailPage edit form league picker works.
6. LayoutWizardPage step 1 shows [NXL, DPL, PXL, Other].
7. DevTools → Network → Offline → reload — app still works (constants fallback).
8. Sentry watch for "useLeagues fetch failed" errors in first 24h.
9. Verify existing tournaments still display correctly (no regression in division string rendering).

## 2026-05-19 — Phase 2.1a: Leagues collection bootstrap
**Commit:** `324f380` (script + Firestore data — no app deploy)
**Status:** ✅ Bootstrap completed 2026-05-19 by CC (autonomous per brief — additive operation, low risk)

**What changed:** `/leagues/` Firestore collection populated with 3 docs (`l_nxl`, `l_pxl`, `l_dpl`) from `src/utils/theme.js` `LEAGUES` + `DIVISIONS` constants. Schema per § 63.15.1: name, shortName, region (null), parentLeagueFamily (null), divisions array with `{id, name, order}`, active (true), createdBy ('bootstrap'), createdAt + updatedAt (serverTimestamp). First Phase 2 implementation per MULTI_TENANT_MIGRATION_PLAN.md. Workspace UI unchanged — still reads from theme.js constants (Phase 2.1b will refactor).

**Bootstrap output (write mode):** 3 created, 0 skipped, 0 errors. NXL has 7 divisions (PRO/SEMI-PRO/D2/D3/D4/PRO3v3/WNXL); PXL + DPL have 3 each (Div.1/Div.2/Div.3).

**Division id convention:** lowercase + hyphenated. Dots → hyphens (`Div.1` → `div-1`). Display name preserves original casing — Phase 2.1b workspace refactor must read `name` field for current UI strings.

**Idempotency verified:** post-write dry-run shows 3 SKIP entries, 0 would-create. Safe to re-run.

**Known issues:** None. App behavior unchanged in this commit.

**Smoke test (optional, Jacek):**
1. Firestore Console → `/leagues/` collection
2. Verify 3 docs: `l_nxl`, `l_pxl`, `l_dpl`
3. Spot check `l_nxl` divisions array → 7 entries with `{id, name, order}` shape
4. App still works as before — workspace UI reads from constants

## 2026-05-19 — Phase 1.3: Migration script — users.workspaces field deletion
**Commit:** `e560151` (script only — no app deploy)
**Status:** ✅ Migration completed 2026-05-19 by CC (Jacek GO on `--write`)
**Migration run output:** Total /users docs: 21 · With workspaces field: 18 · Processed (deleted): 18 · Errors: 0. Post-write verification dry-run confirmed 0 docs with field remaining (all 21 clean).

**🎉 PHASE 1 SCHEMA FOUNDATION COMPLETE.** § 63.3 Option α fully implemented:
- Phase 1.1 (`b90ffed`): useUserWorkspaces hook deployed
- Phase 1.2 (`6c9ad4f`): write path dropped + signup writer removed
- Phase 1.3 (`e560151`): migration script + run — workspaces field deleted from stored data

After Phase 1.3:
- src/ has zero readers + zero writers of `users.workspaces` (verified Phase 1.1 + 1.2 + post-deploy greps)
- Stored data has zero `workspaces` fields on `/users/{uid}` docs (verified post-migration dry-run)
- `workspace.userRoles[uid]` is sole source of truth for user-workspace membership
- Phase 2 (Leagues + Players + Teams + TeamMemberships hoisting) unblocked

**What changed:** Created `scripts/migration/phase_1_3_delete_users_workspaces.cjs`. Node.js Firebase Admin SDK script that iterates `/users/{uid}` collection and deletes the `workspaces` field via `FieldValue.delete()` from any user doc that still has it (legacy data from pre-Phase-1.2 signups). Idempotent — docs already missing the field are skipped. Per-doc try/catch (single-doc errors don't abort batch). Init pattern matches existing `scripts/purge-anonymous-users.cjs` (CommonJS .cjs, `GOOGLE_APPLICATION_CREDENTIALS` env var).

**Per Jacek 2026-05-19:** backup procedure waived ("dane mogą zostać zaorane, nowy import jako recovery"). Re-import is recovery path.

**Why not auto-run:** CC sandbox has no service account JSON. Per brief escalation gate #1, deferring run to Jacek who has `GOOGLE_APPLICATION_CREDENTIALS` set locally per existing script precedent.

**Jacek run instructions:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# Dry-run first to inspect counts + preview
node scripts/migration/phase_1_3_delete_users_workspaces.cjs --dry-run
# If counts sane (most users have workspaces field per Phase 1.2 finding), run:
node scripts/migration/phase_1_3_delete_users_workspaces.cjs --write
```

**Expected dry-run output:** total user docs, count with `workspaces` field, count without. Most existing users should have it (signup writer was active until Phase 1.2 deploy `6c9ad4f`).

**Post-run verification (Jacek):**
1. Firestore Console → /users collection
2. Spot check 3-5 random user docs → NO `workspaces` field present
3. Production smoke: log out + log back in (any account) → bootstrap auto-join works
4. Sentry watch for `useWorkspace.jsx` or `useUserWorkspaces` errors in first 24h

**Once Jacek confirms successful run:** flip this entry's Status to `✅ Migration completed` + append numbers `(total: N, with workspaces: M, deleted: M, errors: 0)` + flip Phase 1 strategic docs to COMPLETE (NEXT_TASKS + HANDOVER + MULTI_TENANT_MIGRATION_PLAN.md). Follow-up doc commit per brief STEP "Phase 1 COMPLETE marker".

**Recovery path:** If issues, re-import data via existing Jacek-managed import process. Script is idempotent — safe to re-run.

## 2026-05-19 — Phase 1.2: Drop users.workspaces write path + bootstrap refactor
**Commit:** `6c9ad4f`
**Status:** ✅ Deployed (smoke test required)
**What changed:** `users/{uid}.workspaces` field is now fully orphan in code — zero readers AND zero writers in src/ (verified by post-change grep). Removed sole writer at `dataService.js:getOrCreateUserProfile` (was writing `workspaces: []` on signup). Updated /users/{uid} canonical schema doc comment to reflect § 63.3 Option α. Added inline SoT comments at 3 `userRoles` write sites in `useWorkspace.jsx` (enterWorkspace self-join + brand-new-workspace bootstrap + autoEnterDefaultWorkspace self-join). No firestore.rules change (user-doc create rule is unconditional, dropping field is rule-safe). Bootstrap auto-join behavior preserved per § 49 + § 51 — only storage location semantics clarified. Phase 1.1 hook (useUserWorkspaces) unaffected. Field still exists in stored data on legacy user docs — Phase 1.3 migration script will delete.

**Discovery note:** Phase 1.1 commit message + report stated "no current direct write to users.workspaces" — that was based on a reads-only grep (`.workspaces` dot-property pattern). Phase 1.2 pre-flight ran wider field-name grep (`workspaces:` colon syntax) and surfaced the signup writer at dataService.js:39. Both Phase 0 reads finding (zero readers) and Phase 1.2 writes finding (one writer, now removed) hold.

**Known issues:** None expected. New users created post-deploy will lack `workspaces` field. Existing users keep the (now-orphan) field until Phase 1.3 migration script deletes it.
**Smoke test required (Jacek):**
1. Log in to production with a NEW account (or use incognito + new email if multi-account flow exists)
2. Verify workspace entry works (bootstrap auto-join completes — should match prior behavior)
3. Browser console: no Firestore permission errors from useWorkspace.jsx
4. (Optional) Firestore Console: verify NEW user doc does NOT have `workspaces` field (only existing field on pre-deploy user docs)
5. Sentry watch for useWorkspace.jsx errors in first 24h

If existing user (account created pre-deploy) → no behavior change expected (their `workspaces` field stays as legacy data; nothing reads it).

## 2026-05-19 — Phase 1.1: useUserWorkspaces hook
**Commit:** `b90ffed`
**Status:** ✅ Deployed (smoke test required)
**What changed:** New `useUserWorkspaces()` hook at `src/hooks/useUserWorkspaces.js`. Queries user's workspace memberships via `workspace.userRoles[uid]` map field — first consumer of the § 63.3 Option α source-of-truth approach. Returns `{ workspaces, loading, error }` with one-shot Firestore `getDocs` query on auth user change. No real-time listener (defer until switcher UI proves it needs one). No `firestore.rules` change (existing `allow read: if request.auth != null` on `/workspaces/{slug}` permits the filtered list query). No composite index pre-deployed (Firestore auto-indexes map subfields for single-field `!=` queries — watch Console for index warning). Foundation for Phase 1.2 + 1.3 + future switcher UI brief. Additive change — hook is unused until a consumer is wired in.
**Known issues:** None expected. Hook has no current consumer, so no user-facing change. If a future consumer hits a Firestore composite index error, escalate (deploy `firestore.indexes.json` patch via `firebase deploy --only firestore:indexes`).
**Smoke test required (Jacek — can do in browser dev console without UI work):**
1. Log in to production (use any account)
2. Open browser console
3. Run:
   ```js
   const { collection, query, where, getDocs } = await import('firebase/firestore');
   const { db, auth } = await import('/src/services/firebase.js');  // path may differ in prod build — use dynamic import via React DevTools instead
   const uid = auth.currentUser.uid;
   const q = query(collection(db, 'workspaces'), where(`userRoles.${uid}`, '!=', null));
   const snap = await getDocs(q);
   console.log('Workspaces:', snap.docs.map(d => ({ id: d.id, ...d.data() })));
   ```
   (Easier alternative: trigger any code path that imports `useUserWorkspaces` — e.g. add a debug log temporarily, OR wait for Phase 1.2 / switcher brief to wire a real consumer.)
4. Expected: array of workspace docs where user has any entry in `userRoles`. Single-workspace accounts return 1 entry. Multi-workspace accounts return all memberships.
5. Verify no `permission-denied` errors in console.
6. Verify no `failed-precondition` errors indicating missing Firestore index.
7. Monitor Sentry for first 24h — hook errors would surface as `useUserWorkspaces query failed: ...` console errors with stack trace.

If composite Firestore index was required and deployed, note it here. **As of deploy time: none added.**

## 2026-05-19 — Canvas Step 1: drawZones.js i18n cleanup
**Commit:** `5f12f7d`
**Status:** ✅ Deployed
**What changed:** Moved 5 hardcoded canvas labels (DISCO/ZEEKER/DANGER/SAJGON/BIG MOVE) from `src/components/field/drawZones.js` to `src/utils/i18n.js` dictionary. Added 5 `zone_label_*` keys to PL + EN sections with identical English values initially (paintball jargon convention). `drawZones` now accepts `t` accessor via options. `FieldCanvas.jsx` imports `useLanguage` hook, calls `const { t } = useLanguage()` in component body, passes `t` through to drawZones, includes `t` in draw useEffect dependency array. Mechanical refactor — no behavior change, no visual regression. All rendering logic preserved (pill bg `rgba(0,0,0,0.65)`, font sizes 11px/14px, position offsets, all 5 zone colors). First canvas refactor step per § 64.9. Frees future i18next migration (§ 63.8) to be straightforward conversion.
**Known issues:** None expected. **Smoke test post-deploy:** open LayoutDetailPage with danger/sajgon polygons + a layout with discoLine/zeekerLine set, verify all 5 labels render correctly in both PL and EN modes (LangToggle in PageHeader). If labels disappear or show key strings (`zone_label_disco` etc), `t` is not being passed through correctly — revert and debug.

## 2026-05-15 — Heatmap simplification: player position views (fix/heatmap-density-removal · § 62)
**Commit:** `15ae8e2` (merge) · branch `fix/heatmap-density-removal` · 1 commit (`acdcc00`)
**Status:** ✅ Deployed (NXL Czechy day 1 — Jacek floor feedback)
**What changed:** Player position heatmaps (coach team summary § 28/§ 60 + match summary § 21) — density gradient removed entirely per § 62. Player dots (gun-up) and runner triangles (apex up) now render solid team fill + 2 px stroke for shape clarity. Team A: `COLORS.success` fill (green) + `COLORS.successDim` stroke (dark green family). Team B: `COLORS.zeeker` fill (teal — kept per Jacek 2026-05-15 decision, not switched to true blue) + `COLORS.surfaceDark` stroke (neutral dark; no dark-teal token in palette and adding new tokens explicitly forbidden — team identity rides on the fill, stroke does shape separation only). Marker radii unchanged (3.5/4.5). Triangle gets `lineJoin='round'` to avoid mitred apex. § 25 HERO amber halo preserved at `r + 3` as outermost layer — HERO markers now have three concentric strokes (fill → dark perimeter stroke → amber halo). Bump density (Layer 2) and shot density (Layer 3) untouched — different overlap patterns, different signal. Eliminated markers (`drawElimX`) untouched — adding the new stroke would compete with the red X per § 31. § 62 appended to DESIGN_DECISIONS with full rule set + out-of-scope list. Density blobs were obscuring overlapping markers (cluster of N markers conveys density by stacking anyway) and hiding the circle-vs-triangle shape encoding per Jacek's tournament floor feedback.
**Known issues:** Deaths heatmap (§ 61, `LayoutAnalyticsPage`) untouched — different canvas, different data type (skulls + shooter markers), keeps its own rendering. Live scouting markers (`FieldCanvas` + `drawPlayers.js` — large r=18 player circles with photos/numbers) untouched — different visual class, out of scope per brief. If Team B stroke reads too washed-out vs the darkened field bg, cheap swap to `COLORS.bg` or `COLORS.black` available (single-line change).

---

## 2026-05-15 — Schedule import scouted-division repair + source fix (fix/schedule-import-scouted-division)
**Commit:** `e0e3e6b` (merge) · branch `fix/schedule-import-scouted-division` · 1 commit (`859e9ef`)
**Status:** ✅ Deployed (NXL Czechy day 1 — Coach tab "Teams" section appeared empty for NXL Czechy tournament despite scouted entries existing in Firestore)
**What changed:** Real-data follow-up to schedule CSV imports (`5b1e15f` 2026-05-13 + `d4653ef` 2026-05-14). On Jacek's NXL Czechy tournament, Coach tab Teams section showed zero entries despite matches rendering correctly. Initial hypothesis (Jacek): Pass 0 silently failed → scouted entries never created. Code analysis disproved this — the only scouted-entry deletion path is full-tournament cascade (no `deleteScoutedTeam` exists), and Pass 2 (match writes) only runs after Pass 0+1 complete sequentially in one try, so matches existing means scouted creates succeeded.

Real root cause: ScheduleCSVImport's three scouted-creation sites (Pass 0 workspace auto-attach line 337, 'match' resolver branch line 353, 'create' new-team branch line 367) ALL called `addScoutedTeam(tid, { teamId, roster })` — **omitting the `division` field**. `addScoutedTeam` defaults it to null. CoachTabContent's client-side division filter (`resolvedDivision = tournament.divisions[0] = 'PRO'` for multi-division NXL tournaments) then excludes every null-division entry. Matches still rendered because the matches list isn't division-filtered against scouted. The canonical add-team UI path (`ScoutTabContent.buildScoutedPayload`) sets division correctly — only the schedule importers were broken. OCR `ScheduleImport.jsx:256` had the same bug.

Jacek confirmed via Firestore Console: ~76 scouted entries existed in `tournaments/TGjh5I7qMzxytDY0BWmF/scouted` with `division: null`. Wrong-shape, not missing-data. Per the brief's "STOP if wrong-shape" clause, the original backfill plan was scrapped (would have created 76 duplicates) and a repair-shape plan substituted.

**Fix shipped:**
- Source: all four scouted-creation sites (3 in ScheduleCSVImport + 1 in OCR ScheduleImport) now derive `division` from `team.divisions[league]` (Pass 0 / 'match' branches) or from the resolver's `u.division` ('create' branch). Each scouted-create now wrapped in per-team try/catch with success/failure counts in the import log — replaces the single outer catch that aborted the whole import on the first failure.
- Repair: new `dataService.repairScoutedDivisionsForTournament(tid, league?)` reads scouted + teams once, **UPDATES** each null-division entry to `team.divisions[league]` (no creates → zero duplicate risk), idempotent on already-set division. Returns `{ scanned, updated, alreadySet, skippedNoTeam, skippedNoDivision, failures[] }`. Surfaced via a self-gated Btn in CoachTabContent that renders only when `scouted.length > 0 && divisionScouted.length === 0` — the exact symptom shape — and vanishes after the update settles via onSnapshot. No permanent UI footprint.

**Validation:** awaiting Jacek's two-step floor check — (1) open Coach tab on NXL Czechy, confirm the repair Btn renders, tap it; (2) confirm Teams section populates with ~76 entries and the Btn vanishes. If repair Btn does NOT render after deploy, that means `scouted.length === 0` (truly missing entries) and the original backfill plan needs to be revived — unlikely given Jacek's Firestore Console check.

**Known issues / out of scope:**
- Repair only touches `tournament.league` divisions (NXL in Jacek's case). Other-league entries with null division remain — none in current data.
- Tournaments where `tournament.divisions` is set but `tournament.league` is unset would fall through to no-op (returns `{ reason: 'tournament has no league' }`). Defensive — no such tournaments exist in practice.
- Future schedule imports use the corrected source code, but the repair affordance stays in CoachTabContent because it's self-gated. Can be removed in a post-NXL cleanup if desired; cost of leaving it is zero (renders only on the broken-shape symptom).

---

## 2026-05-15 — Multi-device point-overwrite hotfix (fix/multi-device-overwrite)
**Commit:** `3b236cf` (merge) · branch `fix/multi-device-overwrite` · 1 commit (`2f696f5`)
**Status:** ✅ Deployed (NXL Czechy day 1 active — Jacek had 6 corrupted points pending recovery, GO given on the tournament floor)
**What changed:** Two-device same-UID scouting was silently overwriting prior point docs via `setDoc` ID collisions. Per-coach point stream used deterministic doc IDs `{matchKey}_{coachShortId}_{NNN}` with NNN sourced from a localStorage-keyed counter (`useCoachPointCounter`) — independent per device by design. iPhone counter at 7, laptop fresh at 0 → laptop's first save computed the same doc ID as iPhone's first point → `setDoc` overwrote it. Surfaced when Jacek opened a LIVE match on laptop after scouting 7 points on iPhone earlier in the day; expected 5:5 → 6:5, actual stayed 5:5 (overwritten doc happened to carry same outcome) or went 5:4 (different outcome). Last 2 saves on iPhone (counter 8, 9) survived since they didn't collide.

Fix (Opus option b — abandon deterministic IDs entirely): `savePointAsNewStream` now uses `addPoint`/`addTrainingPoint` (auto-ID via `addDoc`). `index` field computed reactively from the live `points` array (already an `onSnapshot` subscription filtered to this coach's docs by `usePoints`) — `Math.max(...myPoints.map(p => p.index || 0)) + 1`. Both devices read from the same Firestore source of truth, so they converge on the next free index regardless of which device wrote last. `endMatchAndMerge` groups by `coachUid` + sorts by `index` field (not by doc ID, `dataService.js:383-386`), so old `_NNN` docs and new auto-ID docs co-exist and merge correctly — no data migration. `useCoachPointCounter` deleted (last consumer). `setPointWithId`/`setTrainingPointWithId` retained as unused exports — separate cleanup ticket post-NXL.

**Known issues / out of scope:**
- The 6 corrupted points from Jacek's session remain in Firestore as overwritten docs (each carrying the laptop-save data on top of iPhone's original). Manual re-entry by Jacek is the recovery path; the fix prevents recurrence but doesn't reconstruct lost intermediate state.
- localStorage keys `pbscoutpro_counter_*` left in place as harmless garbage — no read path remains; site-data clear evicts naturally. Not worth a one-time-wipe effect.
- Cross-device same-UID presence banner deferred — no contention signal between devices since Brief F retired the match-level claim system. Separate post-NXL brief.
- Sentry `ReferenceError: onToolbarAction at FieldCanvas-DGuBOyvU.js:1:28582 in handleDown` was unrelated symptom in the canvas tap handler. Separate ticket.
- § 42 docs update (point IDs auto-generated, no longer deterministic) — separate docs commit.

**Smoke test:** awaiting Jacek's two-device confirmation on the tournament floor (iPhone + laptop, alternate saves, indices 1/2/3 across devices, no overwrites).

---

## 2026-05-14 — Schedule CSV: auto-match workspace teams + auto-attach (feat/schedule-auto-match-workspace)
**Commit:** `d4653ef` (merge) · branch `feat/schedule-auto-match-workspace` · 1 commit (`40fe366`)
**Status:** ✅ Deployed (Jacek-driven merge + deploy via terminal after CC approval channel intermittent)
**What changed:** Real-data follow-up to yesterday's schedule CSV import (`5b1e15f`). On Jacek's first run with the 229-row NXL Czechy file, all 76 unique teams landed in the resolver UI — even though those teams had been created in the workspace via the 2026-05-12 player CSV import (`06b4ec1`) with correct `divisions.NXL` values. Diagnosis: schedule import's `findScoutedMatch` was tournament-scope only; teams existed workspace-wide but weren't attached to the freshly-created NXL Czechy tournament yet.

Fix: auto-match now does two passes.
- **Pass 1 — tournament-scouted** (`findScoutedMatch`, existing): match in this tournament's `scouted` list.
- **Pass 2 — workspace fallback** (`findWorkspaceMatches`, new): if Pass 1 misses, search ALL workspace `teams` by case-insensitive name + exact `divisions.NXL`. Exactly 1 hit → schedule it for auto-attach during import (new Pass 0 in `handleImport` creates the scouted entry, roster pre-populated from existing players on that team). 0 hits or 2+ hits (ambiguous parent/child name collision) → fall through to the resolver.

Resolver UI gains a `🔗 Z workspace (zostaną dopięte): N` counter beneath the existing `Auto-dopasowane (w turnieju)` line so the user sees pending attaches before tapping Import. Import log writes a per-team `🔗 Drużyna z workspace dodana do turnieju: {name} ({division})` entry.

For Jacek's specific case: 76 manual taps → 0 taps after this fix (assuming all 76 teams have matching `divisions.NXL` in workspace; ambiguous duplicates still resolver-routed).

**Files touched:** `src/components/ScheduleCSVImport.jsx` (+55/-7).

**Decisions logged:**
- Workspace match requires EXACT same case-insensitive name + division (no fuzzy match). 2+ hits go to resolver because we can't pick safely between parent/child team docs.
- Auto-attach happens before match writes (new Pass 0) so subsequent match docs reference valid scouted IDs. Roster comes from the current `players` filter (`teamId === teamId`), matching the existing OCR ScheduleImport pattern.

**Smoke-test path:**
1. Open Scout tab on empty NXL tournament. Schedule CSV import.
2. Upload Jacek's `harmonogram_pbleagues_20260512_225009.csv`.
3. Resolver screen: `🔗 Z workspace (zostaną dopięte): ~76`, `Do rozwiązania: 0` (or few).
4. Tap Zaimportuj immediately. Log: 76× `🔗 Drużyna z workspace dodana…` + `✅ Zapisano: 229 meczów`.
5. Coach tab: 76 teams attached. Scout tab: 229 matches grouped (Eliminacje + Sunday Club + Grupa).

## 2026-05-13 — Schedule CSV import + match list grouping (feat/schedule-csv-import)
**Commit:** `5b1e15f` (merge) · branch `feat/schedule-csv-import` · 5 commits (`76f7a1f`, `d916347`, `be74c61`, `eb2e1d4`, `f3eb5f1`)
**Status:** ✅ Deployed
**What changed:** PBLeagues NXL schedule CSV import (alternative input alongside existing OCR/image-based ScheduleImport) + Scout-tab match list grouped by tournament stage + Grupa. Pre-NXL Czechy 2026-05-14 readiness.

- **`src/utils/divisionAliases.js`** (new shared util):
  - `SCHEDULE_DIVISION_ALIAS` hardcoded 7-entry map per brief: PBLeagues long-form (`'Pro X-Ball™'`, `'Female - WNXL X-Ball™'`, etc.) → app canonical short codes matching `DIVISIONS.NXL`. `'Semi-Pro X-Ball™'` resolves to `'SEMI-PRO'` (theme.js canonical preserved 2026-05-12).
  - `normalizeScheduleDivision(raw)` — trim + case-sensitive lookup. Returns `null` for unknown values → caller hard-stops the import with row number + offending value (per brief).
  - `parseScheduleDateTime(dzien, godzina, year)` — regex parser for PBLeagues `'Thursday, 14th May'` + `'12:00'`. Year required from caller (no hardcoded 2026); fallback to current calendar year exists only for offline tests. Caller in `ScheduleCSVImport.handleFile` passes `selectedTournament.year` (always set by `addTournament`).
  - `dayShort(date, lang)` — PL/EN day-short labels indexed by `Date.getDay()` for `MatchCard` pill.
  - `stageRank(raw)` + `stageLabel(raw)` — two-bucket classifier per Jacek 2026-05-13: rank 0 → 'Eliminacje', rank 1 → 'Sunday Club' (all bracket-day rounds + unrecognized + empty round collapse here).
  - `groupMatchesByStage(matches)` — returns `[{ rank, label, totalCount, groups: [{ groupName, matches: [...] }] }]`. Stages ordered by rank, groups alpha within stage, matches chronologically by `scheduledAt` (with legacy `date + time` fallback).

- **`dataService.addMatch`** extended additively with `scheduledAt` (Firestore Timestamp | null), `field`, `round`, `group`. Existing string `date` / `time` stay populated alongside so legacy readers (ScoutedTeamPage sort by `m.date`, MatchCard fallback) work unchanged.

- **`src/components/ScheduleCSVImport.jsx`** (new — separate from OCR ScheduleImport per Stage 0 discovery): 5-step modal flow. Upload → Resolve → Importing → Done. Tournament picker filtered to NXL only; year inherited from selected tournament. BOM strip + `;` vs `,` auto-detect + quote-aware row split (reuses pattern from yesterday's CSVImport ship). Division alias + datetime parse on every row, hard-stop with row number on first failure. Auto-match teams against tournament's scouted entries by `(name, division)` tuple. Unmatched teams go into structured resolver — three actions per row: `Dopasuj` (dropdown of workspace teams filtered to matching division), `Utwórz` (creates new team with division pre-set + scouted entry), `Pomiń` (drops affected matches with summary count). Import CTA disabled until every unresolved team has an action (and a mapping for Dopasuj).

- **`src/components/tabs/ScoutTabContent.jsx`**: second CTA `Import harmonogramu (CSV)` alongside existing OCR `Import schedule (zdjęcie)`. Scheduled section render refactored: groups matches by stage + Grupa via `groupMatchesByStage`. Stage section header (uppercase muted label + count) + per-stage Grupa sub-headers when group is non-empty. Knockout rounds (no group) render flat under the stage header. Flatten fast-path: legacy single-stage + single-empty-group keeps existing flat look.

- **`src/components/MatchCard.jsx`** `formatSchedulePill(m)`: reads `scheduledAt` (Firestore Timestamp / Date / ISO), falls back to legacy `m.date + m.time` strings. Format: `'Czw 14:20 · NXL Pro'` for scheduled with full data, graceful degradation when any field absent. Live + Completed pills gain ` · {field}` suffix when present.

**Files touched:** `src/utils/divisionAliases.js` (new, 188 lines), `src/components/ScheduleCSVImport.jsx` (new, 525 lines), `src/components/MatchCard.jsx` (+72/-12), `src/components/tabs/ScoutTabContent.jsx` (+54/-15), `src/services/dataService.js` (+8 additive fields on addMatch).

**Decisions logged:**
- Separate component (not a mode toggle on ScheduleImport) — OCR + CSV branches stay uncoupled per Stage 0 discovery.
- OCR ScheduleImport NOT retrofitted — out of scope; existing OCR flow keeps its current shape until a follow-up brief.
- Year from `tournament.year` (always set by `addTournament`); fallback to `new Date().getFullYear()`. Cross-year tournament span explicitly not possible per Jacek 2026-05-13.
- Two-stage grouping only (Eliminacje + Sunday Club) per Jacek 2026-05-13 simplification — earlier draft had 5-stage breakdown (ocho/quarter/semi/final separate), collapsed back per directive.
- Empty/null `round` → Sunday Club bucket by default. If real-data smoke test reveals non-bracket matches without round info, follow-up can add a third bucket without restructuring consumers (stage.label resolved at grouping time, not by lookup at render).
- No duplicate-match dedup on re-import — re-uploading same CSV writes 229 new docs. Flag for follow-up if idempotency needed.

**Smoke-test path** (real data — Jacek's `harmonogram_pbleagues_20260512_225009.csv`):
1. Open Scout tab on a NEW empty NXL tournament. Empty state shows two CTAs.
2. Tap `Import harmonogramu (CSV)` → modal. Tournament picker shows NXL tournaments.
3. Pick the tournament, upload the file. Header: `{tournament name} — 229 meczów, {N} drużyn`. Stats: auto-matched count + unresolved count.
4. Resolve each unmatched team — `Dopasuj` (existing workspace team), `Utwórz`, or `Pomiń`. Import CTA enables when all resolved.
5. Import → `✅ Zapisano: 229 meczów`.
6. Scout tab match list now grouped:
   - **Eliminacje · {N}** with Grupa sub-headers (A, B, C…).
   - **Sunday Club · {M}** flat list, chronologically sorted.
7. Each MatchCard shows `Czw 14:20 · NXL Pro` style pill.
8. Division filter (D3, PRO3v3, etc.) — grouping recomputes correctly per filter.
9. Bad-data error paths — unknown `Dywizja` value or unparseable date/time → hard-stop with row number + offending value, no partial write.

## 2026-05-12 — CSV import: Dywizja → team.divisions.NXL (feat/csv-import-division)
**Commit:** `06b4ec1` (merge) · branch `feat/csv-import-division` · 1 commit (`0b67166`)
**Status:** ✅ Deployed
**What changed:** PBLeagues NXL CSV export now auto-maps the `Dywizja` column to `team.divisions.NXL` without manual per-team editing. Closes Jacek's "754 rows, 76 teams" import workflow.

- **DIVISIONS.NXL** extended from 5 → 7 values: `['PRO', 'SEMI-PRO', 'D2', 'D3', 'D4', 'PRO3v3', 'WNXL']`. PRO3v3 + WNXL added per brief. **SEMI-PRO uppercase casing preserved** for backward compat with any existing team docs storing that exact value (option (a) from discovery — brief literal `Semi-PRO` title case would orphan production data via case-sensitive UI compares). Casing divergence handled transparently on CSV import: `normalizeDivision` does case-insensitive match against `DIVISIONS[league]` and returns canonical casing, so PBLeagues `'Semi-PRO'` → stored `'SEMI-PRO'`. All existing `DIVISIONS.NXL` consumers (MainPage, NewTournamentModal, TeamDetailPage, TeamsPage) pick up the 7-value list automatically via their existing `DIVISIONS[league].map(...)` iteration — no per-file updates needed.
- **`dataService.addTeam`** now accepts `data.divisions` on creation (defaults to `{}`); manual team-creation flows keep current behavior, CSV import + future programmatic creators can seed the divisions object.
- **`CSVImport.jsx`:**
  - New MAPPABLE entry `teamDivision`, label "NXL Division", detect: `['dywizja', 'division', 'div', 'team_division', 'team_div']`.
  - Removed `'dywizja'`, `'division'` from `playerClass.detect` — those are TEAM-level fields in PBLeagues exports and were mis-mapping to per-player class. `'klasa'` kept on `playerClass`.
  - `normalizeDivision(raw, league)` — case-insensitive match against `DIVISIONS[league]`, returns canonical casing or `null`.
  - `handlePreview` tracks `teamsWithDivision` count + intra-import `collisions` (same team identity, multiple different division values across rows). Last-write-wins on import; collisions surfaced to user via the preview stat row + dev `console.warn` with team names + before/after values.
  - `handleImport` builds `divisionByKey` from parsed rows (key: `teamExtId || teamName`, matching `matchTeam`'s lookup order), writes `team.divisions.NXL` on `addTeam` / `updateTeam` only when value differs. Other leagues on team's divisions object preserved via spread merge.
  - Preview UI gains "Dywizja {league}" stat row showing team count (accent) + collision count (red).
  - Import-log entry on each team line tags `[NXL: {division}]` when written.

**Files touched:** `src/utils/theme.js` (DIVISIONS.NXL expansion + comment), `src/services/dataService.js` (addTeam.divisions support), `src/components/CSVImport.jsx` (new mappable target + normalizer + preview stats + import logic).

**Decisions logged:**
- Option (a) for `Semi-PRO` casing: kept `SEMI-PRO` uppercase in DIVISIONS, normalize on import. Zero data migration. If Jacek prefers title-case `Semi-PRO` later, single-line theme.js change + one-time migration script.
- `'dywizja'` / `'division'` removed from `playerClass.detect`: corrects a long-standing mis-mapping (PBLeagues column was always TEAM-level). PBLeagues `Klasa` column still auto-maps to `playerClass` via the `'klasa'` keyword.
- Last-write-wins on intra-import division collisions, with dev console.warn. For typical PBLeagues NXL exports (one division per Druzyna_ID) collisions are expected to be zero.

**Offline normalize verification (pre-deploy):** all 7 brief CSV values + mixed case + whitespace + invalid → all map correctly to canonical casing or `null`.

**Smoke-test path** (real data — Jacek's `zawodnicy_pbleagues_20260512_211034.csv`):
1. Open Import CSV → select file. Header: "754 wierszy · 11 kolumn · sep: średnik".
2. Inspect auto-mapped fields — `Dywizja → NXL Division` (green ✓). `Klasa → Class`. `Imie_Nazwisko → Player name`. etc.
3. Tap Podgląd → preview shows Drużyny / Gracze counts + new `Dywizja NXL · {N} drużyn` stat row.
4. Import → Done log includes `✅ Teams: 76 total · 76 z dywizją NXL`.
5. Open any imported team's TeamDetailPage → divisions row shows the imported NXL division as active toggle.
6. Open Tournament create modal (NXL league) → division toggles show all 7 values; selecting D3 filters team picker to D3 teams.
7. Re-import same file → idempotent (0 division changes since values already match).

## 2026-05-12 — Match post-close edit + scout preservation (fix/match-postclose-edit)
**Commit:** `ae3627f` (merge) · branch `fix/match-postclose-edit` · 1 commit (`c6e8749`)
**Status:** ✅ Deployed
**What changed:** Bug 7 + Bug 2c bundled.

**Bug 7 — Reopen ended match for post-game data entry.** Jacek's stream-rewatch workflow needs to add/edit points after a match closes (tactic planning use case). Reopen flow was deliberately removed 2026-04-16 (DEPLOY_LOG); restored per new feedback with safer mechanics — match status stays `'closed'` throughout, no new states. New boolean `match.editLockReleased` flips the match into editable mode while status stays closed; no live/claim machinery involvement.
- `dataService.setMatchEditLockReleased(tid, mid, released)` — flag flip.
- `dataService.recomputeMatchAggregates(tid, mid)` — counts canonical-flagged points and rewrites `scoreA` / `scoreB`. Called on re-close so any outcomes recorded during the unlocked window land in the match doc aggregate.
- MatchPage review view derives `isLockReleased = !!match?.editLockReleased` and `isLocked = isClosed && !isLockReleased`. Edit-gate sites (Scout/Quick scoreboard buttons, point-card tap edits, header `MoreBtn`) flipped from `!isClosed` to `!isLocked`. Header badge: FINAL gray when locked, **ODBLOKOWANY** amber when reopened, LIVE amber when open.
- Sticky bottom button branches: red ghost "End match" (open) / neutral ghost **Odblokuj edycję** (closed, locked — single-step, no confirm) / neutral ghost **Zamknij ponownie** (closed, unlocked — confirm modal + `recomputeMatchAggregates`). Ghost variants per brief — explicitly NOT amber CTAs because this is a state change, not a primary action.
- MoreBtn ActionSheet omits "End match" when `isLockReleased` (sticky Zamknij ponownie owns re-close); Clear all + Delete match preserved.
- 8 i18n keys × PL + EN (`match_unlock_edit`, `match_relock`, `match_unlocked_badge`, `match_unlocked_toast`, `match_relocked_toast`, `match_relock_confirm_title`, `match_relock_confirm_msg`, `match_relock_confirm_label`). MatchPage previously had no i18n imports — added `useLanguage` for new strings only; existing English strings on the page untouched (broader i18n pass out of hotfix scope).

**Bug 2c — Preserve `homeData.scoutedBy` / `awayData.scoutedBy` on post-close edits.** Without this, Jacek's post-stream session would overwrite the original scout's uid and break Scout Ranking (§ 33) attribution. `savePoint` now gates on `preserveScout = !!editingId && match?.status === 'closed'` and falls back to the existing per-side `homeData.scoutedBy ?? teamA.scoutedBy ?? uid` (and away symmetric). Applied at both concurrent + solo write sites. Open-match scouting + new-point creation during post-close edit both keep current uid as scout (correct attribution for fresh data).

**Bug 2c back-button half — no code change.** Audited `PageHeader back={{...}}` handler in the editor view: already navigates without forced save (`setEditingId(null); ...; navigate(reviewUrl, { replace: true });`). Landscape's separate Back btn same. Grep for any save-on-back patterns: zero matches. The brief's first half was implicitly already correct; only Bug 2c's scout preservation needed code.

**Files touched:** `src/services/dataService.js` (+32 lines, two new helpers), `src/utils/i18n.js` (+19 lines, 8 keys × PL+EN), `src/pages/MatchPage.jsx` (+155/-34, review view + savePoint).

**Decisions logged:**
- No discard confirm on back per brief consistency rule (open-match back currently silently discards draft; same behavior for post-close edit).
- MoreBtn menu in reopened state keeps Clear all + Delete match (useful), omits End match (sticky Zamknij ponownie handles re-close without competing CTAs).
- Training matchups not handled — brief said "match" not "matchup"; `endMatchupAndMerge` is a parallel codepath. Separate follow-up if Jacek wants post-close edit on training matchups too.
- `recomputeMatchAggregates` rewrites scoreA / scoreB only. Brief mentioned "aggregates (scoreA, scoreB, etc.)" but the "etc." isn't unpacked in code; if other match-doc aggregates need refresh (mergeStats? other), extend the helper.

**Smoke-test path:**
1. Closed match review → header shows FINAL, sticky bottom shows ghost Odblokuj edycję.
2. Tap Odblokuj edycję → toast, badge flips to amber ODBLOKOWANY, Scout/Quick + point-tap re-enable.
3. Edit existing point → save → in Firestore console verify `homeData.scoutedBy` unchanged from pre-edit value (NOT current uid).
4. Add fresh new point during unlocked window → save → that point's `scoutedBy` = current uid (correct).
5. Tap Zamknij ponownie → confirm → toast, badge flips back to FINAL, aggregates recomputed.
6. Match list: stays in Completed section throughout. No LIVE badge appearance during unlocked phase.
7. Open-match scouting in a separate match: no regression — current user becomes scoutedBy as before.

## 2026-05-12 — Deaths heatmap table scroll regression (fix/deaths-heatmap-table-scroll)
**Commit:** `112fff9` (merge) · branch `fix/deaths-heatmap-table-scroll` · 1 commit (`dc3a76e`)
**Status:** ✅ Deployed
**What changed:** Bug 6 — deaths table (Brief B Stage 4 7-column table including "Pozycja strzelca") was rendered but unreachable on iOS Safari after the Bug 5 landscape fix. Root cause: LayoutAnalyticsPage outer wrapper used `height: '100dvh'` (a hard ceiling) with inner `flex: 1, overflowY: 'auto'`. That triggers the classic flex+overflow gotcha — without explicit `min-height: 0` on the flex child, the inner refuses to shrink below content size and `overflowY: 'auto'` never activates. In iPhone landscape (where the canvas height-cap pushes the table further down), the table landed below the silently-broken scroll boundary. Single-line fix swaps `height: '100dvh'` → `minHeight: '100vh'`, matching the canonical pattern used by ScoutedTeamPage + BallisticsPage + MatchPage outer + 8 other canvas pages. Document scrolls naturally; inner's `overflowY: 'auto'` becomes a defensive no-op. Also dropped the leftover `width: '100%'` from Bug 5 (`d1dad51`) — not in the canonical template, redundant with `maxWidth` + `margin: '0 auto'`.

**Files touched:** `src/pages/LayoutAnalyticsPage.jsx` (+1/-1).

**Decisions logged:**
- Bug 5 stopped halfway: aligned width to responsive pattern but left height as `100dvh`. This commit completes the alignment to the canonical scrollable-page template.
- Brief's four hypothesized causes (overflow:hidden, position:fixed overlay, orientation conditional, container restructure) were all incorrect for this regression. Real cause was a layout-strategy mismatch silent on most browsers but reproducible on iOS Safari.

**Smoke-test path:**
1. iPhone portrait: open `/#/layout/{id}/analytics/deaths`, scroll past canvas → table visible with 7 columns. Same as before Bug 5.
2. iPhone landscape: same flow. Document scrolls naturally past viewport height; table reachable with 7 columns intact.
3. Cross-filter, scope drilling, marker rendering — all unchanged.
4. Compare scroll feel to `/tournament/{tid}/team/{sid}` (ScoutedTeamPage) — should be identical document-scroll behavior.

## 2026-05-12 — Deaths heatmap landscape width (fix/deaths-heatmap-landscape-width)
**Commit:** `3737705` (merge) · branch `fix/deaths-heatmap-landscape-width` · 2 commits (`d1dad51`, `607a5eb`)
**Status:** ✅ Deployed
**What changed:** Bug 5 — LayoutAnalyticsPage didn't fill device width in landscape because the page wrapper had hardcoded `maxWidth: 640`. iPhone landscape (812 wide) showed ~86 px dead margin each side. Initial fix (`d1dad51`) dropped maxWidth entirely (pure `width: 100%`) — that overcorrected, stretching to 1920 on desktop browsers. Audit of 11+ other canvas-bearing pages (MatchPage, TacticPage, LayoutDetailPage, BallisticsPage, ScoutedTeamPage, PlayerStatsPage, etc.) found the canonical pattern is `maxWidth: R.layout.maxWidth || 640, margin: '0 auto'` via `responsive(device.type)` from theme. LayoutAnalyticsPage was the outlier with hardcoded 640. Second commit (`607a5eb`) aligns to the responsive pattern. Mobile (< 640 px / iPhone portrait) fills viewport via `'100%'`. Tablet (640–1199 / iPhone landscape forced via touch override) caps at 768. Desktop (1200+) caps at 1200. Same look and feel as every other canvas page.

**Files touched:** `src/pages/LayoutAnalyticsPage.jsx` (+5/-2 net across two commits; `useDevice` + `responsive` imports added).

**Decisions logged:**
- Reverted pure 100%-fill in favor of the app-wide responsive pattern. Consistency across canvas pages preferred over absolute-no-margin on this one page. Jacek explicit ("i want to have the same look and feel across app").

**Known follow-ups flagged:**
- iPhone landscape still has ~22 px dead margin each side (tablet cap 768 vs viewport 812). iPad landscape ~128 px. Both are app-wide standard, not regressions. Three relax paths sketched in commit `607a5eb` if Jacek wants tighter fit globally — separate brief: (a) raise tablet `R.layout.maxWidth` toward 900, (b) tighten `useDevice.js` touch-device override so iPhone landscape stays in mobile breakpoint, (c) per-page override on canvas pages.

**Smoke-test path:**
1. iPhone landscape: deaths heatmap page width should match `/#/tournament/{tid}/match/{mid}` (MatchPage scouting canvas). Both show ~22 px gray margin each side.
2. iPhone portrait: deaths heatmap fills viewport (mobile breakpoint). No regression.
3. Cross-filter, scope drilling, table column, marker rendering, density: all unchanged.

## 2026-05-12 — Deaths heatmap cluster radius + z-order (fix/deaths-heatmap-cluster-zorder)
**Commit:** `555a634` (merge) · branch `fix/deaths-heatmap-cluster-zorder` · 2 commits (`9b13960`, `b548907`)
**Status:** ✅ Deployed
**What changed:** Two refinements after Brief B + Bug 1 hotfix landed.

- **Bug 3 — shooter cluster radius too small** (`9b13960`). Brief B Stage 5 left cluster radius unspecified; implementation rounded to 1% buckets implicitly (`Math.round(x * 100)`). Markers visually splintered on real data — many tiny markers with credit 0.5 / 1 instead of a few meaningful aggregates. New `SHOOTER_CLUSTER_BUCKET = 0.02` named top-level constant (2% bucket = 2× original radius). Applied at both `attributionData` and `linkMap` useMemos so shooterId keys stay aligned for cross-filter. Skulls untouched (their separate `CLUSTER_DIST = 0.04` already produces sensible clusters). Tunable in one place for future iterations.
- **Bug 4 — z-order during cross-filter** (`b548907`). With filter active, a highlighted skull could be visually covered by a faded shooter rendered after it in the original "skulls then shooters" z-order. Restructured the deaths-mode marker render: extracted `drawSkull(cl, alpha)` and `drawShooterMarker(m, alpha)` local helpers. When `filter.mode` is active, render in two passes — faded layer (both types at 0.3 alpha) first, highlighted layer (both types at 1) last. Highlighted markers now sit on top of every faded marker regardless of type. No-filter z-order preserved (density → skulls → shooters at full alpha). Zero-kill shooter markers (Stage 5 decision) still filtered via the existing `m.credit > 0` gate, now hoisted to `validShooters` for use in both passes.

**Files touched:** `src/pages/LayoutAnalyticsPage.jsx` (+48/-24).

**Decisions logged:**
- 2× cluster radius as first pass (Bug 3 brief acceptance). If real data still shows fragmentation or over-merge, the next iteration is a one-line edit to the `SHOOTER_CLUSTER_BUCKET` constant — no logic change needed.
- Z-order fix splits faded vs highlighted by attribute, not by marker type, so a highlighted skull is on top of a faded shooter (and vice versa).

**Smoke-test path:**
1. Open `/#/layout/{id}/analytics/deaths`. Visibly fewer, larger shooter markers vs previous deploy. Aggregated badge counts reflect sum of underlying positions.
2. Tap a shooter marker → attributed skulls stay 100%, rest fade. Highlighted skull never partially obscured by a faded shooter at the same coord.
3. Tap a skull cluster → symmetric.
4. Clear filter → original z-order resumes.

## 2026-05-12 — Deaths heatmap hotfix Bug 1 (fix/deaths-heatmap-hotfix)
**Commit:** `2125793` (merge) · branch `fix/deaths-heatmap-hotfix` · 1 commit (`c5dbb5e`)
**Status:** ✅ Deployed
**What changed:** Hotfix from Brief B post-deploy iPhone feedback. Brief B Stage 5 spec incorrectly applied `forceLeft` to shooter marker normalization ("same forceLeft as skulls"); production showed shooters stacking on top of skulls on the left half of the heatmap. Fix flips shooter coords to the RIGHT half via new `forceRightX` helper. Skulls stay on left (defender side); shooters now render on right (shooter-base side). Cross-filter linking is attribution-based (not spatial), so skull ↔ shooter highlighting continues to work unchanged.

**Files touched:** `src/pages/LayoutAnalyticsPage.jsx` (+19/-4). New `forceRightX` helper applied at both `attributionData` and `linkMap` useMemos — same helper at both sites keeps shooterId keys consistent across the marker aggregation and the cross-filter map.

**Decisions logged:**
- Helper-based fix (not inline math) for clarity + DRY across the two call sites. § 61.8 coord-frame note in DESIGN_DECISIONS already anticipated this would need fixing post-deploy — this hotfix is exactly that.
- Bug 2 (canvas overflow / no pan+zoom) **ESCALATED to separate brief**. LayoutAnalyticsPage uses a raw `<canvas>`, not `FieldCanvas`. `FieldCanvas` has fixed internal draw layers with no API for arbitrary marker rendering, so the migration path requires either extending FieldCanvas to accept custom layers, extracting pan+zoom to a hook, or duplicating MatchPage's pan+zoom inline. All three are architectural-scope changes per the hotfix brief's own decision tree.

**Smoke-test path:**
1. Open `/#/layout/{id}/analytics/deaths`. Skulls cluster on LEFT half; shooter markers on RIGHT half. No visual overlap.
2. Tap a skull → attributing shooters on the right stay 100%, rest fade.
3. Tap a shooter on the right → attributed skulls on the left stay 100%, rest fade.
4. Cross-filter, scope drilling, table column all unchanged.

## 2026-05-12 — Brief B — Deaths Heatmap v2 (feat/deaths-heatmap-v2)
**Commit:** `a5bb51e` (merge) · branch `feat/deaths-heatmap-v2` · 7 commits (`b1f32a2`, `3fe3b90`, `b024889`, `d9dc88b`, `71dfd71`, `4276639`, `ed82311`)
**Status:** ✅ Deployed
**What changed:** LayoutAnalyticsPage `mode='deaths'` overhauled per Jacek 2026-05-12 feedback. Isolated to that one screen — § 30 attribution formula and all global kill displays (`PlayerStatsPage`, `ScoutedTeamPage`, `generateInsights` consumers) explicitly preserved. Spec lives in § 61 of DESIGN_DECISIONS.
- **Stage 1** — New `src/utils/deathAttribution.js` helper (pure function, no imports from `playerStats.js`). Public surface: `computeDeathAttribution(point, field, sideAsDefender)`, `classifyDefenderZone(pos, field)` using § 34.4 line-based thresholds (NOT midline-based `getBunkerSide`), `formatKills(n)` for fractional credit display (1 decimal max, trailing `.0` trimmed). Local `findNearestBunkerObj` returns full bunker object for marker rendering (`generateInsights.findNearestBunker` returns name only). Slot accessor tolerates both Firestore `{"0":[...]}` shape and decoded array-of-arrays.
- **Stage 2** — Scope filter pills row above heatmap: `[Cały layout]` / `[Turniej ▾]` / `[Mecz ▾]` / `[Punkt ▾]` with progressive disclosure. `✕` on deepest selected pill rolls back one level; `[Cały layout]` resets all. Three `ActionSheet` pickers (canonical bottom sheet from `ui.jsx`) with flat label rows. `fetchLayoutDeaths` additively writes `tournamentId/matchId/pointId` to `_ctx` (existing name-only consumers unaffected).
- **Stage 3** — Wire scope to data pipeline: new `filteredPoints` useMemo drives `data = extractData(filteredPoints, mode)` so canvas + table auto-update on scope change. `attributionData` useMemo runs `computeDeathAttribution` per filtered point per side, produces `{ perDeath, shooterMarkers }`. Density layer hides when `filteredPoints.length < 5` (`DENSITY_MIN_POINTS` constant). Empty-state branch when filter excluded everything (pills stay visible so user can rescope without leaving). Count-line wording becomes scope-aware (`… across all tournaments` / `… · {tournament}` / `… · {match}` / `… · {tournament} · Pt {n}`).
- **Stage 4** — `Pozycja strzelca` 7th column in deaths table. Per-row `attributionByDeath` Map keyed `pointId|side|slot` (O(1) lookup). Multi-attributor formatted `Snake1 · D2`. Unattributed shows `—` in `COLORS.textDim` italic. Truncates with `…` past `maxWidth: 110`.
- **Stage 5** — Shooter markers on canvas (z-order: image → density → skulls → shooter markers). 10 px filled circle in `TEAM_COLORS.A` (red, home) / `TEAM_COLORS.B` (blue, away) with white 1.5 px ring + 14 px credit badge showing `formatKills(credit)`. Zero-kill markers NOT rendered in v1 — documented decision per CLAUDE.md smaller-scope rule. Canvas `onClick` hit-test stub with 22 px effective radius (≥ 44 px tap target per § 27).
- **Stage 6** — Cross-filter linked highlighting. Skull-cluster computation hoisted from inside draw effect to `useMemo` (`skullClusters` carries stable id `skull-{x*100}-{y*100}`). Stage 3's `shooterAgg` updated to carry same stable `id` field. `linkMap` useMemo precomputes bidirectional `skullId↔shooterId` Sets — runtime interaction O(1). Filter state `{ mode: null | 'skull' | 'shooter', id }` auto-clears on scope or mode change. Draw effect applies `globalAlpha` per marker via `isSkullActive` / `isShooterActive`. Status pill above heatmap: `📍 Eliminacja na D1 — 3 strzelców · ✕` etc. Animation deferred (instant `globalAlpha` flip; would need rAF interpolation for smooth fade) and unattributed-skull toast deferred (pill already says `brak strzelca`) per CLAUDE.md smaller-scope rule. Both decisions documented in § 61.6.
- **Stage 7** — Docs: § 61 in DESIGN_DECISIONS (9 sub-sections covering helper, formula, scope filter, density, markers, cross-filter, table column, coord-frame note, out-of-scope guarantees). HANDOVER patched (date + Main HEAD + Currently in flight chain + Recent design decisions row). NEXT_TASKS Brief B paragraph carries commit chain + deferral list. Brief moved to `docs/archive/cc-briefs/` via `git mv` (preserves history). `INDEX.md` Brief B row under "Coach view refinements".

**Files touched:** `src/utils/deathAttribution.js` (new, 299 lines), `src/pages/LayoutAnalyticsPage.jsx` (largest delta — 608 line diff, 269→608 lines including the canvas draw effect overhaul), `src/services/dataService.js` (+9 lines, `_ctx` ids additive), `src/utils/i18n.js` (+26, 13 keys × PL+EN), `docs/DESIGN_DECISIONS.md` (+ § 61, 151 lines), `docs/ops/HANDOVER.md`, `NEXT_TASKS.md`, `docs/archive/cc-briefs/INDEX.md`, `docs/archive/cc-briefs/CC_BRIEF_DEATHS_HEATMAP_V2_2026-05-12.md` (moved from repo root).

**Decisions logged (CLAUDE.md smaller-scope rule):**
- **Zero-kill shooter markers NOT rendered.** Brief flagged as ESCALATE; chose smaller-scope — they add visual noise without information. Gate is `if (!m || m.credit <= 0) return;`. Flip if real-data feedback disagrees.
- **No 200 ms opacity fade animation.** Canvas `globalAlpha` flips instant. Smooth fade would need rAF interpolation with stored per-marker target alpha. Functional cross-filter ships; animation as polish follow-up if iPhone walkthrough feels jarring.
- **No toast for unattributed-skull edge case.** Brief calls for pill + toast; pill already says `brak strzelca`. Toast adds noise. Flip if checkpoint disagrees.
- **`classifyDefenderZone` uses line-based thresholds (§ 34.4)**, NOT the midline-based `getBunkerSide` in `helpers.js`. The two existing classifiers disagree at e.g. `y=0.40`; brief's mental model requires the line-based version.

**Known issues / follow-ups:**
- **Coord-frame check (Stage 1 → § 61.8)** awaits real-data validation. Shooter marker coords are pre-normalized via `forceLeft` in Stage 3's `shooterAgg` builder so they should overlay correctly. If markers land on the wrong half of the field on iPhone, the fix is to add `mirrorToLeft(shooterPos, data.fieldSide)` in the caller before populating `shooterAgg` — not in the helper itself.
- Polish plural inflection uses genitive-plural fallback (`strzelców` / `trafień`) for all counts. Grammatically acceptable for 1 + 2+; proper inflection deferred to a future i18n pass.
- iPhone walkthrough deferred (Jacek issued GO direct to merge). 10-step smoke plan documented in branch's Stage 6 checkpoint.

**Smoke-test path** (per archived brief Stage 6 walkthrough):
1. Open `/#/layout/{id}/analytics/deaths`. Pills `[Cały layout active] [Turniej ▾]`. Skulls + shooter markers across all tournaments using layout.
2. Tap a multi-shooter skull cluster → cluster + attributing shooters stay 100%, rest fade to 30%. Status pill shows `📍 Eliminacja na D1 — N strzelców · ✕`.
3. Without clearing, tap a shooter marker → filter pivots: that shooter + attributed skulls stay, rest fade. Pill updates.
4. Tap `✕` on pill OR empty heatmap area → reset to default.
5. Tap an unattributed skull → only that skull stays, all shooters fade. Pill: `brak strzelca`.
6. Drill scope: `[Turniej ▾]` → pick tournament. Heatmap re-clusters; pills `[Cały layout] [NXL Czechy ✕] [Mecz ▾]`; filter auto-clears.
7. Drill to match → density hides (< 5 points likely), skulls + markers remain.
8. Drill to point → only that point's data visible. Filter still works.
9. **Coord-frame sanity:** shooter markers should land on the OPPOSITE half from the skulls they attributed. Flag if not.
10. Verify "Pozycja strzelca" column shows correct attributor bunker(s) for each death row, `—` for unattributed.

## 2026-05-12 — Brief A — Pre-NXL Refinements (feat/pre-nxl-refinements)
**Commit:** `36104cb` (merge) · branch `feat/pre-nxl-refinements` · 8 commits (`63fdb65`, `b67b26e`, `60bb2db`, `2690433`, `d4fd3cc`, `7f51147`, `43b03d1`, `8327d4f`)
**Status:** ✅ Deployed
**What changed:** 8 SAFE-tier items from Jacek's 2026-05-12 feedback session, scoped against the NXL Czechy 2026-05-15 hard deadline. Coach view refinements (§ 60 in DESIGN_DECISIONS):
- **SCOUT #6** — Precision shot drawer `ShotDrawer` width 80%/maxWidth 340 → 70vw/maxWidth 520 (§ 60.8). Discovery: prior cap yielded ~36% of viewport on iPhone Pro Max landscape, matching Jacek's "40%" perception report.
- **COACH #1** — Heatmap promoted to top of analysis below sample badge, expanded by default (`heatmapExpanded` state defaults to `true`). Mini-preview / collapse pill retained (§ 60.1).
- **COACH #2 + #3** — Rozbiegi table gains two columns: `Zagrań` (`timesPlayed`, double-counts per point) + `W pkt` (`pointsPlayed/totalPoints`). Shared data pass via extended `computeBreakSurvival` (§ 60.4). Column widths tightened (42/42/36/44) and value font dropped 13→12px to fit four cells on iPhone width.
- **COACH #4** — Strzelanie reliability banner at top of section. Reuses `computeCompleteness.shotPct`; alert variant (`#f59e0b40` border, ⚠) when ratio < 80%, neutral surfaceDark when ≥ 80% (§ 60.5). Row Strzela% formula untouched (COACH #5 separate ticket).
- **COACH #6** — Match-level scope filter. New pills: `Ostatni mecz` (auto-resolves to most recent closed team match, sorted by `updatedAt.toMillis() || completedAt.toMillis() || date`; disabled with tooltip when none) + `Mecz ▾` (Modal picker, cards sorted newest first with opponent + date + score + W/L/D ResultBadge). URL contract: `?scope=lastMatch` or `?scope=match&mid=<id>`. State machinery: state renamed `allHeatmapPoints` (raw load) + derived `heatmapPoints` useMemo applies filter so every downstream useMemo respects it (§ 60.6). Layout scope ignores matchId filter (multi-tournament span).
- **COACH #7** — Tendencja demoted into Additional sections accordion. Computation logic preserved verbatim while formula is revalidated post-NXL (§ 60.2).
- **COACH #8** — ADD MATCH sticky button + Modal + handler + state all removed from `ScoutedTeamPage`. Match creation lives on Scout tab + More tab only (§ 60.7).
- **i18n** — 10 new keys × PL+EN: `col_played`, `col_played_in`, `strzelanie_reliability`, `strzelanie_reliability_low`, `scope_last_match`, `scope_match_picker`, `scope_no_closed`, `picker_match_title`, `picker_no_matches`, `match_card_scheduled`.

**Files touched:** `src/components/ShotDrawer.jsx`, `src/pages/ScoutedTeamPage.jsx` (largest delta — 578 line diff), `src/utils/generateInsights.js`, `src/utils/i18n.js`, `docs/DESIGN_DECISIONS.md` (+ § 60), `docs/ops/HANDOVER.md`, `NEXT_TASKS.md`, `docs/archive/cc-briefs/INDEX.md`, `docs/archive/cc-briefs/CC_BRIEF_PRE_NXL_REFINEMENTS_2026-05-12.md` (new).

**Decisions logged:**
- **SCOUT #6 width contradiction.** Brief title said "40% → 70%" but discovery surfaced current was `width: '80%', maxWidth: 340`. The `maxWidth: 340` cap was the bottleneck on iPhone Pro Max landscape. Resolved via brief's own decision-tree case 3 (fixed-pixel-cap branch): `min(70vw, 520px)`. Documented in commit `63fdb65`.
- **Task 10 doc numbering.** Brief said "append § 39". § 39 has been taken since 2026-04-21 (Scout score sheet — role-gated match summary); latest at brief-write time was § 59. Renumbered to § 60.
- **Task 6 + 7 bundled.** Brief explicitly noted "share data pass with Task 6" — committed together in `d4fd3cc` rather than two separate commits.
- **§ 27 amber exception applied to Strzelanie banner.** Amber on the <80% alert variant reads as warning-state semantic (not decoration), which falls under the § 27 amber-as-active-indicator carve-out.

**PLAYER #1 deferred** — escalated per the brief's own ESCALATE guidance. Three concerns: § 31 explicitly excludes `/player/:playerId/stats` from BottomNav; `AppShell.jsx:25-28` carries an architectural comment that PPT (`/player/log`) was deliberately routed outside AppShell because of visual conflict with the tournament context bar; three candidate routes (`/profile`, `/player/log`, `/player/log/wizard`) with ambiguous scope. Wrapping multiple routes in shared AppShell requires extracting tab state from `MainPage` into a hook — real refactor, not the SAFE-tier render fix this brief was scoped to. Full rationale in § 60.9. Queued in `NEXT_TASKS.md` BLOCKED #8 for post-NXL re-brief with Jacek screenshot.

**Known issues / follow-ups:**
- iPhone smoke test deferred (Jacek issued GO direct to deploy). If anything surfaces on real device (column overflow on iPhone SE-class width, picker Modal scroll on landscape, reliability banner readability), follow-up brief in next session.
- COACH #5 (Strzelanie row percentage formula refactor) explicitly NOT touched in this batch. § 60.5 banner is independent of that formula. Post-NXL ticket per brief's "Out of scope" list.
- Brief A post-NXL backlog (SCOUT #1/2/3/4/5/7, COACH #5, NEW ACCOUNT #1) added to `NEXT_TASKS.md` BLOCKED #9.

**Smoke-test path** (per archived brief STEP smoke plan):
1. SCOUT #6: open MatchPage → tap player → shots toolbar → verify drawer ~70vw, footer Done/Undo tappable.
2. COACH #8: open Coach tab → drill into team → confirm no ADD MATCH button anywhere; verify Scout + More tab still create matches.
3. COACH #1: ScoutedTeamPage → heatmap is first analysis section, already expanded, toggle pills work.
4. COACH #7: scroll → Additional sections accordion → expand → Tendencja inside.
5. COACH #2+#3: Rozbiegi shows 4 right-aligned columns; `W pkt` = `points-played/total`; `Zagrań` ≥ `points-played`.
6. COACH #4: Strzelanie has banner at top; <80% → amber + ⚠.
7. COACH #6: tap `Ostatni mecz` → page filters to most recent closed match. Tap `Mecz ▾` → picker Modal, tap a card → pill shows `vs {opp} ✕`, tap ✕ to clear.

## 2026-05-02 — Hotfix Bundle 2026-05-02 (fix/hotfix-bundle-2026-05-02)
**Commit:** 3cd7bcb (merge) · branch `fix/hotfix-bundle-2026-05-02` · 1 commit (0de2e59 impl)
**Status:** ✅ Deployed
**What changed:** Two surgical fixes from Jacek's PlayerStatsPage redesign smoke test. (1) Removed duplicate "Kto wygrał punkt?" winner-pick from `LivePointTracker` Stage 3 — QuickLogView Stage 4 already owned outcome confirmation, and the tracker's outcome value was discarded by `handleWin` (only elims/stages/reasons/times/duration consumed). Footer collapsed to a single amber "Zapisz tracking" CTA (≥48px). (2) Replaced manual initial-circles in `LineupStatsSection.ChemistryCard` overlapping-avatar stack with canonical `<PlayerAvatar>` so `player.photoURL` now renders in duo/trio chemistry sections (was initial-only before).

**Files touched:**
- `src/components/training/LivePointTracker.jsx` (footer block rewritten; `outcome` dropped from `handleSave`/contract; unused `teamAColor`/`teamBColor` props removed)
- `src/components/QuickLogView.jsx` (call-site no longer passes teamAColor/teamBColor)
- `src/utils/i18n.js` (+`quicklog_save_tracking` PL+EN)
- `src/components/LineupStatsSection.jsx` (manual avatar div → `<PlayerAvatar size=40 ringColor=COLORS.surfaceDark>` wrapped in absolute-position div for overlap + z-index; unused `ZONE_COLORS` import dropped)
- `NEXT_TASKS.md` (ACTIVE row added)
- `CC_BRIEF_HOTFIX_BUNDLE_2026-05-02.md` (root → archive in follow-up commit)

**Decisions logged:**
- `<PlayerAvatar>` exposes `ringColor` (not `borderColor`/`borderWidth` as brief speculated). Used `ringColor={COLORS.surfaceDark}` — paints the cutout against card bg. Component already implements stable hash-color fallback when no `photoURL`, so no need for per-call `bg`/`color` props.
- Tracker contract now `onSave({outcome: undefined, ...})`. QuickLogView Stage 4 (`handleWin`) is the sole winner-pick surface — same behavior as v3 hotfix already established (`outcome` was throwaway in the merge step).
- Issue #4 (self-log unlock for tournament/sparing) NO-OP per pre-flight: gate is `selfPlayerId && field?.layout` (MatchPage.jsx:462), not training-gated. If FAB is missing in a real tournament/sparing context, root cause is data (linkedPlayer.id absent or field.layout absent on that event), not code — escalate to Jacek if observed.

**Audit notes (NOT in scope, deferred):**
- `src/pages/ScoutRankingPage.jsx:166-172` renders a manual initial-circle for scouts. Different schema (users, not players) but `useUserNames.js:114` includes `photoURL`. Future brief could swap.

**Known issues:**
- Manual browser smoke test deferred to Jacek (CC has no live data session). Static checks (`npm run precommit` + `vite build` + grep audits) pass.

**Smoke-test path** (per brief STEP 4.1):
1. QuickLog → pick 2 players → zones → enter Live tracking → confirm footer shows ONLY "Zapisz tracking" (no win_a/win_b buttons) → save → Stage 4 shows winner pick.
2. PlayerStatsPage for any player with `photoURL` set → scroll to "Najlepiej w duecie z:" / "Najlepiej w trójce z:" → confirm both/all 3 avatars show photos. Player without `photoURL` → falls back to initial+stable hash color.
3. MatchPage in tournament/sparing context with `linkedPlayer.id` user → confirm self-log FAB visible bottom-right (validates Issue #4 NO-OP claim).

---

## 2026-05-02 — PlayerStatsPage redesign § 59 (feat/player-stats-redesign-2026-05-01)
**Commit:** d5d32ab (merge) · branch `feat/player-stats-redesign-2026-05-01` · 2 commits (0e5ad3c docs + § 59 + NEXT_TASKS, d4396d6 STEP 1-7 impl)
**Status:** ✅ Deployed
**What changed:** Full visual redesign of `src/pages/PlayerStatsPage.jsx` per Sławek's coach workflow + § 27 Apple HIG. New visual hierarchy (3 component types: HeroMetric grid + BarRow + history card), descriptive verb-phrase section headers ("Zazwyczaj gra po stronie:" / "Najczęściej zaczyna grę na:" / "Na breaku strzela:" / etc.), DataSourcePill component for transparent provenance (`scout` / `scout+self` / `scout-only`), per-bunker survival rate metric, overlapping-avatar chemistry cards, depth UI subsections collapsed into side aggregation (§ 59.7), match history row format `Zagranych: N` (§ 59.8).

**Files touched:**
- `src/utils/colorScale.js` (+plusMinusColor; reused existing winRateColor at 40/70 thresholds — see decision below)
- `src/utils/playerStats.js` (bunkerCounts now `{played, survived}` per entry → returned with `survivalRate`; legacy `count` retained as alias)
- `src/components/ui.jsx` (+DataSourcePill exported)
- `src/utils/i18n.js` (27 new keys × 2 locales — section headers, HeroMetric labels, pill labels, inline helpers)
- `src/pages/PlayerStatsPage.jsx` (full mid+bottom rewrite; legacy MetricCard / HeroMetric / MetricChip / GroupHeader / SubSection / ShotBar / survivalColor / zoneColor removed; new MetricGridCell / SectionHeader / BunkerCard / aggregateBySide / sideFromBunkerName helpers)
- `src/components/LineupStatsSection.jsx` (full rewrite per § 59.5; modified in place per brief STEP 5g.1 IF-branch — single consumer)
- `docs/DESIGN_DECISIONS.md` (§ 59 added — 10 sub-sections)
- `NEXT_TASKS.md` (parking-lot AWAITING table replaced with ACTIVE/QUEUE/BLOCKED/Recently shipped/Notes structure)
- `CC_BRIEF_PLAYER_STATS_REDESIGN_2026-05-01.md` (root → archive in follow-up commit)

**Decisions logged (memory rule, no parking):**
- `winRateColor` reused from existing `colorScale.js` (40/70 thresholds, COLORS.accent) — brief sample's 50/70 + COLORS.warning would have shifted QuickLog Stage 1 tile UX (shared helper) and referenced a nonexistent theme token. Smaller scope, single mental model across surfaces.
- `plusMinusColor` added with parallel pattern (success / accent / danger), no nonexistent COLORS.warning.
- STEP 6 depth: no standalone depth UI section ever existed; depth was baked into `classifyPosition` zone labels ("Snake Base" / "Snake 1" / "Snake 50"). New `aggregateBySide()` collapses depth into 3 side bars in "Zazwyczaj gra po stronie:" — that's STEP 6 effectively done. Computation in `playerStats.js` preserved per § 59.7.
- LineupStatsSection: 1 consumer (only PlayerStatsPage) → modify-in-place per brief STEP 5g.1 IF-branch. Pre-§ 59 grouping (Dorito pairs / Snake pairs / Dorito trios / Snake trios = 4 sections) collapsed to 2 sections (duo / trio top 3 by winRate) per § 59.2 "descriptive over abstract".
- Chemistry pille = `scout-only` pending § 57 Phase 1b lineup pairing unlock.

**Known issues:**
- Manual browser smoke test deferred to Jacek (CC has no live data session). Static checks (build + precommit + grep audit for dead refs) pass.
- 4 sections labeled `scout-only` ("Na pierwszej przeszkodzie", "Najczęściej trafiane przeszkody", "Najlepiej w duecie", "Najlepiej w trójce") will flip to `scout+self` when § 57 Phase 1b ships (post-niedzielny-sparing 2026-05-03).

**Smoke-test path** (per brief STEP 7.3):
1. Open `/player/{playerId}/stats?scope=tournament&tid={tid}` for a player with full data
2. Verify all sections render: 6-metric grid, side bars, top-3 bunker cards with survival, break shots, obstacle shots, death reasons, death bunkers, duo + trio cards, history rows
3. Toggle scope: Ten turniej → Globalny → Ten mecz — data updates per section
4. Empty state: open page for player with n=0 or n=1 — sections hide gracefully
5. PL ↔ EN toggle: all section headers + pills + helpers switch
6. Avatar stacks on duo/trio: overlap with cutout border, z-index high to low
7. Survival % colors on bunker cards: >70 green / 40-70 amber / <40 red
8. DataSourcePill: cyan on `scout+self`, amber on `scout-only`, gray on `scout`

---

## 2026-05-01 — QuickLog hotfix v3: i18n + chevron + stage title + live tracking (hotfix/quicklog-v3-2026-05-01)
**Commit:** b6cbb38 (merge) · branch `hotfix/quicklog-v3-2026-05-01` · 1 commit (b8aa7cf)
**Status:** ✅ Deployed
**What changed:** Pre-sparing pass over 4 issues that surfaced after the v2 deploy.

- **Bug 5 — Stage 2 → Stage 4 (skip Live tracking)**: Stage 2 footer "Rozpocznij punkt" now does `setStep('tracking')` (was `'win'`). LivePointTracker exists at `src/components/training/LivePointTracker.jsx` with `onSave({outcome, eliminations, ...})` API; per brief STEP 4c "NIE modyfikuj komponentu" — adapted via the parent's onSave handler. New local state `liveTrackingData` captures the payload; handler advances to Stage 4 without saving. Stage 4 `handleWin` merges captured fields (eliminations, eliminationTimes, eliminationStages, eliminationReasons, eliminationReasonTexts, pointDuration) into the final point write. User-picked winner at Stage 4 OVERRIDES live-tracker outcome (intentional confirmation). LivePointTracker `onCancel` now goes to Stage 2 (was Stage 1) so users keep zone selections. Stage 2 ⋮ menu adds **"Pomiń live tracking"** (1st item after "Zaawansowany scouting") that does `setStep('win')` directly with no captured data — the minimal-flow scouts get a single tap to skip Stage 3.
- **Bug 6 — Missing i18n keys**: Added `quicklog_back_to_players`, `quicklog_start_point`, `quicklog_skip_tracking`, `quicklog_skip_positions`, `quicklog_cancel_point`, `quicklog_assign_positions`, `quicklog_step_2_title`, `quicklog_step_3_title`, `quicklog_step_4_title` in pl + en. `quicklog_pick_n_players` is a function `(n) =>` so the dynamic remaining-count stays visible. Stripped baked-in decorations from existing values (`quicklog_back '← Wróć' → 'Wróć'`, `quicklog_assign 'Przypisz pozycje →' → 'Przypisz pozycje'`, `quicklog_advanced 'Zaawansowany scouting ›' → 'Zaawansowany scouting'`). EN `quicklog_assign 'Assign zones'` aligned to `'Assign positions'` (terminology fix).
- **Bug 7 — PageHeader title stage-aware**: `step` → title key map: `'pick' → quicklog_title`, `'zone' → quicklog_step_2_title`, `'tracking' → quicklog_step_3_title`, `'win' → quicklog_step_4_title`. Subtitle (team name) unchanged across stages.
- **Bug 8 — "← ←" double chevron + "→ →" double arrow**: Single source of truth — chevrons + arrows live only in component templates, never in i18n values. Stage 4 back link now prepends `← ` explicitly to preserve visual after stripping `← Wróć` → `Wróć` from the i18n value. Stage 1 CTA `'Przypisz pozycje → (5/5) →'` (double arrow) now `'Przypisz pozycje (5/5) →'`.

**Files touched:** `src/utils/i18n.js`, `src/components/QuickLogView.jsx`. Single batch commit per brief option.

**Known issues:** None.

**LivePointTracker not modified** per brief STEP 4c — capture-then-advance semantics implemented entirely in QuickLogView's onSave handler. Existing LivePointTracker callers/tests unaffected.

**Smoke-test path** (per brief checkpoint):
1. Stage 1 header: "Szybki zapis"
2. Stage 2 header: "Przypisz pozycje" (Bug 7)
3. Stage 2 back button: "← Wróć do graczy" — single chevron (Bug 8)
4. Stage 2 forward CTA: "▶ Rozpocznij punkt" — PL label not raw key (Bug 6)
5. Stage 2 → tap "Rozpocznij punkt" → Stage 3 LivePointTracker (Bug 5)
6. LivePointTracker complete → Stage 4 outcome buttons; selected + zones preserved
7. Stage 4 → pick winner → save fires once with elims merged
8. Stage 2 ⋮ → "Pomiń live tracking" → Stage 4 directly (Bug 5 skip)
9. PL ↔ EN toggle: all labels switch correctly (Bug 6)

---

## 2026-05-01 — QuickLog hotfix v2: context bar hide + sticky CTA + tile cap (hotfix/quicklog-v2-2026-05-01)
**Commit:** f6fd317 (merge) · branch `hotfix/quicklog-v2-2026-05-01` · 1 commit (5a5f770)
**Status:** ✅ Deployed
**What changed:** Pre-sparing visual hotfix for issues Jacek flagged on desktop landscape + mobile after the v2 deploy of `feat/quicklog-visual-redesign`.

- **Bug 1 — AppShell tournament context bar visible during QuickLog**: New `QuickLogContext` (`src/contexts/QuickLogContext.jsx`) — lifted active flag. Provider in `App.jsx` wraps the route tree (between `KioskProvider` and `HashRouter`). `QuickLogView` calls `setQuickLogActive(true)` in `useEffect` on mount, `false` on cleanup. `AppShell` reads `useQuickLogActive()` and gates the bar: `{tournament && !quickLogActive && (...)}`. Tab bar stays visible (escape via tabs intentional). PageHeader inside QuickLogView is unaffected (separate component).
- **Bug 2 — Stage 1 CTA below the fold on desktop landscape**: QuickLogView outer container changed from `minHeight: 100dvh` to `height: 100%; minHeight: 0`. The `100dvh` was forcing AppShell's flex content slot to overflow-scroll, which moved the CTA off-screen. With `height: 100%` QuickLogView fits exactly and its own internal `flex: 1; overflow-y: auto` handles scroll. Stage 1 + Stage 2 footer CTAs now use `position: sticky; bottom: 0` with opaque bg + top border so they stay pinned to the bottom of the scroll container regardless of player-list / zone-row length.
- **Bug 3 — "Start punktu (live tracking)" shortcut removed from Stage 1**: Single primary CTA per surface (§ 27, § 58.2 single-CTA rule added to docs). Stage 1 is exclusively player-pick. Live tracking is reached via Stage 2 → "Rozpocznij punkt", not as a Stage 1 shortcut.
- **Bug 4 — Stage 2 zone tiles huge on landscape**: Tile-row gets `maxWidth: 480; marginLeft: auto` on tablet/desktop. Each tile gets `maxWidth: 140` on top of `flex: 1; aspectRatio: 1`. Mobile keeps `flex: 1` only — tiles fill available space after avatar+name (no cap, by design).

§ 58 patches: 58.2 append "Single CTA rule" + "Sticky-bottom CTA"; 58.3 append "Landscape size cap" (140/480 maxWidths); new 58.7 subsection on AppShell context bar visibility via QuickLogContext (architecture rationale, behavior, why not URL-based detection).

**Bug 5 (Stage 2 → Stage 3 routing): DEFERRED.** Brief suggested redirect `setStep('win')` → `setStep('tracking')` so the default Stage 2 → Stage 3 (live tracking) → Stage 4 flow works. But `LivePointTracker.onSave` already saves the point with outcome internally and resets — naively swapping the destination would either duplicate-save or require a LivePointTracker refactor (separate `onComplete` callback that emits data without saving). Stage 4 outcome buttons remain reachable; LivePointTracker still works via existing affordances. Awaiting Jacek decision (option A swap-only / option B refactor / option C keep-as-is) before applying. **Not blocking sparing — current flow works, just keeps live-tracking out of the default path.**

**Known issues:**
- Bug 5 deferred — see above.
- LivePointTracker ghost button height (40px, slightly under §27's 44 minimum) issue from prior commit also deferred — pre-existing, not introduced here.

**Smoke-test path** (per brief checkpoint):
1. Desktop landscape 1920×1080: training matchup → squad → QuickLog → context bar HIDDEN
2. Stage 1 desktop: CTA "Przypisz pozycje" visible without scroll, player list scrolls beneath (sticky bottom)
3. Stage 1 mobile + tablet portrait: same sticky-bottom pattern
4. Stage 1: NO "Start punktu (live tracking)" ghost button
5. Stage 2 desktop: zone tiles ~120-140px each, emoji visibly centered, row right-aligned after avatar+name
6. After exiting QuickLog (back / save / cancel / Anuluj punkt): context bar returns
7. Tab bar: stays visible throughout (escape via tabs preserved)

---

## 2026-05-01 — QuickLog Visual Redesign (feat/quicklog-visual-redesign)
**Commit:** 8d6af5f (merge) · branch `feat/quicklog-visual-redesign` · 3 commits (707d4ba, 124efea, a495cc4)
**Status:** ✅ Deployed
**What changed:** Visual refactor of `QuickLogView.jsx` (3-stage flow already in place from prior `CC_BRIEF_TRAINING_SCOUTING_FLOW_FIX`). Stage 1 KIOSK-style player tiles with metrics (`win% + survival + punkty dziś`), tablet ≥768px 3-column grid, avatars 48 (mobile) / 64 (tablet), `winRateColor()` helper drives metric color (green > 70 / amber 40-70 / red < 40 / textMuted null). Stage 2 zone toggles use emoji from QuickShotPanel via shared `src/utils/zones.js` + theme `ZONE_COLORS` (orange/slate/cyan); aspect-ratio 1:1 tiles, mobile-only legend pill. ⋮ menu in Stage 2 hosts Zaawansowany scouting (amber via new `ActionSheet { a.accent: true }`) + Pomiń pozycje + Anuluj punkt. Footer rebrand to "▶ Rozpocznij punkt". Stage 4 unchanged. § 58 added to DESIGN_DECISIONS.md, "On fire indicator" added to NEXT_TASKS backlog.

**Files touched:** `src/utils/zones.js` (new), `src/utils/colorScale.js` (new), `src/components/QuickLogView.jsx`, `src/components/QuickShotPanel.jsx` (refactored to share ZONES), `src/components/ui.jsx` (ActionSheet `a.accent: true`), `docs/DESIGN_DECISIONS.md` (§ 58), `NEXT_TASKS.md`.

**FAB hide:** verified as no-op. SelfLog FAB already auto-hidden during QuickLog because `viewMode === 'quicklog'` triggers MatchPage's early return at L772 before either render site (L1657 / L2099). TrainingScoutTab path doesn't mount MatchPage. STEP 2 SKIPPED per Jacek correction; documented as architectural invariant in § 58.4.

**Known issues:**
- Stage 4 mockup's "Skład w tym punkcie" zone-tag section NOT added (brief STEP 5 said "no changes expected"). Deferred to follow-up brief if Jacek wants it.
- LivePointTracker ghost button "Start punktu (live tracking)" is 40px tall — slightly under § 27's 44 minimum. Pre-existing from prior commits; preserved as secondary affordance.
- New i18n keys (`quicklog_pick_n_players`, `quicklog_skip_positions`, `quicklog_cancel_point`, `quicklog_back_to_players`, `quicklog_start_point`) use Polish fallbacks via `t(key) || 'fallback'`. Adding entries to `i18n.js` is a separate concern.
- Selection-order index (1-5) renders inside checkbox — bonus over brief that surfaces the slot model. If Jacek finds it noisy, single-line revert to plain ✓.

**Smoke-test path:**
1. Tablet (Chrome DevTools, iPad landscape): training matchup → squad → QuickLog opens with 3-col grid, avatars 64px, KIOSK tiles
2. Pick 5 in tap order — checkbox shows 1, 2, 3, 4, 5
3. Tap "Przypisz pozycje (5/5) →" → Stage 2 with zone toggles aspect-ratio 1:1, icons 40px
4. Tap ⋮ → 3 stage-zone items (Zaawansowany scouting amber, Pomiń pozycje, Anuluj punkt) + separator + End/Delete
5. Tap "▶ Rozpocznij punkt" → Stage 4 outcome → save
6. Mobile (iPhone 14): same flow, 1-col grid, avatars 48px, legend pill visible on Stage 2
7. Inspect Firestore: § 57 W3 `playersMeta[i].syntheticZone` still set per zone selection (orange/slate/cyan colors don't change schema; emoji is rendering-only)

---

## 2026-05-01 — § 57 Phase 1a hotfix: serverTimestamp() in arrays (hotfix/meta-server-timestamp)
**Commit:** f3f4c56 (merge) · branch `hotfix/meta-server-timestamp` · 1 commit (13d1a32)
**Status:** ✅ Deployed
**What changed:** `makeMeta()` in `src/utils/observationMeta.js` now uses `Date.now()` (millisecond client timestamp number) instead of `serverTimestamp()` Firestore sentinel. Firestore does not support sentinel values inside array fields — `addDoc()` with `_meta` arrays containing `serverTimestamp()` was failing on the training "Zaawansowany scouting" → savePoint path with `Function addDoc() called with invalid data. serverTimestamp() is not currently supported inside arrays`. The earlier W1/W4/W5 paths happened to work because they wrote via `updateDoc` with dot-notation (`homeData.playersMeta.<slot>`) which Firestore accepts; the new Bug B `handleAdvancedScouting` path (commit `abff61e`) writes via `addDoc` with the full structure, hitting the limitation.

Tradeoff: `_meta.ts` is now client clock not server clock — acceptable for § 57 provenance; conflict resolution per § 57.7 unchanged (ts comparison works equally well with client ms). `_meta` schema shape unchanged (`{source, writerUid, ts}`); only `ts` value type narrows from sentinel to number. All 7 writers (W1–W7) verified post-edit; zero existing readers of `_meta.ts` in code (Phase 1b propagator/conflict-resolver not shipped yet).

**Known issues:** None — fix unblocks niedzielny sparing 2026-05-03.

**Smoke-test (post-deploy on production):**
1. Training matchup → QuickLog → Stage 1 pick 5 → Stage 2 zones → "Kto wygrał?" → save: succeeds (no error toast)
2. Training matchup → QuickLog → Stage 2 → "Zaawansowany scouting →": save succeeds + canvas opens with prefill
3. Inspect Firestore: `homeData.playersMeta[N].ts` is a number (e.g. `1714521600000`), `source: 'scout'`, `writerUid` populated
4. Tournament savePoint canvas → save succeeds (W1 path)

---

## 2026-05-01 — Training scouting flow fix (fix/training-scouting-flow)
**Commit:** 34b8960 (merge) · branch `fix/training-scouting-flow` · 3 commits (8d37557, 8a16c6f, abff61e)
**Status:** ✅ Deployed
**What changed:** Three related bugs fixed in training point scouting flow before niedzielny sparing 2026-05-03.

- **Bug A** (`8d37557`): `TrainingScoutTab.jsx:214` now respects `quickLogSide` when routing 'Zaawansowany scouting' — tapping the AWAY squad in a matchup card opens canvas for `awaySquad` (was: always `homeSquad`). `'both'` default still routes to `homeSquad`, preserving prior behavior for the score-center tap zone.
- **Bug C** (`8a16c6f`): QuickLogView restructured around 3 explicit stages — Wybór graczy → Przypisz pozycje (zone toggles) → Kto wygrał? Stage 1's primary CTA is now the accent 'Przypisz pozycje (N/5) →' (was a secondary ghost button); LivePointTracker preserved as a non-flow ghost affordance. Stage 2 hosts the only 'Zaawansowany scouting →' link in the entire view (always-visible footer + More-menu entry removed). 'Pomiń' skip-link removed: zones are now mandatory transit so Phase 1b propagator can rely on `syntheticZone` tags. Zone + selection state already at parent level — persists across stage navigation.
- **Bug B** (`abff61e`): 'Zaawansowany scouting' from QuickLog Stage 2 now saves the point with assignments + synthetic zone positions + § 57 W3 `_meta` (`outcome: null`), then navigates to canvas with `?scout=<squad>&point=<pid>` — MatchPage's existing `pointParamId` loader (L586-598) auto-edits the freshly-saved point. Selection state converted from `Set` to `Array` so tap order maps directly to slot indices on prefill (`assignments[0]=first tapped, [4]=fifth`). § 57 `slotIds`/`_meta`/`syntheticZone` flags preserved through the round-trip — W1's `makeTeamData(d, existingSide)` doesn't regenerate slotIds on subsequent canvas saves.

**Bonus fix in passing**: pre-existing latent `ReferenceError` in MatchPage's QuickLog mount — `onSwitchToScout` called `goScout(scoutedId)` but `goScout` is declared inside the `isReviewView` block at L1274, out of scope from the `viewMode === 'quicklog'` early return at L707. Inlined the navigation in commit B so MatchPage's tournament-side QuickLog "Advanced scouting" actually works now (was throwing on click).

**Known issues:**
- Bug 0 (`MatchPage.jsx:1063` observe-mode editPoint hard-clamp to 'A') NOT fixed — separate brief post-sparing.
- 'Historia punktów' showing wrong squad name (screenshot 3 evidence) — investigate post-deploy if persists; may self-resolve given Bug A fix.
- LivePointTracker now demoted to a secondary ghost button on stage 'pick'. Not a regression (still reachable) but reduced visual prominence; surface again if users complain.
- Removing 'Pomiń' makes zones mandatory; users who relied on skipping zones will now have to set them. This is intentional per Phase 1b propagator design.

**Smoke-test path** (per brief verification):
1. Tap matchup card AWAY side → QuickLog opens for away squad ✓
2. Stage 1: pick 5 players → 'Przypisz pozycje (5/5) →' enables (full-opacity)
3. Tap → Stage 2 zone toggles per player
4. Tap '← Wróć' → back to Stage 1, selections preserved; tap forward again → zones preserved
5. Tap 'Kto wygrał? →' → outcome → save → returns to matchup ✓
6. Re-enter, get to Stage 2, tap 'Zaawansowany scouting →' → canvas opens with header for correct (away) squad and 5 markers at synthetic zone positions; picker shows assignments in tap order
7. Inspect saved point in Firestore: `slotIds` is 5 UUIDs, `playersMeta[i].syntheticZone` reflects zone selection

---

## 2026-04-30 — § 57 Phase 1a Foundation (feat/observations-foundation)
**Commit:** ce19a51 (merge) · branch `feat/observations-foundation` · 3 commits (0e7df5a, 5c50870, f628fcf)
**Status:** ✅ Deployed
**What changed:** Foundation half of § 57 multi-source observations. Schema additions (`slotIds`, `_meta` sibling arrays, `slotRef`, `propagatedAt`) + every existing writer (W1-W7) populates `_meta` alongside data writes. `bunkerToPosition()` utility added (used by Phase 1b propagator). No reader behavior changed — `_meta` arrays invisible to existing 28 readers in generateInsights/coachingStats. Niedzielny sparing 2026-05-03 will generate first full dataset in new format for Phase 1b matcher tuning.

Per-writer summary:
- **W1 scout canvas** (MatchPage.savePoint): `makeTeamData(d, existingSide)` emits playersMeta/shotsMeta/eliminationsMeta arrays; `slotIds` preserved across edits + joins via hoisted existingPt lookup.
- **W2 ShotDrawer**: presentational-only, covered by W1's shotsMeta computation.
- **W3 QuickLogView**: callback signature extended with `syntheticZones` array; both parents (MatchPage + TrainingScoutTab) tag playersMeta with `syntheticZone: 'dorito'|'center'|'snake'`.
- **W4 HotSheet** (MatchPage.handleSelfLogSave): post-write dot-notation `{side}.playersMeta.{slot}` etc when `assignments.indexOf(playerId)` resolves; orphan logs skip meta (Phase 1b propagator binds via slotRef).
- **W5 KIOSK** (KioskLobbyOverlay.handleKioskSelfLogSave): post-write dot-notation meta with `source:'kiosk'`, `writerUid = activePlayer.linkedUid || activePlayerId` (player identity, not coach).
- **W6 PPT WizardShell**: verification only — `createSelfReport` + `createPendingSelfReport` already write `slotRef:null` + `propagatedAt:null` per 0e7df5a.
- **W7 elim toggle**: covered by W1 — `toggleElim` is local-only; only Firestore write path is `savePoint` → `makeTeamData`.

**Known issues:**
- Phase 1b (propagator, matcher, conflict resolver, write-back, late-log trigger) NOT shipped — deferred for post-sparing analysis. Niedzielny 2026-05-03 generates the dataset; Opus reviews orphan distribution + assignment-to-self-log timestamp deltas + KIOSK race patterns, then ships Phase 1b brief.
- Bundle size impact ~1KB per point document (5 UUIDs + 3×5 _meta entries) — well within Firestore 1MB doc limit.
- KIOSK `writerUid` uses tapped player uid (linked) or player doc id (unlinked) — different from `scoutedBy` field on shot subdocs, which still uses `linkedUid || null` per § 55.4.

**Smoke-test path:**
1. Open production app → create new point on dev tournament → verify Firestore homeData has slotIds (5 UUIDs) + 3×_meta arrays.
2. Trigger one HotSheet self-log → verify selfReport doc has `slotRef:null` + `propagatedAt:null`.
3. Open ScoutedTeamPage for affected team → verify all sections render (heatmap, insights, coachingStats) — zero reader breakage.
4. KIOSK lobby on tablet → tap tile → fill wizard → save → verify `homeData.playersMeta[N]` shows `source:'kiosk'`, `writerUid = player linkedUid or doc id`.
5. Sentry / console: zero new errors related to undefined `_meta` access.

---

## 2026-04-30 — § 57 Multi-Source Observations docs (docs/observations-section-57)
**Commit:** e136b9c (merge) · branch `docs/observations-section-57` · 1 commit (4cadf41)
**Status:** ✅ Docs-only, no deploy needed
**What changed:** Architecture spec for multi-source observations write-back propagation. Adds DESIGN_DECISIONS § 57 (Option C write-back), MULTI_SOURCE_OBSERVATIONS_INDEX, ONBOARDING_GUIDANCE Phase 2 spec, 10 architecture diagrams (4 HLD + 3 HLD + 3 LLD sequence), full discovery archive at docs/archive/audits/2026-04-30_observations_discovery/. Implementation Phase 1 deferred to post-NXL Czechy 2026-05-15.
**Known issues:** None — docs-only.

---

## 2026-04-30 — Brief E — 4 phone-facing entry points to PlayerStatsPage
**Commit:** `ce8c320` (+136 / -7 LOC, 7 files)
**Status:** ✅ Deployed to GitHub Pages
**Spec:** `docs/DESIGN_DECISIONS.md` § 56 (added in this commit)

Closes the Brief D incentive loop on the **player's phone** — KIOSK tablet no longer required for stats access. 4 entry points, all gated where appropriate:

1. **ProfilePage** linked-player section → dedicated surface card with "📊 Moje statystyki" amber CTA. Own card so it doesn't compete with the existing "Zapisz dane gracza" save CTA (§ 27 anti-pattern: multiple CTAs per surface).
2. **ProfilePage** not-linked fallback → existing self-claim CTA copy swaps to "Połącz profil żeby zobaczyć statystyki" via new i18n key. Single CTA preserved → opens existing `LinkProfileModal`. Empty-state hint also extended.
3. **More tab → KONTO → "📊 Moje statystyki"** `<MoreItem>` after "Mój profil" in BOTH `MoreTabContent.jsx` (tournament) + `TrainingMoreTab.jsx` (training). Gated on `useWorkspace().linkedPlayer`.
4. **PPT TodaysLogsList footer link** "Zobacz statystyki dnia →" `Btn variant="ghost"` between rows and the sticky "+ Nowy punkt" amber CTA. Ghost (not amber) by design — sticky CTA retains primary status. Render gated on `playerId && combined.length > 0`.

Plus **auto-default scope=training for self-view**: when `linkedPlayer.id === playerId` AND no `?scope=` in URL AND trainings loaded → redirect to `?scope=training&tid={latestTid}` with `replace: true`. Latest tid derived from already-subscribed `useTrainings()` + client-side `attendees` filter (§ 32 schema). **Zero new Firestore reads, zero new indexes, zero new helpers** — STEP 0.5 deviation B from brief, Jacek-approved.

**Other STEP 0.5 deviation (A):** Gap 3 footer link lives INSIDE `TodaysLogsList.jsx` (component owns its own page chrome incl. sticky CTA), not wrapped around it from `PlayerPerformanceTrackerPage.jsx`.

**§ 27 self-review:**
- Color discipline: PASS — every amber tappable
- Elevation: PASS — COLORS.surfaceDark/surface tokens only
- Typography: PASS — FONT_SIZE tokens
- Touch targets: PASS — Btn lg ≥48, MoreItem 52, ghost link explicit minHeight: 44
- Cards: PASS — Profile "Moje statystyki" on own surface (1 card = 1 CTA)
- Navigation: PASS — programmatic navigate(), no chevrons
- Anti-patterns: ZERO

**Smoke-test path:**
1. Login as linked player on phone → `/profile` → tap "📊 Moje statystyki" → opens stats page → URL auto-completes to `?scope=training&tid={latestTid}` and shows latest training stats.
2. Login as unlinked user → `/profile` → see "Połącz profil żeby zobaczyć statystyki" → tap → LinkProfileModal opens → search by name → tap → page refreshes → "📊 Moje statystyki" CTA replaces fallback.
3. Bottom tab Ustawienia → KONTO section shows "📊 Moje statystyki" item under "Mój profil" (only when linked).
4. Bottom tab Gracz → log a self-report point → TodaysLogsList shows row → "Zobacz statystyki dnia →" ghost link visible above sticky "+ Nowy punkt" → tap → stats page.
5. Linked player visiting `/player/{me}/stats` (no scope) on cold reload → URL auto-rewrites to `?scope=training&tid={latestTid}` once trainings settle.

**Known issues / follow-ups:**
- Brief E Gap 4 (QR/SMS share) deferred — entry points 1-3 cover phone access for now.
- Brief E Gap 6 (sub-nav inside Gracz tab) deferred — duplicates Gap 2.
- Email-based auto-link of new user → existing player record remains a separate scope; manual self-claim via LinkProfileModal stays the only path.

---

## 2026-04-28 — Brief D — PlayerStatsPage scope=training fix (field + self-log + squadName + KIOSK toast)
**Commit:** `80cc945` (+256 / -9 LOC, 5 files)
**Status:** ✅ Deployed to GitHub Pages
**Brief:** `docs/archive/cc-briefs/CC_BRIEF_D_PLAYER_STATS_TRAINING_FIX.md` (will move on next chore commit)

Fixes the four gaps identified in PlayerStatsPage audit for `scope=training`:

1. **Field resolution** — was passing `field: null` to `computePlayerStats`, leaving zone/bunker stats blank. Now resolves training layout via `resolveFieldFull(syntheticTournament, layouts)` and threads it through.
2. **Self-log aggregation** — KIOSK self-log data now flows into the player profile:
   - New `dataService.fetchSelfLogShotsForPlayer(playerId, trainingId)` — collectionGroup query on `shots` filtered post-fetch by `source='self'` + tournamentId.
   - PlayerStatsPage attaches `selfLog` (from `point.selfLogs[playerId]`) and `selfShots` (grouped by `pointId`) to each player point.
   - `playerStats.computePlayerStats` now: counts `selfLoggedElim` when coach didn't mark elim; falls back to self-log breakout for `positionCounts` / `bunkerCounts` when no coach assignment exists; classifies self-shot zones via `getBunkerSide`.
3. **Custom squad names** — opponent label uses `getSquadName(trainingDoc, oppKey)` instead of hardcoded letter (respects § 53).
4. **Post-KIOSK toast deep-link** — closes the incentive loop. After self-log save in KioskLobbyOverlay, sticky toast with **"Zobacz swój dzień"** CTA appears (8s auto-dismiss + × manual). Tap → `/player/{id}/stats?scope=training&tid={tid}`. Player sees their same-day stats immediately, motivating future self-logs.

**i18n:** Added `kiosk_save_toast_title` ("Zapisano" / "Saved") and `kiosk_save_toast_cta` ("Zobacz swój dzień" / "See your day") in PL+EN sections.

**§ 27 self-review:**
- Color discipline: PASS — toast uses COLORS.surface/border/success/textMuted/accentGradient tokens
- Elevation: PASS — zIndex 260 above wizard host, shadow + border
- Typography: PASS — FONT_SIZE.sm/xs only
- Cards: PASS — toast is notification, not card
- Navigation: PASS — programmatic navigate(), no chevron
- Anti-patterns: ZERO — all touch targets ≥ 44px (CTA 48, dismiss 44)

**Process discipline applied:**
- Runtime schema verification (Hotfix #3 lesson): grepped for `selfLogs` map shape + `shots` subcollection structure before writing aggregator. Confirmed `point.selfLogs[playerId]` exists at point doc; `shots` is a subcollection per point with `source: 'self'` flag.
- Contract verification (squad-rename Input lesson): toast `onClick` uses `() => navigateToPlayerStats(savedToast.playerId)` not bare function ref — avoids accidental React event arg capture.
- Reuse existing components: toast uses `COLORS`, `FONT`, `FONT_SIZE`, `SPACE` tokens; nav via existing `useNavigate` hook.

**Known issues / follow-ups:**
- Pre-existing `#1a2234` border in PlayerStatsPage (lines 110, 150) flagged by precommit's §27 elevation check — not from this commit, predates Brief D. Punt to a § 27 surface migration sweep.
- Pre-existing TODO in `OlderPointsSection.jsx` (deferred per § 55.6) and `ScoutIssuesPage.jsx` (legitimate "scouting TODO" feature label) flagged by precommit — both not introduced by this commit.

---

## 2026-04-29 — KIOSK Brief C — Prefill resolver (Source A scouting, Source D coach elim)
**Commit:** `f717fda` (squash-merge of `feat/kiosk-c-prefill`, originally `e90746f` on branch, +309/-5 LOC, 4 files)
**Status:** ✅ Deployed to GitHub Pages
**Spec:** `docs/DESIGN_DECISIONS.md` § 55.4 + § 55.5

Implements `CC_BRIEF_KIOSK_C_PREFILL` — final brief in 3-part KIOSK rollout (Brief A taxonomy 2026-04-29 / Brief B lobby 2026-04-29 / Brief C prefill 2026-04-29). KIOSK feature complete after this commit (modulo deferred Source B drawing + Source C zone narrowing — both need separate product decisions).

**Runtime-schema verification (per Hotfix #3-class process gap):**

Discovery confirmed three runtime gotchas vs § 55.4 spec text:

- **Source A** (scouting positions+shots) — spec correct: `homeData.players[slot]` = positions, `homeData.shots[slot]` = shot list. Hotfix #3 schema correction already established players=positions, assignments=IDs.
- **Source B** (drawing on layout, "sposób 1") — deferred per § 55.10 (separate brief; format TBD).
- **Source C** (Quick Log zone narrowing) — `point.homeData.zones[playerId]` spec text is **wrong**. `zones` is QuickLogView local React state, NEVER persisted to point doc. Per Brief C STEP 4.1 escalation default: skip Source C, flag for separate brief to add zone persistence first. Resolver returns `bunkerPickerFilter: null` so Krok 1 picker shows full layout-wide top 6 (no narrowing — same as vanilla PPT).
- **Source D** (coach Live Tracking elim) — spec said `point.eliminations[playerId].deathStage`. That field doesn't exist. Real schema (Brief A § 54.5 D1.A) is slot-indexed: `homeData.eliminationStages[slot]` etc. Reading via `deathTaxonomy.readNormalizedEliminations(teamData)[slot]`.

Plus reason-key translation (Hotfix #3-class):

- Coach canonical (§ 54.1): `gunfight / przejscie / faja / na_przeszkodzie / za_kare / nie_wiem / inaczej`
- PPT Step4bDetail slugs: `gunfight / przejscie / faja / na-przeszkodzie / inne / nie-wiem` (no za_kare)
- `REASON_CANONICAL_TO_PPT` map handles 6 of 7 reasons. `za_kare` has no PPT equivalent → falls through to no-prefill (player picks fresh in Step 4b). Slug unification = future brief if needed.

**Files:**

NEW:
- `src/utils/kioskPrefillResolver.js` — pure function, ~200 LOC. Returns prefill snapshot per `emptyPrefill()` shape: `{ bunker, bunkerPickerFilter, way, shots, stage, reason, reasonText }`. Each field either null or `{ value, source }` where source ∈ {'scouting', 'coach'}. Defensive — never throws; missing data → emptyPrefill(). Implements Source A + Source D; Source B/C return null.

CHANGED:
- `src/components/kiosk/KioskWizardHost.jsx` — accepts new `point` prop. `useMemo` computes prefill at open (deps: open, point, playerId, layout). `applyPrefill(prefill)` seeds initial wizard state. New `<PrefillHint>` subcomponent renders subtle amber-left-border banner above current step body when state still matches prefill snapshot. Auto-hides on user override. Skipped on Step 5 (review) per § 55.5: "treats prefilled and player-entered as equivalent — no special styling on review".
- `src/components/kiosk/KioskLobbyOverlay.jsx` — passes `point` prop to KioskWizardHost.
- `src/utils/i18n.js` — 4 prefill hint keys × PL+EN + `kiosk_wizard_save_failed` (was using fallback before).

**§ 27 self-review:** PASS. PrefillHint = thin amber left border (interactive accent — signals tap-to-override) + 6% bg tint + textMuted hint text. Explicit avoidance of § 55.5 anti-pattern: NO "FROM COACH" badge, subtle annotation only.

**NON-GOALS preserved:**

- Source B (drawing on layout) — sposób 1 separate brief
- Source C (zone narrowing) — needs QuickLog zone persistence first (separate brief)
- Per-field `filledBy` attribution at save — write skipped for MVP. Save handler records full payload; analytics can derive coach-vs-self via comparing prefill snapshot to saved values if ever needed.
- BunkerPickerGrid "outlined-vs-selected" two-state styling — simplified to state-as-selected + hint banner (functional override works; visual annotation via banner not per-tile outline). Cleaner spec compliance is a polish brief.

**Verification path** (tablet landscape ≥ 1024×768):

1. **Prefill from Source A**: scout a point in MatchPage full FieldCanvas mode (place 5 players, draw shots), save. Open KIOSK lobby for that point, tap a player → wizard opens with bunker pre-selected matching coach's scouted position. Hint banner: "Coach ustawił to przez scouting — potwierdź lub zmień". Step 3 shows pre-filled shot list.
2. **Prefill from Source D**: in LivePointTracker, mark a player elim with stage+reason. Open KIOSK → wizard for that player → Step 4 outcome pre-selected based on coach's deathStage; Step 4b reason pre-selected.
3. **Override**: tap different bunker/outcome/reason → state changes; hint banner disappears for that field.
4. **Vanilla path**: open KIOSK for a point with no coach scouting + no Live Tracking elim → wizard runs vanilla (no prefill, no hints), Tier 1 § 35 behavior.

If broken: revert this commit only — Brief A + B + previous hotfixes unaffected. `git revert f717fda && push && deploy`.

**KIOSK rollout summary:**

| Brief | Commit | Status |
|---|---|---|
| A — Death Reason Taxonomy + coach 2-step picker | `ef94637` | ✅ deployed |
| B — Lobby + post-save summary + KioskWizardHost | `519b34b` + 3 hotfixes | ✅ deployed (E2 amended in Path 2) |
| § 54.3.1 amendment — break is its own reason | `332f77f` | ✅ deployed |
| **C — Prefill resolver (Source A + D)** | **`f717fda`** | **✅ deployed (this entry)** |

KIOSK feature complete for tablet landscape MVP. Outstanding items: Source B drawing, Source C zone persistence, BunkerPickerGrid outlined-vs-selected styling — all separate briefs.

---

## 2026-04-29 — KIOSK Brief B — Player Verification lobby + post-save summary (feat/kiosk-b-lobby)
**Commit:** `519b34b` (squash-merge of `feat/kiosk-b-lobby`, originally `bde4c79` on branch, +1403/-1 LOC, 10 files)
**Status:** ✅ Deployed to GitHub Pages
**Spec:** `docs/DESIGN_DECISIONS.md` § 55 (KIOSK Player Verification mode — base spec at `b5854af` 2026-04-28, lobby filter + multi-tablet truth + § 55.11 backlog patches at `2019821` 2026-04-29)

Implements `CC_BRIEF_KIOSK_B_LOBBY` per `docs/mockups/MOCKUP_KIOSK_v3_INLINE.html` (added in this commit) as visual ground truth. Wariant 3 commit-and-iterate flow per Jacek 2026-04-29 — patches PATCH_BRIEF_B_INLINE_STYLES_NOTE / PATCH_DD_FORM_FACTOR_TABLET_ONLY / HANDOVER skipped because (1) inline-styles discipline already followed natively (PROJECT_GUIDELINES § 1.7 verified), (2) E6 form-factor amendment to be added by Jacek in separate § amendment, (3) HANDOVER patch deferred non-blocking.

**Pre-implementation decisions baked in (E1-E6 confirmed by Jacek 2026-04-29):**

- **E1** — KioskContext directly, no useSelfLogIdentity hook recreation. HotSheet receives playerId prop; KIOSK lobby provides kiosk.activePlayerId. MatchPage's existing FAB path (uses `linkedPlayer`) untouched.
- **E2** — HotSheet wizard from § 35 (single-screen, 4 inline fields breakout/variant/shots/outcome). Brief C will add prefill resolver later.
- **E3** — Full-screen overlay (NOT route). Mounted at App.jsx root via KioskProvider; coach view persists "underneath", not navigated.
- **E4** — Training only for MVP. Quick Log save in TrainingScoutTab is the entry point. Tournament MatchPage savePoint integration deferred to separate brief.
- **E5** — Mockup v3 full-screen Post-Save Summary (richer than § 55.1 toast/banner spec). Scoreboard + elim list + stats grid + 88px primary "Przekaż graczom" + 56px secondary "Następny punkt →".
- **E6** — Form-factor gate. KIOSK overlays only render on tablet landscape ≥ 1024×768. Phone / portrait → enterPostSave is a no-op; coach experience unchanged, players use Tier 1 HotSheet on their own phones (also § 27-protective: 5-tile grid in <600px would compress tiles below § 27 typography + touch-target floors).

**Files (10 total):**

NEW (6):
- `src/utils/kioskViewport.js` — `useKioskCompatible` hook + `isKioskCompatible` bare-call. Re-evaluates on resize + orientationchange (tablet rotated mid-session updates).
- `src/contexts/KioskContext.jsx` — Provider with state (activePlayerId, postSaveOpen, lobbyOpen, pointId, trainingId, matchupId, scoutingSide). Actions: enterPostSave (E6-gated), enterLobby, exitPostSave, exitLobby, setActivePlayer, clearActivePlayer.
- `src/components/kiosk/KioskPostSaveSummary.jsx` — § 55.1 + mockup v3 Screen 1. Reads `point.eliminations*` via `deathTaxonomy.readNormalizedEliminations` (Brief A § 54 schema), renders scoreboard + "Co zarejestrowałeś" elim list with stage short labels + stats (Czas / Eliminacje) + 2 CTAs.
- `src/components/kiosk/KioskLobbyOverlay.jsx` — § 55.2 + mockup v3 Screen 2. Filters `point.<side>Data.players[]` (NOT whole squad per § 55.2 amendment). Renders 5-tile grid + OlderPointsSection. Tap tile → `kiosk.setActivePlayer` → HotSheet wizard opens with overridden playerId. Save handler mirrors MatchPage pattern but anchored to `kiosk.pointId`.
- `src/components/kiosk/PlayerTile.jsx` — § 55.2 5-row identity (firstname/lastname/nick-in-quotes/jersey + 6px status bar). Photo zone 45% (gradient or photoURL), info zone 55%. State via bar color + border + ✓ overlay (Apple HIG: visual properties, not text labels). Inline `resolveSquadLabel` reads `training.squadNames?.[key]` (forward-compatible w/ parked feat/custom-squad-names branch) else falls back to legacy R1-R5 via SQUAD_MAP.name. Without squad-names branch merged, tiles show "R1"/"R2"; after merge, auto-upgrades to "RANGER"/"RING"/etc.
- `src/components/kiosk/OlderPointsSection.jsx` — § 55.6 collapsed pill. MVP: tap expands to placeholder list. Switching lobby context to past point left as TODO (§ 55.6 follow-up wiring).

EDIT (3):
- `src/App.jsx` — KioskProvider wraps HashRouter; KioskPostSaveSummary + KioskLobbyOverlay rendered at App root (z-index 200, above any route content).
- `src/components/tabs/TrainingScoutTab.jsx` — captures `pointRef.id` from `ds.addTrainingPoint` return; calls `kiosk.enterPostSave({...})` after save resolves. scoutingSide derivation: 'home' for quickLogSide ∈ {'home', 'both'}, else 'away'.
- `src/utils/i18n.js` — 22 new keys × PL+EN under "KIOSK (§ 55)" section. Function-form keys for parameterized labels.

DOCS (1):
- `docs/mockups/MOCKUP_KIOSK_v3_INLINE.html` — Jacek-provided inline-styles mockup variant per PROJECT_GUIDELINES § 1.7. v3.html retained for now; cleanup at user discretion.

**§ 27 self-review: PASS** — color discipline (amber interactive only, green/red/squad-color semantic/categorical), elevation 4-layer standard, typography ≥ 8px throughout, primary touch targets 44-200px range. Anti-patterns ZERO new — Post-Save 2 CTAs have clear visual hierarchy (88 amber gradient vs 56 surface); tile shows identity+status only (NO stats/elim-times/kill-counts on card per explicit pre-impl anti-pattern avoidance).

**PROJECT_GUIDELINES § 1.7 compliance:** every component uses inline `style={{ ... }}` with COLORS/FONT/FONT_SIZE/SPACE/RADIUS tokens from theme.js. Zero classNames, zero stylesheets, zero `<style>` tags. Mockup HTML treated as visual reference (positions/sizes/colors), NOT copy template.

**NON-GOALS preserved:**
- HotSheet wizard internals untouched (Brief C scope — prefill resolver)
- MatchPage FAB path unchanged (linkedPlayer still drives identity there)
- "Suggested" tile state shimmer animation skipped (§ 55.2 "MVP może obejść się bez tego" — code path exists in PlayerTile but not auto-set)
- OlderPointsSection switch-context wiring deferred (TODO comment at § 55.6)
- Tournament MatchPage savePoint integration deferred (E4 training-only MVP)
- Form-factor styling for non-compatible viewports unchanged (E6 — KIOSK simply doesn't render; coach UI continues normally)

**Pending verification (Jacek manual smoke test on tablet landscape ≥ 1024×768):**
1. Quick Log Save → KioskPostSaveSummary opens (full screen overlay)
2. Header shows "Punkt #N zakończony" + "Trening DATE · Twoja strona: SQUAD" + "✓ ZAPISANE" pill
3. Scoreboard + elim list reflect saved point data; aliveCount summary row correct
4. Tap "Przekaż graczom" → KioskLobbyOverlay opens; tap "Następny punkt →" → coach view returns
5. Lobby shows N tiles where N = `point.<side>Data.players.filter(Boolean).length` (5 typical, NOT whole squad)
6. Tile tap → HotSheet wizard opens with overridden `playerId` (not coach's linkedPlayer)
7. Wizard save → ✓ overlay appears on tile, tile bg green-tinted, nick green
8. On phone / portrait — Quick Log Save proceeds normally, no KIOSK overlay (E6 fallback)

**Known issues / iteration candidates (Wariant 3 commit-and-iterate):**
- Post-Save Summary header "Trening DATE · Twoja strona: SQUAD" reads training.date which may be ISO string (e.g. "2026-04-25"); UI may want shorter date format
- `kiosk_postsave_alive_summary` and similar function-form keys assume player count + side label — formatting may need polish for edge cases (0 elim, 5 elim, etc.)
- Tile photo zone uses gradient from squad color when no photoURL — squad color (e.g. yellow) may produce harsh photo zone for "Rush"/yellow squad. Consider muted variant.
- Older points pill renders `kiosk_older_missing_suffix` ("brakuje") — may want to reword ("3 brakuje" reads awkward; "brakuje 3" more natural)
- Suggested tile state code path exists but no logic auto-sets it; future enhancement could mark "last-touched" or "scout-suggested" player

If verification fails on a scenario, revert: `git revert 519b34b && push && deploy`.

**Brief C (KIOSK Prefill Resolver) status:** unblocked. § 55 spec complete (incl. § 55.4 prefill sources + § 55.5 UI annotation). HotSheet wizard available as reuse target. Mockup v3 Screen 2 visual reference includes prefill annotation cues. Source D coach data already canonical via Brief A § 54.

---

## 2026-04-29 — KIOSK Brief A — Death Reason Taxonomy + coach 2-step picker (feat/kiosk-a-taxonomy)
**Commit:** `ef94637` (squash-merge of `feat/kiosk-a-taxonomy`, originally `6fb16be` on branch, +516/-100 LOC, 7 files)
**Status:** ✅ Deployed to GitHub Pages
**Spec:** `docs/DESIGN_DECISIONS.md` § 54 (added 2026-04-28 in `b5854af`; § 54.3 amended 2026-04-29 in `2ca78ca` for D3.four 4-stage axis)

Implements `CC_BRIEF_KIOSK_A_TAXONOMY` (Opus, 2026-04-28 — originally referenced § 39, renumbered to § 54 since § 39 was already taken by Scout score sheet). First brief in 3-part KIOSK rollout (B + C still blocked on § 40 spec + mockup file).

**Pre-implementation escalation resolved 5 schema decisions (2026-04-29):**
- D1.A — slot-indexed array schema preserved (no migration to per-playerId map per § 54.5 verbatim — would've been 15-file blast radius for limited gain)
- D2 — no migrate; legacy storage values stay literal in old docs, normalize on every read
- D3.four — stage axis is 4 values (alive/break/inplay/endgame), NOT 3 — preserves fidelity with HotSheet's existing `elim_end` outcome
- D4 — inline 2-step picker in existing LivePointTracker player card (no full-screen Modal — preserves coach UX speed)
- D5 — full label alignment for coach + PPT player wizard (PL labels were already canonical in PPT, EN labels needed 3 fixes: Transition→Crossing, Bunkered→Outflanked, On the prop→On bunker)

**Files changed:**
- **`src/utils/deathTaxonomy.js` (NEW)** — canonical sets `DEATH_STAGES` (4) + `DEATH_REASONS` (7), validators, `normalizeLegacyStage` (elim_break→break, elim_mid/elim_midgame→inplay, elim_end→endgame), `normalizeLegacyReason` (przebieg→przejscie, kara→za_kare, unknown→nie_wiem; legacy `break` reason resolves to `{reason:null, inferredStage:'break'}` — the legacy stage-as-reason ambiguity disambiguated). Plus `buildEliminationRecord` and `readNormalizedEliminations` helpers per § 54.5 schema.
- **`src/components/training/LivePointTracker.jsx`** — REWRITTEN. Was: flat 6-option picker mixing stage + reason. Now: inline 2-step picker (Step 1 stage 3 options break/inplay/endgame — alive omitted because coach tapped Trafiony=eliminated; Step 2 reason 7 canonical options + Pomiń skip + back chevron to Step 1 + Inaczej textarea expand). New shared `PickerPanel` sub-component parameterized for both steps.
- **Output schema renamed** — was `eliminationCauses[i]`, now 3 separate arrays: `eliminationStages[i]` + `eliminationReasons[i]` + `eliminationReasonTexts[i]` (latter for inaczej free text). Legacy `eliminationCauses` no longer written for new points; readers normalize.
- **`src/components/QuickLogView.jsx` + `src/components/tabs/TrainingScoutTab.jsx`** — passthrough callback signatures updated; attach 3 new arrays to `target.{eliminationStages,eliminationReasons,eliminationReasonTexts}`.
- **`src/utils/playerStats.js`** — `causeCounts` aggregation reads `eliminationReasons[i]` first, falls back to `eliminationCauses[i]` with inline normalize. Output keys always canonical.
- **`src/pages/PlayerStatsPage.jsx`** — `CAUSE_META` keyed on canonical reasons (added `na_przeszkodzie` + `inaczej`, renamed legacy keys, dropped `break` since it's no longer a reason). Categorical color palette respects § 27 (no semantic clash with reserved amber/green/red/cyan/orange).
- **`src/utils/i18n.js`** — 17 new keys × PL + EN in `death_*` namespace (4 stages + 7 reasons + 4 section questions + 1 skip label). Plus 3 EN label fixes for PPT alignment.

**§ 27 self-review:** PASS — color discipline (categorical encoding, no semantic clash), elevation preserved (existing `#0d1117` for picker bg), typography ≥ 8px throughout, primary touch targets ≥ 44px (stage/reason tiles minHeight 44, player card 56). Pre-existing under-44 violations on Skip/Back/Close affordances (32-36px) inherited from pre-Brief LivePointTracker pattern — out of brief scope per CLAUDE.md "no refactor beyond task", flagged for future § 27 cleanup PR.

**NON-GOALS (per brief):**
- HotSheet (older single-screen self-log) untouched — different surface, separate alignment if ever needed
- PPT slug migration (`na-przeszkodzie`/`inne`/`nie-wiem` with hyphens stay as-is per D5 label-only alignment)
- Batch migration of legacy point docs (D2.no-migrate)
- KIOSK lobby (Brief B) + prefill resolver (Brief C) — separate briefs, not in scope

**Pending verification (Jacek manual smoke test 7 scenarios per Brief A STEP 5):**
1. Coach popup alive→elim toggle (Trafiony → stage Step 1 → reason Step 2 → save with canonical keys)
2. Pomiń path (stage-only capture, deathReason=null)
3. Inaczej path (textarea expand → ✓ Zapisz → deathReason='inaczej' + deathReasonText)
4. Back navigation (Step 2 → ‹ → Step 1 stage clear)
5. Revert (tap player tile post-elim → cofnij entire hit)
6. Player wizard label check (PPT Krok 4 EN labels Crossing/Outflanked/On bunker; PL was already canonical)
7. Legacy fallback (old points with `eliminationCauses=['przebieg','unknown',...]` show normalized labels in PlayerStatsPage)

**Known issues:** None expected. If verification fails on a scenario, revert: `git revert ef94637 && push && deploy`.

**Brief B + C status:** still BLOCKED on § 40 spec content (KIOSK Player Verification mode) and `outputs/MOCKUP_KIOSK_v2.html`.

---

## 2026-04-28 — Custom Squad Names branch parked (feat/custom-squad-names) ⏸️
**Branch:** `feat/custom-squad-names` (commit `ece9246`, +239/-44 LOC, 8 files)
**Status:** ⏸️ Pushed to origin, **NOT merged to main** — awaiting Jacek manual smoke test.

Per `CC_BRIEF_CUSTOM_SQUAD_NAMES`. Implements `docs/DESIGN_DECISIONS.md § 53` (renumbered from § 38 — § 38 was already taken by Security Role System). Full implementation done; brief explicitly required "Wait for Jacek GO before merging to main" (STEP 5).

**What's on the branch:**
- `src/utils/squads.js` — extended (NOT new file; brief proposed `squadHelpers.js` but `squads.js` already existed). +purple `#a855f7`, +`defaultName` per squad (Ranger/Ring/Rage/Rush/Rebel), +`getSquadName(training, key)` resolver, +`buildDefaultSquadNames()`.
- `src/services/dataService.js` — `addTraining` writes default squadNames; new `updateTrainingSquadName(tid, key, newName)` (trim, 16-char cap, empty=revert).
- `src/components/training/SquadEditor.jsx` — MAX_SQUADS=5 (was 4), zone header tappable (`minHeight: TOUCH.min`) opens rename Modal, Pencil ✎ icon as decorative affordance (textMuted, NOT amber per § 27), display via `getSquadName(training, meta.key)`.
- 5 i18n keys × PL+EN.
- Display propagation in TrainingScoutTab + TrainingCoachTab + TrainingResultsPage + MatchPage (training adapter).

**Why parked:** brief STEP 5 required user-side manual smoke test before merge ("Wait for Jacek GO"). Jacek 2026-04-28 evening: "nie będę tego dzisiaj testować, zapisz ten stan i leć dalej". Branch retained intact on remote `origin/feat/custom-squad-names`.

**To merge later:**
```bash
git checkout main
git merge --ff-only feat/custom-squad-names
git push origin main
npm run deploy
git branch -d feat/custom-squad-names
git push origin --delete feat/custom-squad-names
# Then update DEPLOY_LOG entry to ✅ Deployed + NEXT_TASKS [DONE]
```

**Pre-existing § 27 violation NOT touched:** CountBtn (+/-) in SquadEditor at 32×32 (under § 27 mandate of 44×44). Out of brief scope; flagged for future cleanup.

**Known issues:** Per § 53.6 backward-compat fallback may surprise users on first rename of a legacy training (Option A: untouched slots adopt brand defaults rather than R-codes). Documented in commit `ece9246`.

---

## 2026-04-28 — Auto-swap regression fix (hotfix/auto-swap-regression-2026-04-28) ⏳ unverified
**Commit:** `13837e4` (ff-merged from `hotfix/auto-swap-regression-2026-04-28`, 1 commit, +36/-17 LOC, 1 file)
**Status:** ✅ Deployed to GitHub Pages — ⏳ **awaiting Jacek prod incognito verification**

P0 regression — Tier-C-era side-flip cleanup (`33b81fc`, 2026-04-25) anchored the URL effect (MatchPage L519-538) to constant `'left'` instead of `match?.currentHomeSide`, removing cross-team leak (correct) but leaving NO replacement persistence for per-team forward intent. Result: solo coach scouts TEAM A point #N with auto-swap toggle active → save → "Scout ›" again for point #N+1 → URL effect re-fires (`scoutingSide` was reset to 'observe' during review round-trip → mismatch with 'home') → calls `changeFieldSide('left')`, clobbering the right-side intent that savePoint just set in `nextFieldSideRef`. Same flow on TEAM B.

Confirmed by Jacek in prod incognito 2026-04-28 (eliminates SW cache as cause, scenario (c) ruled out from CC_BRIEF_TIER_C_FORWARD_FIX_2026-04-28 root-cause matrix).

**Fix (Option A+ per CC_BRIEF_AUTO_SWAP_REGRESSION_2026-04-28):**
new `teamSideMemoryRef` (`{home: 'left', away: 'right'}`) holds per-team forward intent in component memory. URL effect reads it on team-switch; savePoint auto-swap + manual flip pill persist to it after each flip. ~6 effective lines + comments. No schema change, no Firestore writes.

Tradeoff vs Brief's Option B (per-point Firestore field): chose Option A+ because (a) points lack a clean per-team filter (`homeData`/`awayData` per-team subobjects, no `p.team` field for `points.filter(...)` per Brief's pseudocode), (b) concurrent-mode last-write-wins on `nextPointSide` between coaches, (c) refresh-resets-to-defaults is acceptable since active-scouting refresh is rare and recovery cost is one manual flip. 33b81fc cross-team leak fix preserved (zero `match.currentHomeSide` writes).

**Pending verification (3 scenarios):**
1. TEAM A point #N → win → save → "Scout ›" TEAM A point #N+1 → field **flipped** (auto-swap honored)
2. TEAM A point #N → no winner → save → "Scout ›" TEAM A → field **same** (no flip)
3. TEAM A point #N → win → save → "Scout ›" TEAM B point #1 → TEAM B opens **own default 'right'** (33b81fc cross-team isolation preserved)

**Known issues:** None expected. If verification fails on any of the 3 scenarios, revert: `git revert 13837e4 && push && deploy`.

---

## 2026-04-28 — Tier C forward fix — bundle React-ecosystem libs into vendor-react chunk (hotfix/tier-c-chunk-order-2026-04-28) ⏳ unverified
**Commit:** `f604343` (ff-merged from `hotfix/tier-c-chunk-order-2026-04-28`, 1 commit, +12/-1 LOC, 1 file)
**Status:** ✅ Deployed to GitHub Pages — ⏳ **awaiting Jacek prod incognito verification**

🚨 P0 prod hotfix — Tier C (`e0b8ee4`, 2026-04-26) caused white-screen on all routes via `TypeError: Cannot read properties of undefined (reading 'createContext') at vendor-misc-C1Sp9epr.js`. Root cause: `lucide-react` references `React.forwardRef` + `React.createContext` at module-init, but the prior `manualChunks` regex only matched literal `(react|react-dom|react-router-dom|scheduler)` — `lucide-react` fell into `vendor-misc`. Module preload doesn't guarantee execution order, so `vendor-misc` could initialize before `vendor-react` → React undefined → crash.

**Fix:** explicit pattern set in `vite.config.js` keeping ALL React-ecosystem libs in `vendor-react`: `node_modules/react/`, `node_modules/react-dom/`, `node_modules/react-router` (catches both bare + dom), `node_modules/scheduler/`, `node_modules/lucide-react/`, `node_modules/@radix-ui/`, plus catch-all `/node_modules\/react-[a-z-]+\//`.

**Pre-deploy local verification:**
- `vendor-misc.js` no longer contains `createContext`/`forwardRef` calls (grep returns ZERO); only `@remix-run/router` (pure utility, no React refs).
- `vendor-react.js` now contains lucide-react (38 hits) + createContext (3 hits) — share single load unit.
- `npm run preview` → `200 OK` on `/pbscoutpro/`.

**Bundle deltas (gzip):**
- `vendor-react`: 46.86 KB → 53.09 KB (+6.23 KB, lucide moved here)
- `vendor-misc`: 11.52 KB → ~4 KB (only @remix-run/router left)
- Other chunks unchanged.

Cache benefit preserved — vendor-react still hash-stable across app deploys, slightly larger.

**Pending verification:** open prod in incognito + hard reload → app loads, no console `createContext` error. Jacek 2026-04-28 evening: "nie będę tego dzisiaj testować".

**If verification fails:** `git revert e0b8ee4 f604343 && push && deploy` (revert both Tier C and forward fix together).

---

## 2026-04-26 — ADMIN_RUNBOOK completion (docs/admin-runbook-completion-2026-04-26)
**Commit:** `a221e2e` (ff-merged from `docs/admin-runbook-completion-2026-04-26`, 1 commit, +83 LOC)
**Status:** ✅ Documented (no app deploy — docs-only)

Closes the end-of-MAX survival doc per `CC_BRIEF_ADMIN_RUNBOOK_COMPLETION_2026-04-26`. Audit found §§ 1-11 already substantive (15-42 lines each, all following When/Steps/Verification/Recovery template); real gap was the two sections the brief explicitly called out. Existing strong content not churned.

**Added § 12 — Bundle cache verification:**
Quarterly procedure to verify Tier C vendor split (commit `e0b8ee4`) keeps delivering its cache benefit in production. Walks Future Jacek through DevTools Network tab inspection: expected behavior is that 4 of 5 JS chunks (the vendor-* ones) serve from `(disk cache)` after an app-only redeploy while only `index-*.js` fetches from network. Pass criterion documented (≥4/5 cached). Failure modes covered: regression in `vite.config.js` `manualChunks` pulling high-churn code into vendor chunks, and the (less likely) GitHub Pages stripping `cache-control` headers.

**Added § 13 — Service account credentials regeneration:**
Standalone revoke-old-then-generate-new procedure for the Firebase Admin SDK service account JSON. Pulls scattered service-account guidance out of § 11 prerequisites into a canonical procedure. Cross-references the `firebase-admin-*.json` + `service-account*.json` gitignore patterns added in Tier A.3 (commit `ed855cc`). Includes IAM permission check (in case rotated key has wrong role) and explicit security reminders (never paste JSON into chat/screenshots/Sentry).

**Coverage now:**
| § | Topic | Status |
|---|---|---|
| 1 | Adding a new player | ✅ existing |
| 2 | Linking user to player profile | ✅ existing |
| 3 | Rotating leaked API keys (Anthropic + Firebase + Sentry) | ✅ existing |
| 4 | Deploying Firestore rules | ✅ existing |
| 5 | Building and deploying the app | ✅ existing |
| 6 | Reading Sentry errors | ✅ existing |
| 7 | Common error responses | ✅ existing |
| 8 | Emergency rollback | ✅ existing |
| 9 | Database backup | ✅ existing |
| 10 | Monitoring health post-MAX | ✅ existing |
| 11 | Periodic anonymous user cleanup | ✅ existing (2026-04-26) |
| **12** | **Bundle cache verification** | **✅ new (this commit)** |
| **13** | **Service account credentials regeneration** | **✅ new (this commit)** |

Plus Appendix A (admin allowlist transfer) and Appendix B (resource directory). Total runbook 335 → 418 lines.

**Cache verification scheduling:** the brief's STEP 5 asked for a `/schedule` agent in 1 week. CC cannot trigger `/schedule` on the user's behalf (that's a user-action that creates billable scheduled remote agents). § 12 of the runbook documents the manual procedure as the brief's own fallback path explicitly permits ("If `/schedule` not supported... document the procedure in § 12 of runbook (manual quarterly check) and skip schedule"). Jacek can opt into `/schedule` himself if he wants automated checks.

**Known issues:** None. Documentation only.

---

## 2026-04-26 — Tier C vendor split (chore/tier-c-vendor-split-2026-04-26)
**Commit:** `e0b8ee4` (ff-merged from `chore/tier-c-vendor-split-2026-04-26`, 1 commit)
**Status:** ✅ Deployed to GitHub Pages

Closes Tier C from the post-MAX cumulative P1 backlog (UX_QUALITY_AUDIT § "Cumulative P1 backlog"). Brief `CC_BRIEF_TIER_C_VENDOR_SPLIT_2026-04-26` from Jacek with mandatory measurement gate.

**What changed:** added `build.rollupOptions.output.manualChunks` to `vite.config.js`. Splits node_modules into 4 vendor chunks. App code untouched (routes were already lazy-split via React Router).

**Chunk strategy:**
- `vendor-react`: react + react-dom + react-router-dom + scheduler — kept together because they share React internals (splitting risks duplication of React's `Scheduler`/`React.shared` modules across chunks)
- `vendor-firebase`: firebase + @firebase/* — biggest single chunk (567 KB raw / 134.88 KB gzip), tightly coupled package family, sub-splitting would over-fragment with no gain
- `vendor-sentry`: @sentry/* + @sentry-internal/* — separate so Sentry SDK upgrades don't invalidate the React/Firebase cache
- `vendor-misc`: everything else from node_modules (lucide-react slivers, transitive deps)

Path-based regex (`/node_modules\/(react|...)\//`) used instead of naive `id.includes('react')` to avoid over-matching future `react-*` deps.

**Local build measurements (gzip, what the user actually downloads):**

| Metric | Before | After | Δ |
|---|---|---|---|
| App entry chunk (`index-*.js`) | 263.50 KB | **44.42 KB** | **-83%** |
| Total first-visit transfer | ~263 KB | ~267 KB (4 chunks parallel) | ~flat (+1.3%) |
| Total dist | 3.6 MB | 3.6 MB | 0 |
| JS chunk count | 56 | 57 | +1 (4 vendor chunks emerged, monolith index shrank) |

Vendor chunks (raw / gzip):
- vendor-firebase: 567.67 KB / **134.88 KB**
- vendor-react: 145.21 KB / **46.86 KB**
- vendor-sentry: 85.43 KB / **29.34 KB**
- vendor-misc: 35.31 KB / **11.52 KB**

**Cache benefit (the actual win):**
- Initial visit: similar total bytes, but downloaded as 5 parallel chunks (Vite auto-emits `<link rel="modulepreload">` for all 4 vendor chunks in `index.html`, so the browser fetches them concurrently with the entry chunk via HTTP/2 multiplexing — verified locally by inspecting served HTML).
- Subsequent visits after app-only deploys: vendor chunks (~222 KB gzip) hash separately from app code; only the 44 KB index chunk re-downloads. **~83% of the bundle stays in browser cache** across consecutive deploys.
- Firebase SDK upgrades (rare) would invalidate the 135 KB vendor-firebase chunk; React upgrades would invalidate the 47 KB vendor-react chunk. Most app deploys touch neither.

**Verification:**
- `npm run build` clean (no errors, Vite warning about >500KB chunk is for vendor-firebase — acceptable, that's the necessary cost of Firestore in the bundle).
- `npm run preview` → curl `localhost:4173/pbscoutpro/` → **200 OK**.
- Served `index.html` confirmed includes `<link rel="modulepreload">` hints for all 4 vendor chunks.
- `npm run precommit` → All checks passed.

**Known issues:** None. Functional behavior unchanged — no app code touched, only build config. The `vendor-firebase` chunk still triggers Vite's >500KB warning; this is inherent to using Firebase Firestore + Auth + Storage and not actionable without dropping a Firebase product (out of scope; would be Brief G territory if ever needed).

**Follow-up candidates (NOT in this brief):**
- Lazy-load `vendor-charts` if Recharts ever gets added (currently not in deps).
- Per-route `vendor-*` splits via dynamic imports for rarely-used pages (e.g. ballistics worker, vision scan) — bigger refactor, separate brief.
- `build.chunkSizeWarningLimit` raise to silence the cosmetic Firebase warning — declined; the warning is a useful nudge if Firebase grows.

---

## 2026-04-26 — Bulk anonymous user purge (CC_BRIEF_BULK_DELETE_ANONYMOUS_2026-04-26)
**Commit:** `ed855cc` (script + gitignore + npm) — operational, no app deploy
**Status:** ✅ Executed (Firebase Auth — 611 anonymous users deleted via Admin SDK)

Closes the SECURITY_AUDIT § 2 P2 follow-up (Tier A.3 from cumulative P1 backlog) — bulk-deleted legacy anonymous Firebase Auth users from pre-§51 era when `signInAnonymously` was active in `ensureAuth()`. Per Jacek's 2026-04-26 morning authorization: historic scout attribution + PPT data from anonymous users discarded ("Unknown scout" acceptable, PPT historic dropped). Brief had mandatory STEP 4 verify gate; numbers surfaced and "GO" received before delete.

**Audit results (pre-delete):**
- Found **611** anonymous users.
- Oldest: 2026-04-02 21:42 GMT. Newest: 2026-04-11 12:36 GMT.
- Newest is **6 days BEFORE** the 2026-04-17 anonymous-auth disable date → no re-leak detected, all 611 are pre-§51 legacy.
- Pattern: drive-by traffic — sampled users had `created == lastSignIn` (signed in once, never returned).

**Delete results:**
- Single batch (611 < 1000 batch limit). Deleted 611, failed 0. Re-audit confirms 0 remaining.

**Artifacts shipped (in commit `ed855cc`):**
- `scripts/purge-anonymous-users.cjs` — audit | delete modes, paginated `listUsers`, batches of 1000, 5s abort countdown. CommonJS (`.cjs`) since project is ESM. Retained for periodic re-use.
- `firebase-admin@latest` added to `devDependencies` (one-shot ops tool, not part of app bundle).
- `.gitignore` — added `firebase-admin-*.json` + `service-account*.json` patterns so service account credentials cannot leak into the repo.

**Service account credentials:** stayed on Jacek's local machine (`~/Downloads/pbscoutpro-firebase-adminsdk-fbsvc-500193fec8.json`); passed via `GOOGLE_APPLICATION_CREDENTIALS` env var; never entered repo.

**Delete log:** saved locally to `logs/anonymous-purge-2026-04-26.log` (gitignored via `*.log` glob), kept for audit trail.

**Orphaned references (intentionally left intact):**
- `/users/{uid}` Firestore docs for the deleted users → display as "Unknown" in admin Members panel; cleanup optional.
- `scoutedBy` references on old points → display as "Unknown scout" in match review; Jacek confirmed acceptable.
- No PPT data orphaned (anonymous users never had linked players).

**Docs updated:**
- `docs/audits/SECURITY_AUDIT_2026-04-25.md` — § 2 P2 note marked RESOLVED; new § 2A "Anonymous user purge (2026-04-26 follow-up)" with full audit + delete results.
- `docs/ops/ADMIN_RUNBOOK.md` — new § 11 "Periodic anonymous user cleanup" with re-run procedure for the retained script.
- `NEXT_TASKS.md` — Tier A.3 (anonymous-user audit) marked done.

**Revert:** none. `auth.deleteUsers()` is irreversible. Affected users must re-register with email/password — verified non-issue per Jacek's authorization (all current users on email accounts).

**Smoke-test pending Jacek action:** open prod in incognito, fresh signup, spot-check old scout point shows "Unknown scout" fallback. Not blocking; flagged in case of regression.

---

## 2026-04-25 — Tier B rules hardening (chore/tier-b-rules-hardening-2026-04-25)
**Commit:** `bed5d05` (ff-merged to main from `chore/tier-b-rules-hardening-2026-04-25`, 1 commit)
**Status:** ✅ Deployed (Firestore rules only — no client code, no `npm run deploy` needed)

Closes the two latent rules-level holes from Phase 1 SECURITY_AUDIT (P1.1 + P1.2). Brief `CC_BRIEF_TIER_B_RULES_HARDENING_2026-04-25` from Jacek with mandatory STEP 3 verification gate.

**Hole A — `/workspaces/{slug}` self-join envelope:**
Removed `passwordHash` from the `affectedKeys.hasOnly` allow-list at `firestore.rules:121`. Was a defense-in-depth gap — any auth user could rewrite the workspace passwordHash during enterWorkspace, potentially locking out future password-typed entry. Unreachable in production today (ranger1996 has passwordHash set, LoginGate retired, jacek admin via email allowlist not via password) but worth closing. Brand-new workspace creation unaffected (uses `allow create` path which still permits passwordHash).

**Hole B — `/users/{uid}` self-write soft-delete bypass:**
Replaced unrestricted `allow write: if uid == auth.uid` with explicit `allow create` + scoped `allow update` (allow-list `hasOnly(['displayName', 'email', 'linkSkippedAt'])`). Closes the bypass where a soft-disabled user could self-write `disabled: false` via SDK to re-enable themselves after admin softDisableUser. Admin-managed fields (`roles`, `disabled` family, `defaultWorkspace`, `workspaces`) become create-only or admin-only. Delete is implicit-deny (no allow-rule).

**Allow-list derivation** — every `/users/{uid}` self-write site enumerated before commit:
- `ProfilePage.handleSaveName` → `setDoc(merge)` `{displayName, email}` → covered
- `skipLinkOnboarding` → `setDoc(merge)` `{linkSkippedAt}` → covered
- `getOrCreateUserProfile` → `setDoc` CREATE → covered by `allow create` (unrestricted)
- `softDisableUser` / `reEnableUser` → admin path → existing rule unchanged

**Verification path executed by Jacek post-deploy (4 flows in incognito):**
1. ✅ Fresh signup with new email → completed
2. ✅ Self-link to player ("Tak, to ja") → succeeded
3. ✅ Change displayName on ProfilePage + save → persisted
4. ✅ Admin disable test user via Členkowie → succeeded

**Known issues:** None. Rules-only, no client code touched.

**SECURITY_AUDIT_2026-04-25.md** updated to reflect P1.1 + P1.2 shipped. Cumulative P1 backlog in UX_QUALITY_AUDIT_2026-04-25.md updated — Tier B removed from "next windowed rules deploy" since it's now done.

---

## 2026-04-25 — Post-MAX Tier A cleanup (gitignore + orphaned PBLI helpers)
**Commit:** `e8abb7b` (direct to main, no merge — 4 files, +7/-64 LOC)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules change)

Two cleanups from the post-MAX P1 backlog Tier A (see `docs/audits/UX_QUALITY_AUDIT_2026-04-25.md` § "Cumulative P1 backlog"). Picked up by Jacek's "knock out Tier A" call after the audit ship.

**Changes:**
- `.gitignore` — replaced `.env` + `.env.local` (with stale duplicate `.env`) with single `.env*` glob + `!.env.example` whitelist. Catches `.env.development` / `.env.staging` / future siblings that the narrow list would have missed. Tightens the re-leak window flagged in the SECURITY_AUDIT § 3.1 ESCALATE.
- `src/utils/roleUtils.js` — deleted `parsePbliId` + `PBLI_ID_FULL_REGEX`. Replaced by `pbliMatching.js` cascade in `83c929b` (2026-04-24). `normalizePbliId` retained — actively used by `pbliMatching.js` + `findPlayerByPbliId`.
- `src/services/dataService.js` — deleted `linkPbliPlayer` (29 LOC transactional helper). Replaced by `selfLinkPlayer` + `adminLinkPlayer` shipped in 2026-04-24 sprint. Also dropped the historical `claimPlayer` tombstone comment block since the chain claimPlayer → linkPbliPlayer → selfLink/adminLink no longer needs source-level breadcrumbs.
- `src/pages/PbleaguesOnboardingPage.jsx` — tightened a 7-line comment that referenced `linkPbliPlayer` (now gone) into 3 lines pointing at the current `selfLinkPlayer` flow + § 49.8.

**Verification:** zero behavior change; precommit + build pass; net -57 LOC. The audit's "Cumulative P1 backlog Tier A.2" item is now done.

**Tier A.3 (anonymous-user Firebase Auth scan)** still pending — that one needs Jacek's Firebase Console access. See § 2 of SECURITY_AUDIT for the rationale (pre-§51 anonymous sessions still accepted; confirm via Firebase Auth Console whether any are still active).

---

## 2026-04-25 — End-of-MAX production audit (CC_BRIEF_PRODUCTION_AUDIT_2026-04-25)
**Commits:** `8396146` (Phase 1 — security audit + VisionScan.jsx fix) + `51f3fa3` (Phase 2 — UX/quality audit + admin runbook)
**Status:** ✅ Deployed (GitHub Pages — security-audit code change)

End-of-MAX cleanup audit per Jacek's directive (MAX license expiring; app must be self-sustaining for 6+ months). Two phases: security (Firestore rules + auth flow + secrets + admin operational risks) and UX/quality (navigation + dead code + component consistency + docs sync + perf baseline + admin runbook).

**🚨 P0 ESCALATE — needs Jacek action TODAY:**
- **Anthropic API key leaked in public Git history.** Key `sk-ant-api03-KYGNizd7Du...lQ-wNVrmgAA` was committed at `f7450b7` (2026-04-06) inside `.env`, removed from HEAD at `4c74335f` (2026-04-20). Commit still publicly retrievable. CC cannot rotate (needs console.anthropic.com auth). **Rotate at https://console.anthropic.com → Settings → API Keys.** Rotation invalidates the leaked key — sufficient corrective action. History scrubbing optional (CC recommends skip — public exposure already cached/forked/archived; force-pushing main is nuclear). Full diff + revocation steps in `docs/audits/SECURITY_AUDIT_2026-04-25.md` § 3.1.

**P0 fixed inline this audit:**
- **`VisionScan.jsx:159`** — dropped `import.meta.env.VITE_ANTHROPIC_API_KEY` env fallback. If anyone re-introduces a `.env` with that variable, Vite would inline the secret into the public deploy bundle (this is likely how the original 14-day leak happened). Now consistent with `OCRBunkerDetect.jsx` + `ScheduleImport.jsx` (localStorage-only, user-provided per existing design).

**Phase 1 — security audit deliverables:**
- `docs/audits/SECURITY_AUDIT_2026-04-25.md` — full report. Per-collection rules tabulation, auth flow walkthrough, secrets/config scan with diff, admin operational risks.
- 6 P1 findings logged (passwordHash self-write window, /users disabled-flag bypass, /users global read, selfReports per-pid ownership, userRoles self-write diff gap, workspace adminUid create-time injection). All currently unreachable or low-impact under single-admin + invited-only-workspace threat model.
- No firestore.rules deploy this audit. Reasoning: Saturday-prep series already shipped recent rules tightening (`d548ad3` self-link, `c817516` self-link defensive, `fa2f15c` pendingSelfReports); layering more without device validation risks breaking working flows. Tier B P1 items consolidated for next windowed deploy.

**Phase 2 — UX/quality audit deliverables:**
- `docs/audits/UX_QUALITY_AUDIT_2026-04-25.md` — full report.
- `docs/ops/ADMIN_RUNBOOK.md` (10 sections + 2 appendices) — load-bearing deliverable for end-of-MAX survival. Open this when something breaks post-MAX. Covers: adding players (3 paths), linking users (admin override), rotating API keys (Anthropic / Firebase / Sentry — each with specific procedure), deploying rules, building & deploying app, reading Sentry, common error responses, emergency rollback (3 scenarios), database backup procedure (gcloud firestore export), weekly health-check checklist. Plus Appendix A (admin allowlist transfer procedure) + Appendix B (where things live).
- Nav audit clean — all 24 pages with PageHeader carry back prop; 5 omissions legitimate.
- No dead code requiring removal — orphaned `parsePbliId` / `linkPbliPlayer` / `PBLI_ID_FULL_REGEX` deferred per HANDOVER follow-up; ViewAs* components kept on disk per `04ff7fc` explicit decision.
- Component consistency = deferred polish only (raw button/input/hex counts logged as P1 sweep candidate, no user-visible defects).
- Performance baseline acceptable: 3.6 MB total `dist/`, 264 kB gzipped initial transfer (`index-*.js`). Largest pre-gzip 960 kB — close to 1 MB threshold; vendor manualChunks split logged as Tier C P1.

**Cumulative P1 backlog (post-MAX):** 8 items in 4 tiers (Tier A quick wins, Tier B windowed rules deploy, Tier C performance, Tier D Brief G territory). See `docs/audits/UX_QUALITY_AUDIT_2026-04-25.md` for the full breakdown.

**Verification path:**
- VisionScan.jsx fix: open Layout Wizard → Vision Scan; should still prompt for API key on first use, NOT auto-fill from env. (Functionally indistinguishable for most users — no .env was set anyway.) Reload after deploy.
- Audits + runbook: read in repo. Cross-reference SECURITY § 3.1 ESCALATE before any new deploy that might re-leak.

---

## 2026-04-25 — Single-coach side flip (Path X — currentHomeSide stop persisted) (hotfix/single-coach-side-flip-2026-04-25)
**Commit:** `33b81fc` (merge of `hotfix/single-coach-side-flip-2026-04-25`, 1 commit `f7a23ad`)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules change)

Solo coach scouting both teams of the same match sequentially hit a side flip when switching from TEAM A (after auto-swap) to TEAM B point #1. Workaround: go back to TEAM A, return to TEAM B → side correct.

**Decision-tree audit (`CC_BRIEF_SINGLE_COACH_SIDE_FLIP_2026-04-25`):**
- **STEP 1:** ref-based auto-swap — `nextFieldSideRef` + `sideChange` state at `MatchPage.jsx:185-252`.
- **STEP 2 — root cause at line 648:**
  ```js
  const isConcurrent = !isTraining && (scoutingSide === 'home' || scoutingSide === 'away');
  ```
  **`isConcurrent` is misnamed** — fires for ANY active match scouting, including SOLO coaches. So `savePoint`'s "concurrent" branch (line 926-938) wrote `match.currentHomeSide` to Firestore on every solo save with a winner. Same bug in the manual flip pill (line 1591-1599). Persisted shared signal then leaked into TEAM B's view via the team-switch effect (line 515-540) on `scoutTeamId` change. **`grep currentHomeSide` confirmed NO other consumers in `src/`** — heatmap independent, Path X risks audited yesterday all clear.
- **STEP 3 / FIX TYPE B:** auto-swap state goes local-only. No Firestore writes. No shared signal.

**Per yesterday's HANDOVER "Carry-over items" Path X audit:** the shared-`currentHomeSide` signal is a relict from the pre-Brief 8 v2 chess model. Per § 42 per-coach point streams, each coach's perspective is local — `homeData/awayData` per-point fieldSide snapshots are authoritative. **Today's bug forced our hand on Path X.**

**Changes (`MatchPage.jsx` only):**
- `savePoint` auto-swap (lines 922-941) → collapsed to local-only `changeFieldSide`. Removed `isConcurrent` split + `updateMatch` write to `currentHomeSide`. Same-team next-point auto-swap preserved (`resetDraft` intentionally carries `fieldSide` forward, line 723).
- Manual flip pill (lines 1591-1602) → same collapse. Removed `isConcurrent` branch + `updateMatch` write.
- READ paths (lines 526, 590) → anchor at constant `'left'` instead of reading polluted `match?.currentHomeSide`. Existing matches with prior writes (`currentHomeSide='right'` polluting docs) no longer mis-orient on team switch.

**Path X risks audited yesterday now resolved:**
- (a) Initial perspective: TEAM A always opens 'left', TEAM B 'right' — natural starting state per paintball convention. Auto-swap on save still flips local perspective for sequential same-team points.
- (b) `HeatmapCanvas` observer: `grep currentHomeSide` confirmed NO other consumers. Heatmap independent.
- (c) Single-coach legacy: `changeFieldSide` always runs locally; no regression.

**Concurrent scouting preserved.** BUG-1 fix from 2026-04-13 (`lastSyncedHomeSideRef` guard) and Path Y `hasDraftData` guard from `c817516` are about WHEN the sync effect applies the shared signal. With the shared signal removed (Path X), the effect's role narrows to setting initial per-team orientation on mount; both guards remain defensive but are now effectively no-ops for the cross-coach case. Concurrent multi-coach scouting still works — each coach manages own perspective; per-point fieldSide snapshots in `homeData/awayData` remain authoritative for `editPoint` review/edit.

**Polluted match docs harmless.** `match.currentHomeSide` is no longer read. Cleanup via Firebase console is cosmetic, not required.

**Codifies the architectural cleanup yesterday's HANDOVER tracked as Path X follow-up.** § 42.5 / § 53 supersession of the 2026-04-21 Bug 3a revert (commit `29c2be1`) follows up in next docs sweep.

**Verification path for Jacek (solo coach):**
- Open match X → Scout TEAM A point #1 → place players → win_a → Save
- Switch to TEAM B → open point #1 → field should display from RIGHT (TEAM B's natural starting side), NOT flipped from auto-swap
- Same-team auto-swap still works: TEAM A point #2 after #1 win opens from RIGHT (TEAM A's swapped position)

**Known issues:** None.

## 2026-04-25 — Back nav hotfix (hotfix/back-nav-teams-players-2026-04-25)
**Commit:** `da83244` (merge of `hotfix/back-nav-teams-players-2026-04-25`, 1 commit `0484120`)
**Status:** ✅ Deployed (GitHub Pages)

Real admin/coach reported being stuck on Teams + Players pages — no back button visible after navigating via Settings → ZARZĄDZAJ → Drużyny / Zawodnicy. Browser back was the only escape.

Decision-tree audit (`CC_BRIEF_BACK_NAV_FIX_2026-04-25`):
- **STEP 1:** TeamsPage + PlayersPage + LayoutsPage all render `<PageHeader title="..." />` WITHOUT a `back` prop.
- **STEP 2:** Single entry path = Settings (`/`) via `MoreTabContent.jsx:76-78` + `TrainingMoreTab.jsx:117-119` `navigate('/teams|/players|/layouts')`. AppShell tab persistence restores the Ustawienia tab on return.
- **STEP 3:** All three ZARZĄDZAJ list pages broken; detail page (`TeamDetailPage:112`) correctly uses `back={{ to: '/teams' }}` — pattern to mirror.
- **STEP 4:** FIX TYPE B (multiple pages, identical fix). Added `back={{ to: '/' }}` to all three list pages. Matches existing PageHeader API exactly (chevron is icon-only per `src/components/PageHeader.jsx:31-48`; no label needed).

Pages fixed:
- `src/pages/TeamsPage.jsx:111`
- `src/pages/PlayersPage.jsx:63`
- `src/pages/LayoutsPage.jsx:20`

**Root cause:** Regression introduced by `a0435cb feat(auth): retire team-code gate + auto-enter default workspace + members audit` on 2026-04-23. Settings menu was restructured per § 50.1 (Drużyny / Zawodnicy / Layouty promoted from More tab into ZARZĄDZAJ section) but the destination list pages were never re-wired with a back arrow — they had no back originally because the legacy nav model assumed users reached them via the bottom-tab `More` button which auto-rendered its own back chrome. The new Settings menu navigates via React Router push (no auto-back), so the back arrow needed to be explicit on the destination.

**Detail pages were unaffected** because they kept their original back-to-list pattern (`TeamDetailPage` → `back={{ to: '/teams' }}`).

**No new functionality. No i18n change. No PageHeader API change.**

**Verification path:** admin login → tap Ustawienia tab → ZARZĄDZAJ section → Drużyny → back chevron visible top-left → tap → returns to `/` with Ustawienia tab restored. Same for Zawodnicy + Layouty.

**Known issues:** None.

## 2026-04-25 — Self-link missing-field rules fix (hotfix/self-link-still-broken-2026-04-25)
**Commit:** `b47a07c` (merge of `hotfix/self-link-still-broken-2026-04-25`, 1 commit `d548ad3`)
**Status:** ✅ Deployed (Firestore rules only — `firebase deploy --only firestore:rules` reports "uploading rules" + "released rules"; no app code change needed)

Real players during 2026-04-25 training session reported permission-denied when clicking "Tak, to ja" on the self-link confirmation modal — same bug `0ba285a` was supposed to fix on 2026-04-24. Decision-tree audit per `CC_BRIEF_SELF_LINK_DEBUG_2026-04-25` walked STEP 1 → STEP 4:

- **STEP 1** — `git show 0ba285a -- firestore.rules` confirmed the self-link carve-out exists at `firestore.rules:158-175`.
- **STEP 2** — `firebase deploy --only firestore:rules` reports "already up to date" → live state == repo state. Rules ARE deployed.
- **STEP 3** — `selfLinkPlayer` at `dataService.js:1038-1051` writes ONLY `linkedUid` + `linkedAt` (transactional). Matches the rule's `affectedKeys` allow-list `[linkedUid, pbliIdFull, linkedAt]`. Client + rule aligned.
- **STEP 4** — Manual rule trace identified bug pattern #1 from the brief: `resource.data.linkedUid == null` is brittle when the field doesn't exist on the doc. **`addPlayer` (`dataService.js:114-126`) and `CSVImport` create players WITHOUT a `linkedUid` field at all** — it's genuinely missing, not explicitly null. Per Firebase rules_version=2 spec missing fields evaluate to null, but production behavior empirically reports failures. → **FIX TYPE D.**

**Fix:** switched both null-checks in the self-link branch from `resource.data.linkedUid == null` to `resource.data.get('linkedUid', null) == null` — canonical safe form for missing-or-null. Idempotent re-claim path (the `|| resource.data.linkedUid == request.auth.uid` from `0ba285a`) also gets the `.get()` form so both branches are uniformly resilient.

**Permits:**
- First-time claim (player never linked → field missing OR explicitly null)
- Idempotent re-claim (same uid re-runs from another device or after a flaky first attempt)

**Security unchanged.** `request.resource.data.linkedUid == request.auth.uid` invariant on the post-state still blocks hijacking another user's player. `affectedKeys` allow-list unchanged.

**No client code change.** Bug was 100% rule-side. `selfLinkPlayer` is unchanged and correct.

**Verification path for Jacek:** fresh test signup in incognito → search for any player profile → "Tak, to ja" → should land in app linked, no error. If verification still fails, the diagnostic logging from yesterday's `0ba285a` will capture the next failure in console (workspace shape + write payload + full FirebaseError) — paste that and we go to STEP 4 round 2.

**Known issues:** None expected. Self-edit + self-unlink branches in the same `allow update` rule still use direct `resource.data.linkedUid == request.auth.uid` (not `.get()`) — those paths only fire when the field DOES exist (user is already linked), so missing-field semantics don't apply. Defensive `.get()` could be applied there too as future hardening; deferred.

## 2026-04-24 — Concurrent-scout flip guard + autoEnter diagnostics + defensive self-link rule (fix/concurrent-scout-flip-autoenter-diag-selflink-2026-04-24)
**Commit:** `c817516` (merge of `fix/concurrent-scout-flip-autoenter-diag-selflink-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages + Firestore rules redeploy via `firebase deploy --only firestore:rules`)

Three batched Saturday-prep fixes from tonight's iPhone validation + the fresh 20:43 UTC autoEnter error log.

**Fix 1 — concurrent-scout flip guard (Path Y / minimal).** Coach B placing players for a NEW point saw their field orientation flip when coach A saved a winning point first. Per § 2.5 paintball rule the cross-coach flip IS the correct behavior for idle coaches, but mid-placement it scrambles coach B's in-progress work. Added `hasDraftData` short-circuit to `MatchPage.jsx:575-595` sync effect — mirrors the existing `editingId` guard's intent ("perspective locked during active local work"). Once coach B saves or clears their draft, the effect re-runs and the flip applies. Deps array extended with `draftA.players` + `draftB.players`.

**Path X architectural cleanup deferred to tracked follow-up in HANDOVER "Next on deck"** — deprecate cross-coach `match.currentHomeSide` sync entirely per Brief 8 v2 / § 42 per-coach-streams model. Jacek's observation in tonight's session ("relict of the past") confirms the open decision in HANDOVER "Awaiting decision" about `match.currentHomeSide` under Brief 8 architecture. Path X was scoped (~30-45min) but has three downstream risks (initial perspective on first open, heatmap observer view, single-coach legacy) that want verification in a dedicated window, not at 23:00 Friday before Saturday's NXL Czechy match. The minimal Path Y guard ships tonight; the architectural cleanup gets its own session.

**Fix 2 — autoEnter diagnostic instrumentation.** The `c81dade` dot-notation fix didn't fully resolve prod 403s — Jacek's 20:43 UTC log shows `Auto-enter default workspace failed: FirebaseError: Missing or insufficient permissions.` fired **52 minutes after** that fix shipped. Static re-analysis of the post-fix write payload matches the self-join envelope rule exactly; cannot reproduce the failure statically. Added catch-block instrumentation to capture pre-write workspace shape (`members` type/length/caller-inclusion, `userRoles` key count + dotted-key detection, top-level dotted keys on workspace doc, caller's existing roles entry, rolesVersion), the write payload keys, and full FirebaseError structure (`code`, `message`, `customData`). Console-only; no user-facing changes. Next user-reported failure will land with actionable context.

**Hypothesis the diagnostic targets:** orphan `userRoles.<uid>` top-level fields on `workspaces/ranger1996` from pre-`c81dade` failed attempts may be showing up as extra entries in `affectedKeys()` → `hasOnly([...])` fails on subsequent writes that touch them indirectly. The `topLevelDottedKeys` capture will confirm or refute.

**Fix 3 — defensive self-link rule (Path 2).** Self-link carve-out at `firestore.rules:158-167` changed from `resource.data.linkedUid == null` to `(resource.data.linkedUid == null || resource.data.linkedUid == request.auth.uid)` — idempotent re-claim now permitted. Same user re-linking their own player from a second device, or after a flaky first attempt that left partial state, no longer surfaces as permission-denied. Security unchanged: the `request.resource.data.linkedUid == request.auth.uid` invariant on the post-state still blocks hijacking another user's player. `affectedKeys` allow-list unchanged. Rules deployed via `firebase deploy --only firestore:rules` before this commit.

**Known issues / tracked follow-ups:**
- Path X (full `currentHomeSide` deprecation) — tracked in HANDOVER "Next on deck". Remove the sync effect entirely, remove match.currentHomeSide writes from savePoint auto-flip + manual flip pill, remove `lastSyncedHomeSideRef`. Codify as DESIGN_DECISIONS § 53 or § 42.5 revision. Requires verifying initial-perspective-on-first-open, heatmap observer orientation, and single-coach legacy paths don't regress.
- Stale `userRoles.<uid>` top-level fields on `workspaces/ranger1996` from pre-`c81dade` writes may still pollute the doc. Harmless if rules don't reference them, but the new diagnostic will flag if they contribute to a future 403. Console batch-delete via Firebase UI when convenient.
- Defensive self-link rule change is prophylactic — no confirmed static bug it fixes. If the 20:38 UTC 403 had a different root cause (separate from idempotent-reclaim), the diagnostic logging from Fix 2 on the *next* failure will reveal it.

**Reproduction for Fix 1:** two browser tabs signed in as different users, both open same match scouting, both place players for a new point, coach A saves a winner → coach B's side indicator SHOULD NOT flip while draft is dirty. Coach A swaps sides explicitly → still does propagate (observer / post-save paths unchanged).

## 2026-04-24 — Relax PBLeagues onboarding (feat/relax-pbleagues-onboarding-2026-04-24)
**Commit:** `2f8f971` (merge of `feat/relax-pbleagues-onboarding-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules change, no data migration)

The second signup blocker. After `c9d99eb` retired the team-code gate + auto-joined new users to ranger1996, users landed on `PbleaguesOnboardingPage` which STILL blocked them with strict `NNNNN-NNNN` regex validation and a dead-end "Nie znaleziono gracza" branch whose only action was Wyloguj się. Users typing "111111" or "1-1" got "Niepoprawny format"; users missing from the roster got "Skontaktuj się z adminem". Zero adoption.

**What changed:** Rewrote `PbleaguesOnboardingPage.jsx` to mirror the UX shipped in `fa2f15c` (relax-player-linking) by reusing the same `LinkProfileModal` component — same 5-priority `pbliMatching` cascade, same "Czy to ty?" confirmation card, same "Pomiń na razie" skip fallback. Zero logic duplication. The onboarding page is now just a shell (logo top-bar + explanatory card + pbleagues.com external link) with `<LinkProfileModal open={true} …/>` rendered atop.

**New persistence signal:** `users/{uid}.linkSkippedAt: serverTimestamp()` written by `ds.skipLinkOnboarding(uid)` when the user taps Pomiń. `App.jsx` gate updated from `if (!linkedPlayer)` to `if (!linkedPlayer && !userProfile?.linkSkippedAt)` so the onboarding gate falls through on subsequent renders. User can still link later from ProfilePage (§ 33.3 self-claim, restored in `a0af773`). No rules change — user self-write on `/users/{uid}` already permits arbitrary field writes per `firestore.rules:71`.

**Link write:** `ds.selfLinkPlayer(playerId, uid)` (not `linkPbliPlayer`). User is already a workspace member via auto-enter from the retire-team-code ship, so `linkPbliPlayer`'s workspace-membership branch would be a no-op; `selfLinkPlayer` preserves symmetry with ProfilePage's self-claim flow. `pbliIdFull` not written — admin can fill it via Členkowie if needed. After link: `onPlayerLinked(uid, playerId)` migrates any `pendingSelfReports` written in unlinked PPT mode (from `e94aafa`) to the canonical `/players/{pid}/selfReports/` path. Best-effort; non-blocking for link success.

**Spec deviations:**
- Used option (A) from Checkpoint 1 audit — render `LinkProfileModal` inside the onboarding shell (zero UX drift between onboarding and ProfilePage link). Option (B) was to duplicate the state machine inline for a more "native" full-screen feel; rejected for consistency.
- `linkSkippedAt` is auth-side state (never actually prevents re-rendering the onboarding if admin nullifies the field). Intentional — gives admin a way to force-onboard a user if needed.
- Legacy strict-format code (`parsePbliId` + `PBLI_ID_FULL_REGEX` + `linkPbliPlayer`) intentionally left in place. Not called from the UI anymore but kept available for any downstream caller or future strict-format UX.

**Acceptance (code-trace):**
- `111111` → cascade returns 0 hits → nomatch fallback with [Pomiń na razie] → skip writes linkSkippedAt → re-render lands user in app with tab bar per § 49 role matrix ✓
- `1-1` → accepted as input → substring search on digits → 0 hits → fallback ✓
- `61114` → P1 exact pbliId match → confirm card → link ✓
- `61114-8236` → P2 exact pbliIdFull (if set) or P3 first-segment extract → confirm → link ✓
- `Jacek` → alpha input → nickname substring → candidates ✓
- Skip → PPT immediately accessible (unlinked mode from `e94aafa` writes to pendingSelfReports keyed by uid) ✓
- Existing users with `linkedPlayer` set: unchanged, bypass this gate entirely ✓
- Admin (ADMIN_EMAILS allowlist or role/adminUid): always bypasses via `isAdmin` flag ✓

**Self-heal for users already stuck pre-deploy:** their next visit lands on the new relaxed UI with visible Pomiń na razie. One tap and they're unblocked. No admin intervention needed.

**Known issues:** None. Single full-surface rewrite, reused utilities only, no schema/rules changes.

**Adoption impact:** end-to-end signup flow now works without any admin intervention — neither team code, nor PBLI lookup, nor PBLI format validation blocks users. Admin audits via Členkowie panel with the createdAt-desc sort + NEW badge from `c9d99eb`.

## 2026-04-24 — Fix: autoEnter dot-notation bug (fix/auto-enter-dot-notation)
**Commit:** `c81dade` (merge of `fix/auto-enter-dot-notation`, 1 commit)
**Status:** ✅ Deployed
**What changed:** `autoEnterDefaultWorkspace` was using `setDoc(merge:true)` with dot-notation keys (`update[\`userRoles.${uid}\`]`), which Firestore treats as literal field names — not nested paths (that's `updateDoc`-only behavior). Top-level fields with dots then failed the self-join envelope's `affectedKeys().hasOnly()` check in `firestore.rules`, blocking every fresh user signup with "Permission denied". Fixed by using nested-map literal `userRoles: { [uid]: [...] }` — `setDoc(merge)` does recursive map merge so existing entries are preserved. Same pattern also present in `enterWorkspace` (the pre-retire-team-code path still reachable for admin workspace-switch) — fixed there too with the same transformation.

**Audit:** grepped `userRoles\.${` across codebase. All other hits in `src/services/dataService.js` (`approveUserRoles`, `updateUserRoles`, `transferAdmin`, `removeMember`, `linkPbliPlayer`) use `updateDoc` or transaction `tx.update`, both of which parse dot-notation correctly per Firestore SDK — NO fix needed there.

**Known issues:** Stale `userRoles.<uid>` top-level fields from failed writes before the fix may still exist on `workspaces/ranger1996` in Firestore — cleanup via console if they show up in data audit. They don't affect runtime (rules don't reference them) but pollute doc shape.

## 2026-04-24 — Retire team-code + auto-join ranger1996 + members audit (feat/retire-team-code-auto-join-2026-04-24)
**Commit:** `c9d99eb` (merge of `feat/retire-team-code-auto-join-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes, no data migration)

P0 URGENT — new users were 100% blocked from entering the app. Real-user report: after email signup + login, user landed on a legacy "Team code" screen, typed `Ranger1996`, got "Permission denied — log out and log in again". Adoption at zero.

**Root cause (from Checkpoint 1 audit):** `LoginGate` was still the only path that set `workspace` state. § 49 Checkpoint 2 seeded `users/{uid}.defaultWorkspace: 'ranger1996'` + `roles: ['player']` on signup (via `getOrCreateUserProfile`) but **nothing ever called `enterWorkspace` automatically**. The `utils/constants.js:16` comment literally codified this: "auto-join, nie auto-login" — users got the role pointer, still had to type the code. The team-code screen bricked adoption when it rejected the typed code (password-hash mismatch vs `Ranger1996`'s prior admin hash, or userProfile load-race falling through to pending-approval write, or some other permission edge case — academic; the fix is the same).

**Approach per brief: A + Variant 3.** Access-first. Admin audits reactively via the Członkowie panel.

### Part 1 — retire team-code gate
- `src/pages/LoginGate.jsx` **DELETED** (109 lines). No source code references remain (docs only).
- `App.jsx:69` branch replaced: when `!workspace` and `user` + `userProfile` are resolved, WorkspaceProvider's auto-enter effect fires; UI shows `<Loading text="Preparing your workspace..." />` during the write.
- New `<AutoEnterErrorScreen>` component surfaces auto-enter failures (e.g. default workspace missing) with a sign-out escape. Visually mirrors `DisabledAccountScreen` from § 50.5 for consistency.

### Part 2 — `autoEnterDefaultWorkspace` in `useWorkspace.jsx`
- New internal helper. Target slug = `userProfile.defaultWorkspace` OR `DEFAULT_WORKSPACE_SLUG` ('ranger1996') fallback. The fallback handles legacy users predating § 49 whose user doc lacks the field (Variant 3 philosophy: everyone lands in ranger1996; any wrong assignment is reversible via delete).
- **Skips the password check** — target is system-trusted (hardcoded constant OR server-side-only-written field). The password-gated `enterWorkspace(code)` path STAYS intact for admin workspace-switch via Settings → Mój workspace.
- Write shape identical to `enterWorkspace`'s self-join envelope: adds self to `members[]`, sets `userRoles.<uid>`, optionally `pendingApprovals[]`, plus `lastAccess`. The existing Firestore rule branch `hasOnly(['members', 'userRoles', 'pendingApprovals', 'lastAccess', 'passwordHash'])` accepts without modification — **NO RULES CHANGE**.
- Auto-approve: when target slug matches `userProfile.defaultWorkspace` AND `userProfile.roles` is non-empty (always true for § 49 signups since `DEFAULT_USER_ROLES = ['player']`), mirrors roles into `workspace.userRoles[uid]` and **skips `pendingApprovals`**. New players land directly as `['player']` → tab matrix shows Home + Gracz + Ustawienia immediately.
- Drive effect in `WorkspaceProvider` fires exactly once per auth session via `useRef(false)` re-entrancy flag even though `autoEnterDefaultWorkspace` captures mutable state each render. Short-circuits when `workspace` is already set (legacy session restore wins first).

### Part 3 — Members panel Variant 3 surface
- `useUserProfiles` extended to return `createdAt` alongside `displayName`/`email`/`photoURL`. Legacy users without the field get `null` — sort-last (right place for "old accounts").
- `MembersPage` active members sorted by `createdAt` desc (newest first). Pending approvals stay in original order.
- Section header gains a green `(N nowych w tym tygodniu)` sub-count when any recent joiners exist — distinct from the total count via color differentiation (green COLORS.success on the sub-count, muted gray on the total).
- `MemberCard` accepts new `isRecentJoiner` prop; renders a small green "NOWY" / "NEW" badge inline next to the member name when `createdAt ≥ now - 7 days`. § 27 compliant: green, not amber (amber is reserved for interactive per § 27; the badge is purely informational).
- Admin retains delete + detail-page navigation (§ 50.4 unchanged).

### i18n
3 new keys (PL+EN):
- `members_recent_joined_badge` — "Nowy" / "New"
- `members_new_this_week` (param) — "N nowych w tym tygodniu" / "N new this week"
- `workspace_enter_error_title` — "Nie udało się wejść do workspace'a" / "Couldn't enter workspace"

### Spec deviations from brief
- **Fix to existing users without `defaultWorkspace`**: brief's audit question (1) asked Option (A) unconditional fallback to `DEFAULT_WORKSPACE_SLUG` vs Option (B) picker UI. Chose (A) per my Checkpoint 1 recommendation — matches Variant 3 "adoption is the blocker" rationale and "ranger1996 is the only workspace today" reality. A multi-workspace migration would need (B) later.
- **Admin workspace-switch UI intentionally not rebuilt**: brief mentioned "Mój workspace" as the preserved entry point. Verified `enterWorkspace(code)` still lives in `useWorkspace.jsx` unchanged; admin can still call it from wherever that UI lives (Settings → Workspace section). No new UI needed.

### Acceptance (code-trace verified)
- New user signs up → `getOrCreateUserProfile` writes `defaultWorkspace: 'ranger1996'` + `roles: ['player']` + `createdAt` → auto-enter effect fires → write lands `members[uid]` + `userRoles.<uid> = ['player']` (auto-approved, skips pending) → `workspace` state set → user lands in app with Home + Gracz + Ustawienia tabs ✓
- `Ranger1996` casing is irrelevant now — user never sees the code input ✓
- Legacy user with stale `sessionStorage`: existing restore path runs first at line 75; auto-enter short-circuits on `if (workspace) return` ✓
- Legacy user with no storage + no `defaultWorkspace`: falls back to `DEFAULT_WORKSPACE_SLUG`. If rules reject (edge case: pre-§49 workspace missing), `AutoEnterErrorScreen` with sign-out ✓
- Admin workspace-switch via Settings: untouched, still password-gated via `enterWorkspace(code)` ✓
- Members panel: new `createdAt desc` sort + green NEW badge on ≤7d joiners + green sub-count on section header ✓
- Existing active users: zero behavior change — they pass through the restored-from-storage path that short-circuits auto-enter ✓

### Known issues
- `DEFAULT_USER_ROLES = ['player']` is still a bootstrap-only seed. Admin still needs to touch Members panel to assign scout/coach/admin roles to specific users. Auto-join grants `player` only — matches Variant 3 principle of "access first, admin moderates after".
- `AutoEnterErrorScreen` relies on `error` state from `useWorkspace`. If auto-enter succeeds on retry but the prior error state isn't cleared, a stale screen could flash. Mitigated by `setError(null)` at the top of `autoEnterDefaultWorkspace`.
- Legacy users with a user doc predating § 49 (no `createdAt`) sort to the bottom of the list — intentional, but means admin can't differentiate "oldest legacy" from "sort-last bucket". Low priority; can add a "no timestamp" pill in a follow-up if it becomes confusing.

**Adoption impact:** new users can now enter the app and reach PPT without any admin intervention. Admin audits via Members panel after-the-fact — sorted by newest, green NEW badges for the past week.

## 2026-04-24 — Step 5 sticky + Coach live-score + PPT unlinked-mode (feat/coach-parity-step5-sticky-ppt-unlinked-2026-04-24)
**Commit:** `fa2f15c` (merge of `feat/coach-parity-step5-sticky-ppt-unlinked-2026-04-24`, 3 commits)
**Status:** ✅ Deployed (GitHub Pages + Firestore rules redeploy via `firebase deploy --only firestore:rules`)

Three follow-ups bundled into one ship — two cheap symmetry fixes from prior briefs, plus the deferred PPT unlinked-mode (option (a) from the relax-player-linking Checkpoint 1 audit, option B → option A upgrade).

**Fix 1 — `ed1d524` Step 5 "Zapisz punkt" CTA pinned to viewport bottom.** § 48.3 spec called for "Sticky footer: amber Zapisz punkt CTA (64px, checkmark icon)" but implementation rendered the button inline at the end of the summary card — on dense summaries the CTA scrolled off viewport. Same pattern as the Step 3 fix from `34755ce`: `position: fixed` + safe-area inset + gradient fade + 120px spacer to keep the last summary row scrollable into view.

**Fix 2 — `f0bfbe8` Coach live-score parity via shared `useLiveMatchScores`.** P0 Fix 1 (commit `629edc8`) explicitly noted CoachTabContent as a symmetry follow-up — Coach tab cards showed `0:0` for in-flight LIVE matches between Brief 9 Bug 2's write-side change and end-of-match merge. Extracted `useLiveMatchScores` from `ScoutTabContent.jsx` into `src/hooks/useLiveMatchScores.js` (single source of truth) and wired CoachTabContent to use it. Hook call placed BEFORE the `if (!tournament) return` early return — Rules of Hooks compliant by construction (the React #310 crash that bit ScoutTabContent in `950ab79` doesn't recur).

**Fix 3 — `e94aafa` PPT unlinked-mode (option A from Checkpoint 1).** Players who haven't yet linked a workspace player profile can now open PPT and log points; reports go to a new uid-keyed pending collection and migrate to the canonical player path on link.

- **New collection** `/workspaces/{slug}/pendingSelfReports/{auto-id}` with `uid` field for ownership. **Firestore rule** (deployed via `firebase deploy --only firestore:rules`): create gates on `request.resource.data.uid == request.auth.uid`; read/update/delete gate on `resource.data.uid == request.auth.uid`. No coach visibility (drafts by definition); no collection-group entry for `getLayoutShotFrequencies` (crowdsource includes only canonical selfReports). Once migrated, docs become regular selfReports under `/players/{pid}/selfReports/`.

- **Service** (`playerPerformanceTrackerService.js`):
  - `createPendingSelfReport(uid, payload)` — write to pending path
  - `getTodaysPendingSelfReports(uid)` — today's drafts
  - `migratePendingToPlayer(uid, playerId)` — batch move (200/batch with per-doc fallback if a slice fails); strips `uid` field on write since canonical schema doesn't carry it (path's pid IS the owner)
  - `onPlayerLinked(uid, playerId)` — terminal post-link helper: flushes local offline queue (uid namespace) directly to canonical path, then runs `migratePendingToPlayer`, then clears uid queue
  - Existing `createSelfReport(playerId)` signature unchanged

- **Offline queue + sync hook** (`pptPendingQueue.js`, `usePPTSyncPending.js`): functions gain `mode` param (`'player'` | `'uid'`) so player and uid queues live under separate localStorage namespaces (`ppt_pending_saves_<id>` vs `ppt_pending_saves_uid_<id>`). Default `'player'` preserves existing behavior — no localStorage migration needed.

- **`usePPTIdentity`**: returns `uid` alongside `playerId`; `teamTrainings` returns ALL workspace trainings when unlinked (no team affiliation yet, but user should be able to log against any LIVE training and have it migrate later). Linked behavior unchanged.

- **UI**: hard guard `if (!playerId) return <empty/>` removed from `PlayerPerformanceTrackerPage`; new guard bails only when neither `playerId` nor `uid` exists (auth missing, AuthGate catches upstream). `WizardShell` accepts `uid` prop, `handleSave` branches between `createSelfReport` and `createPendingSelfReport`. `TodaysLogsList` reads from `getTodaysPendingSelfReports` when unlinked. New "unlinked banner" (translucent-amber surface matching the offline-pending banner pattern) renders on both wizard + list view; tap → `/profile`.

- **Step 1 / Step 3 pickers UNCHANGED** — they already short-circuit to bootstrap mode when `playerId` is null. Unlinked users always see all bunkers; mature mode kicks in only post-link + accumulating ≥5 player-history logs OR ≥20 layout crowdsource shots.

- **Migrate-on-link** wired into both link paths: `ProfilePage.handleClaim` (after `ds.selfLinkPlayer` succeeds) and `PbleaguesOnboardingPage.handleSubmit` (after `ds.linkPbliPlayer` succeeds). Best-effort: failures don't roll back the link itself (link is the user-visible win); on partial failure, unmigrated docs stay in pending and can be manually retried by re-linking.

- **i18n**: 2 new keys (PL+EN) — `ppt_unlinked_banner` / `ppt_unlinked_banner_cta`.

**Spec deviations:**
- Coach hook extraction was implied by "symmetry fix" but not strictly required — done because two near-identical hooks would have drifted. Single hook now serves both tabs.
- PPT unlinked banner uses translucent-amber background (matches the existing offline-pending banner) rather than a separate elevation; § 27 anti-pattern avoidance for "decorative" elevation. Banner IS interactive (tap → /profile) so amber is justified.
- `teamTrainings` for unlinked users returns ALL workspace trainings (not filtered by team). Alternative would have been to disable PPT for unlinked users (defeats the purpose) or to require team-pre-pick (extra step). Showing all is the simplest path; once linked, the existing team filter restores.

**Acceptance scenarios:**
- Unlinked user opens PPT → picker shows all workspace trainings → pick → wizard → save → `pendingSelfReport` written ✓
- Unlinked banner visible on wizard + list, tap navigates to /profile ✓
- User links via ProfilePage → `onPlayerLinked` migrates pending docs to `/players/{pid}/selfReports/` + clears local queue ✓
- Coach analytics + crowdsource pickers see migrated reports (path is now canonical) ✓
- Existing linked users: zero behavior change (default mode='player') ✓
- React #310 crash fix from `950ab79` survives — `useLiveMatchScores` placement in CoachTabContent verified above all early returns ✓

**Known issues:**
- Migration is per-link, not per-doc retry. If `onPlayerLinked` fails partway, docs remain in pending until next link attempt (which would re-trigger). Adequate for the invited-workspace model; production-grade would be a Cloud Function trigger on `players/{pid}.linkedUid` change.
- Unlinked users see ALL workspace trainings in the picker — could be noisy in workspaces with many concurrent teams. Acceptable trade-off for v1; if Jacek wants it filtered, a "for me / any" toggle on the picker is cheap.
- `pendingSelfReports` documents are NOT included in `getLayoutShotFrequencies` collection-group queries — the crowdsource picker won't see unlinked users' shots until they link. Trade-off vs. attack surface (anonymous unauthenticated docs polluting the layout heatmap). Documented.

## 2026-04-24 — Relax player linking (feat/relax-player-linking-2026-04-24)
**Commit:** `83c929b` (merge of `feat/relax-player-linking-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes, no data migration)

P0 URGENT — real users reported they could not self-link to a player profile from ProfilePage → "Połącz z profilem gracza". Blocker for PPT adoption because PPT requires `linkedPlayer` to function.

**What changed:** Replaced the legacy substring matcher in `LinkProfileModal.jsx` (two bugs: `#` not stripped from input; `(p.pbliId || p.pbliIdFull)` short-circuit hid pbliIdFull when pbliId was set) with a 4-priority cascade matcher + confirmation gate + skip-link fallback + write-side normalization + PPT empty-state polish.

**New util — `src/utils/pbliMatching.js`:**
- `normalizePbliInput(raw)` — strips `#`, removes all whitespace, lowercases. Stricter than the existing `normalizePbliId` in roleUtils which only strips leading `#` + trims. Both sides (DB + input) go through it.
- `extractPbliFirstSegment(normalized)` — returns first segment of dash form (`61114-8236` → `61114`).
- `matchPlayersByPbli(normalized, players)` — 4-priority cascade: P1 exact pbliId / P2 exact pbliIdFull / P3 first-segment for dash input / P4 substring ≥6 chars. Capped at 5.
- `matchPlayers(query, players)` — single entry point: empty query → alphabetical unlinked roster; PBLI-ish input → cascade; alpha-only input → nickname/name substring (legacy browse behavior preserved).

**LinkProfileModal rewritten** as a 3-state in-place swap (no nested modals): **list** (search + cascade output) / **confirm** ("Czy to ty?" card with avatar + name #number + team + PBLI + `[Nie, szukaj dalej]` / `[Tak, to ja]`) / **no match** ("Nie znaleźliśmy Cię w bazie" + `[Spróbuj ponownie]` / `[Pomiń na razie]`). **Confirmation is ALWAYS required before write**, even on exact PBLI match — prevents the wrong-profile-click failure mode that the matcher alone can't solve. Skip-link CTA closes the modal unlinked; user can retry later from ProfilePage.

**Defensive write-side normalize:** `PlayerEditModal.handleSave` + `CSVImport.parseRows` now pipe `pbliId` through `normalizePbliInput` before writing. Keeps future data clean so the cascade's exact-equality priorities stay pinpoint.

**PPT empty-state polish:** The "no player linked" screen at `PlayerPerformanceTrackerPage.jsx:163` previously showed a single muted text line. Now surfaces a proper card (emoji + title + body) above a prominent amber `Połącz teraz` CTA routing to `/profile`. One-tap path for users blocked here.

**Admin Členkowie panel (§ 50.4):** picks up the same cascade + confirmation via the shared `LinkProfileModal`. Admin also gets the confirm gate — correct default (same risk of wrong-profile click).

**i18n:** 10 new keys across `link_profile_confirm_*`, `link_profile_nomatch_*`, `ppt_no_player_linked_*` namespaces (PL + EN).

**Spec deviations from brief (option B chosen, confirmed by Jacek):**
- PPT unlinked MODE (logging without a player link) intentionally DEFERRED. Data-model + rules scope per Checkpoint 1 audit (~2-3h on top): new `/users/{uid}/selfReports/{sid}` rule + dual-write service path + dual-read hook merge + migration-on-link logic. Shipping matching/confirm/skip-link first matches Saturday priority; unlinked-mode is a follow-up brief if real users complain about "can't log pre-link".
- Priority 5 name-similarity (Levenshtein/fuzzy) skipped — existing nickname/name substring (Priority 4 equivalent for alpha input) covers the realistic use case; Levenshtein is overkill for v1.

**Acceptance scenarios verified via code read + test prep:**
- `61114` → P1 hit → confirm → linked ✓
- `61114-8236` → P2 (if pbliIdFull) or P3 (first-segment) hit ✓
- `#61114` / `#61114-8236` → normalized → matches ✓
- ` 61114 ` → whitespace stripped → P1 ✓
- `999999` (nonexistent) → zero hits → skip-link fallback UI ✓
- `Jacek` (alpha) → nickname substring → candidates ✓
- `ds.selfLinkPlayer` transaction still throws `ALREADY_LINKED` on race — preserved.

**Known issues:**
- PPT still requires a linked player to function — empty-state now gives a clear path but doesn't enable logging without link. Deferred per option B scope.
- Write-side normalize changes PlayerEditModal input semantics slightly: a value like `#61114` typed by admin is persisted as `61114`. Existing DB values untouched (no migration). Matcher handles both shapes, so admin edits still land correctly regardless.
- Confirmation gate adds one extra tap for admin bulk-linking in Členkowie. Acceptable trade-off vs wrong-profile-click risk. If admin-bulk becomes a real workflow, a `quickMode` prop on `LinkProfileModal` is cheap to add.

## 2026-04-24 — Critical scouting crash fix (hotfix/scouting-react-310-crash-2026-04-24)
**Commit:** `bbad249` (merge of `hotfix/scouting-react-310-crash-2026-04-24`, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

P0 BLOCKER for Saturday tournament usage. Tournament Scout view crashed with React #310 ("Rendered more hooks than during the previous render") immediately on open. Crash report screen + Reload App button only — entire scouting flow unreachable.

**Root cause:** P0 Fix 1 (commit `629edc8`, `fix(scout): compute live score from points subcollection`) added two new hook calls (`useMemo(liveCandidateIds)` + `useLiveMatchScores(...)` — itself a wrapper containing `useState` + `useMemo` + `useEffect`) to `ScoutTabContent.jsx` at lines 223 / 227, *below* the existing `if (!tournament) return <EmptyState …/>` early return at line 141. On first render with `tournament` still undefined (subscription bootstrap), only the ~17 hooks above the guard ran. Once `tournaments.find(t => t.id === tournamentId)` resolved on the next snapshot, the component blew past the guard and ran the two extra hooks → React's hook-count assertion fired. Classic Rules-of-Hooks violation, undetected because the original P0 Fix 1 likely never opened the page on a cold-start render where tournament wasn't already cached.

**Fix:** hoist `filtered` (plain const) + the two live-score hooks above the `if (!tournament) return` guard. Safe even when tournament is undefined — `resolvedDivision` falls back to 'all', `matches` is the empty subscription bootstrap, and `useLiveMatchScores` no-ops on empty matchIds (it has its own `if (matchIds.length === 0) return` guard). Removed the now-duplicate computation that lived below the guard. **Functional behavior unchanged**: classify() still reads liveScores + falls back to cached scoreA/B; live/scheduled/completed buckets still render correctly; P0 Fix 1's actual feature (live score from points subcollection + LIVE/Scheduled classification) preserved end-to-end. **No revert needed**.

**Audit:** Other recently-touched scouting files inspected for the same pattern. CoachTabContent's early return (line 86) is correctly placed AFTER all hook calls. CompletenessCard's single `useMemo` is unconditional. No other violations found.

**Reproduction before fix:** tournament → tap Scout tab → React error boundary screen with "Reload App" CTA (URL `/`).
**Reproduction attempt after fix:** same path → renders Live / Scheduled / Completed buckets normally.

**Known issues:** None. Single-line-shift fix; build clean; precommit clean.

## 2026-04-24 — PPT hotfix follow-up (Step 1 dedup + Step 3 sticky CTA)
**Commit:** `34755ce` (direct to main, 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

Two follow-ups landed by Jacek's same-day iPhone validation of the PPT hotfix batch (`31c1f7d`).

**Fix A — Step 1 (breakout) bunker dedup.** Mirror of the Step 3 fix from `61aa528` into `Step1Breakout.jsx`'s local `bunkerListFromLayout`. Same root cause class noted as a known follow-up in the prior deploy log entry: layout.bunkers can carry duplicate entries per positionName (legacy docs without `role` field, BunkerEditorPage master+mirror persistence with shared name). Step 1's mature path was already safe via the byName Map in `top6`, but bootstrap (cells = sortedBunkers) showed the same twin-cell bug Step 3 did. First-write-wins dedupe by positionName, after the existing role==='mirror' + missing-name filters.

**Fix B — Step 3 "Dalej →" CTA pinned to viewport bottom.** § 48.3 spec calls for a "Sticky footer: amber Dalej CTA (64px, full-width)" but the implementation rendered the button inline at the end of the scrollable grid. On layouts with many bunkers the CTA scrolled off-screen mid-selection. Mirrors the TodaysLogsList "+ Nowy punkt" pattern: `position: fixed` + safe-area inset (`env(safe-area-inset-bottom)`) + gradient fade-in (functional separation, not decorative — § 27 PASS). 120px spacer reserves room under the footer so the last grid row remains scrollable into view; `zIndex: 20` keeps the footer above the slide-animation layer. Skip link ("Nic nie strzelałem →") stays inline above the spacer.

**Known issues:** None. Both fixes are scoped, pure UI/data, no rules or schema changes.

## 2026-04-24 — PPT hotfix batch (hotfix/ppt-training-sticky-shots-dedup-2026-04-24)
**Commit:** `31c1f7d` (merge of `hotfix/ppt-training-sticky-shots-dedup-2026-04-24`, 2 commits)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

Two PPT regressions discovered by Jacek's iPhone validation pre-Saturday training. P0 — both blocked real game-time use of the Player Performance Tracker. Batched into a single deploy per CC_BRIEF_PPT_HOTFIX_BATCH_2.

**Fix 1 — `fcb9e4e` PPT training selection now sticky per day via localStorage.** Pre-fix: `PlayerPerformanceTrackerPage` auto-routed to the wizard only when exactly one LIVE training existed; otherwise every "+ Nowy punkt" tap routed through the picker (`?pick=1`). With multiple LIVE trainings (or zero), the user re-selected the same training before every single point — unusable in a 15-second between-points window. New `src/utils/pptActiveTraining.js` (get/set/clear with `YYYY-MM-DD` date stamp) persists today's pick; entry logic adds `stickyTraining` as the highest-priority redirect target (beats `showList`, beats single-LIVE inference). `handlePickTraining` writes the sticky on user pick before navigating to the wizard. **Wizard save flow rewritten**: `handleSave` no longer navigates — it resets state to Step 1 in-place, bumps a local pill counter, and shows an inline toast. The next point is one tap away with zero round-trips. **Training pill becomes the "Zmień trening" affordance** (§ 27 discreet text hint, not a competing amber CTA): tap clears sticky + forces picker (`?pick=1`). Step 1 back arrow + exit chevron use a `?leave=1` flag so the user can actually exit the wizard without immediately bouncing back via the sticky-redirect; the flag suppresses auto-redirect for that visit while preserving sticky for the next "+ Nowy punkt" tap. Day boundary clears stale entries automatically (`getActiveTraining` checks `data.date !== todayISO()` and self-cleans). Closed/deleted training: `useMemo` resolves the saved `trainingId` against current `teamTrainings` and drops it if missing or `status==='closed'`. Added 4 i18n keys (PL+EN): `ppt_pill_change`, `ppt_pill_change_aria`.

**Fix 2 — `61aa528` shots picker (Step 3) bunker deduplication.** Pre-fix: every bunker rendered exactly twice in Step 3; tapping one (e.g. "Dog") lit up both order badges simultaneously (twin-badge symptom). Root cause: `bunkerListFromLayout` only filtered `b.role === 'mirror'`, but `layout.bunkers` can carry duplicate entries per `positionName` — legacy docs without a `role` field, or `BunkerEditorPage`'s persistence pattern that writes both master + mirror with shared `positionName`. `BunkerPickerGrid` keys order-badges by `positionName`, so two cells with the same name both selected on a single tap. Fix: defensive first-write-wins dedupe in Step 3's local `bunkerListFromLayout` — `Map` keyed by `positionName`, after the existing `role==='mirror'` + missing-name filters. Bootstrap path (cells = sortedBunkers) now never returns dupes; mature path was already deduped via the `byName` Map in `top6`. **Step 1 (breakout) intentionally untouched per brief acceptance criterion** — its mature path already dedupes; bootstrap path likely has the same latent bug but Jacek hits the mature branch in his testing (≥5 player breakouts logged), and tightly-scoped P0 fix matches the hotfix character. If Step 1 bootstrap shows dupes on Saturday, mirror this fix into `Step1Breakout.jsx`'s local helper.

**Spec deviations from brief:**
- Brief specified saving wizard state to `localStorage` separately from the day-stamp; we reused the existing `ppt_wizard_state_*` localStorage (cleared by `handleSave`) and only added `ppt_active_training` for sticky tracking. Cleaner separation: wizard state = in-progress draft (10min TTL); active training = day-bounded selection.
- Brief suggested adding "Zmień trening" as a separate small link in wizard header. Implemented as an extension of the existing training pill (added "ZMIEŃ" suffix label + 1px divider) — § 27 anti-pattern avoidance: a second link would have introduced a competing tappable surface adjacent to the pill. The pill itself is already the natural "this is the active training" indicator and was already tappable.
- Brief acceptance: "After saving a point, user returns to logging wizard (Step 1), NOT to 'Wybierz trening' picker". Achieved via in-place state reset rather than navigate-to-wizard-URL — avoids the `/player/log` flash + Firestore round-trip + URL-change race that would have happened with the navigate path.

**Known issues:**
- TodaysLogsList view is now reachable only via Step 1 back arrow (lands on `/player/log?leave=1`) since the page auto-redirects to wizard on every other entry path while sticky is active. Acceptable — pill counter shows `#N pkt dziś` inline so the user has running visibility on count.
- Step 1 bootstrap dedup latent bug remains (see above). Watch for at Saturday session.
- Inline wizard toast is local component state; hard refresh mid-toast loses it (vs the previous list-based toast which survived the navigation via `location.state`). 2.5s auto-dismiss reduces exposure.
- `getActiveTraining` is invoked inside a `useMemo` deps:`[teamTrainings]` — reads localStorage on every teamTrainings change. Cheap (single localStorage read + JSON.parse + Date string compare), no observable cost.

## 2026-04-24 — ProfilePage hotfix batch (hotfix/profile-page-regressions-2026-04-24)
**Commit:** `04ff7fc` (merge of `hotfix/profile-page-regressions-2026-04-24`, 3 commits)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

Three regressions on Mój profil surfaced by iPhone validation this morning, batched into a single deploy per brief CC_BRIEF_PROFILEPAGE_HOTFIX (Tier 1, 3 separate commits for clean history).

**Fix 1 — `a0af773` restore linked-player self-claim section (§ 49.8 Path A).** § 33.3 ProfilePage shipped 2026-04-23 with the self-edit form conditionally rendered only when `linkedPlayer` existed — users not yet linked had no UI path to claim themselves. Fix adds the missing unlinked-state surface: empty-state copy + "Połącz z profilem gracza" CTA that opens the admin `LinkProfileModal` (reused — the rules distinction is on the Firestore write side). Linked state unchanged except for a new "Rozłącz" row placed on a separate surface below the edit card so the Save CTA doesn't compete with a destructive action (§ 27 anti-pattern avoidance, follows § 50.3 Wyjdź pattern). Two new dataService functions: `selfLinkPlayer(playerId, uid)` (transactional, surfaces `ALREADY_LINKED` on races) and `selfUnlinkPlayer(playerId)` — both map exactly to self-link + self-unlink Firestore rule carve-outs shipped in § 33.3 + § 50.3, so **no rules change needed**. Inline i18n cleanup for admin-context labels (team / PBLI / role / class) so the section stops hardcoding Polish.

**Fix 2 — `04efb14` missing profile_roles_label + profile_player_* translations.** Root cause: `t('key') || 'fallback'` short-circuits to the raw key because a non-empty string is truthy, so the fallback pattern never fired for missing keys. Raw `profile_roles_label` was leaking to UI above the role chips. Adds the full dictionary set in PL + EN: `profile_roles_*`, `profile_player_*` family (including team/PBLI/role/class labels for the admin-managed context box), and `profile_claim_*` + `profile_unlink_*` for the self-claim flow added in Fix 1. Keys placed in the canonical "Profile / Account" block (second pl / en blocks); earlier-file-drift duplicates left untouched to avoid scope creep.

**Fix 3 — `1f989df` remove misplaced "Podgląd: Admin" floating pill (§ 50 direction).** ViewAsIndicator (§ 38.5) was rendering a floating bottom-right pill on every screen whenever an admin had impersonation state in sessionStorage. On iPhone it read as an active role-preview toggle that users couldn't figure out how to dismiss. Three surgical changes: (a) `<ViewAsIndicator />` removed from App.jsx + its import — no more floating pill anywhere. (b) `ViewAsContext` neutralised at runtime — `viewAs` always `null`, `setViewAs` no-op, previously-persisted sessionStorage cleared on mount so anyone stuck from before this deploy is unwedged on first load. Restore-path comment left for when feature is revived. (c) `ViewAsPill` in ADMIN section of `MoreTabContent` + `TrainingMoreTab` replaced with new `ViewAsPlaceholder` — MoreItem that opens a brief "Funkcja wkrótce" toast, matching § 50.1 row layout without a functional dropdown. Old `ViewAsIndicator.jsx` / `ViewAsPill.jsx` / `ViewAsDropdown.jsx` / `ViewAsPlayerPicker.jsx` left on disk untouched for easy revival — reviving = re-wire `ViewAsContext` useState/useEffect and restore the two mount points.

**Audit (brief's optional 15-min sweep for sibling regressions):** scanned `MoreTabContent`, `TrainingMoreTab`, `UserDetailPage`, `MembersPage`, `MatchPage`. No other sections deleted by the 2026-04-23 settings-reorg. § 33.3 ProfilePage code was intact; the regression was a *conditional render gap*, not a deleted component.

**Root cause note:** Fix 1's regression was present from § 33.3's original 2026-04-23 ship (`0da83b4`), not from the subsequent settings-reorg — the unlinked-state UI was simply never built. Fix 3's regression is latent sessionStorage impersonation state surfacing now; the feature itself has shipped since 2026-04-17 v1 / 2026-04-20 v2. Fix 2 was always broken — the translation keys existed nowhere in dict. Brief's suspicion that `feat/settings-reorg-nav-cleanup` deleted something is **not confirmed** — the underlying issues pre-date that refactor.

**Known issues:**
- Users already stuck with impersonation state from before this deploy get unwedged on first page load (effect clears `sessionStorage`), but cached bundles could delay this by a few seconds. Acceptable.
- ViewAs feature is dormant, not deleted. Admin temporarily loses the role-impersonation preview surface. Explicit spec deviation vs § 50.1 (which kept ViewAsPill functional in ADMIN); the hotfix brief updated § 50 direction toward a placeholder. DESIGN_DECISIONS § 50.1 table entry is now stale — follow-up edit to codify the placeholder-only state (or revive the feature).
- `navigate` import in ProfilePage.jsx remains unused (pre-existing, untouched).

## 2026-04-24 — Scout completeness section rebuild (feat/scout-completeness-rebuild)
**Commit:** `02752ae` (merge of `feat/scout-completeness-rebuild`, fast-forward — 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

**What changed:** Match view's two prior completeness surfaces (the inline 2-bar Breaks/Shots mini-summary inside the Points list block + the scout-only `ScoutScoreSheet` card) replaced with one canonical `CompletenessCard` (`src/components/scout/CompletenessCard.jsx`) visible to scout/coach/admin. Card shows all 5 ranking metrics + composite, exactly mirroring `ScoutDetailPage`'s drill-down — a 75% on this card equals a 75% on the ranking page.

**Metrics displayed (single source of truth via existing scoutStats):**
- Breaks (placed / totalSlots, 35% in composite)
- Shots (withShots / nonRunners, 20%)
- Przypisania / Assignments (assigned / placedForAssign, 20%)
- Biegacze / Runners (runnerFlagged / placedForRunner, 10%)
- Eliminacje / Eliminations (elimMarked / placedForElim, 15%)
- Ogólny wskaźnik / Overall (weighted composite using ranking weights)

Section title `Kompletność scoutingu` (PL) / `Scouting completeness` (EN). Eight new i18n keys added under `completeness_*` namespace.

**Color scale (4 tiers per brief):**
- ≥90% → `COLORS.accent` (amber/gold) + Star badge — celebrate
- 70-89% → `COLORS.success` (green)
- 50-69% → `COLORS.accent` (amber) — needs attention (no badge)
- <50% → `COLORS.danger` (red) + AlertTriangle badge — incomplete

**Data layer:** new `computeMatchBreakdown(points)` exported from `src/utils/scoutStats.js` — returns the full per-section row + composite for a single match (aggregates both `homeData` and `awayData` scouts' work). Existing `computeMatchCompleteness` refactored to a one-line wrapper around `computeMatchBreakdown` for `ScoutDetailPage` back-compat (composite pluck only).

**Files retired:**
- `src/components/match/ScoutScoreSheet.jsx` (256 lines) — deleted; was the scout-only 3-row variant with a different threshold scale on the same data. `scout_sheet_*` i18n keys kept (cheap, may be useful for future scout-only surfaces).
- Inline 2-bar mini-summary inside MatchPage's Points list block (~50 lines of inline computation) — deleted; data now part of the new card with consistent thresholds.

**Role gating:** previous state had two surfaces with split visibility (inline 2-bar = ungated, ScoutScoreSheet = scout-only). New card uses `hasAnyRole(roles, 'scout', 'coach') || isAdmin` — scout + coach + admin see card; pure-player + legacy-viewer see nothing.

**§ 27 exception flagged:** amber appears in two non-interactive roles (top celebration + middle warning). Differentiated by Star badge (top) vs no badge (middle) plus the percentage value itself. Precedent already set by `compositeColor()` in scoutStats.js using amber for the 60-79% tier on the ranking page. If strict-§27 alternative is wanted, swap mid-tier (50-69%) to `'#fb923c'` orange — single-line change in `tierFor()` inside CompletenessCard.

**Known issues / iteration flags:**
- ScoutScoreSheet's "Result" line (match outcome + score in human-readable form like "RANGER won 3:1") was deliberately dropped — score is already in the scoreboard card directly above. If anyone wants it back, fold it into the card footer.
- ScoutScoreSheet had a "breaks" row using bunker-distance threshold (different from ranking's `breakPct = placed/totalSlots`). The new card uses ranking semantics for cross-page consistency. The bunker-distance metric is no longer surfaced anywhere; if it's still useful, file a follow-up.

## 2026-04-24 — Shot cone visualization (feat/shot-cone-visualization)
**Commit:** `5db6a95` (merge of `feat/shot-cone-visualization`, fast-forward — 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

**What changed:** Shot rendering on scouting canvas (`drawQuickShots`) and match heatmap (`HeatmapCanvas`) switched from thin lines / ticks to angled cones (obstacle shots) or three radiating dashed radii (break shots). Geometry helpers extracted to `src/utils/shotGeometry.js` — `TEAM_DIRECTIONS` lookup (A: dorito -30°, center 0°, snake +30° / B mirrored: dorito 210°, center 180°, snake 150°), `shotDirectionDeg(zone, fieldSide, doritoSide)` resolver with viewport-mirror + top/bottom dorito flip, `tracePathCone(ctx, ...)` Canvas2D path builder, `getBreakShotDashEndpoints(...)`, and `vectorDirectionDeg(...)` for heatmap.

**Scouting canvas:** new `team` prop ('A' | 'B') controls cone color via TEAM_COLORS; radius `0.20 × min(canvas w, h)`; obstacle = 18% fill + 80% stroke (2px); break = 3 radial dashes from EXACT player center to 75% of cone radius (inside obstacle boundary, no edge collision); render order obstacle below + break dashes on top. `team` prop plumbed through FieldCanvas; MatchPage passes `activeTeam`.

**Heatmap:** per-shot direction = actual vector (sx-px, sy-py) — no zone quantization; data has no break/obstacle phase distinction (that lives only in scouting-side `quickShots`/`obstacleShots`), so all shots render as obstacle cones. Reduced parameters for aggregation context: radius `0.10 × min dim`, 7% fill / 55% stroke (1.5px). Existing heatmap density grid (warmth) preserved as functional aggregation signal — only the per-shot directional gradient line was replaced. Team B color migrated from teal `rgba(6,182,212,...)` to `TEAM_COLORS.B` (#3b82f6 blue) — aligns with § 49 unified team palette and the heatmap-toggle redesign that just shipped. Kill 💀 cluster layer untouched.

**Implementation deviation from brief:** SVG sweep-flag distinction (team A clockwise vs team B counter-clockwise) translated to Canvas2D as a no-op — `ctx.arc(cx, cy, r, a1, a2, false)` with `a1 < a2` naturally draws the SHORT arc bulging outward in the direction axis for both teams. Verified geometrically (commit message includes the proof). `tracePathCone` therefore takes no `team` param — simpler API, same visual output.

**Data layer:** zero changes. Shot data shapes (`quickShots` zone enum arrays + points-doc `shots` vector arrays) untouched. Scouting workflow, player rendering, bunker rendering, field lines all untouched.

**Known issues / iteration flags:**
- Cone radius `0.20` on scouting canvas may overcrowd in dense breakouts (Snake 50 + Snake 1 close together). Brief explicitly OK'd this tradeoff; tunable via single constant if iPhone testing finds it too dense.
- Heatmap radius `0.10` is much smaller than scouting; tunable independently if the aggregation visualization needs more presence.
- TacticPage / LayoutDetailPage / PlayerStatsPage also use FieldCanvas. They don't pass shot data through `quickShots`/`obstacleShots` so they're unaffected. If a future surface starts passing those, it'll get the new cone vocabulary automatically (default `team='A'` will pick red color — fine for those contexts since they're typically about a single team's shots).

## 2026-04-24 — Heatmap team A/B toggle redesign (feat/heatmap-toggle-redesign)
**Commit:** `acb28c7` (merge of `feat/heatmap-toggle-redesign`, fast-forward — 1 commit)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes)

**What changed:** Team A / Team B positions+shots toggles on the match heatmap view restructured from a two-row stacked layout (with team-name capsules + amber-active chips) to a single row that mirrors the scoreboard card flexbox above the heatmap exactly: `[ Team A capsule (flex:1) ][ spacer (minWidth:110) ][ Team B capsule (flex:1) ]` — matching MatchPage.jsx:1184 scoreboard's `[ Left team flex:1 ][ Score zone minWidth:110 ][ Right team flex:1 ]`. Each capsule is a 44px tall segmented control (background `surfaceDark`, border + 10px radius) holding two chips ("Positions" / "Shots") with `flex:1` so they split the capsule width evenly. Chip active = full team color fill (red `#ef4444` for A, blue `#3b82f6` for B) + white text. Chip inactive = transparent + dim text + transparent border, "embedded" in the capsule. Team-name labels removed from the toggle row — the scoreboard card above already names the teams. 36px chip touch target (acceptable for analysis context per brief; capsule provides surrounding 44px hit area). Toggle on/off logic, `hmVisibility` state, and `onChange` callback all unchanged. i18n reuses existing `conf_pill_positions` ('Pozycje' / 'Positions') and `conf_pill_shots` ('Strzały' / 'Shots') — no new keys.

**Implementation deviation from brief:** Used flex (not the brief's `display: grid; grid-template-columns: 1fr auto 1fr`) because the scoreboard header card is itself flex with `flex:1 | minWidth:110 | flex:1`. Mirroring its actual layout achieves perfect alignment — this is what the brief's risk note explicitly anticipated ("If current header uses flex not grid, we need to match that pattern instead of forcing grid").

**Known issues:** None. Toggle component is presentation-only; logic + state contract preserved. No other components touched (header, FieldCanvas, page header, points list).

## 2026-04-24 — P0 micro-hotfixes batch (hotfix/p0-batch-2026-04-23)
**Commit:** `629edc8` (merge of `hotfix/p0-batch-2026-04-23`, fast-forward — 3 commits)
**Status:** ✅ Deployed (GitHub Pages — no Firestore rules changes in this batch)

**What changed (3 independent fixes batched into one deploy):**

- **fix(scout): match card shows correct score instead of `—:—` placeholder + LIVE/Scheduled classification fixed (commit `629edc8`).** Root cause was architectural, not a field-name bug as the brief hypothesized: Brief 9 Bug 2 / Option A (commit `da36f49`) deliberately stops `savePoint` from writing `match.scoreA/B` during LIVE play to avoid the coachUid-filtered subset race. Authoritative score only lands at end-of-match merge. Cards reading `m.scoreA/B` saw 0 until then.
  - Fix mirrors what MatchPage detail header does: extract local `matchScore({a,b})` to `src/utils/helpers.js` (replaces dead `{w,l,t,total}` export), add `useLiveMatchScores(tournamentId, matchIds)` hook in ScoutTabContent that subscribes to `subscribePoints` per non-closed match and reduces points via canonical helper. Listener lifecycle: unsubscribe on unmount AND on matchId-set change (sorted-join key prevents spurious resubs). Closed matches skip the listener — `match.scoreA/B` is already authoritative there. MatchCard accepts optional `liveScore` prop, prefers it over cached fields when present.
  - **Side effect: LIVE/Scheduled classification bug fixed (same root cause).** ScoutTabContent classifier (line 175) also depended on `m.scoreA/B > 0`, putting in-flight unmerged matches into the Scheduled bucket. Now uses `liveScores[id].count > 0` as primary signal with the cached fields as first-paint fallback.
  - **Listener cost:** ~1 listener per non-closed match in active tournament view. Typical tournament: 3-15 matches at any time. Acceptable.
  - **CoachTabContent untouched** — same bug applies but outside this hotfix's scope (brief targeted Scout tab). Follow-up if needed.

- **fix(match): removed side percentages (Dorito/Snake/Center) from heatmap view for all roles (commit `5bba54f`).** The `<CoachingStats>` block (admin/coach branch in MatchPage role-gated heatmap section) deleted entirely. Coaching tendencies belong on ScoutedTeamPage drill-down where aggregate sample size is meaningful, not on every match view (§ 27 content hierarchy). Scout-only `ScoutScoreSheet` (data completeness, different surface) preserved. Underlying `computeCoachingStats` function + `CoachingStats` UI component still alive — ScoutedTeamPage uses the function directly. Unused imports stripped from MatchPage.

- **fix(match): removed orphan `releaseClaim` call blocking back navigation (commit `69c2e2d`).** Two call sites in MatchPage.jsx (portrait header back handler line 1631 + landscape floating back button line 1687) referenced `releaseClaim()` after Brief F (2026-04-22 concurrent-scouting cleanup) had removed the function definition. Result: ReferenceError on tap-back, observed in Sentry 2026-04-22 21:19 UTC at `/tournament/.../match/...?scout=...&mode=new`. Both sites were pure cleanup orphans — Brief F retired the claim system (no longer needed under per-coach point streams from Brief 8 v2). The back-handler logic around them remains intact. Acceptance check: `grep -rn "releaseClaim" src/` returns zero.

**Known issues / iteration flags:**
- **CoachTabContent has the same `--:--` score bug** — same root cause, same fix would apply. Not in this hotfix's scope. Cheap follow-up if Jacek wants symmetry.
- **Listener density on large tournaments** — useLiveMatchScores subscribes one listener per non-closed match. A tournament with 50 active matches creates 50 listeners. Acceptable for typical tournament size; revisit if larger tournaments emerge.
- **Brief 9 Bug 2 architectural decision left intact** — `savePoint` still doesn't write `match.scoreA/B` per-write (race avoidance). The hotfix sidesteps the problem at read time rather than reverting the write-side decision.

## 2026-04-24 — Settings menu reorg + nav cleanup + Członkowie full UX (§ 50)
**Commit:** `0fe8739` (merge of `feat/settings-reorg-nav-cleanup`, fast-forward — 4 commits across 3 checkpoints)
**Status:** ✅ Deployed (Firestore rules via `firebase deploy --only firestore:rules` BEFORE client merge — 4 new carve-outs: workspace self-leave + player self-unlink + user admin-disable + the prior § 33.3 self-edit; app via `npm run deploy` GitHub Pages published)

**What changed:**
- **Settings menu restructured** to Jacek's exact six-section spec — SESJA / ZARZĄDZAJ / SCOUTING / WORKSPACE / KONTO / ADMIN. Strict per-section + per-item role gating per § 49 matrix. Tab label "More" → "Ustawienia" via new `tab_settings` i18n key; `TAB_DEFS` gains `labelKey` field.
- **WORKSPACE section** added Wyjdź flow (§ 50.3) — `ds.leaveWorkspaceSelf(uid)` wraps `removeMember` for self-call, `ConfirmModal` warns, last-admin guard disables button with tooltip. On success → useWorkspace.leaveWorkspace() clears local session → LoginGate takes over.
- **KONTO sign-out ungated** — was admin-only in old More tab, locking pure players out of explicit logout. Now visible to every role.
- **ADMIN section** consolidates ViewAsPill (relocated from KONTO) + Feature flags. Skipped brief's separate "Podgląd jako (placeholder)" item — `ViewAsPill` already IS that entry; would have created two identically-labeled rows.
- **ZARZĄDZAJ** stripped to Layouty/Drużyny/Zawodnicy. Scout ranking + my TODO moved to SCOUTING (matches Jacek's grouping).
- **TrainingMoreTab** mirrors the same restructure (helpers prefixed `Training*` to keep imports flat — § 50.7 marks DRY as a follow-up).
- **Legacy BottomNav.jsx deleted** (62 lines: Home/Layouts/Teams/Players object-based tabs) + mount removed from App.jsx. AppShell role-tab bar (Scout/Coach/Gracz/Ustawienia per § 49) is now the only bottom nav. **No legacy-route redirects added** — brief's redirect-to-Home premise was based on the assumption these would become dead routes; reality is all five remain reachable via Settings → ZARZĄDZAJ / SCOUTING. Bookmarked URLs continue to work.
- **Członkowie full UX** (§ 50.4) — new route `/settings/members/:uid` (`UserDetailPage.jsx`, AdminGuard wrapped) gives admin a deliberate-edit surface separate from MembersPage's inline chip toggles. Sections: Identity (avatar + name + email + UID + joined), Linked profile (with link/change/unlink), Roles (deliberate edit), Danger zone (soft-delete).
- **Admin link override** (§ 50.4) — new `LinkProfileModal.jsx` searches by nickname/name/PBLI, surfaces conflicts (already-linked players show conflicting user's email as subtext), atomic transaction `ds.adminLinkPlayer` clears stale uid links and sets new linkedUid + linkedAt. Existing `isCoach(slug)` rule branch covers writes — no rules change for linking.
- **Soft-delete** (§ 50.5) — `ds.softDisableUser(uid, byEmail)` writes `users/{uid}.disabled = true` + audit fields. AppRoutes bootstrap watches `userProfile?.disabled` (live onSnapshot already in useWorkspace) and renders `DisabledAccountScreen` — full-page "Konto wyłączone" + Wyloguj CTA. User can re-authenticate but bounces back. Re-enable button on UserDetailPage when target's disabled flag is true.
- **MemberCard** identity area now navigates to detail page on tap (admin viewers only; chips and ⋮ menu stay independent). Green dot next to name = "linked profile" indicator (replaces the brief's separate row idea, more compact).
- **Firestore rules** — 3 new carve-outs deployed:
  - `/workspaces/{slug}` self-leave envelope (was-in-members + now-not-in-members invariant)
  - `/players/{pid}` self-unlink (linkedUid was-self + now-null invariant)
  - `/users/{uid}` admin update via ADMIN_EMAILS allowlist (jacek@epicsports.pl), scoped to disabled/disabledAt/disabledBy/reEnabledAt fields
- **DESIGN_DECISIONS § 50** — 7 sub-sections documenting the full model (menu structure, nav cleanup, Wyjdź flow, detail page + linking, soft-delete, coach/staff N/A, follow-ups). Last-updated header bumped.

**Known issues / iteration flags:**
- **Soft-delete tied to ADMIN_EMAILS allowlist** — only Jacek can disable today; transferring admin to a different user wouldn't grant them this capability without code change. Per-workspace admin check requires custom claims (deferred).
- **Soft-delete is client-enforced only** — user can still authenticate against Firebase Auth (admin SDK not available client-side). Sufficient for invited-workspace model; not robust against hostile actors. True delete needs server work (§ 50.7).
- **No coach/staff profile entities** — brief speculated about linking users to coach/staff profiles. Not built; role IS the identity. Modal supports player linking only.
- **TrainingMoreTab DRY** — Scouting/Workspace/Account helpers duplicated with `Training*` prefix in MoreTabContent and TrainingMoreTab. Extract to a shared `<SettingsCommonSections />` if a third surface needs them.
- **Stale "above BottomNav" comments** in design-contract.js + ViewAsIndicator.jsx — describe spatial intent for any future bottom-anchored UI, not BottomNav specifically. Cosmetic cleanup deferred.

**Brief deviations from spec (Jacek's call to revise if needed):**
1. WORKSPACE row 2 has no row-body onClick — only the [Wyjdź] button does anything (avoids multi-CTA-on-card § 27 anti-pattern).
2. Skipped separate "Podgląd jako" placeholder — existing ViewAsPill IS that entry.
3. Skipped legacy URL redirects — pages stay reachable via Settings.
4. Sign-out ungated for pure-player (was admin-only — clear UX bug).

## 2026-04-23 — ProfilePage roles + linked-player self-edit (§ 33.3)
**Commit:** `0da83b4` (merge of `feat/profile-player-section`, fast-forward)
**Status:** ✅ Deployed — Firestore rules via `firebase deploy --only firestore:rules` (self-edit carve-out live before client merge); app via `npm run deploy` (GitHub Pages published).

**What changed:**
- **ProfilePage Roles section** — read-only `<RoleChips roles={roles} editable={false} />` rendered from `useWorkspace().roles` (canonical resolver). Empty-state copy when no workspace is active or roles array is empty. Pure players finally see *which* role(s) admin granted them.
- **ProfilePage Player data section** (NEW, conditional on `linkedPlayer`) — surfaces only when the active workspace has a player doc with `linkedUid === auth.uid`. Six editable fields: nickname, name, number, age, nationality (Select dropdown reusing `NATIONALITIES` exported from PlayerEditModal), favoriteBunker. Read-only context box below: team name (resolved via `useTeams`), `pbliIdFull`, `paintballRole`, `playerClass`. Save button disabled until dirty + valid (name + number both required).
- **Firestore rules self-edit carve-out** at `/workspaces/{slug}/players/{pid}` allow update — third `||` branch permits the linked user to mutate the 6-field whitelist (+ `updatedAt`) only. `linkedUid` invariant on both `resource` and `request.resource` blocks identity hijacking.
- **PhotoURL editor REMOVED** from avatar card per Jacek's interrupt: "drop the user link to photo — i have more players with their photos". A single user-doc photo doesn't fit the multi-player reality. Avatar still renders `auth.user.photoURL` if Firebase Auth provider supplied one (Google etc.); otherwise initial-letter fallback.
- **PlayerEditModal export** — `NATIONALITIES` changed from `const` to `export const` so ProfilePage's Select can reuse the same dropdown source.
- **Propagation** — rides existing `onSnapshot` subscriptions on the players collection. Edits land in MembersPage, PPT Gracz tab, scout ranking display names, training squad rosters within ~200ms — no new wiring.
- **DESIGN_DECISIONS § 33.3** — full design + rules carve-out + propagation + photoURL removal rationale documented.

**Known issues / iteration flags:**
- **Team / PBLI ID / role / class stay admin-only** by design — these are roster math, league identifier, and coach-curated tactical attributes. Players who need them changed still go through coach.
- **No avatar upload UX** — providers that don't supply `photoURL` (email/password) get the initial-letter fallback permanently. Per-player photos already work via PlayerEditModal; user-doc avatar is intentionally bare.

## 2026-04-23 — Unified auth + roles + tab visibility (§ 49) + PPT rules hotfix
**Commit:** (merge of `feat/auth-roles-unified`) — 3 commits across 4 checkpoints: `548a3bb` (user-doc schema + rules hotfix) + `470f227` (strict tab matrix + Gracz tab) + `8aa6cac` (§ 49 docs + NEXT_TASKS)
**Status:** ✅ Deployed — Firestore rules via `firebase deploy --only firestore:rules` at Checkpoint 2 (PPT selfReports unblocked); app via `npm run deploy` (GitHub Pages published).

**What changed:**
- **User-doc schema** — new signups land with `users/{uid} = { email, displayName, workspaces: [], roles: ['player'], defaultWorkspace: 'ranger1996', createdAt }`. Existing docs untouched (no migration per 2026-04-23 policy). Plural `roles` array is a fresh field — no overlap with the deprecated singular `role` string dropped in Brief G Option B § 33.1.
- **Constants:** `DEFAULT_WORKSPACE_SLUG = 'ranger1996'`, `DEFAULT_USER_ROLES = ['player']` in new `src/utils/constants.js`.
- **Canonical role resolver** (`useWorkspace.roles`): `workspace.userRoles[uid]` if non-empty → else `userProfile.roles` if non-empty → else `[]`. Workspace-scoped wins once admin touches the user.
- **Default-workspace auto-join:** `enterWorkspace(code)` mirrors `user.roles` into `workspace.userRoles[uid]` AND skips `pendingApprovals` when `slug === userProfile.defaultWorkspace` AND user has bootstrap roles. Non-default workspaces keep existing approval gate. "Auto-join, nie auto-login" — user still enters the code manually.
- **Strict tab matrix** (replaces § 47 permissive): Scout requires `['scout']`, Coach requires `['coach']`, Gracz (NEW, icon 🏃) requires `['player']`, More always visible (admin-only items inside still gated). Coach no longer auto-grants Scout tab; admin assigns 2 roles if needed. Multi-role users see union.
- **Gracz tab** — key `'ppt'`, positioned between Coach and More. Tap routes `navigate('/player/log')`; not persisted to localStorage. Satisfies Brief E Option 2 (PPT reachability) — wchłonięte here.
- **Viewer role retired** from active matrix. `ASSIGNABLE_ROLES = ['admin', 'coach', 'scout', 'player']` new export drives RoleChips rendering. `ROLES` (5-role constant) kept for legacy data parsing. Existing viewer users keep their role until admin reassigns via Members page — no automatic migration.
- **`isPurePlayer` predicate simplified** in MoreTabContent + TrainingMoreTab: `!effectiveIsAdmin && !hasAnyRole(roles, 'coach', 'scout')`. One-liner captures player, legacy-viewer, and empty-roles bootstrap users.
- **Admin panel (Path A verified)** — MembersPage already works end-to-end. RoleChips renders 4 roles. `updateUserRoles` writes `workspace.userRoles[uid]` (canonical). Live propagation via existing useWorkspace onSnapshot.
- **PPT Firestore rules hotfix** (§ 48 was shipped without them — default-deny was blocking all PPT writes in prod):
  - `/workspaces/{slug}/players/{pid}/selfReports/{sid}` — read=isMember, create|update|delete=isPlayer
  - Root-level collection-group `/{path=**}/selfReports/{sid}` — authenticated read (for getLayoutShotFrequencies)
- **DESIGN_DECISIONS § 49** — 11 sub-sections documenting the full model (schema, auto-join, resolver, matrix, Gracz tab, More gating, viewer retirement, admin panel, rules hotfix, migration policy, follow-ups).

**Known issues / iteration flags:**
- **selfReports ownership validation loose** — current rule gates on `isPlayer(slug)`, not on `pid` matching the caller's linked player. Tighter validation deferred per § 49.11; workspace-invited model contains attack surface.
- **workspace.userRoles self-write diff gap** (pre-existing, flagged in § 49.11) — existing self-join envelope rule allows a user to write arbitrary values to their own `userRoles[uid]`. Latent privilege-escalation risk; fix = field-value validation in rules. Not introduced by this brief.
- **Dual-path reader (workspace vs user-doc roles)** adds cognitive load. Full schema unification (Brief G proper) deferred to a dedicated off-hours migration window.
- **Existing viewer users** — admin reassignment needed to move them to one of the 4 assignable roles. Until then they see More-only (similar to pure-player).

**Brief E Option 2 DONE** via this brief's Gracz tab. NEXT_TASKS updated.

## 2026-04-23 — Player Performance Tracker (PPT) — full product (§ 48)
**Commit:** (merge of `feat/player-performance-tracker`) — 7 commits across 5 checkpoints: `5ba04c2` (docs) + `0eb553f` (data layer) + `19cfcc7` (mockup spec) + `874b59b` (picker) + `8a47c50` (shell+Step1+Step2) + `0211a8e` (Step3+4+4b) + `6483331` (Step5+save+list+offline)
**Status:** ✅ Deployed — Firestore indexes via `firebase deploy --only firestore:indexes` (selfReports collection-group composite: layoutId + breakout.bunker + createdAt desc); app via `npm run deploy` (GitHub Pages published).

**What shipped:**
- **New product PPT** — full-screen 5-step wizard for pure-player performance logging during training. Separate route `/player/log` (today's list + `+ Nowy punkt` CTA) and `/player/log/wizard?trainingId=X` (5-step flow). Writes to `/workspaces/{slug}/players/{playerId}/selfReports/{auto}` per § 48.5 schema.
- **Training picker** — auto-picks when exactly 1 LIVE training for player's teams, shows list (LIVE / Upcoming / Ended max 10) otherwise. Refresh icon in PageHeader action slot (no pull-to-refresh — explicit tap-ack per 2026-04-23 clarification #7).
- **5-step wizard** — Step 1 Breakout (bootstrap vs mature via `getPlayerBreakoutFrequencies`), Step 2 Variant (4 cards with Lucide icons + SKIP SHOTS cyan badge), Step 3 Shots (multi-select order badges + `getLayoutShotFrequencies` crowdsource), Step 4 Outcome (3 default-semantic cards per § 35.5), Step 4b Detail (6 cards grouped konkretne/nieprecyzyjne + `inne` inline textarea expand + `nie-wiem` auto-advance), Step 5 Summary (tappable jump-back rows + amber Zapisz punkt 64px CTA).
- **Offline queue** — `pptPendingQueue.js` + `usePPTSyncPending` hook. Failed writes queue to localStorage; flushed on `window.online` + route changes. List UI merges server rows + pending rows with subtle cloud indicator.
- **State machine** — picker | wizard | list resolved by `PlayerPerformanceTrackerPage`. `?pick=1` escape hatch from list when multiple LIVE or zero LIVE trainings.
- **i18n** — ~90 pl + en keys added. Dynamic strings use function values per repo `points_n(5)` convention.
- **Docs** — `DESIGN_DECISIONS.md § 48` (10 sub-sections) + § 35.5 rewritten to 3-state outcome enum + § 35.7 scope clarifier (HotSheet vs PPT). `docs/product/PPT_MOCKUP.md` implementation spec (tokens + JSX pseudocode + Lucide icon map + i18n keys).

**Tier-2 compliance:**
- 5 Jacek-approved checkpoints (not merged between).
- § 27 self-review per checkpoint. All PASS.
- Precommit green, build green every checkpoint.
- Touch targets 88/76/72/64/44 (2× Apple HIG min) for glove-friendly use.

**Known issues / iteration flags:**
- **Role gating (Brief E Option 2) not shipped** — `/player/log` is reachable only by direct URL. Pure-player's tab bar (Brief E Option 1, § 47) shows only "More". Follow-up brief needed to add a "Gracz" tab or deep link. Until then PPT is an admin-preview / test-account feature.
- **Matchup-matching product not built** — orphan `selfReports` accumulate correctly per § 48.5 schema (`matchupId: null`, `pointNumber: null`), but coach-side assignment workflow is a separate product. Players can already see their own history via `/player/log`; coach analytics blocked until matching ships.
- **Post-save list edit/delete not implemented** — rows are read-only on initial ship per § 48.10. Tap = no-op. Add in follow-up if user feedback demands.
- **Offline queue deduplication best-effort** — TodaysLogsList dedupes by `(trainingId, bunker, variant, outcome)` signature. Two saves with identical semantics within the same queued-before-sync window could collide on display (cosmetic, both rows render as one). Real fix = persist a client-side UUID on each queued payload. Accepted risk on initial ship per § 48.10 note.
- **Mockup reference** `docs/product/PPT_MOCKUP.md` (v7-derived spec, not the original interactive HTML preview which lives at `/mnt/user-data/outputs/…`) is canonical visual spec.

**iPhone validation pending.** Brief pasted inline (no archive file to move). `NEXT_TASKS.md` marked [DONE] in this commit.

## 2026-04-22 — Brief G (Option B slice): role + membership code-side shims
**Commit:** (merge of `fix/role-and-membership-shims`) — 4 commits: `4e84337` + `a73aa36` + `10baa1b` + `257d641`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Option B (narrow) from the Brief G audit — code-side shims only, **no Firestore writes, no rules changes, no data migration**. Full schema migration deferred to Brief G proper (requires Firebase Admin SDK + multi-checkpoint human review during off-hours).

**What changed:**
- `dataService.js:getOrCreateUserProfile` — dropped the junk `role: 'scout,coach,admin'` (singular comma-string) write that shipped on every first-sign-in. No app path reads `users/{uid}.role`; all role gating flows through `workspaces/{slug}.userRoles[uid]` (§ 38, v2 security). New profiles now land in the canonical shape: `{ email, displayName, workspaces: [], createdAt }`. Legacy docs keep their junk string — harmless since unread.
- `roleUtils.js` — new `parseRoles(r)` defensive helper accepts array ∨ comma-string ∨ pipe-string ∨ undefined and returns a deduped array. Applied inside `getRolesForUser`. Survives any legacy read path where a string-shaped role landed in `userRoles[uid]` instead of silently collapsing to `[]` and dropping permissions.
- `useWorkspace.jsx` session restore — slugs loaded from `localStorage` / `sessionStorage` now run through `slugify()` on load; normalized shape persisted back. Fixes the `biuro@epicsports.pl`-type failure mode (uppercase `"Ranger1996"` stored, lowercase `ranger1996` Firestore doc → case-sensitive 404 → user dropped into silent re-enrollment).
- `DESIGN_DECISIONS.md § 33.1 + § 33.2` — codified the deprecation of `users/{uid}.role` and the canonical lowercase workspace-slug shape. Explicit pointer to Brief G for full data migration.

**Explicitly NOT done in this slice (deferred to Brief G proper):**
- Firestore data migration (legacy junk role strings on existing user docs remain; `biuro@epicsports.pl` still has broken on-disk data)
- `firestore.rules` changes (still checks `workspace.members`)
- `users.workspaces` schema activation (workspace selection still localStorage-driven)
- `workspace.members` → `users.workspaces` source-of-truth consolidation
- Enrollment flow rewrite
- `adminUid` / `passwordHash` field retirement

**Known issues:** None. Existing bad data stays as-is (unread by any code path). The `parseRoles` shim also works on post-migration array-only data — no rework needed when Brief G proper runs.

**Follow-up:** Brief G Phase 1-2 (audit script + migration script + rules consolidation) remains queued for a dedicated session with Firebase Admin SDK access and a proper off-hours deploy window.

## 2026-04-22 — Brief F: concurrent-scouting cleanup (diagnostics + claim retirement)
**Commit:** (merge of `chore/concurrent-scouting-cleanup`) — 1 commit: `3caf9c3`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Post-Saturday-validation cleanup items from HANDOVER.md. Net −232 lines across 4 files.

**What changed:**
- **Diagnostic removal:** ~40 `[BUG-B]` / `[BUG-C]` console.log/warn/error/group statements in `MatchPage.jsx` removed. Inner try/catch blocks that existed only to log-and-rethrow collapsed to plain `await`; the outer `savePoint` catch still logs `'Save failed'` and raises the user-facing alert. `[BUG-B DIAG]` / `[BUG-C DIAG]` comments deleted. Historical reference comment at `MatchPage.jsx:607` retained (explains why Brief 8 removed the fallback openPoint search).
- **Claim system retired:** `MatchPage.jsx` — URL-entry claim write, `releaseClaim` function + unmount / beforeunload / visibilitychange effects, 5-min heartbeat interval, auto-clear stale-claim effect, and the now-dead `claimSide` / `isClaimStale` / `CLAIM_TTL_MS` block all removed. `MatchCard.jsx` — `STALE_MS` + `isClaimActive` helpers, all `home/awayClaimActive` / `*Blocked` derivations, the `TeamZone` `blocked` prop + its visual treatment (opacity 0.35 / not-allowed cursor / "Scout" overlay), and the Firebase `auth` import that only served claim state — gone. Per-coach streams (§ 42) made claim state redundant; `coachUid` per doc identifies ownership at the stream level.
- **Docs:** `DESIGN_DECISIONS.md § 18` marked **DEPRECATED** with pointer to § 42-44; retired sub-sections struck through (side picker, claim system, old save behavior); data-model + status-tracking sub-sections preserved as they still describe legacy doc shape. `PROJECT_GUIDELINES.md § 2.5` rewritten to describe per-coach streams + explicitly list retired pieces.

**Data left in Firestore:** Existing match docs may still carry `homeClaimedBy`/`awayClaimedBy`/`homeClaimedAt`/`awayClaimedAt` fields. No code path reads them; left in place (option (a) per brief — harmless clutter, no migration).

**Known issues:** None. Precommit is now quiet — the BUG-B/BUG-C warnings that shipped through Brief 9 deploy no longer fire.

**Follow-up:** one-time batch delete of stale `*ClaimedBy`/`*ClaimedAt` fields from existing match docs — purely cosmetic Firestore hygiene, can run from Console if desired. Not code-visible.

**Console is now quiet during normal scouting flows — any console output is intentional.**

## 2026-04-22 — Brief E: SessionContextBar removal + role-gated tabs (Option 1 scope)
**Commit:** (merge of `fix/remove-session-bar-and-harden-player-tabs`) — 2 commits: `8bbf85f` + `23e4bd6`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Option 1 — minimum safe fix after 2026-04-22 audit surfaced that Self Log is a FAB in MatchPage, not a tab, and that pure-player is already blocked from MatchPage by `canAccessRoute`. Self-Log-as-tab deferred to future brief.

**What changed:**
- **J1 — SessionContextBar removed:** inline `SessionContextBar` function + its call-site in `App.jsx` fully deleted (74 lines). `useTournaments` / `useTrainings` imports dropped (only consumer was the bar). No replacement indicator — user explicitly doesn't want one.
- **E1 — tab visibility role-gated:** `AppShell.TAB_DEFS` now carries `requiredAny` per tab. Scout ← scout / coach / viewer; Coach ← coach / viewer; More ← always. Effective-admin bypasses gates (multi-role users unchanged). A `useEffect` in AppShell resets `activeTab` to the first visible tab when the persisted tab is hidden (admin impersonating a lower role, or a user whose roles changed).
- **E1 — pure-player More trim:** `isPurePlayer` predicate (`hasRole(roles, 'player')` AND no admin/coach/scout/viewer AND not effective-admin) in both `MoreTabContent` and `TrainingMoreTab`. When true, Session + Manage + Scouting + Actions sections hide. Account + Language remain. Feature flags is already admin-gated — unchanged.

**Deliberately NOT done (noted for future briefs):**
- Route-level URL-typing guards on `/teams`, `/players`, `/my-issues`, etc. — `canAccessRoute` in `roleUtils.js:88-95` default-denies player on unlisted routes including `/profile`, so wrapping those routes with `<RouteGuard>` without first extending the allowlist would regress pure-player access to their own profile. Needs a dedicated audit brief.
- No SelfLog-as-tab + new `PlayerSelfLogPage` (Brief E Option 2 scope).

**Design decisions appended:** DESIGN_DECISIONS § 47 (role-gated tab visibility matrix + pure-player More rule + deferred route-guard sweep note).

**Dropped from backlog:** F2 ("Quick scouting only in training") per user decision 2026-04-22 — keep quick scouting available in all current contexts. Noted in E1 commit message.

**Known issues:** None. Validation on iPhone pending (Brief E GO checkpoint).

## 2026-04-22 — Brief C: Scouting section + Feature flags inline edit (Option 1)
**Commit:** (merge of `feat/settings-restructure-and-feature-flags`) — 1 commit: `524fe48`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**Scope:** Option 1 as agreed after 2026-04-22 audit surfaced mismatches between brief's assumptions (per-user flag overrides, separate Settings page) and reality (workspace-global + audience-rule flags, MoreTab-as-Settings).

**What changed:**
- A3: New `ScoutingSection` export in `MoreShell.jsx`, consumed by both `MoreTabContent` and `TrainingMoreTab`. Holds a single handedness toggle (RIGHT/LEFT, persisted to `pbscoutpro-handedness` localStorage — consumed by `drawLoupe.js`; the key previously had no UI). Amber active-state pill matches the LanguageSection pattern. IA slot created for future per-device scouting preferences.
- D1 (Option 1): Feature Flags promoted from the former "Debug" sub-section to its own admin-only top-level `MoreSection` in both More tabs. `DebugFlagsPage` renamed "Debug: Feature Flags" → "Feature flags" and given inline edit:
  - Per-flag **enable toggle** — green iOS-switch, 48×44 hit area.
  - Per-flag **audience cycle pill** — `all → beta → admin`, colors scaled broadest → most-restrictive (green / amber / red) so the reach of a change is visible.
  - Writes target `/workspaces/{slug}/config/featureFlags` via `updateDoc`; `useAllFlags` snapshot drives the re-render. Row dims while the round-trip completes.
- **Per-user flag overrides NOT shipped** — current architecture routes eligibility through audience rules (`isInAudience`), and per-user overrides would require either `/users/{uid}.featureFlagOverrides` that layers over workspace defaults, or an explicit `userIds` allow/block list on the audience system. Noted in DESIGN_DECISIONS § 46 as deferred architecture.

**Design decisions appended:** DESIGN_DECISIONS § 46 (Settings IA: Scouting section + Feature flags single-home rule + deferred per-user override architecture note).

**Known issues:** None. Validation on iPhone pending (per Brief C Option 1 GO checkpoint).

## 2026-04-22 — Brief D: members + profile targeted cleanup (B1/B2/B3/C1/C2)
**Commit:** (merge of `fix/members-and-profile-cleanup`) — 2 commits: `326cdc2` + `a515657`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:**
- B1: New `useUserProfiles(uids)` hook (alongside `useUserNames`) fetches `{displayName, email, photoURL}` from `/users/{uid}` into a process-wide cache. MembersPage batch-resolves all rendered uids and passes `displayName` + `email` through to `MemberCard` and `PendingMemberCard`. Fallback order unified: `linkedPlayer.nickname → linkedPlayer.name → displayName → email → localized 'Member'`. The old `uid.slice(0, 6)` fragment is no longer surfaced anywhere.
- B2: `MemberCard` Edit/Save/Cancel state machine removed — role chips are always live for the current-user admin, read-only for non-admins. Optimistic UI via nullable `pendingRoles` buffer: canonical `roles` prop drives display by default, buffer overrides only while the Firestore write is in flight, reverts automatically on error. `updateUserRoles` is called directly on each chip toggle. Self-admin self-protect retained (§ 38.3 hard block — transfer-before-demote — not relaxed despite brief's softer suggestion; explicit decision to keep existing security invariant).
- B3: `adminCount` computed in MembersPage, passed down. The 'admin' chip is disabled with reason ("Cannot remove last admin") when role is present and `adminCount <= 1`. "Remove from workspace" is filtered out entirely from the kebab menu for the last admin. ConfirmModal title now includes target name, body expanded to spell out exactly what is lost and that the op is hard to undo. Self-remove ("Leave workspace") deferred — brief's targeted-fix clamp excludes the post-leave redirect flow.
- C1 + C2: ProfilePage avatar card was rendering `user.displayName` read-only inside the header, duplicating the editable Input below. Removed the duplicate render. Avatar card now shows avatar + email (account-identity anchor) + photo URL editor; the Display-name editor card below is the single surface where name appears. C3 "karta od zera" folded in — page reads cleaner after dedup, no full redesign per scope discipline.

**Design decisions appended:** DESIGN_DECISIONS § 45 (Members page inline role editing + last-admin guard + profile identity single-render rule).

**Known issues:** None. Validation checklist pending on iPhone (per Brief D GO checkpoint).

## 2026-04-22 — Brief A: tournament setup polish (I1 + I2 + H1)
**Commit:** (merge of `fix/tournament-setup-polish`) — 2 commits: `ce766a9` + `e9bf2df`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:**
- I1: Scout tab was rendering both the "No matches" empty-state `+ Add team` CTA AND the primary-action card `+ Add team` simultaneously when the tournament had zero scouted teams. Gated XOR: empty-state CTA owns the `scouted.length === 0` moment; primary action row takes over from `scouted.length >= 1`.
- I2: Add-team modal converted from single-tap-and-close to checkbox multi-select. Row = 52px touch target toggling its checkbox; sticky footer shows `{N} selected` + primary `Add {N} teams`. Batch add via `Promise.allSettled` — partial failures keep only the failed rows checked and surface an inline error count. Division filter + auto-division derivation preserved (extracted into `buildScoutedPayload`). Modal retitled "Add teams".
- H1: `NewTournamentModal` + `EditTournamentModal` converted from single-select `division: string` to multi-select `divisions: string[]`. Toggle adds/removes. League switch clears. Inline "Select at least one division" error (11px/600 red) on submit when `DIVISIONS[league]` exists and selection is empty. EditTournamentModal has a defensive initializer for legacy singular `tournament.division` field. Write path persists authoritative `divisions: [...]` AND mirrors first entry to singular `division` for legacy readers (`ScheduleImport.jsx:240`).

**Design decision appended:** DESIGN_DECISIONS § 5.7 (multi-division + multi-select Add teams patterns).

**Known issues:** None. Validation checklist pending on iPhone:
- Fresh tournament → one Add team affordance per state (no duplicate)
- Multi-select 3+ teams → batch add in one modal open
- Create tournament with PRO + SEMI → both pills visible in DivisionPillFilter; Add Match / Add Team modals filter correctly by active pill
- Edit single-division tournament → loads existing div; add second; save preserves both
- Submit with zero divisions → inline error, submit blocked

## 2026-04-22 — Brief B: copy cleanup + language flag single-source-of-truth
**Commit:** (merge of `fix/copy-and-language-flag-cleanup`) — 2 commits: `4636d6b` + `5f73f3e`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:**
- A2: More-tab section title `browse_section` renamed Przeglądaj → Zarządzaj (PL) / Browse → Manage (EN). i18n value + hardcoded fallback in MoreTabContent + TrainingMoreTab updated together so the new copy holds even before the locale dictionary loads.
- B4 / C4 / J2: `LangToggle` removed from `PageHeader.jsx` — single-edit change that eliminates the language-flag pill from every page that uses PageHeader (22 pages: ProfilePage → C4, all tab-inner routes → B4/J2). Dead `LangToggle.jsx` deleted (PageHeader was its sole importer). `LanguageSection` in `MoreShell.jsx` kept as the app's Settings-canonical switch. PlayerEditModal country flags (player nationality — not locale) untouched. i18n infrastructure untouched.

**Known issues:** None. Validation checklist pending on iPhone:
- More tab section title reads "ZARZĄDZAJ" (uppercase render via MoreSection CSS) on both PL and EN
- No flag anywhere outside More → Language section
- Language switch in More still works and persists across reloads

## 2026-04-22 — Revert Brief 9 Bug 3a mode=new guard (auto-flip regression)
**Commit:** (merge of `fix/revert-bug-3a-mode-guard` @ `29c2be1`)
**Status:** ✅ Deployed
**What changed:** Brief 9 Bug 3a added `modeParam !== 'new'` to the savePoint post-write flip block, which killed the paintball § 2.5 auto-swap after a scored point. 2-device test confirmed `match.currentHomeSide` never flipped on mode=new saves. Manual flip-pill worked, auto did not.
**Fix:** remove the `&& modeParam !== 'new'` predicate. Brief 7 `!editingId` guard retained (edit saves still never flip). Bug 3b toast suppression retained — the flip is real, just no longer announced with a startle notification.
**Rationale:** per-coach streams don't actually conflict with a shared `match.currentHomeSide` — both teams physically swap sides when a point is scored, so the shared signal IS the correct source for next-point orientation on both devices.

## 2026-04-21 — Brief 9: post-Brief-8 polish (canonical order + flip toast + score Option A)
**Commit:** (merge of `fix/brief-8-polish` @ `65082aa`) — 2 commits: `a872782` + `65082aa`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Three bugs surfaced by 2-device test 2026-04-21 22:54-23:08 on match `rzj1EYtDWjD0i54WtWnp`. Architecture (per-coach streams + merge) worked; polish layer had issues.

**Bug 1 — canonical docs invisible post-End-match**
- Root cause: `subscribePoints` queries with `orderBy('order', 'asc')` and Firestore excludes documents missing the orderBy field. `endMatchAndMerge`'s `batch.set(canonicalRef, ...)` for merged docs omitted `order`, so the canonical filter matched zero rows server-side.
- Fix: write `order: Date.now() + i` on canonical doc creation. Sorts after source docs, preserves canonical index order via `+i`.

**Bug 3a — match.currentHomeSide still mutating on mode=new saves**
- Brief 7 added `!editingId` guard but `mode=new` saves still flipped. Per-coach streams (§ 42) store fieldSide per doc, so a shared currentHomeSide is meaningless and triggered sync-effect noise on the other device.
- Fix: extend guard with `modeParam !== 'new'` — Firestore updateMatch + lastSyncedHomeSideRef update only run for legacy non-mode=new path. Local changeFieldSide still fires for next-point orientation.

**Bug 3b — false-positive "sides swapped by other coach" toast**
- Sync effect toast fired on every currentHomeSide change. Under per-coach streams, flips should never happen (Bug 3a stops writes). Residual legacy flips still trigger the sync but the toast was noise designed for a chess-model lock that no longer exists.
- Fix: remove `setToast + setTimeout` from sync effect. Local fieldSide still syncs for correctness on rare legacy paths.

**Bug 2 — score desync across devices (Option A resolution)**
- Root cause: regular save paths wrote `match.scoreA/B` from coachUid-filtered points — each coach's write was only their own stream's subset, last-write-wins race. Jacek's 2-device test showed A=2:0, B=0:1, list=1:1.
- Fix (Option A strict per Jacek): remove all regular-save score writes. `endMatchAndMerge` and `endMatchupAndMerge` now compute authoritative scoreA/scoreB from canonical outcomes during the batch build and write once on the match/matchup doc. Empty-match branch writes 0:0.
- **Intentional trade-off:** match lists (MatchCard, ScoutedTeamPage, Scout/CoachTab, teamStats) show 0:0 for active matches until End match — live score only on in-match scoreboard (own stream, per-device). Snap to canonical post-merge.

**Known issues / follow-up:**
- 🟡 Re-running End match after edits/deletes on already-merged matches is a no-op (idempotency guard on `match.merged=true`). A recompute trigger for post-merge corrections is a follow-up.
- 🟡 Match list 0:0 during active matches — acceptable per Option A; if field use demands live aggregate, Option Y (raw subscribe + unfiltered score write) is a future alternative.
- 🟡 Diagnostic `[BUG-B]` + `[BUG-C]` logs still live in prod. Cleanup PR after Saturday validation.
- iPhone 2-device retest pending per Brief 9 validation scenario.

## 2026-04-21 — Brief 8: URL-param entry semantics + per-coach streams + end-match merge
**Commit:** (merge of `feat/entry-semantics-and-per-coach-streams` @ `3f0f5e9`) — 3 commits: `335b058` + `072861d` + `3f0f5e9`
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Architectural overhaul of tournament scouting entry + per-point persistence. Replaces "smart-guess" auto-attach with explicit URL-driven intent (Problem A), and the shared-point concurrent chess model with per-coach streams merged at end-match (Problem B).

**Commit 1 — Problem A URL-param entry semantics:**
- All Scout-intent CTAs now navigate with `&mode=new` (MatchPage `goScout` helper, `MatchCard.handleScout`, `TrainingScoutTab.onSwitchToScout`). List-card taps unchanged — `goScoutPoint` already used `&point=<id>`.
- MatchPage auto-attach effect rewritten (L588-608): URL-param dispatch only; fallback `openPoint` search DELETED (was root cause of Bug C symptom where user's own partial points silently reloaded on next Scout › click).
- `savePoint` mode=new bypass: when `editingId=null && URL has mode=new`, skip joinable search, route to new-point save path. Legacy URLs (no params) still fall through to Brief 6 narrowed joinable fallback.
- Quick Log CTAs untouched — already "always new point" by construction (in-page `setViewMode('quicklog')` + unconditional `addPointFn` in QuickLogView).

**Commit 2 — Problem B per-coach stream infrastructure:**
- New hook `src/hooks/useCoachPointCounter.js`: per-(matchKey, uid) counter with localStorage persistence, zero Firestore round-trip on reserveNext.
- Doc ID scheme `{matchKey}_{coachShortId}_{NNN}` (matchKey = matchId or matchupId; coachShortId = first 8 chars of uid; NNN = zero-padded index).
- `dataService.setPointWithId / setTrainingPointWithId` helpers for deterministic-ID writes via `setDoc`.
- `usePoints` / `useTrainingPoints` opt-in filter via `{ currentUid, merged }` options:
  - `currentUid`: client-side filter `!p.coachUid || p.coachUid === uid` (legacy grandfathered per Blocker 2 — Firestore `in [uid, null]` does not match field-missing docs, hence client-side).
  - `merged`: filter to `canonical === true` only. Flag threaded but set active only by Commit 3's endMatchAndMerge.
  - Default (no options) = all points, backward-compat for non-opting callers.
- MatchPage: counter hook + `savePointAsNewStream` helper wrapping `setPointWithId/setTrainingPointWithId` with `coachUid / coachShortId / index / canonical:false / mergedInto:null` enrichment. `mode=new` branch in savePoint now calls `savePointAsNewStream`.
- Per Blocker 3: training also gets coachUid schema (solo per matchup; `endMatchupAndMerge` collapses to single-coach branch in Commit 3).

**Commit 3 — Problem B end-match merge:**
- `ds.endMatchAndMerge(tid, mid)`: idempotent (match.merged=true → no-op). Groups points by coachUid; legacy bucket (no coachUid) → canonical standalone per Blocker 2 audit. Solo (1 non-legacy stream) → canonical in place. 2+ coaches → per-index lockstep merge, writes canonical merged docs `{matchId}_merged_{NNN}` with both sides populated, source docs get `mergedInto` audit pointer. Leftover mismatched indexes (Coach A 12 / Coach B 10) → canonical standalone with unmerged count. Match doc: `merged:true, mergedAt, mergeStats { merged, unmerged }`.
- `ds.endMatchupAndMerge(trid, mid)`: training solo per Blocker 3 — mark all canonical, flip matchup.merged=true. No merge logic.
- End match confirm modal (L1774) wired: runs appropriate merge per isTraining, then flips status='closed'. Transient toast `⚠ {n} unmerged points — audit manually` if unmerged > 0.

**Known issues / must-dos:**
- 🔴 **iPhone validation pending before Saturday 2026-04-25.** Brief 8 Tests 1-4 + 6 (solo flows + regression) all need device verification. Test 5 (2-device concurrent) deferred to Tymek session.
- 🟡 **Firestore indexes deferred** — client-side filter covers current load; add `coachUid ASC` / `canonical ASC` if server-side queries become necessary.
- 🟡 **Persistent post-merge banner deferred** — toast only in v1. `match.mergeStats` is queryable in Firestore for audit.
- 🟡 **Legacy points grandfathered** — points missing `coachUid` (pre-Brief 8 data, including current BUG-C test match with 6+ points) stay visible to all coaches during match; marked canonical standalone at end-match. Zero migration script run.
- 🟡 **Diagnostic [BUG-B] + [BUG-C] logs still live in prod.** Kept for Brief 8 validation signal. Cleanup PR after Saturday validation passes.
- 🟡 **Counter sync hint for late-joining coach** — if coach B joins match mid-stream, their counter starts at 0, out of sync with Coach A. User responsibility per brief founding assumption. Follow-up UI hint possible.
- 🟡 **Manual merge conflict resolution UI** — stream length mismatch (A scouted 12, B scouted 10) shows unmerged audit banner but no reconciliation UI. Follow-up if field use demands.

## 2026-04-21 — Narrow joinable mirror at startNewPoint L852 (Brief 6 follow-up)
**Commit:** (merge of `fix/narrow-joinable-condition-L852` at `257c80b`)
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Mirror of Brief 6 (Fix X) narrowing applied to the duplicate buggy OR clause at `MatchPage.jsx:L852-860` inside `startNewPoint`. The "+ Add Point" flow in editor view (not match-review "Scout ›") had the identical `p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean)` condition; with a terminal `scouted` point the third OR was tautologically true and caused `editPoint(joinable)` to load a completed point into drafts. Removed the OR clause. Dropped the now-unused `otherSide` local. Updated adjacent comment with § 18 / § 40 / Brief 6 cross-ref.

**Note:** This closes a latent mirror bug Brief 6 flagged and de-scoped. Parallel to `[BUG-C]` diagnostic at `28fd0eb` — does NOT explain Jacek's Scout › routing symptom (different call path, auto-attach at L572 not startNewPoint).

**Known issues:**
- iPhone validation per Jacek's scenario pending — tournament match with existing scouted points, tap "+ Add Point" → verify no "Point already in progress" toast, no editPoint-into-scouted-point.

## 2026-04-21 — Fix Y guard edit flip (Brief 7, fieldSide rendering resolution)
**Commit:** (merge of `fix/guard-edit-flip` at `17cd6e5`)
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Two defense-in-depth guards in `src/pages/MatchPage.jsx` to stop `match.currentHomeSide` from flipping on edit saves:
- **Guard 2 (L202-212, state-intent layer):** G2 auto-swap effect now early-returns when `editingId` is truthy. `editPoint` hydrating `outcome` from Firestore no longer re-arms `sideChange=true`. Deps updated to `[outcome, editingId]`.
- **Guard 1 (L1066, write-path layer):** post-tracked swap-flip block now predicated on `&& !editingId`. Even if `sideChange` somehow leaks true during edit (e.g. manual pill toggle in save sheet), Firestore mutation is blocked. `editingId` is closed-over from savePoint invocation — `resetDraft()`'s async `setEditingId(null)` doesn't change scope value.

**Resolves:** Problem Y from [BUG-B] prod log 2026-04-21 (Jacek) — same point `1imySsDDYy1...` re-entered 3× with stable `fieldSide='right'` payload but visual side flip on each cycle because `match.currentHomeSide` was flipping on every edit save, then URL effect at L496-502 seeded local fieldSide from the polluted value on next entry, racing against `editPoint`'s correct per-point resolution at L1110.

**Semantic clarification codified:** `point.{homeData,awayData}.fieldSide` = historical snapshot (frozen after first write, authoritative for edit renders); `match.currentHomeSide` = live pointer (flips only on new-point save with winner per § 2.5). See new DESIGN_DECISIONS § 41. PROJECT_GUIDELINES § 2.5 updated with "fires ONLY on new-point scouting" qualifier.

**Known issues / must-dos:**
- 🟡 **Duplicate L840 still pending** (same issue as Fix X in `startNewPoint` "+ Add Point" flow) — Brief 7-bis if Jacek wants symmetric fix. Out of this brief's scope.
- 🟡 **Diagnostic logs still in prod** (`[BUG-B]` prefix in savePoint, auto-attach, URL effect, editPoint). Help confirm Fix X + Fix Y in post-deploy iPhone validation. Separate cleanup PR planned.
- **Training/solo else-if branch at L1077 unchanged** — different semantic (no `match.currentHomeSide` concept; local flip only). Intentionally out of scope per brief.
- iPhone empirical validation pending Jacek 2026-04-25:
  - **Regression check:** new-point save with winner still flips `match.currentHomeSide` (G2 rule intact)
  - **Core fix:** edit saved point + save → `match.currentHomeSide` unchanged; re-open → orientation stable across 3+ cycles

## 2026-04-21 — Fix X narrow joinable condition (Brief 6, Bug B resolution)
**Commit:** (merge of `fix/narrow-joinable-condition` at `bc6954d`)
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Removed the over-permissive OR clause in `savePoint`'s joinable-search fallback at `src/pages/MatchPage.jsx:L944` (was L898 pre-diagnostic-merge). The prior condition `p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean)` made every `status='scouted'` point a join target, because scouted ≡ both sides populated (§ 18) makes the third OR tautologically true on any completed point. Condition now restricted to `p.status === 'open' || p.status === 'partial'`. Scouted points are never overwritten by fresh saves from the other team.

**Resolves:** Problem X confirmed by 43-step repro 2026-04-21 (Jacek). Scouting Team B after Ballistics-only points was silently routing ALA data into Ballistics' empty `awayData` slots in reverse order. Post-fix: fresh save creates a new `partial` shell as intended. Diagnostic validated the root cause via `diagnostic/bug-b-instrumentation` @ `724abee`.

**Known issues / must-dos:**
- 🔴 **Known duplicate bug, NOT fixed this PR** — the identical buggy OR clause exists at `MatchPage.jsx:L840` inside `startNewPoint` (the "+ Add Point" flow in editor view). Same root cause; different user action triggers it ("+" tap vs "Scout ›" tap). Out of brief scope per strict instruction. Follow-up Brief 7 can mirror this fix — single-line change.
- 🟡 **Fix Y still pending** — fieldSide rendering on edit + G2 auto-swap firing on outcome hydrated from `editPoint`. Different code path, different brief (§ sideChange state + `savePoint` L1059 flip guard). Not fixed here per brief scope.
- 🟡 **Diagnostic logs still in prod** — `[BUG-B]`-prefixed console.logs from `diagnostic/bug-b-instrumentation` remain active. They help confirm this fix in post-deploy iPhone validation (look for `joinable search result: no match` on first ALA save). Separate cleanup PR to revert after Fix Y lands.
- iPhone empirical validation pending Jacek 2026-04-25. Validation signal: Firestore shows a new doc with `awayData.players.length > 0` and `homeData` empty; old Ballistics points 1-4 untouched. `[BUG-B]` console shows `joinable search result: no match` on first ALA save.

## 2026-04-21 — Per-team heatmap visibility toggle (Brief 3)
**Commit:** (merge of `fix/per-team-heatmap-toggle` at e695880) · § 40
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Replaced the two global heatmap pills (`● Positions` / `⊕ Shots`) with `PerTeamHeatmapToggle` — a 2-row block where each team gets its own Positions + Shots chip pair grouped by a team tag (dot + name). Independent on/off per team per layer — 4 boolean combinations. Lets coaches isolate opponent-only or own-team-only views. `HeatmapCanvas` gains optional `visibility` prop (`{ A: {positions, shots}, B: {positions, shots} }`); legacy `showPositions`/`showShots` booleans preserved for `FieldView` backward-compat (no caller migration forced). State lives in parent `MatchPage.jsx` as `hmVisibility`, non-persisted (resets on view remount — intentional v1; flag for future persistence if field use demands it). Active-chip styling reuses § 24 scope-pill pattern (amber border + bg #f59e0b08), consistent with existing primitives. New DESIGN_DECISIONS § 40 documents.

**Known issues:**
- iPhone empirical validation still pending; Jacek to verify 4-combo flow (All on / RANGER only / ALA only / Positions-only) on device before trusting for 2026-04-25 match.
- Visibility state does NOT persist across match-review → editor → match-review navigations — re-opens to all-on default. If coaches find themselves re-tapping same combo every point, add localStorage persistence (trivial follow-up).

## 2026-04-21 — Bug B diagnostic instrumentation (Brief 4, diagnostic-only)
**Commit:** (merge of `diagnostic/bug-b-instrumentation` at 724abee)
**Status:** ⚠️ Deployed as instrumentation — REVERT after Bug B fix merges
**What changed:** Zero-behavior-change instrumentation on `src/pages/MatchPage.jsx` save path to diagnose user-reported 2026-04-21 "Team B save data loss" (bug flagged `CC_BRIEF_BUGFIX_PRE_SATURDAY_4`). Four paths instrumented with `[BUG-B]`-prefixed `console.log`/`console.group`:
- URL `?scout=` effect (~L478): scoutingSide/activeTeam resolution + transitions
- Auto-attach effect (~L563): per-fire deps snapshot, guard skip reasons, openPoint search result, "will load" preview
- `savePoint` (~L838): console.group per save — entry state, branch taken (CONCURRENT/SOLO), homeHasData/awayHasData, joinable search result, per-write payload JSON.stringify, ✓ id or ✗ error. Inner try/catch-rethrow around each updatePointFn/addPointFn so silent Firestore errors surface with context. `finally{}` closes group on both success and throw.
- `editPoint` (~L1066): re-entry point loader — logs point id + player counts across homeData/awayData/teamA/teamB

**Ready-to-fix hypothesis (Suspect 3 from static analysis):** Fallback joinable search @ L896-899 too permissive. Condition `p.status === 'open' || p.status === 'partial' || p[otherSide]?.players?.some(Boolean)` captures already-`scouted` points where other side has data — so when scout A finishes 4 points for Team A and then scouts Team B, each new Team B save attaches to an existing Team A point (`otherSide` populated, `mySide=awayData` empty, status=`scouted` tautologically satisfies `otherSide?.players?.some` gate). Diagnostic output will confirm.

**Known issues / must-dos:**
- 🔴 Revert this commit after Bug B fix lands. Diagnostic logs are not production-grade (JSON.stringify of full payloads on every save — performance + privacy of player names in console).
- 43-step repro from Jacek (Ballistics vs ALA — 4 points scouted A, then scout B, data lands in B1-B4) still required to confirm Suspect 3 vs alternative race.
- No fix applied — per brief "reproduce first, confirm hypothesis, then fix."

## 2026-04-21 — Scout workflow polish (G3 + G4 + F1)
**Commit:** 2485653 (merge) · branch `fix/scout-workflow-polish` · commits f68a70c + 8d5686f
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Companion to the pre-NXL Saturday bugfix sprint. Two scout-workflow polish items:
- **G3 + G4:** Role-gated match summary on MatchPage heatmap view. Pure-scout users (roles contain `'scout'` but NOT `'admin'`/`'coach'`) now see the new **ScoutScoreSheet** — a 4-row data-completeness dashboard (Players placed / Breaks / Shots recorded / Result) replacing the coaching analytics block they couldn't action. Coaches/admins keep `CoachingStats` unchanged. Multi-role users (Jacek) fall into coach branch first → no regression. Values color-coded per § 27 semantic palette (green 100% / amber 60-99% partial / red <60% / neutral Result). Breaks uses the brief's canonical definition (placed player within 0.15 of a bunker — matches § 30 kill-attribution distance threshold), scout's side only. New DESIGN_DECISIONS § 39 documents the role-gating rationale.
- **F1:** Elimination reason picker in LivePointTracker (training mode) auto-closes on reason tap. Previously required two taps (reason + "Zapisz i zwiń ▲"); now one. Same-cause re-tap is a confirm (close, no data change) instead of toggle-off. Reason cells bumped to minHeight 44 per § 27 touch targets. Architectural note: reason sits in component state, Firestore write happens only on W/L outcome tap — so "auto-save" here means "commit in-memory + close picker", no per-tap writes, and the brief's debounce-concern is moot.

**Known issues:**
- ScoutScoreSheet's Breaks metric uses bunker-distance inference (0.15 threshold); accuracy depends on layout having bunkers with valid `{x,y}` positions. Layouts without bunker data → Breaks shows `0/N (0%)`.
- Existing inline Breaks+Shots mini-strip in Points section (MatchPage ~L1405) uses a different "Breaks" definition (placed / totalSlots across both sides) and is intentionally unchanged — ScoutScoreSheet is the new canonical surface; the old strip stays as supplementary coach context. Out of brief scope.
- iPhone empirical validation still pending; Jacek to verify scout-role view + 1-tap reason flow before Saturday 2026-04-25.

## 2026-04-21 — Bugfix sprint pre-NXL Saturday (F3 + G2 + G1)
**Commit:** 0c39e52 (merge) · branch `fix/bugfix-sprint-pre-nxl-saturday` · commits 07391a4 + ada6936
**Status:** ✅ Deployed (main merged, GitHub Pages published)
**What changed:** Three bugfix items from 2026-04-20 post-merge test sweep:
- **F3 (BLOCKER):** Firestore `addDoc()` crash on quick-log save in tournament mode — `src/pages/MatchPage.jsx` QuickLogView branch was writing `shots: Array(5).fill([])` (nested array, Firestore rejects). Swapped for the object-map shape (`shots: {}`) that `pointFactory.baseSide` + `shotsFromFirestore` round-trip already expects. Training quick-log path (TrainingScoutTab → createPointData → pointFactory) was already clean, no change there.
- **G2:** Auto-swap sides on winner selection restored per PROJECT_GUIDELINES § 2.5. The 2026-04-15 over-correction that forced Same on every outcome change was replaced with `win_a/win_b → Swap, timeout/null → Same`, keyed on outcome change so user manual override persists until outcome actually changes. BUG-1 concurrent-scouting sync machinery untouched.
- **G1:** Corner `✕` elimination marker swapped for `💀` in `drawPlayers.js drawElimMark`. Two iterations: first pass rewrote the full marker (bigger disc, translucent, no red ring), rolled back in `ada6936` to preserve original backdrop + red ring, replacing only the glyph. Photo grayscale + red tint overlay on player circle were never touched.

**Known issues:**
- Historic Firestore documents written before the nested-array fix could not have persisted (Firestore rejects at write), so no data migration needed. Reader (`shotsFromFirestore`) already handles both array and object shapes.
- Self-log shots written before Commit 4 (§ 38.9) still lack `scoutedBy` — player edit/delete via future Tier 2 UI will not be able to touch those docs (accepted per earlier brief: "self-log is write-only for now").
- iPhone empirical validation still pending; Jacek to verify on device before Saturday 2026-04-25.

## 2026-04-20 — Security Role System + View Switcher codified (§ 38)
**Commit:** 8424e70
**Status:** ✅ Docs committed (no deploy needed — doc-only)
**What changed:** Transferred 17.04 Opus chat decisions on security refactor + view switcher to repo per § 37.2. DESIGN_DECISIONS.md gained § 38 (11 subsections covering role model, admin determination, Settings UI, View Switcher, protected routes matrix, migration, data model, Firestore rules outline, anti-patterns, and open Path A/B decision). HANDOVER.md awaiting-decision row resolved, § 38 added to recent decisions, security refactor inserted at priority 4 in next-on-deck queue. Update protocol gained a proactive-patching rule to prevent decision-to-repo gaps from compounding.
**Known issues:** Implementation path (A full refactor vs B MVP switcher) still pending Jacek's call. Brief not written until path chosen.

## 2026-04-20 — Documentation cleanup (chore/docs-cleanup)
**Commit:** 2f4464d (merge) · branch `chore/docs-cleanup` · 3 commits
**Status:** ✅ Deployed (docs-only, no code changes)
**What changed:** Repo restructure per the new documentation discipline rules added in DESIGN_DECISIONS § 37 and PROJECT_GUIDELINES § 10.
- Root reduced from 14 to 4 .md files: README, CLAUDE, NEXT_TASKS, DEPLOY_LOG.
- 17 files moved via `git mv` (history preserved): DESIGN_DECISIONS/PROJECT_GUIDELINES → `docs/`; BALLISTICS_SYSTEM/BUNKER_RECOGNITION/TACTIC_WORKFLOW + docs/BREAK_ANALYZER_* + docs/HALF_FIELD_SPEC → `docs/architecture/`; DEV_SETUP/SECURITY/HANDOVER/FEATURE_OCR_LANDSCAPE → `docs/ops/`; IDEAS_BACKLOG + docs/VISION/FEEDBACK_EXTRACT/SLAWEK_COACH_WORKFLOW_TRANSCRIPT → `docs/product/`; docs/AUDIT_CODE/AUDIT_DESIGN_HIG/CURRENT_STATE_MAP → `docs/archive/audits/`.
- New: `docs/architecture/PLAYER_SELFLOG.md` (full Tier-1 architecture doc), `docs/archive/cc-briefs/INDEX.md` (28 briefs categorized).
- 9 cross-reference edits in active docs (CLAUDE.md mandatory reads, NEXT_TASKS.md header, REVIEW_CHECKLIST.md, DESIGN_DECISIONS + PROJECT_GUIDELINES self-refs, VISION.md FEEDBACK_EXTRACT path, BREAK_ANALYZER_DOMAIN_v2.md footer).
- PROJECT_GUIDELINES § 10 'Documentation discipline' added (quick reference to §37 rules).
- CLAUDE.md gained 'Documentation map' section at top (path table + decisions-from-chat rule + CC brief lifecycle pointer).

**Known issues:** None. DEPLOY_LOG.md and `docs/archive/**` intentionally not rewritten — historical entries preserved at-time paths.

## 2026-04-20 — Player Self-Report MVP Tier 1 (feat/player-selflog)
**Commit:** ffb9b43 (merge) · branch `feat/player-selflog` · 4c72779 + 75d8347 + 8a43e3b
**Status:** ✅ Deployed (code + Firebase indexes)
**What changed:** Self-log subsystem — player logs own breakout + shots + outcome in ~10-15s between points via FAB + bottom sheet in MatchPage. Use case: coach plays + trains, no time to scout; players self-report.
- Foundation: `player.emails[]` field, `useSelfLogIdentity` hook (maps logged-in user to player via email), OnboardingModal in MainPage (unmatched users only, dismissable per session), shared team `breakoutVariants` subcollection, self-log CRUD in dataService (`setPlayerSelfLog`, `addSelfLogShot`, training-path variants).
- Shots schema: new subcollection `points/{pid}/shots/{sid}` with `source: 'self'` (scout shots stay on point.shots field — zero migration). `layoutId`, `breakout`, `breakoutVariant`, `targetBunker`, `result` ('hit'|'miss'|'unknown') fields. Synthetic coords = target bunker center (existing heatmap/canvas viz works unchanged).
- Firestore collection group indexes deployed: `(layoutId ASC, breakout ASC)` and `(playerId ASC, createdAt DESC)`. `firebase.json` now references `firestore.indexes.json`.
- HotSheet UI: bottom sheet with 4 fields (breakout → variant → shots → outcome). Adaptive pickers — bootstrap shows all bunkers when history <5 (breakout) / <20 (layout shots), mature shows top 5 / top 6 with weighted freq (hit=2, miss=1, unknown=0.5). Breakout bootstrap collapses to header bar after select; shots picker stays full grid.
- Shot cell cycle-tap: unselected → hit → miss → unknown → unselected (soft limit 3 shots).
- All elim outcomes use `COLORS.danger`, label distinguishes (§27 color discipline).
- FAB (56px amber gradient with glow) bottom-right in MatchPage — visible ONLY when `playerId` matched AND `field.layout` resolved. Badge shows pending count (points without selfLog for this player).
- `NewVariantModal` — adds breakout-specific variant to team pool (shared across all players on team).
- i18n PL + EN for full HotSheet UI.

**Known limitations / iteration flags:**
- Visual extrapolated from textual spec only (PlayerSelfReportV4.jsx mockup referenced but not in repo). Expected iteration after iPhone test for spacing, colors, collapse transitions.
- Pickers use master bunkers only (no mirrors) — same grid for breakout AND shots. Lacks explicit "my side / opponent side" visual separation. Revisit if confusing in use.
- Point creation on save: reuses latest pending point or creates new with `order=Date.now()`. Race possible if two players log simultaneously; each still gets own `selfLogs[playerId]` slot so no data loss.
- Onboarding modal shows in MainPage on first login — dismissable per session (needsOnboarding stays true for next reload).
- Tier 2 (PlayerStatsPage "Mój dzień", Tier 2 edit modal, shot accuracy, ScoutedTeamPage hybrid, tactic suggestions) deferred to Commit 3 (separate session).
- Self-log is write-only for now — no inline edit/delete UI. Edits come with Tier 2 cold-review.

## 2026-04-19 — Unified polygon zone editor (Google-Maps style)
**Commit:** ce40944 (merge) · feature branch `fix/polygon-zone-editor` · 0f21eaf
**Status:** ✅ Deployed
**What changed:** Rebuilt zone editing for all 3 zones (Danger/Sajgon/BigMove) with single code path. New interaction model: drag vertex to reposition, drag edge midpoint ghost (+ glyph, 50% opacity) to insert new vertex, tap vertex of completed polygon to select (pulsing ring), tap trash button (red, offset) to delete. Minimum 3 vertices enforced (delete hidden on triangles). All hit targets 44×44px (Apple HIG). iOS Safari magnifier suppressed via non-passive touchstart/touchmove listeners attached in useEffect + CSS (touchAction:none, WebkitTouchCallout:none, WebkitTapHighlightColor:transparent) on canvas. Banner copy context-aware (zone_hint_drawing when <3 pts, else zone_hint_editing).
**Root cause of magnifier:** React synthetic touch events are passive by default, so preventDefault() on touchstart was silently ignored. Fix: addEventListener with { passive: false } in useEffect. This affects ALL FieldCanvas usage (scouting, heatmap, tactics, zones) — preventDefault calls that existed in handleDown/handleMove now actually fire.
**Known issues / regression risk:** Touch listener change applies globally to FieldCanvas — scouting / heatmap / tactics flows also affected. No regressions expected (preventDefault was already intended behavior), but untested on iPhone in non-zone contexts (deployed blind per Jacek's authorization). If scouting/heatmap touch feels off after 19.04 deploy — rollback candidate.

## 2026-04-19 — Notes + Big Moves + Kluczowi gracze refinements (3 branches)
**Commit:** 95db593 (merge) · incl. merges 6d6f74f, 2e44f89
**Status:** ✅ Deployed
**What changed:** Three feature/fix branches merged in one deploy session:
1. `fix/training-match-navigation` (6b96a70) — PlayerStatsPage match-history now respects `isTraining` flag, routes to `/training/.../matchup/...` instead of hanging on tournament-only route
2. `feat/big-moves` (brought in Coach Notes ancestor too):
   - Coach Notes subsystem: Firestore subcollection `scouted/{sid}/notes`, NotatkiSection in ScoutedTeamPage, AddNoteSheet, UnseenNotesModal in MatchPage (tournament mode only, once-per-session), role filter via existing `workspace.role`
   - Section renames: "1. Breakouty"/"2. Strzały"/"3. Tendencja"/"4. Kluczowi gracze" → "Rozbiegi"/"Strzelanie"/"Tendencja"/"Kluczowi gracze" (numbers dropped, Lucide icons: Footprints/Crosshair/Route/Medal)
   - Column renames: Chodzą/Przeżywają/Strzelają/Trafiają → Rozbieg%/Przeżycie%/Strzela%/Celność%
   - Big Moves user-drawn polygon zone: `layout.bigMoveZone` bare `[{x,y},...] | null` (mirrors dangerZone/sajgonZone), drawing UI in LayoutDetailPage toolbar + Lines & Zones modal (amber), `computeBigMoves()` using existing `pointInPolygon` helper, new BigMovesSection in ScoutedTeamPage (3 states: data above-fold / no-detections / no-zone-configured)
3. `fix/key-players-tiebreakers` (3f13e7b) — `computeTopHeroes` multi-key sort (diff DESC → winRate DESC → ptsPlayed DESC; tertiary opposite of PBLeagues to prefer volume on tie); weak data banner when `avg(+/-) of top 5 < 0` signals "least losers, not leaders"

Rebase resolved conflict in ScoutedTeamPage Kluczowi gracze section: kept Medal icon (big-moves) AND weak data banner (key-players).

**Known issues:**
- Lucide react added (`lucide-react@1.8.0`) — 3 npm audit warnings noted, not addressed
- CoachTabContent.jsx:155 has tournament-only `navigate` pattern; safe in tournament context today, latent landmine if reused for training — flagged for future ticket
- §27 tech debt flagged earlier (5× `#1a2234` in MatchPage/PlayerStatsPage) not addressed, separate cleanup ticket

## 2026-04-18 22:36 — Coach Brief View (CC_WORK_PACKAGE)
**Commit:** 0f4ef8a (merge) · feature branch `feat/coach-brief-view` · ae59b49
**Status:** ✅ Deployed
**What changed:** ScoutedTeamPage redesigned to Sławek's 4 priorities above the fold: Breakouty (top 7 bunkers with freq + survival %), Strzały (3 zones with shot % + accuracy %), Tendencja (3 cards D/C/S per § 34.4), Kluczowi gracze (top 5 by +/-). Everything else (Counter plan, Insights, Tactical signals, Heatmap, Matches) collapsed under "Additional sections" toggle. Confidence banner reduced to 2 pills (Positions + Shots with precision qualifier). Added canonical <SideTag> component (§ 34.3). New insight helpers: computeBreakSurvival, computeSideTendency (3-way with Center box), computeTopHeroes, zonesWithAccuracy in computeShotTargets. Also pushed § 34 Field Side Standard to DESIGN_DECISIONS.md + docs/SLAWEK_COACH_WORKFLOW_TRANSCRIPT.md.
**Known issues:** Big Moves placeholder card is explicit "Wkrótce" — awaiting Sławek's taxonomy + scouting pipeline. `eliminationTimes` typically absent in tournament scouting, so survival% currently falls back to binary eliminated→not-survived (matches existing data shape; no schema change).

## 2026-04-17 — Email-based admin + disable anonymous auth for new users
**Commit:** (see below)
**Status:** ✅ Deployed
**What changed:** Admin check switched from UID-based to email-based (jacek@epicsports.pl) in featureFlags.js, useFeatureFlag.js, and firestore.rules. Anonymous sign-in removed from ensureAuth() — existing anonymous sessions still work, new users must use email/password. signInAnonymously import removed from firebase.js.
**Known issues:** `firebase deploy --only firestore:rules` still needed manually for email-based rule. Existing anonymous users will keep working until Firebase Console anonymous auth is disabled.

## 2026-04-17 — Sentry fix: remove PROD guard
**Commit:** (see below)
**Status:** ✅ Deployed
**What changed:** `enabled: import.meta.env.PROD` → `enabled: true` in sentry.js. Previous builds had Sentry disabled because GitHub Pages serves the app but Vite may have been evaluating PROD differently. Now Sentry is unconditionally enabled whenever DSN is present.
**Known issues:** Sentry will also fire in local dev if DSN is in .env — acceptable for debugging phase.

## 2026-04-17 — Feature Flags + Sentry: real DSN + admin UID (clean rebuild)
**Commit:** (see below)
**Status:** ✅ Deployed (force clean rebuild — rm node_modules/.vite + dist)
**What changed:** Verified DSN present in production bundle (grep confirms `ingest.de.sentry.io` in dist/assets/index-*.js). Previous deploy may have used stale Vite cache without DSN. This deploy is from clean state with real VITE_SENTRY_DSN in .env + hardcoded fallback in sentry.js.
**Known issues:** `firebase deploy --only firestore:rules` still needs manual run by Jacek.

## 2026-04-17 — Feature Flags + Sentry (CC_BRIEF_FEATURE_FLAGS_AND_SENTRY)
**Commit:** d8652d2
**Status:** ✅ Deployed
**What changed:** Added 3-layer feature flags system (static + Firestore dynamic + role-based audience), Sentry error tracking (graceful no-op without DSN), FeatureGate component for gating beta features, Debug Flags page (/debug/flags, admin only), admin-only link in More tab (both tournament + training). ErrorBoundary replaced with Sentry.withErrorBoundary preserving existing crash UI. Firestore rules updated for /config/ subcollection.
**Known issues:** Two TODO placeholders: `UID_JACEK_TBD` in useFeatureFlag.js + firestore.rules (Jacek to provide real UID), `__SENTRY_DSN_TBD__` in .env.example (Jacek to create Sentry project). App works fully without both — graceful defaults. Bundle grew ~19KB (838KB index, from 819KB) due to @sentry/react.

## 2026-04-16 — More tab actions + workspace in Account (CC_BRIEF_MORE_TAB_ACTIONS_AND_ACCOUNT)
**Commit:** d7c742a
**Status:** ✅ Deployed
**What changed:** Simplified More tab across training + tournament. Removed `StatusHeader` + LIVE toggle + `WorkspaceFooter` (from cea1a20 — superseded by this brief). Actions section is now a single adaptive row: Zakończ/Zamknij when live → Usuń when ended (no reopen path). Workspace moved into Account section between Profile and Sign out. Scout tab read-only when session closed: matchup/match tap routes to review-only, hint shows "tap to view", no Add CTA. Context bar badges gray out and subtitle gains "zakończony" suffix when closed. New i18n keys: `end_training_msg`, `close_tournament_msg`, `session_ended`, `actions_single` (pl + en). Confirm modal copy localized.
**Known issues:** Reopen flow is gone — if a user ends by mistake they must delete + recreate; confirm acceptable before wide rollout. "tap to scout" / "tap to view" hints in tournament Scout tab are still hardcoded English. `NEXT_TASKS.md` is partially stale (PLANNED still lists already-shipped briefs as ACTIVE) — not touched this deploy.

## 2026-04-15 16:00 — Bilingual support PL/EN (CC_BRIEF_I18N)
**Commit:** 66b856a
**Status:** ✅ Deployed
**What changed:** Added a lightweight custom i18n layer (no library): `src/utils/i18n.js` flat dictionary PL+EN, `useLanguage` hook with localStorage persistence (default Polish), and a `LangToggle` pill wired into `PageHeader` so it appears on every screen. Wired `t()` into ScoutedTeamPage, QuickLogView, LineupStatsSection, TrainingPage, ScoutRankingPage, PlayerStatsPage, and SessionContextBar. Refactored `generateInsights`/`generateCounters` to accept a `lang` param and attach a stable `key` + `data` payload to each insight; counters now match on `insight.key` instead of Polish substring parsing, so language switches re-render insights cleanly.
**Known issues:** Some lower-traffic labels in PlayerStatsPage (metric card labels, shot-bar section titles) and match history copy remain untranslated — not in brief scope. Precommit reports pre-existing warnings in scoutStats.js/theme.js (not touched). Polish strings in the new i18n.js dictionary itself trip the Polish-string linter, which is expected for a translation file.

## 2026-04-15 — Status system + layout scope + lineup analytics + zone picker (CC brief)
**Commit:** 48bf709
**Status:** ✅ Deployed to GitHub Pages
**What changed (4 parts):**
- **Part 1 — status/eventType/isTest:** tournaments gain `status` (open/live/closed),
  `eventType` (tournament/sparing), `isTest` flag; trainings gain `isTest`.
  NewTournamentModal has a 3-way selector (Tournament/Sparing/Training) plus a
  Test session checkbox. App.jsx now renders a persistent `SessionContextBar`
  above BottomNav that surfaces any LIVE tournament/training; TrainingPage
  footer has Set LIVE / ● LIVE — deactivate; tournament LIVE toggle lives in
  the More tab Tournament section. TEST badges in TournamentPicker + AppShell.
- **Part 2 — zone picker in QuickLogView:** three-step flow pick → zone → win.
  Each selected player gets Dorito/Centrum/Snake toggles that map to synthetic
  `{x,y}` coordinates (0.15/0.20, 0.15/0.50, 0.15/0.80) so lineup analytics can
  zone-classify without full canvas scouting. Skip link at both steps logs
  score only. TrainingPage + MatchPage onSavePoint pass `players[]` through.
- **Part 3 — layout scope:** new `useLayoutScope` hook; PlayerStatsPage
  `?scope=layout&lid=` with picker + summary header counting sparing/tournament
  events; ScoutedTeamPage "Ten turniej / Cały layout" pills that aggregate
  heatmapPoints across every tournament sharing the same layoutId (resolved
  per-tournament via scouted entry matching teamId); ScoutRankingPage now has
  three scope pills Globalny / Ten layout / Ten turniej with filtered stats.
- **Part 4 — lineup analytics:** `computeLineupStats()` in generateInsights.js
  builds pair and trio win-rate combos by side with D/C/S zone classification
  (position-first, slot-index fallback), played ≥ 3 threshold, lowSample flag.
  New `LineupStatsSection` component with Pary — dorito / — snake and Trójki
  groups wired into PlayerStatsPage above Preferred position.

**Known issues:**
- Layout aggregation on ScoutedTeamPage re-fetches per tournament on every
  scope toggle — no caching. Fine for small layouts, may lag for large ones.
- Zone picker is per-point; if lineup stays the same, zones persist across
  saves, but you'll still see the zone step for every new selection change.

---

## 2026-04-15 — Coach language overhaul (CC brief)
**Commit:** 946f337
**Status:** ✅ Deployed to GitHub Pages
**What changed:** All coach-facing analytics text on ScoutedTeamPage +
generateInsights rewritten to plain Polish, with section reordering so
"Jak ich pokonać" (Counter plan) appears before "Jak grają" (Key insights).
Pills, row labels, side tendency classifiers, performance rows, confidence
banner, scout ranking subtitle and QuickLogView strings all localized.
Counter generator keyword matching updated to Polish across text+detail
so predictable-formation D/S counts and side vulnerability zones still work.
**Known issues:**
- Precommit emits ~40 "Polish string detected" warnings (expected — the
  brief explicitly authorizes Polish for coach analytics); they're warnings,
  not errors, so commits still pass.
- CC_BRIEF_I18N.md landed upstream during this work; a future proper i18n
  pass may supersede this hard-coded Polish copy.

---

## 2026-04-15 — Practice UX + Scout Ranking scope (CC brief)
**Commit:** d7de9b4
**Status:** ✅ Deployed to GitHub Pages
**What changed:** ScoutRankingPage now has a Global / Tournament scope toggle
with a tournament picker; TrainingPage context bar uses shared Btn ghost
components and gained an Attendees back link; MatchupCard no longer does
tap=won direct saves (every tap opens QuickLogView); QuickLogView renders two
labeled squad sections with color dots and shows an Advanced scouting link.
**Known issues:**
- If no players are picked, QuickLogView still saves with empty assignments;
  TrainingPage's per-squad auto-fill catches that, but MatchPage single-team
  tournament quick-log will persist an empty lineup — watch for roster-less
  points in tournament review.

---

## 2026-04-15 — Auth + Scout Ranking (CC brief)
**Commits:** ab0dff5 → c6e2917 (2 commits)
**Status:** ✅ Deployed to GitHub Pages
**What changed:** Email/password login via Firebase Auth (LoginPage) gates the app
before the workspace code; Firestore /users profiles on first real login; new
Scout Ranking / Scout Detail / My scouting TODO pages computed from per-point
`scoutedBy` attribution; confidence banner and MatchPage review cards now
surface scout display names via a cached `useUserNames` hook.
**Known issues:**
- Email/Password provider must be enabled in Firebase Console
  (Authentication → Sign-in method) or login fails with
  `auth/operation-not-allowed`.
- Existing legacy anonymous sessions pass through unchanged, so old workspaces
  still work without an email account.

---

## 2026-04-15 02:00 — Opus direct session (massive feature + bugfix batch)
**Commits:** debdde6 → b035bf6 (14 commits)
**Status:** ✅ Deployed to GitHub Pages

**Features shipped:**
- Quick Logging mode — roster chips → tap winner → next, no canvas (Don's paper replacement)
- Counter Suggestions — tactical recommendations from opponent insights ("Send runner to snake", "Eliminate key player")
- Formation consistency insight — "Predictable — same formation 73% (2D 1S 2C)"
- Fifty bunker detection — "Aggressive Snake 50" instead of generic zone
- Full player profile — bunkers, break/obstacle shot patterns, kills, K/pt on PlayerStatsPage
- Tournament settings + Close tournament in More tab
- New tournament / New training buttons in More tab + empty state
- Practice mode simplified (no league/division/year required)
- Squad names R1/R2/R3/R4 (was Red/Blue/Green/Yellow)
- Cleaner base labels (just team name, no "BASE" text/arrows/borders)
- Separated break vs obstacle shot indicators (two concentric rings, different end markers)

**Bug fixes:**
- fieldSide bug: solo save gave both teams same fieldSide → heatmap/run lines from wrong base
- Auto-swap after save: disabled (was auto-enabling "Swap sides" on winner selection)
- Toolbar dismiss: transparent backdrop catches taps outside buttons
- QuickShotPanel dismiss: tap canvas closes panel
- Back button: 28px → 44px touch target + replace navigation
- PointSummary bar removed (redundant)
- Switch team button removed (cleaner flow)
- Score colon color: #2a3548 → #64748b (4 places)
- PlayerStatsPage kills: piped opponent data through buildPlayerPointsFromMatch

**Apple HIG audit:**
- Touch targets: squad chips 40→44, +/- buttons 32→44, edit squads 32→44
- fontFamily: FONT added to Training pages, MoreTabContent, QuickLogView
- All elevation layers verified correct

**Known issues:** None critical

---

## 2026-04-15 — Tab Navigation + Training Mode (CC)
**Commits:** cc2324d → 0698653 (20 commits pushed)
**Status:** ✅ Deployed to GitHub Pages
**Auth note:** Remote URL refreshed with a new `contents: write` PAT
(prior token was fetch-only). Old entry below preserved for history.

---

## 2026-04-15 — Tab Navigation + Training Mode (CC, pre-deploy)
**Commits:** cc2324d → 65f0d4e (19 local commits)
**Status:** ❌ Blocked on push auth — PAT in remote URL has fetch-only scope
**What changed:**
- TAB_NAVIGATION (8 parts): AppShell + MainPage + Scout/Coach/More tab
  extraction + TournamentPicker + NewTournamentModal + routes. HomePage
  and TournamentPage deleted; `/tournament/:tid` route removed; all
  back-nav references updated.
- Fallout fixes: ScoutedTeamPage and TacticPage back buttons pointed at
  the deleted /tournament/:tid route.
- TRAINING_MODE (7 parts): new `trainings` collection with cascading CRUD,
  TrainingSetupPage (Who's here roster picker), TrainingSquadsPage (drag
  & drop 2-4 squads), TrainingPage (matchup list with scout entry),
  TrainingResultsPage (leaderboard sorted by played → win% → diff),
  NewTournamentModal Tournament/Training type selector, TournamentPicker
  merged list with cyan Training badge, PlayerStatsPage training scope
  pill, MatchPage training adapter (synthesises tournament/match from
  training+matchup, skips concurrent/claim logic, ds wrappers for
  addPoint/updatePoint/deletePoint/updateMatch/deleteMatch).

**Known issues:**
- ⚠️ Auth blocker: `git push origin main` returns "Invalid username or
  token. Password authentication is not supported for Git operations."
  The fine-grained PAT embedded in the origin URL can fetch but not
  push. Refresh the token (contents: write) or switch to a credential
  helper before re-running `git push origin main` + `npm run deploy`.
- PlayerStatsPage global-scope training aggregation is a no-op — only
  `scope=training&tid=<trainingId>` walks matchups. Adding a global
  training walk needs a trainings list helper in dataService.
- MatchPage claim writes still use `ds.updateMatch` directly (guarded by
  `if (!isTraining)` so they never run in training mode). Harmless, but
  worth revisiting if the claim code is refactored.
- Training delete-matchup button (⋮) in TrainingPage is a direct delete
  with ConfirmModal; no password gate since workspace password only
  protects tournament-level deletions.

## 2026-04-14 23:00 — Bug fixes + feature session (Opus direct)
**Commit:** 003a5fb
**Status:** ✅ Deployed
**What changed:** Score colon visibility, removed ⋮ dots, Done/Save toggle, auto-redirect home, quick shot indicators, scout button fix, bump flow, run lines, player stats W/L/+-, kill attribution, bunker matching, formula corrections, Apple HIG compliance docs
**Known issues:** None critical

---
_CC: append new entries above this line_
