# Deploy Log

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
