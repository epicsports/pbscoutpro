# PbScoutPro — Project Context for Claude Code

## 📋 TASK QUEUE
**🚨 URGENT_FIXES.md — A-D are DONE (committed a6d9579).**
**🚨 NOW: Read `CC_MASTER_BRIEF.md` — UI unification, loupe fix, bump redesign, shared components.**
**Work through the 9 passes in order. Push after each pass.**
**Also pending: `CC_BRIEF_LAYOUT_PAGE.md` — 11 fixes for LayoutDetailPage.**
**Later: `NEXT_TASKS.md` Session 4.0+ — resume after briefs are done.**
**Additional specs: `TACTIC_WORKFLOW.md`, `TRANSLATION_MANIFEST.md`, `FEATURE_OCR_LANDSCAPE.md`, `SECURITY.md`**

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

## Architecture
- **One FieldCanvas component** renders field everywhere (layout, tactic, match scouting)
- **FieldEditor** wraps FieldCanvas with toolbar + zoom. Focus mode = floating FAB.
- **Layout is source of truth** — bunker data, calibration, zones stored on layout doc in Firestore
- **Web Worker** (`src/workers/ballisticsEngine.js`) does all physics computation off main thread
- **Inline JSX styles** — no CSS modules, no Tailwind. Use COLORS, FONT, TOUCH from `src/utils/theme.js`
- **Design contract** (`src/utils/design-contract.js`) — single source of truth for layout rules (header, bottom bar, form controls, touch targets). Shared components import from here.

## Key files
- `src/utils/theme.js` — design tokens: COLORS, FONT, TOUCH, responsive()
- `src/services/dataService.js` — all Firestore CRUD operations
- `src/hooks/useVisibility.js` — Web Worker hook (3-channel: safe/arc/exposed)
- `src/workers/ballisticsEngine.js` — ballistics engine (DO NOT modify physics logic)
- `src/components/FieldCanvas.jsx` — main canvas renderer
- `src/components/FieldEditor.jsx` — toolbar + zoom wrapper with FAB focus mode
- `src/components/PlayerEditModal.jsx` — shared player edit form
- `src/components/ui.jsx` — shared UI: Btn, Input, Select, Checkbox, Slider, TextArea, FormField, HeatmapToggle, Modal, etc.
- `src/components/PageHeader.jsx` — shared page header (create per CC_MASTER_BRIEF)
- `src/components/ModeTabBar.jsx` — shared sticky bottom tabs (create per CC_MASTER_BRIEF)
- `src/components/ActionBar.jsx` — shared sticky action bar (create per CC_MASTER_BRIEF)
- `src/components/BottomSheet.jsx` — shared bottom sheet (create per CC_MASTER_BRIEF)

## Conventions
- English UI labels (Visibility, Names, Zones, Positions, Shots, etc.)
- Mobile-first: min 44px touch targets
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

## Testing
Playwright E2E tests in /tests folder.
App URL: https://epicsports.github.io/pbscoutpro/
Tests need workspace password — set PBSCOUT_PASSWORD env var.
