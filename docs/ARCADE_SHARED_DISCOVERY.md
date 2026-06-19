# Arcade Shared-Code Discovery — 2026-06-19 (REFRESHED), commit f079ce44 (branch `discovery/arcade-shared`)

> READ-ONLY discovery per the CC brief. **Refresh note:** the original pass (commit f60cc524) ran while
> Asteroids + Q*bert were still prototypes "not yet in the repo." They have since been **implemented and
> shipped** (`f4477ffe`, games 6 & 7) — each ported SELF-CONTAINED (inlining its own sky/audio/dither/
> seven-seg/loop), exactly the duplication this report flagged. This version re-measures against the live
> **7-game** repo. No existing source/config file was modified by this pass. The shared-module extraction
> remains a LATER refactor brief — this only recommends.

## 1. Game roster (verified — 7 games)
| Game | File path | LOC | Route | Lazy-loaded? |
|---|---|---|---|---|
| Reads Invaders | `src/pages/ReadsInvadersPage.jsx` | 645 | `/break/invaders` | yes (`App.jsx:48`) |
| Reads Mini | `src/pages/ReadsMiniPage.jsx` | 601 | `/break/reads` | yes (`App.jsx:46`) |
| Lunar Lander | `src/pages/ReadsLanderPage.jsx` | 557 | `/break/lander` | yes (`App.jsx:49`) |
| Snake | `src/pages/ReadsSnakePage.jsx` | 551 | `/break/snake` | yes (`App.jsx:47`) |
| Read Warrior | `src/pages/ReadWarriorPage.jsx` | 329 | `/break/warrior` | yes (`App.jsx:50`) |
| **Reads Asteroids** | `src/pages/ReadsAsteroidsPage.jsx` | 290 | `/break/asteroids` | yes (`App.jsx:51`) |
| **Readbert** (Q*bert) | `src/pages/ReadbertPage.jsx` | 243 | `/break/readbert` | yes (`App.jsx:52`) |
| (selector) | `src/pages/TakeABreakPage.jsx` | 158 | `/break` | yes (`App.jsx:45`) |

- Roster source of truth: `TakeABreakPage.jsx` `GAMES[]` registry — `{id, route, Icon glyph, nameKey,
  subKey, top: ds.get<Game>Top}`. Adding a game = one `GAMES[]` entry + one lazy route + one score wrapper
  (proven twice now). The `src/components/tabs/TakeABreakSection.jsx` (35 LOC) menu row is a single
  entrypoint → `/break`; the list lives in `TakeABreakPage`.
- All 7 are **vanilla `<canvas>` + Web Audio**. Confirmed: **no** game/physics engine. (Assumption verified.)

## 2. Bundle / lightness
- **Lazy-loading:** every game is `React.lazy` (`App.jsx:45–52`) on a `/break/*` route (`App.jsx:185–192`)
  under the app-level `<Suspense>`. **Zero arcade code reaches the app entry chunk.**
- **manualChunks (`vite.config.js:87`):** function-form, **node_modules only** (`if (!id.includes('node_modules')) return;`).
  Feature/game code is NOT manually chunked → Rollup route-splits each lazy page into its own chunk.
  vendor groups: `vendor-react` (all React-ecosystem, MUST stay together — §11 precedent), `vendor-firebase`,
  `vendor-sentry`, `vendor-misc`. **No arcade leak into entry/vendor.**
- **Heavy deps in games:** NONE. (`three|phaser|pixi|matter-js|p5|gsap|howler|tone` → 0 hits.)
- **Binary assets in games:** NONE. `public/` holds only PWA icons + `reads-avatar.svg`; **no `public/sounds/`**
  (the old `.m4a` was retired → procedural chiptune). All audio procedural; all art inline canvas/SVG.
- **Chunk sizes (BUILT — `npx vite build`, raw | gzip):**
  | Chunk | raw | gzip |
  |---|---|---|
  | `index-*` (app entry) | 415.25 kB | 125.62 kB |
  | `vendor-firebase` | 581.54 kB | 138.14 kB |
  | `vendor-react` | 182.33 kB | 55.99 kB |
  | ReadWarriorPage | 29.08 kB | 10.86 kB |
  | ReadsInvadersPage | 23.64 kB | 8.29 kB |
  | ReadsLanderPage | 23.59 kB | 8.51 kB |
  | **ReadsAsteroidsPage** | 20.43 kB | 7.50 kB |
  | **ReadbertPage** | 19.61 kB | 7.35 kB |
  | ReadsMiniPage | 18.63 kB | 6.39 kB |
  | ReadsSnakePage | 18.19 kB | 6.20 kB |
  | TakeABreakPage (selector) | 6.08 kB | 2.01 kB |
- **Method: BUILT.** Each game is a self-contained 18–29 kB lazy chunk; total arcade ≈153 kB raw / ≈55 kB gz
  across 7 games + selector, **none in the 415 kB entry**. The size floor per game (~18 kB) IS the duplicated
  sky/audio/dither/seven-seg/loop — the two newest games landed at ~20 kB carrying their own copies.

## 3. Shared-candidate matrix (updated for 7 games)
| Concern | Current state | Locations (~LOC/copy) | Recommendation | Est. impact |
|---|---|---|---|---|
| Cosmic sky | **dup ×3** | Invaders `genSky/drawShoot/drawSky` (~45); Lander `genSky`/`drawSky` (~40); Asteroids `genSky/drawSky` (~40) | **extract** `cosmicSky.js` | ~42 LOC/space-game |
| Procedural audio | **dup ×7** | every page: AudioContext+master+`blip`+`noise`+envelope+music loop (Warrior/Lander richest ~50–60; Snake/Mini/Invaders/Asteroids/Readbert ~30–50) | **extract** `gameAudio.js` | biggest win — ~45 LOC ×7 |
| Seven-seg score | **dup ×3 canvas (+1 SVG)** | Warrior `SEG`+`sevenSeg`; Asteroids `SEG`+`drawDigit`; Readbert `SEG`+`drawDigit` (near-identical); Mini SVG `SEG/SEG7` (different medium) | **extract** `sevenSeg.js` (canvas) | ~24 LOC ×3 |
| Dither / 1-bit | **dup ×4** | Lander `mkDither` Bayer4×4; Warrior `tile`/`bayer`; Asteroids `buildTile`; Readbert `mkTile` (dense+sparse) — all `→ createPattern('repeat')`, screen-anchored | **extract** `dither.js` (tile factory + pattern) | ~15 LOC ×4 |
| Game shell/loop | **dup ×7** | DPR resize (`devicePixelRatio`+`setTransform`) + rAF `dt`-clamped loop reimplemented per page (Asteroids/Readbert `resize()`+`frame()` identical pattern) | **extract** `useArcadeCanvas` hook | ~30 LOC ×7 |
| Touch / overlay / HUD | **partly shared** | `src/components/arcade/ArcadeButton.jsx` (88 LOC) shared (`NO_SELECT`/`ARCADE_BTN`, hold/tap) — used by all 7. Overlays + canvas-drawn HUD still per-page | reuse `ArcadeButton`; optional `<GameShell>` | already-won + small |
| **Leaderboard / hi-score** | **ALREADY single-source (×7 boards)** | `dataService.js`: `_submitArcadeScore`, `getArcadeBests`, per-game `submit*/get*Top/get*MyScore` (incl. new `readsAsteroids` + `readbert`) → `leaderboards/{board}` + `users/{uid}/appState/arcade` mirror | reuse as-is | ~0 — 1 wrapper/board |
| Theme tokens | **mostly clean** | all 7 `import COLORS from utils/theme`. In-canvas AMBER literals: Warrior 8 / Invaders 3 / Lander 3 / Asteroids+Readbert define `AMBER`/`AMBER4` consts; Mini & Snake 0 | minor: hoist a shared `ARCADE_PALETTE` | cosmetic |

## 4. Per-game duplication map (now: what each SHIPPED game re-implements)
The two new games proved the thesis — they shipped self-contained. An extraction refactor would migrate all 7.
- **Reads Asteroids** — inlines ALL of: cosmic sky (✓ ~10 refs), procedural audio (✓ 6), dither (✓ 7),
  canvas seven-seg (✓ 3), DPR+rAF loop (✓ 4). Reuses: `ArcadeButton`, the leaderboard infra. → would import
  `cosmicSky` + `gameAudio` + `sevenSeg` + `dither` + `useArcadeCanvas`.
- **Readbert** — inlines: procedural audio (✓ 4), dither cube-face tiles (✓ 5), canvas seven-seg (✓ 3),
  DPR+rAF loop (✓ 3). **No cosmic sky** (0 — isometric board, correct). → would import `gameAudio` +
  `sevenSeg` + `dither` + `useArcadeCanvas` (not `cosmicSky`).
- **Existing 5** — same concerns, same duplication (Invaders+Lander also carry cosmic sky; Warrior+Lander
  the richest audio; Mini's seven-seg is SVG and would stay SVG or migrate).

## 5. Proposed minimal shared layout
- **Location: `src/components/arcade/`** — existing convention (`ArcadeButton.jsx` already there); do NOT
  invent a new folder.
- Modules (tiny, single-responsibility):
  - `gameAudio.js` — AudioContext singleton + master gain + `blip`/`noise`/envelope + step-sequencer music + iOS unlock (~80 LOC; replaces ~45 ×7).
  - `cosmicSky.js` — `genSky()/drawSky(ctx,sky,dt)` incl. shooting-star (space games only) (~55 LOC).
  - `sevenSeg.js` — canvas digit drawer + `SEG` table (~30 LOC).
  - `dither.js` — Bayer/dot tile factory → `createPattern` helper (tile content as arg) (~25 LOC).
  - `useArcadeCanvas.js` (hook) — DPR-aware sizing + resize + rAF `dt`-clamped loop wiring a ref canvas (~50 LOC).
  - `ArcadeButton.jsx` — **exists**, reuse. Leaderboard wrappers — **exist** in `dataService.js`.
- **Constraint check (lightness):** every shared module imported **only** by the lazy `/break/*` pages
  (themselves lazy). Rollup hoists them into an arcade-shared chunk loaded with the first game, or duplicates
  per game chunk — **never enters the app entry**. Hard rule for the refactor brief: **no eagerly-loaded
  module may import `src/components/arcade/*`** (no util barrel, no non-lazy component), or the arcade leaks
  into the entry chunk and defeats the add-on goal.

## 6. Savings estimate (7 games)
- **Duplicated LOC today:** ~1,150 across 7 games (audio ~330, sky ~125, seven-seg ~75, dither ~70,
  shell/loop ~210, plus per-game HUD/overlay).
- **Realistic LOC removed by extraction:** ~750–850 net (shared modules cost ~240 LOC once).
- **Net bundle effect:** mild per-game chunk shrink (esp. audio), or neutral; **app entry unchanged** (lazy).
  No risk of increase PROVIDED the no-eager-import rule (§5) holds.
- **Decision input:** with 7 games now duplicating, the extraction is worth more than at 5 — but it is a
  refactor that touches all 7 live games (regression surface). Recommend gating it behind its own brief +
  the existing per-game e2e suite (each game has a fail-first spec) as the safety net.

## 7. Blockers / could-not-determine
- **Original assumption now false (corrected):** "Asteroids/Q*bert not yet in the repo — ignore them" — both
  are shipped (`f4477ffe`). This refresh measures all 7; nothing was ignored.
- **`HANDOFF.md`** does not pre-exist in the repo (narrative state is `docs/ops/HANDOVER.md`); created at root
  per the brief's explicit wording. Flag if you'd rather fold it into `docs/ops/HANDOVER.md`.
- Build ran clean; §2 chunk sizes are real (not estimated). `dist/` not committed.
- Prototypes saved: `docs/prototypes/asteroids.html` + `docs/prototypes/readbert.html`.
