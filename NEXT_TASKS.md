# NEXT TASKS — For Claude Code
## Read docs/DESIGN_DECISIONS.md + docs/PROJECT_GUIDELINES.md first.
## Work top to bottom. Push after each task.

**Last updated:** 2026-04-13 by Opus
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
