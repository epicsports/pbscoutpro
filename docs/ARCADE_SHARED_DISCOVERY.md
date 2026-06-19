# Arcade Shared-Code Discovery — 2026-06-19, commit f60cc524 (branch `discovery/arcade-shared`)

> READ-ONLY discovery per the CC brief. No existing source/config file was modified. Writes on this
> branch: this report, `HANDOFF.md`, and `docs/prototypes/asteroids.html` (the Asteroids prototype Jacek
> handed over mid-pass — saved so it isn't lost; it makes the Asteroids mapping concrete rather than
> hypothetical). The extraction/refactor is a LATER implementation brief — this only recommends.

## 1. Game roster (verified)
| Game         | File path                          | LOC | Route            | Lazy-loaded? |
|--------------|------------------------------------|-----|------------------|--------------|
| Read Warrior | `src/pages/ReadWarriorPage.jsx`    | 329 | `/break/warrior` | yes (`App.jsx:50`) |
| Reads Invaders | `src/pages/ReadsInvadersPage.jsx`| 645 | `/break/invaders`| yes (`App.jsx:48`) |
| Lunar Lander | `src/pages/ReadsLanderPage.jsx`    | 557 | `/break/lander`  | yes (`App.jsx:49`) |
| Snake        | `src/pages/ReadsSnakePage.jsx`     | 551 | `/break/snake`   | yes (`App.jsx:47`) |
| Reads Mini   | `src/pages/ReadsMiniPage.jsx`      | 601 | `/break/reads`   | yes (`App.jsx:46`) |
| (selector)   | `src/pages/TakeABreakPage.jsx`     | 146 | `/break`         | yes (`App.jsx:45`) |

- Roster source of truth: `TakeABreakPage.jsx` `GAMES[]` registry (line 70) — `{id, route, Icon glyph,
  nameKey, subKey, top: ds.get<Game>Top}`. The menu entry (`src/components/tabs/TakeABreakSection.jsx`,
  35 LOC) is a single row → `/break`; the actual game list lives in `TakeABreakPage`.
- All five game pages + the selector are **vanilla `<canvas>` + Web Audio**. Confirmed: **no** game/physics
  engine. (Assumption verified true.)

## 2. Bundle / lightness
- **Lazy-loading:** every game is `React.lazy` (`App.jsx:45–50`) on a `/break/*` route (`App.jsx:185–190`),
  wrapped in the app-level `<Suspense>`. **Zero arcade code reaches the app entry chunk.**
- **manualChunks (`vite.config.js:87`):** function-form, **node_modules only** (`if (!id.includes('node_modules')) return;`).
  App/feature code (incl. games) is NOT manually chunked → Rollup route-splits each lazy page into its own
  chunk. Groups: `vendor-react` (all React-ecosystem, MUST stay together — §11 white-screen precedent),
  `vendor-firebase`, `vendor-sentry`, `vendor-misc`. **No arcade leak into entry/vendor.**
- **Heavy deps in games:** NONE. (`rg "from '(three|phaser|pixi|matter-js|p5|gsap|howler|tone)'"` → 0 hits.)
- **Binary assets in games:** NONE. `public/` has only PWA icons + `reads-avatar.svg`; **no `public/sounds/`**
  (the old `sky-catcher-loop60.m4a` was retired → procedural chiptune, `8a7d06e3`). Audio is 100% procedural;
  art is inline canvas/SVG. Target state (~0 bytes) already met.
- **Chunk sizes (BUILT — `npx vite build`, raw | gzip):**
  | Chunk | raw | gzip |
  |---|---|---|
  | `index-*` (app entry) | 415.25 kB | 125.62 kB |
  | `vendor-react` | 182.33 kB | 55.99 kB |
  | `vendor-firebase` | 581.54 kB | 138.14 kB |
  | ReadWarriorPage | 29.08 kB | 10.86 kB |
  | ReadsInvadersPage | 23.64 kB | 8.29 kB |
  | ReadsLanderPage | 23.59 kB | 8.51 kB |
  | ReadsMiniPage | 18.63 kB | 6.39 kB |
  | ReadsSnakePage | 18.19 kB | 6.20 kB |
  | TakeABreakPage (selector) | 6.08 kB | 2.01 kB |
- **Method: BUILT.** Each game is a self-contained 18–29 kB chunk; the size spread *is* the duplication
  (each carries its own sky/audio/dither/seven-seg/loop). Total arcade ≈113 kB raw / ≈40 kB gz, all lazy,
  none in the 415 kB entry.

## 3. Shared-candidate matrix
| Concern | Current state | Locations (file:line, ~LOC) | Recommendation | Est. impact |
|---|---|---|---|---|
| Cosmic sky | **dup ×2 (×3 w/ Asteroids)** | Invaders `genSky/drawShoot/drawSky` 235–280 (~45); Lander `genSky` 66 + `drawSky` 205 (~40); Asteroids proto `genSky/drawSky` (~40) | **extract** `cosmicSky.js` | ~45 LOC saved/game; Asteroids imports vs reimplements |
| Procedural audio | **dup ×5 (×7 w/ new)** | every page has AudioContext+master+`blip`+`noise`+envelope+music-loop: Warrior(4 refs)/Snake(4)/Lander(10)/Mini(4)/Invaders(6); Asteroids proto ~60 LOC | **extract** `gameAudio.js` | biggest win — ~50 LOC/game ×7 |
| Seven-seg score | **dup ×2 canvas (+1 SVG)** | Warrior canvas `SEG`+`sevenSeg` 183–184 (~25); Asteroids proto canvas `SEG`+`drawDigit` (~22); Mini SVG `SEG/SEG7` 152–161 (different medium) | **extract** `sevenSeg.js` (canvas) | ~22 LOC/game; Mini stays SVG or migrates |
| Dither / 1-bit | **dup ×3** | Lander `mkDither` Bayer4×4→`createPattern` 159–170 (~20); Warrior `tile`/`bayer` 63–69 (~15); Asteroids proto `buildTile`→`createPattern` (~10) | **extract** `dither.js` (tile factory + pattern) | ~15 LOC/game |
| Game shell/loop | **dup ×5** | DPR resize (`devicePixelRatio`+`setTransform`) + rAF `dt`-clamped loop reimplemented per page (Invaders 3 / Warrior 3 / Lander 2 / Mini 2 / Snake 2 rAF/DPR refs); Asteroids proto `resize()`+`loop()` identical pattern | **extract** `useArcadeCanvas` hook | ~30 LOC/game boilerplate |
| Touch / overlay / HUD | **partly shared** | `src/components/arcade/ArcadeButton.jsx` (88 LOC) ALREADY shared: `NO_SELECT`, `ARCADE_BTN`, hold/tap modes. Overlays + HUD frames still inline per page | reuse `ArcadeButton`; optional `<GameShell>` for overlay/HUD | already-won + small |
| **Leaderboard / hi-score** | **ALREADY single-source** | `dataService.js`: `_submitArcadeScore` 3365, `getArcadeBests` 3392, per-game `submit*Score`/`get*Top` 3239–3360 → `leaderboards/{board}/scores/{uid}` + mirror `users/{uid}/appState/arcade` | reuse as-is — add 1 wrapper/board per new game | ~0 new infra |
| Theme tokens | **mostly clean** | all 5 pages `import COLORS from utils/theme` (1 each). In-canvas AMBER literals: Warrior 8 / Invaders 3 / Lander 3; Mini & Snake 0 | minor: hoist the AMBER consts | cosmetic |

## 4. Per-game mapping (for the implementation briefs)
### Asteroids — import vs implement (concrete, from `docs/prototypes/asteroids.html`)
- **Cosmic sky:** the proto's `genSky/drawSky` (stars+nebulae+planets+shooting-star, screen-anchored,
  re-rolled per wave) is the SAME shape as Invaders+Lander → **extract-then-import** `cosmicSky.js`.
- **Audio:** proto's `aInit/unlockAudio/blip/noise/envelope/music` are the canonical set → **import**
  `gameAudio.js`. Game-specific SFX (`sFire/sBoom/sThrust/sUFO/heartbeat`) stay **local** but built on the
  shared primitives.
- **Seven-seg:** proto's canvas `SEG`+`drawDigit` is byte-near Warrior's → **import** `sevenSeg.js`.
- **Dither:** proto's `buildTile`+`createPattern` → **import** `dither.js` (the asteroid dot-tile is a config arg).
- **Shell/loop/HUD/touch:** **import** `useArcadeCanvas` (DPR+rAF) + `ArcadeButton` (rotate/thrust/fire/jump
  pads). Overlay/HUD inline or via optional `<GameShell>`.
- **HI-SCORE (answers "sprawdź czy mają hi score"):** the proto has **only an in-memory `hi`** (`let hi=0;
  hi=Math.max(hi,score)` on game-over — resets on reload, no initials, no persistence). To match the other
  games: add `READS_ASTEROIDS_BOARD='readsAsteroids'` + `submitReadsAsteroidsScore`/`getReadsAsteroidsTop`
  (mode `'A'`) in `dataService.js`, a new-best **initials overlay** (`[A-Z]{3}`, which the proto lacks — same
  add Lander/Warrior got), and register `top: ds.getReadsAsteroidsTop` in `GAMES[]`. **No rules change** —
  the shared `leaderboards/{board}` rule already validates any board (mode must be `'A'|'B'`).
### Q*bert — import vs implement (prototype not yet provided)
- (Q*bert needs: dither, audio, seven-seg, shell/loop/HUD/touch — **NOT** cosmic sky.)
- **Audio / seven-seg / dither / shell+loop / touch:** **import** the same shared modules.
- **Cosmic sky:** **skip** (isometric cube board, no starfield).
- **Hi-score:** same pattern — add `READS_QBERT_BOARD` + wrappers + initials overlay + `GAMES[]` entry.
- Confirm against the real prototype when it lands (mapping above is from the genre, not pasted code).

## 5. Proposed minimal shared layout
- **Location: `src/components/arcade/`** — matches the existing convention (`ArcadeButton.jsx` already there);
  do NOT invent a new folder.
- Modules (each tiny, single-responsibility):
  - `gameAudio.js` — AudioContext singleton + `master` gain + `blip`/`noise`/envelope + a step-sequencer
    music helper + iOS unlock. (~80 LOC; replaces ~50/game.)
  - `cosmicSky.js` — `genSky()/drawSky(ctx,sky,dt)` incl. shooting-star (space games only). (~55 LOC.)
  - `sevenSeg.js` — canvas digit drawer + `SEG` table (`drawScore(ctx,...)`). (~30 LOC.)
  - `dither.js` — Bayer/dot tile factory → `createPattern` helper (tile content as arg). (~25 LOC.)
  - `useArcadeCanvas.js` (hook) — DPR-aware sizing + resize + rAF `dt`-clamped loop wiring a ref canvas. (~50 LOC.)
  - `ArcadeButton.jsx` — **exists**, reuse.
  - Leaderboard wrappers — **already** centralized in `dataService.js`; add 1 `submit/get` pair + board const per new game.
- **Constraint check (lightness):** every shared module is imported **only** by the lazy `/break/*` pages
  (which are themselves lazy, incl. `TakeABreakPage`). Rollup will hoist them into an arcade-shared chunk
  loaded with the first game, or duplicate into each game chunk — **either way it never enters the app
  entry**. The one hard rule for the impl brief: **no eagerly-loaded module may import `src/components/arcade/*`**
  (no util barrel, no non-lazy component) — that would pull the arcade into entry and defeat the add-on goal.

## 6. Savings estimate
- **Duplicated LOC today:** ~850 across the 5 games (audio ~250, sky ~85, seven-seg ~50, dither ~50,
  shell/loop ~150, plus misc HUD/overlay).
- **Realistic LOC removed by extraction:** ~550–600 net across the 5 existing games (shared modules cost
  ~240 LOC once). The bigger value is **forward**: each NEW game (Asteroids, Q*bert) imports instead of
  re-implementing ~200 LOC of sky/audio/seg/dither/loop.
- **Net bundle effect:** mild reduction or neutral — duplicated logic collapses into one arcade-shared
  chunk; per-game chunks shrink (esp. audio). Because it's lazy, the **app entry is unchanged either way**.
  No risk of increase PROVIDED the no-eager-import rule (S5) holds.

## 7. Blockers / could-not-determine
- **`HANDOFF.md` did not exist** — the repo's narrative state file is `docs/ops/HANDOVER.md`. Per the brief's
  explicit wording I created a root `HANDOFF.md` with the exec summary; flag if you'd rather fold it into
  `docs/ops/HANDOVER.md` instead.
- **Q*bert prototype not provided** — its mapping (§4) is inferred from the genre + shared-module fit, not
  from pasted code. Re-verify when the prototype lands.
- **Asteroids prototype** was provided mid-pass and saved to `docs/prototypes/asteroids.html`; §4 Asteroids
  mapping is from that real code. (Jacek noted he's unsure whether it differs from another copy — diff on
  arrival if a second version appears.)
- Build ran clean; chunk sizes in §2 are real (not estimated). `dist/` not committed.
