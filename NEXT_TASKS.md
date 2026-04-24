# NEXT TASKS — For Claude Code
## Read docs/DESIGN_DECISIONS.md + docs/PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-04-24 by CC implementation (PPT hotfix batch — sticky training + shots picker dedup deploy)
**Rules:** Inline JSX styles (COLORS/FONT/TOUCH from theme.js). English UI labels.
Don't touch `src/workers/ballisticsEngine.js` (Opus territory).
Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`

---

# ✅ COMPLETED (summary — do not re-implement)

Everything below is shipped and working as of April 10, 2026:

**Core:** Canvas (pinch-zoom, loupe, pan, handedness), FieldCanvas/FieldEditor/HeatmapCanvas,
half-field viewport, max-vertical sizing, landscape immersive mode, ErrorBoundary.

**Design:** Premium design system (Inter font, dark theme, design tokens, ui.jsx components),
all pages redesigned (Home, Tournament, Teams, TeamDetail, ScoutedTeam, LayoutDetail),
design-contract.js, precommit linter, review suite.

**Scouting:** MatchPage (header, half-field, toolbar, bump drag, roster grid, shot drawer,
save flow), coaching stats (dorito/snake/disco/zeeker/center/danger/sajgon),
runner visualization (▲/●), eliminated markers (✕), No Point option,
point preview on heatmap, swap sides (nextFieldSideRef), drag fixes, desktop mouse pan.

**Concurrent:** Chess model (side-safe writes, homeData/awayData split, claim system
with heartbeat/TTL, LIVE badge, shell points, auto-attach, merge view toggle,
point status tracking, duplicate prevention, independent fieldSide per coach).

**Layout:** Wizard (3-step: Basic Info → Calibrate → Vision Scan), BunkerEditorPage,
calibration (tap-to-place + sliders), Vision scan (Claude Sonnet API),
disco/zeeker draggable handles, zone drawing (danger/sajgon with save/cancel),
premium toolbar pills, landscape floating toolbar, bunker drag, sticky New Tactic,
deaths heatmap (💀), break positions heatmap (🎯), layout analytics page.

**Ballistics:** BallisticsPage, engine rewrite (triangle/cross hitboxes, shape-aware
ray casting, bunkerShapes.js, 3-channel visibility: safe/arc/exposed).

**Tactic:** Scouting-style editor, freehand drawing (persist, rAF fix), zone drawing,
second position (bump stop), shot from 2nd position, curve cycling (5 arcs),
freehand visible in layout preview.

**Teams:** Parent + child teams, division enforcement, child team picker filter.

**Tournament:** Division pills, match sections (Live/Scheduled/Completed), close/reopen
(password-protected, CLOSED badge), observed teams (👁 toggle, W/L/LIVE on home).

**Home:** Active tournament selector, categorized matches, observed teams section.

**Auth:** Squad codes per layout, viewer role (?code login), guards on write actions.

**Canvas scaling:** Mobile/desktop vh-based, HeatmapCanvas aspect preservation,
FieldCanvas outer/inner wrapper, layout page width-first.

**Misc:** Font audit (all ≥10px), ActionSheet 80dvh, shot lines 5px, zone borders 3px,
desktop toolbar stays open, freehand sync fix.

---

# 🐛 KNOWN BUGS (from user feedback, April 2026 PXL weekend)

### ~~BUG-1: fieldSide useEffect race condition~~ ✅ FIXED (April 13, 2026)
Was: useEffect on line ~183 of MatchPage.jsx re-fired on editingId clear after
save → read stale `match.currentHomeSide` → silently reverted the swap that was
just persisted. Concurrent mode side flips also had no UI feedback.
**Fix shipped:**
- `lastSyncedHomeSideRef` now guards the sync effect: on re-fires (e.g.
  editingId clearing) where `currentHomeSide` hasn't actually changed, the
  effect is a no-op.
- Swap button + savePoint's swap branch now update local state +
  `lastSyncedHomeSideRef` **before** the async Firestore write, so the
  onSnapshot round-trip is also a no-op.
- Toast `⇄ Sides swapped — other coach flipped orientation` fires when the
  sync applies an external change.
- Base indicator pills (`◀ BASE {teamName}` / `{teamName} BASE ▶`) overlay
  the canvas corners, color-coded per team, so scouts can orient instantly.

---

# 🔨 NEEDS VALIDATION
- Ballistics accuracy: engine rewritten but needs tuning against real field data
- OCR/Vision scan: works but requires user's Anthropic API key in localStorage
- Concurrent scouting: needs real 2-device test with Tymek

---

# 📋 PLANNED (needs Opus brief before CC implements)

### [DONE] 2026-04-24: PPT hotfix batch — sticky training + shots picker dedup
Deployed in merge of `hotfix/ppt-training-sticky-shots-dedup-2026-04-24` (commit `31c1f7d`, 2 commits). Two PPT regressions surfaced by Jacek's iPhone validation pre-Saturday training. (1) **Fix 1 sticky training selection** — pre-fix the picker re-appeared on every "+ Nowy punkt" tap when liveTrainings.length !== 1. New `src/utils/pptActiveTraining.js` (date-stamped localStorage), entry logic prioritizes sticky over showList/single-LIVE inference, `handleSave` resets state in-place + bumps local pill count + inline toast (no navigation), training pill becomes the "Zmień trening" affordance (clears sticky + forces picker), Step 1 back arrow uses `?leave=1` to break the sticky-redirect loop. (2) **Fix 2 shots picker dedup** — `bunkerListFromLayout` only filtered `role==='mirror'` but `layout.bunkers` can carry duplicate entries per `positionName` (legacy docs without `role`, or BunkerEditorPage's master+mirror persistence with shared name). `BunkerPickerGrid` keys order-badges by `positionName` → twin-badge symptom. Defensive first-write-wins dedupe in Step 3's local helper. **Spec deviations:** "Zmień trening" implemented as extension of existing pill rather than separate link (§ 27 anti-pattern avoidance); save flow uses in-place state reset rather than navigate-to-wizard-URL (avoids flash + round-trip).

**Known follow-ups:**
- Step 1 bootstrap likely has the same latent dedup bug (mature path is fine via byName Map). Mirror Fix 2 into Step1Breakout.jsx if it surfaces.
- TodaysLogsList view now only reachable via Step 1 back arrow + `?leave=1`. Pill counter shows `#N pkt dziś` inline so visibility preserved.
- `useMemo` reads localStorage on every teamTrainings change. Cheap; no observable cost.

### [DONE] 2026-04-24: ProfilePage hotfix batch — 3 regressions
Deployed in merge of `hotfix/profile-page-regressions-2026-04-24` (commit `04ff7fc`, 3 commits). Three regressions on Mój profil surfaced by iPhone validation, batched into a single deploy. (1) **Fix 1 linked-player self-claim restored (§ 49.8 Path A)** — § 33.3 ProfilePage shipped without unlinked-state UI. Added empty-state + "Połącz z profilem gracza" CTA reusing admin `LinkProfileModal`; linked state unchanged except new "Rozłącz" row on separate surface (§ 27 anti-pattern avoidance, § 50.3 Wyjdź precedent). New `ds.selfLinkPlayer` (transactional, surfaces ALREADY_LINKED) + `ds.selfUnlinkPlayer` — no rules change needed (self-link + self-unlink carve-outs from § 33.3 + § 50.3 already whitelist exactly these writes). (2) **Fix 2 missing i18n keys** — `t('key') || 'fallback'` short-circuits to raw key. Added full `profile_roles_*` + `profile_player_*` + `profile_claim_*` + `profile_unlink_*` sets in PL+EN. (3) **Fix 3 remove "Podgląd: Admin" floating pill** — removed `<ViewAsIndicator />` from App.jsx, neutralised `ViewAsContext` (always null + clears stale sessionStorage on mount), replaced `ViewAsPill` in ADMIN settings with new `ViewAsPlaceholder` (toast "Funkcja wkrótce"). Old ViewAs* files kept on disk for easy revival. **Spec deviation:** § 50.1 kept ViewAsPill functional in ADMIN; hotfix brief updated direction toward placeholder.

**Known follow-ups:**
- § 50.1 DESIGN_DECISIONS entry is now stale — either codify the placeholder-only state or revive the feature.
- ViewAs feature dormant, not deleted. Admin loses role-impersonation preview surface until revived.
- `navigate` import in ProfilePage.jsx is unused (pre-existing, untouched).

### [DONE] 2026-04-24: P0 micro-hotfixes batch
Deployed in merge of `hotfix/p0-batch-2026-04-23` (commit `629edc8`, 3 commits). Three independent fixes batched into one deploy: (1) **Scout card score** — useLiveMatchScores hook subscribes to subscribePoints per non-closed match, derives {a,b} via canonical matchScore helper extracted to utils/helpers.js, MatchCard accepts liveScore prop. Side-effect fix: LIVE/Scheduled classification bug (same Brief 9 Bug 2 root cause). (2) **Side percentages removed from heatmap** for all roles — CoachingStats block deleted from MatchPage; computeCoachingStats function preserved for ScoutedTeamPage. (3) **releaseClaim ReferenceError** — two orphan call sites in MatchPage back handlers (Brief F leftover). `grep releaseClaim` now returns zero.

**Known follow-ups:**
- CoachTabContent has the same Scout-card score bug — out of brief scope, cheap symmetry fix if needed
- Brief 9 Bug 2 write-side decision left intact (race avoidance preserved)

### [DONE] 2026-04-24: Settings menu reorg + nav cleanup + Członkowie full UX (§ 50)
Deployed in merge of `feat/settings-reorg-nav-cleanup` (commit `0fe8739`, 4 commits across 3 checkpoints). Six-section Settings menu (SESJA / ZARZĄDZAJ / SCOUTING / WORKSPACE / KONTO / ADMIN) per Jacek spec with strict role gating per § 49. Tab "More" → "Ustawienia". Legacy `BottomNav.jsx` deleted; AppShell role-tab bar is now the only bottom nav (Scout/Coach/Gracz/Ustawienia). Wyjdź workspace flow added (`ds.leaveWorkspaceSelf` + ConfirmModal + last-admin guard) — Firestore rules carve-outs for self-leave on workspace + self-unlink on player. **Członkowie full UX**: new `/settings/members/:uid` UserDetailPage with admin link override (LinkProfileModal — search players, conflict surface, atomic re-link via `ds.adminLinkPlayer`), unlink, deliberate role edit, soft-delete via `users/{uid}.disabled` flag (rule via ADMIN_EMAILS allowlist). AppRoutes bootstrap watches the disabled flag and renders DisabledAccountScreen. Four spec deviations documented in DEPLOY_LOG.

**Known follow-ups (§ 50.7):**
- Per-workspace admin check on `/users/{uid}` writes (replace ADMIN_EMAILS allowlist, requires custom claims)
- Server-side Firebase Auth deletion (true delete, requires Admin SDK + Cloud Function)
- Coach/staff profile entities (only player profiles exist today)
- Toast for legacy URL clicks (currently no redirect — pages remain reachable from Settings)
- DRY between MoreTabContent + TrainingMoreTab helpers (Training* prefix duplication)

### [DONE] 2026-04-23: ProfilePage roles + linked-player self-edit (§ 33.3)
Deployed in merge of `feat/profile-player-section` (commit `0da83b4`, deploy log `7e69a2f`). ProfilePage now renders read-only Roles section (`RoleChips` from canonical `useWorkspace().roles` resolver) and a 6-field self-edit form for the linked player (nickname/name/number/age/nationality/favoriteBunker) when the active workspace contains a player doc with `linkedUid === auth.uid`. Team / PBLI ID / role / class stay admin-only via Firestore rules `affectedKeys.hasOnly([...])` whitelist on `/players/{pid}` update. User-doc photoURL editor *removed* — multi-player reality means a single avatar URL doesn't fit (Jacek interrupt). Firestore rules deployed via `firebase deploy --only firestore:rules` before client merge.

### [DONE] 2026-04-23: Unified auth + roles + tab visibility (§ 49)
Deployed in merge of `feat/auth-roles-unified`. New users auto-assigned to ranger1996 workspace + `['player']` role on signup. Strict per-role tab visibility matrix (admin/coach/scout/player/viewer-legacy). New Gracz tab routes to `/player/log`. PPT Firestore rules hotfix deployed alongside (selfReports subcollection + collection-group read). Admin panel already handles the new model (Path A verified). **Brief E Option 2 (PPT reachability) wchłonięte — DONE.** Migration policy: new users only; existing users untouched until admin reassigns.

### [DONE] 2026-04-23: Player Performance Tracker (PPT) — full product
Deployed in merge of `feat/player-performance-tracker` (7 commits, Tier 2 / 5 checkpoints). Route `/player/log` picker + `/player/log/wizard` 5-step wizard + today's logs list + offline queue. Firestore indexes deployed via `firebase deploy --only firestore:indexes`. Spec lives in `docs/DESIGN_DECISIONS.md § 48` + `docs/product/PPT_MOCKUP.md`. Brief pasted inline (no archive file). iPhone validation pending.

**Known follow-ups:**
- Role gating (Brief E Option 2) — required for pure-player reachability
- Matchup-matching product — coach-side assignment of orphan `selfReports`
- Post-save list row edit/delete (§ 48.10 deferred)

### From user feedback (F1-F7):
1. **~~F1+F2: Side confusion fix~~** → ✅ **FIXED** — BUG-1 patched by CC (lastSyncedHomeSideRef, swap toast, base indicator pills)
2. **F3: Quick shots dual mode** → **ACTIVE: `CC_BRIEF_QUICK_SHOTS.md`** (zone toggles + precise drill-down)
3. **F4: Sample size indicator** → **ACTIVE: `CC_BRIEF_TEAM_STATS_CARDS.md`** (n=X on tournament team cards)
4. **Match flow redesign** → **ACTIVE: `CC_BRIEF_MATCH_FLOW.md`** (three-level nav, eliminate side picker, split-tap match cards, match review page, point summary bar)
5. **F5: Self-scouting** — scout own team + counter analysis view
6. **F6: Tournament profiles** — may be solved by quick shots (quick vs deep modes)
7. **F7: Training data → break selection** — practice data informing break choices

### Features:
- BreakAnalyzer module (spec: BREAK_ANALYZER_SPEC.md, BREAK_ANALYZER_DOMAIN_v2.md)
- Tournament tendencies (team/lineup/player level analytics)
- Practice tournament type (ad-hoc lineups, no player history impact)
- Security Phase 3: server-side admin verification

---

# 🧹 Post-Saturday cleanup (after NXL Czechy 2026-04-25)

Tech-debt + investigation items surfaced during Brief 6-9 pre-Saturday sprint. None are Saturday-blocking; schedule after match validation.

### Brief 10 — enroll/membership cleanup (tech debt)
- Workspace ID case normalization (`users/{uid}/workspaces[0]` vs actual doc casing)
- Role field: migrate from comma-separated string `"scout,coach,admin"` to array
- Sync `users.workspaces` array ↔ `workspaces/{slug}.members` array (currently can drift)
- Audit `pendingApprovals` cleanup
- Problem manifested in 2-device test: biuro user had workspace "Ranger1996" but doc is `workspaces/ranger1996` (lowercase). Required manual Firestore edit to grant membership.

### Diagnostic logs removal (BUG-B / BUG-C)
- After Saturday validation confirms concurrent scouting works end-to-end
- Remove `[BUG-B]` and `[BUG-C]` console.log statements from MatchPage.jsx
- Keep in prod during Saturday match itself (useful if something breaks on real devices)
- Target: Sunday 2026-04-26 cleanup PR

### Claim fields retirement
- `match.homeClaimedBy`, `awayClaimedBy`, `homeClaimedAt`, `awayClaimedAt` fields
- Still written on side selection but no longer used for routing under Brief 8 (per-coach streams have own identity via coachUid)
- Safe to retire: stop writing + lazy cleanup
- Low priority — harmless if left

### Investigation: `match.currentHomeSide` necessity under Brief 8
- See DESIGN_DECISIONS § 44.5
- Question: should flip pill update only local state with no Firestore write?
- Currently shared between coaches via match doc, which introduces surprising semantics
- Not a bug, but architectural cleanup candidate

### Brief 8/9 CC briefs archiving verification
- Verify CC moved these to `docs/archive/cc-briefs/`:
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_6.md (Problem X narrow) ✅ archived
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_7.md (Fix Y) ✅ archived
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_7bis.md (L852 mirror) — informal, no brief file written; one-line mirror fix documented in commit message `257c80b`
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_8.md (per-coach streams v2) ✅ archived
  - CC_BRIEF_BUGFIX_PRE_SATURDAY_9.md (polish) ✅ archived
- Per DESIGN_DECISIONS § 37.3 CC brief lifecycle
- Status verified 2026-04-21 — all briefs with files are in archive.

---

# 📦 BACKLOG (see IDEAS_BACKLOG.md — do NOT implement without instruction)
- Dark/light toggle, settings page, colorblind UI toggle
- Undo stack, tactic templates, direct manipulation drag
- Export CSV/Excel, print layout with overlays
- OffscreenCanvas heatmap, SharedArrayBuffer ballistics
- ARIA/WCAG remaining, haptic feedback, keyboard shortcuts
- Paintball IQ, body count analysis, agentic counter explanations
- Onboarding tunnel, competitive analysis
