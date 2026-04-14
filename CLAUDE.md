# PbScoutPro — Project Context for Claude Code

## 🤖 AUTONOMOUS WORKFLOW
**You work independently. Do NOT wait for human approval between tasks.**

### On every session:
```
1. git pull origin main
2. Read PROJECT_GUIDELINES.md (design system, patterns, anti-patterns)
3. Read DESIGN_DECISIONS.md section 27 (Apple HIG — MANDATORY)
4. Run: git log --since="yesterday" --oneline
5. Read this file's TASK QUEUE below
6. Pick the first incomplete task → implement → commit → deploy → next
```

### On every task:
```
1. Read the brief file (CC_BRIEF_*.md) FULLY before coding
2. Implement one part at a time
3. npx vite build 2>&1 | tail -5  (must pass)
4. npm run precommit  (must pass)
5. git add -A && git commit -m "feat/fix: descriptive message"
6. git push origin main
```

### On every brief completed:
```
1. npm run deploy  (deploys to GitHub Pages)
2. Append status to DEPLOY_LOG.md (see format below)
3. Move to next task in queue
```

### DEPLOY_LOG.md format:
```markdown
## YYYY-MM-DD HH:MM — [Brief name]
**Commit:** abc1234
**Status:** ✅ Deployed / ❌ Failed
**What changed:** 1-2 sentence summary
**Known issues:** any warnings or edge cases noticed
```

### Rules:
- **Never wait for approval** — move to next task after deploy
- **If a task is ambiguous** — make a reasonable choice, note it in commit message
- **If something breaks** — fix it immediately, commit the fix, then continue
- **If build fails** — do NOT push. Fix first.
- **If you're unsure about a design decision** — check DESIGN_DECISIONS.md. If not covered, follow Apple HIG principles (section 27): clarity, deference, depth, consistency.

**If a task requires breaking any rule from PROJECT_GUIDELINES.md — STOP and ask before implementing.**

---

## 📋 TASK QUEUE
**All current briefs completed.**

1. ✅ **`CC_BRIEF_QUICK_LOGGING.md`** — DONE: fast point logging, no canvas
2. ✅ **`CC_BRIEF_COUNTER_SUGGESTIONS.md`** — DONE: tactical counter plan from insights
3. ✅ **`CC_BRIEF_TAB_NAVIGATION.md`** — DONE: bottom tab nav (Scout/Coach/More)
4. ✅ **`CC_BRIEF_TRAINING_MODE.md`** — DONE: training sessions with squads + drag & drop
5. ✅ **`CC_BRIEF_MATCH_FLOW.md`** — DONE: split-tap cards, review view, no side picker
6. ✅ **`CC_BRIEF_QUICK_SHOTS.md`** — DONE: zone toggles, obstacle play, player indicators
7. ✅ **`CC_BRIEF_COACH_SUMMARY.md`** — DONE: insights engine, stats, player cards
8. ✅ **`CC_BRIEF_PLAYER_STATS_HERO.md`** — DONE: PlayerStatsPage, HERO toggle, amber glow

**Old CC_BRIEF_*.md files in `docs/archive/` — do not use.**

---

## 📦 ALREADY SHIPPED (do not reimplement)
- Premium design system + dark theme + Apple HIG compliance
- Bottom tab navigation (Scout/Coach/More) with tournament picker
- Training mode (who's here, squad builder drag&drop, matchups, results)
- Quick Logging mode (roster → tap winner → next, no canvas)
- Counter Suggestions (tactical counters from opponent insights)
- Formation consistency insight (predictable/unpredictable detection)
- Quick Shots (zone toggles + obstacle play + small player indicators)
- Coach team summary (insights engine + stats + player cards)
- Player Stats Page + HERO rank system + full profile (bunkers, shots, kills)
- Kill attribution engine + bunker matching
- Fifty bunker detection (Snake 50 / Dorito 50 instead of generic)
- Player metrics: W/L/+- per player, matchesPlayed, bunker, position
- Point summary bar (removed — was redundant)
- Bump flow (toolbar ⏱ — saves position, clears player, re-place)
- Run lines from base to players
- Runner+eliminated = triangle with skull
- Tournament settings + Close tournament in More tab
- Practice mode simplified (no league/division/year)
- Match review with split-tap point cards
- Concurrent scouting (shared shells, side-safe writes)
- Layout wizard (3-step: Basic Info → Calibrate → Vision Scan)
- Ballistics engine (shape-aware ray casting, Web Worker)
- Bunker editor + Vision scan
- Landscape immersive mode

---

## What this is
Paintball xball scouting app. React 18 + Vite + Firebase Firestore. Deployed to GitHub Pages.

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run deploy` — build + deploy to GitHub Pages
- `npm run precommit` — run ALL checks before committing
- `npx vite build 2>&1 | tail -5` — quick build check

## ⚠️ PRE-COMMIT RULE
**Run `npm run precommit` before EVERY commit.** It catches:
- Build failures
- Polish strings in UI (must be English)
- Raw HTML controls (must use shared components from ui.jsx)
- Touch targets below 44px
- Debug artifacts (console.log, debugger)
Fix all errors before committing.

## Architecture
- **One FieldCanvas component** renders field everywhere
- **Inline JSX styles** — no CSS modules, no Tailwind. Use COLORS/FONT/TOUCH from `src/utils/theme.js`
- **Layout is source of truth** — bunker data, calibration, zones on layout doc
- **Web Worker** for ballistics (DO NOT modify physics logic)
- **Component reusability mandatory** — all behavior in shared components/hooks

## Key files
- `src/utils/theme.js` — design tokens
- `src/services/dataService.js` — all Firestore CRUD
- `src/components/FieldCanvas.jsx` — main canvas
- `src/components/ui.jsx` — shared UI components
- `src/components/AppShell.jsx` — bottom tab bar wrapper
- `src/components/TournamentPicker.jsx` — tournament/training selector
- `src/components/QuickLogView.jsx` — fast point logging (no canvas)
- `src/pages/MainPage.jsx` — app root with tabs + EditTournamentModal
- `src/pages/PlayerStatsPage.jsx` — full player profile
- `src/pages/ScoutedTeamPage.jsx` — coach team summary + counter plan
- `src/pages/Training*.jsx` — Setup, Squads, Training, Results pages
- `src/utils/generateInsights.js` — insight engine + player summaries + counters
- `src/utils/playerStats.js` — per-player stat computation
- `src/utils/coachingStats.js` — coaching statistics
- `src/components/field/drawPlayers.js` — player rendering
- `src/components/field/drawQuickShots.js` — shot indicators (two rings)
- `src/components/field/touchHandler.js` — canvas touch/mouse handling

## Conventions
- English UI labels everywhere
- Mobile-first: min 44px touch targets
- All coordinates normalized 0-1
- Commit messages: imperative mood, prefix feat/fix/refactor
- Push directly to main

## Git
```bash
git config user.name "Claude Code"
git config user.email "code@pbscoutpro.dev"
```

## Domain
Paintball xball: 5v5, sprint from bases to bunkers at buzzer.
See BREAK_ANALYZER_DOMAIN_v2.md for full context.
See BUNKER_RECOGNITION.md for bunker identification.
