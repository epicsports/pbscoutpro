# PbScoutPro — Session Handover
**Date:** 2026-04-15  
**Repo:** https://github.com/epicsports/pbscoutpro  
**Live app:** https://epicsports.github.io/pbscoutpro  
**Last commit:** cd88699 — feat: dual-coach training model

---

## Stack

React + Vite + Firebase (Firestore + Auth). HashRouter. All inline JSX styles — no CSS modules, no Tailwind.  
Design tokens: `src/utils/theme.js` (COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH).  
UI components: `src/components/ui.jsx` (Btn, Card, Modal, ConfirmModal, ActionSheet, MoreBtn, Input, Select, Checkbox, PageHeader, EmptyState, Loading, SectionTitle, SectionLabel, LeagueBadge, YearBadge).  
Data: `src/services/dataService.js`. Hooks: `src/hooks/useFirestore.js`.

Dark theme. Accent = #f59e0b (amber). Btn variant="accent" = black text on amber.  
All buttons min 44px touch target. Font = Inter (FONT constant).

---

## What's live (all deployed to GitHub Pages)

- Tab navigation (Scout / Coach / More tabs), MainPage with TournamentPicker
- Training mode: setup → squads → matchups → results
- Tournament scouting: MatchPage (canvas + shots + eliminations), ScoutedTeamPage
- Auth: Firebase email/password login
- Scout Ranking + Scout Detail pages
- Data confidence banner (per-metric quality pills)
- Shot attribution system (approach vector projection)
- Tactical signals section (ScoutedTeamPage): most targeted, they hunt, they shoot at, reach 50
- Side tendency section (replaces zone breakdown)
- Status system: tournaments/trainings have status (open/live/closed), eventType (tournament/sparing), isTest flag
- Session context bar: persistent LIVE badge above BottomNav when any session is live
- Zone picker in QuickLogView: 3-step pick→zone(D/C/S)→win
- Layout scope in PlayerStatsPage, ScoutedTeamPage, ScoutRankingPage
- Lineup analytics: pair/trio win rates (LineupStatsSection in PlayerStatsPage)
- Coach language overhaul: Polish labels, conclusion-first layout on ScoutedTeamPage
- Practice UX: Edit squads / Attendees buttons, no tap=won, QuickLogView per squad
- Dual-coach training model: tap home side = log home only, tap away = log away only, tap center = log both
- Nav fixes: TrainingPage back→'/', paddingBottom for BottomNav, Add match button in ScoutTabContent
- Zone picker squad colors: color dot per player shows which squad they belong to

---

## Pending — ready to implement

### 1. `CC_BRIEF_I18N.md` — NEXT PRIORITY
Full bilingual PL/EN support.  
Architecture: `src/utils/i18n.js` (translation dictionary), `src/hooks/useLanguage.js` (context + `t()` helper), `src/components/LangToggle.jsx` (PL/EN pill in PageHeader).  
Default language: Polish. Persists to localStorage.  
No external i18n library — pure React context.  
**CC command:** `Read CC_BRIEF_I18N.md and implement it in order: Step 1, Step 2, Step 3, Step 4. Run npx vite build after each step.`

### 2. `CC_BRIEF_MATCH_OPTIONS_AND_DUAL_COACH.md` — Part 1 done, Part 2 done manually
**Part 1 (MatchPage options):** DONE — ActionSheet in MatchPage with End match / Clear points / Delete match.  
**Part 2 (dual-coach):** DONE manually in this session (cd88699).  
Brief is fully implemented. Can be archived.

---

## Known issues / backlog

- `TrainingSetupPage` back button goes to '/' — should probably go to training list or stay (low priority)
- Match options (Reopen, Edit score) not yet in MatchPage — Part 1 of MATCH_OPTIONS brief added End/Clear/Delete but not Reopen or Edit score manually
- Layout aggregation on ScoutedTeamPage re-fetches on every scope toggle (no caching) — fine for now
- Zone picker persists zones across points (good) but has no "clear zones" option if player moves
- i18n not yet implemented — all Polish strings are hardcoded in generateInsights.js and ScoutedTeamPage.jsx

---

## Architecture decisions (key ones)

1. **Layout = primary analytical unit.** All events (training/sparing/tournament) sharing same `layoutId` aggregate together for analytics.
2. **Tournament prep cycle:** 4wk layout published → 2-3wk training → 1-2wk sparing → 1wk local tournament → NXL
3. **eventType:** `'tournament'` | `'sparing'` on tournament docs. Sparing = no league/division.
4. **Pair/trio classification:** by Y position vs disco/zeeker lines (slot-index fallback when no position data).
5. **Shot attribution:** approach vector projection — transform shot to master space (tx = 1-shot.x), project onto base→bunker vector, score by t parameter and lateral distance.
6. **QuickLogView activeSide:** `'home'` | `'away'` | `'both'` — single-side mode shows only that squad's roster.
7. **All inline JSX styles** — no CSS modules, no Tailwind. Import from theme.js only.
8. **UI language:** English for buttons/nav. Polish for coach analytics text (insights, counters, section headers in ScoutedTeamPage).
9. **Firestore path:** `bp()` function in dataService returns workspace-scoped base path.
10. **Mirror bunkers:** field.bunkers has master (x<0.5) + mirror (role:'mirror', x=1-master.x) bunkers. Analytics use masters only.

---

## Domain model (paintball)

- **Field:** symmetric, Dorito side (top, pyramids, D-prefix) vs Snake side (bottom, beams, S-prefix)
- **discoLine** (≈0.30): boundary between dorito zone and center
- **zeekerLine** (≈0.80): boundary between center and snake zone
- **Break:** start of point — players run from base (x≈0, y≈0.5) to bunkers
- **Approach zone:** corridor between base and a bunker where break lanes are set
- **Pair:** D1+D2 or S1+S2 (2 players on same side)
- **Trio:** pair + center player
- **NXL:** main tournament. **PXL/DPL:** local tournaments. Same layout used for all prep events.

---

## File structure (key files)

```
src/
  App.jsx                          — routes, SessionContextBar, BottomNav
  components/
    ui.jsx                         — all shared components
    PageHeader.jsx                 — back + title + action slot
    BottomNav.jsx                  — Scout/Coach/More tabs
    AppShell.jsx                   — tournament context bar + tabs
    QuickLogView.jsx               — fast point logging (3-step: pick→zone→win)
    LineupStatsSection.jsx         — pair/trio win rates display
    NewTournamentModal.jsx         — create tournament/sparing/training
    tabs/
      ScoutTabContent.jsx          — match list, add match
      CoachTabContent.jsx          — scouted teams list
  pages/
    MainPage.jsx                   — app shell, tab routing
    MatchPage.jsx                  — full scouting canvas
    ScoutedTeamPage.jsx            — opponent analytics (all sections)
    PlayerStatsPage.jsx            — player stats + scope pills + lineup
    TrainingPage.jsx               — matchup list + dual-coach entry
    TrainingSetupPage.jsx          — attendance picker
    TrainingSquadsPage.jsx         — squad builder
    TrainingResultsPage.jsx        — leaderboard
    ScoutRankingPage.jsx           — scout leaderboard
    LayoutDetailPage.jsx           — layout view + tactics
    LayoutAnalyticsPage.jsx        — layout analytics
  utils/
    theme.js                       — COLORS, FONT, RADIUS, SPACE, TOUCH, FONT_SIZE
    generateInsights.js            — computePlayerSummaries, generateInsights,
                                     generateCounters, computeBreakBunkers,
                                     computeTacticalSignals, computeShotTargets,
                                     findPrecisionShotBunker, computeLineupStats
    helpers.js                     — resolveField, resolveFieldFull, mirrorPointToLeft
  hooks/
    useFirestore.js                — useTournaments, useTrainings, useLayouts,
                                     useMatches, usePlayers, useTeams, etc.
    useLayoutScope.js              — filter tournaments/trainings by layoutId
    useLanguage.js                 — (TO BE CREATED by i18n brief)
  services/
    dataService.js                 — all Firestore CRUD
```

---

## Workflow

- **Main chat (Claude.ai):** architecture decisions, reviewing problems, writing CC briefs, small direct fixes
- **CC (Claude Code):** implements briefs from repo, runs build checks, commits + pushes
- **Tymek:** tests on iPhone, reports bugs

**CC brief pattern:**
1. Brief file added to repo root as `CC_BRIEF_*.md`
2. CC command: `Read CC_BRIEF_NAME.md and implement it.`
3. CC builds, commits, pushes
4. DEPLOY_LOG.md updated

---

## Next session priorities

1. **i18n (CC_BRIEF_I18N.md)** — highest priority, coaches complain about English
2. **Reopen match / Edit score** — currently missing from MatchPage ActionSheet (End/Delete exist, Reopen does not)
3. **ScoutedTeamPage layout scope** — "Ten turniej / Cały layout" pills exist but need testing with real multi-event data
4. **LayoutAnalyticsPage redesign** — become pre-tournament war room (own stats + opponent analysis + tactics per layout)
