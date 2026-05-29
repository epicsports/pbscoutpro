# e2e suite (Firebase emulator)

Isolated end-to-end tests that run against the **Firebase emulator suite** (auth +
firestore) with a seeded fixture — never against the prod project.

## Prerequisites
- `firebase` CLI (installed) **+ a JRE** — the Firestore emulator needs Java.
  GitHub Actions runners have Java; locally install a JDK if `java -version` fails.
- Playwright browsers: `npx playwright install chromium`.

## Run
```bash
npm run test:e2e
```
This single command (via `playwright.emulator.config.js` → `webServer`):
1. boots the auth + firestore emulators (`firebase emulators:exec`),
2. seeds the fixture (`scripts/test/seed-emulator.cjs`),
3. starts Vite with `VITE_USE_EMULATOR=true` (app → emulator, not prod),
4. runs the specs in `tests/e2e/`.

## What's covered
- `login.spec.js` — #3 login → workspace auto-entry → home renders (+ console-error
  guard, tab switching, touch-target audit migrated from the retired smoke suite).
- `log-point.spec.js` — #2 match opens in scout mode; log a point → persists →
  reads back.
- `concurrent-merge.spec.js` — #1 (KEYSTONE) two-coach concurrent scouting →
  `endMatchAndMerge`: no point loss, no doc-ID collision, both coaches' data merged.

## Test bridge (`window.__pbtest`)
`src/services/testBridge.js` is an **emulator-only** hook (guarded by
`VITE_USE_EMULATOR`; tree-shaken from prod — verified by a dist grep). It exposes
the REAL dataService write/merge/read paths (`addPoint` auto-id + coachUid/index,
`endMatchAndMerge`, one-shot points read) so the suite exercises the
concurrent-scouting + merge corruption class at the data layer without brittle
canvas/bottom-sheet puppetry (brief-sanctioned "test-only hook" latitude).

## Fixture
`scripts/test/seed-emulator.cjs` seeds: test account `coach@test.local` / `test1234`
(workspace admin+coach), workspace `demo-ws`, 2 teams + rosters, 1 tournament, 1
match. Constants mirrored in `tests/e2e/fixtures.js` — **keep both in sync**.

## Not part of this suite
- `tests/responsive-audit.spec.js` + `playwright.config.js` → prod responsive
  screenshots (manual, targets the live site).
- `scripts/reviewers/*` → Claude-Vision UX/code audit, **on-demand only**
  (`npm run review*`), not a gate.

## Stage 2 (next brief)
`#1` concurrent two-coach scouting → end-match merge (multi-client emulator writes
+ merge assertion) — highest blast-radius UAT.
