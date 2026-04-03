# PbScoutPro — Project Context for Claude Code

## 📋 TASK QUEUE
**Read `NEXT_TASKS.md` — organized into 7 sessions. Work through in order.**
**Each session = one focus area. Push after each task.**
**Additional specs: `TACTIC_WORKFLOW.md`, `FEATURE_OCR_LANDSCAPE.md`, `SECURITY.md`**

## What this is
Paintball xball scouting app. React 18 + Vite + Firebase Firestore. Deployed to GitHub Pages.

## Commands
- `npm run dev` — dev server on port 3000
- `npm run build` — production build to /dist
- `npm run deploy` — build + deploy to GitHub Pages
- `npx playwright test` — run E2E tests
- `npx playwright test --ui` — run tests with visual UI

## Architecture
- **One FieldCanvas component** renders field everywhere (layout, tactic, match scouting)
- **FieldEditor** wraps FieldCanvas with toolbar + zoom. Focus mode = floating FAB.
- **Layout is source of truth** — bunker data, calibration, zones stored on layout doc in Firestore
- **Web Worker** (`src/workers/ballisticsEngine.js`) does all physics computation off main thread
- **Inline JSX styles** — no CSS modules, no Tailwind. Use COLORS, FONT, TOUCH from `src/utils/theme.js`

## Key files
- `src/utils/theme.js` — design tokens: COLORS, FONT, TOUCH, responsive()
- `src/services/dataService.js` — all Firestore CRUD operations
- `src/hooks/useVisibility.js` — Web Worker hook (3-channel: safe/arc/exposed)
- `src/workers/ballisticsEngine.js` — ballistics engine (DO NOT modify physics logic)
- `src/components/FieldCanvas.jsx` — main canvas renderer
- `src/components/FieldEditor.jsx` — toolbar + zoom wrapper with FAB focus mode
- `src/components/PlayerEditModal.jsx` — shared player edit form

## Conventions
- Polish UI labels (Widoczność, Nazwy, Strefy)
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
