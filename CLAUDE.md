# PbScoutPro — Project Context for Claude Code

## 📋 TASK QUEUE
**THREE ACTIVE BRIEFS — implement in this order:**
1. **`CC_BRIEF_TEAM_STATS_CARDS.md`** — tournament team cards with W-L, point diff, n=X (quick win)
2. **`CC_BRIEF_MATCH_FLOW.md`** — three-level match navigation (match list → review → scouting), eliminates side picker, fixes BUG-1
3. **`CC_BRIEF_QUICK_SHOTS.md`** — dual mode shot input (zone toggles + precise)
**Old CC_BRIEF_*.md files archived to `docs/archive/` — do not use.**
**Read `NEXT_TASKS.md` for full context and future work.**

**Major features shipped (April 2026):**
- Premium design system + all page redesigns
- Concurrent scouting (shared shells, side-safe writes, synced swap sides)
- Layout wizard (3-step: Basic Info → Calibrate → Vision Scan)
- Ballistics engine rewrite (shape-aware ray casting, polygon hitboxes)
- Tactic page redesign (scouting-style, freehand drawing, zones)
- Bunker editor + Vision scan + BUNKER_RECOGNITION.md
- Landscape immersive mode

## 🚨 FIRST THING ON EVERY SESSION
1. Read `PROJECT_GUIDELINES.md` — contains 39+ non-negotiable project decisions (design system, UX patterns, architecture, anti-patterns)
2. Run `git log --since="yesterday" --oneline` to catch up on recent changes
3. Read `NEXT_TASKS.md` for current queue
4. Only then start working

**If a task requires breaking any rule from PROJECT_GUIDELINES.md — STOP and ask before implementing.**

## What this is
Paintball xball scouting app. React 18 + Vite + Firebase Firestore. Deployed to GitHub Pages.

## Commands
- `npm run dev` — dev server on port 3000
- `npm run build` — production build to /dist
- `npm run deploy` — build + deploy to GitHub Pages
- `npm run lint:ui` — UI consistency linter (Polish strings, raw controls, touch targets)
- `npm run precommit` — run ALL checks before committing (build + lint + grep)
- `npx playwright test` — run E2E tests
- `npx playwright test --ui` — run tests with visual UI

## ⚠️ PRE-COMMIT RULE
**Run `npm run precommit` before EVERY commit.** It catches:
- Build failures
- Polish strings in UI (must be English)
- Raw HTML controls (must use shared components from ui.jsx)
- Touch targets below 44px
- Sticky elements without zIndex
- Debug artifacts (console.log, debugger)
Fix all errors before committing. Warnings are advisory but should be fixed too.

## 🔍 REVIEW SUITE
Automated reviewers that catch issues before manual testing:
- `npm run review` — run ALL reviewers (needs PBSCOUT_PASSWORD + ANTHROPIC_API_KEY)
- `npm run review:ux` — screenshot all screens + UX analysis via Claude Vision
- `npm run review:code` — code quality, perf, security analysis
- `npm run review:ai` — prompt efficiency, API cost, token usage audit
- `npm run review:screenshots` — capture screenshots only (no analysis)
Reports saved to `scripts/reviewers/*-report.md`. Feed reports to Opus for triage.

## Architecture
- **One FieldCanvas component** renders field everywhere (layout, tactic, match scouting)
- **FieldEditor** wraps FieldCanvas with toggle toolbar (labels/lines/zones overlay controls)
- **Layout is source of truth** — bunker data, calibration, zones stored on layout doc in Firestore
- **Web Worker** (`src/workers/ballisticsEngine.js`) does all physics computation off main thread
- **Inline JSX styles** — no CSS modules, no Tailwind. Use COLORS, FONT, TOUCH from `src/utils/theme.js`
- **Design contract** (`src/utils/design-contract.js`) — single source of truth for layout rules (header, bottom bar, form controls, touch targets). Shared components import from here.

## Key files
- `src/utils/theme.js` — design tokens: COLORS, FONT, TOUCH, FONT_SIZE, RADIUS, SPACE, responsive()
- `src/services/dataService.js` — all Firestore CRUD operations
- `src/hooks/useVisibility.js` — Web Worker hook (3-channel: safe/arc/exposed)
- `src/workers/ballisticsEngine.js` — ballistics engine (DO NOT modify physics logic)
- `src/components/FieldCanvas.jsx` — main canvas renderer (pinch-to-zoom, loupe, half-field viewport)
- `src/components/FieldEditor.jsx` — toggle toolbar wrapper (labels/lines/zones)
- `src/components/PlayerEditModal.jsx` — shared player edit form
- `src/components/ui.jsx` — shared UI: Btn, Input, Select, Checkbox, Slider, TextArea, FormField, Modal, ActionSheet, ConfirmModal, etc.
- `src/components/PageHeader.jsx` — shared page header
- `src/components/ModeTabBar.jsx` — shared sticky bottom tabs
- `src/components/BottomSheet.jsx` — shared bottom sheet
- `src/components/RosterGrid.jsx` — pre-breakout roster picker grid
- `src/components/ShotDrawer.jsx` — shot placement panel
- `src/components/BunkerCard.jsx` — bunker editor bottom sheet

## Conventions
- English UI labels (Labels, Lines, Zones, etc.)
- Mobile-first: min 44px touch targets
- **Component reusability is mandatory.** All behavior lives in shared components/hooks. Never hardcode what should be shared. Touch handling, canvas, loupe, toolbar, save flow — all in shared files. Before changing one page, check if the same component is used elsewhere. If unsure — ASK.
- Bunker types use NXL abbreviations: SB, SD, MD, Tr, C, Br, GB, MW, Wg, GW, Ck, TCK, T, MT, GP
- All coordinates normalized 0-1 (x=0 home base left, x=1 away base right)
- Firestore path: /workspaces/{slug}/layouts/{id}, /workspaces/{slug}/tournaments/{tid}/...

## Git
- Commit messages: imperative mood, prefix with feat/fix/refactor/test
- Push directly to main (no branches for now)
- `git config user.name "Claude Code"` / `git config user.email "code@pbscoutpro.dev"`

## Domain
Paintball xball: 5v5, two teams sprint from bases to bunkers at buzzer.
Bunkers have types (height/shape affects ballistic calculations).
See BREAK_ANALYZER_DOMAIN_v2.md for full domain context.
See BUNKER_RECOGNITION.md for bunker shape identification from layout images.

## Testing
Playwright E2E tests in /tests folder.
App URL: https://epicsports.github.io/pbscoutpro/
Tests need workspace password — set PBSCOUT_PASSWORD env var.
