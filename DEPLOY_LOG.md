# Deploy Log

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
