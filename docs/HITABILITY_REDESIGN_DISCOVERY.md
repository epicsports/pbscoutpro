# Hitability / Canvas responsive redesign — DISCOVERY (read-only, 2026-06-09)

Grounds the responsive Canvas-archetype redesign in actual code. **No build, no restyle.** Report on branch
`discovery/hitability-responsive` (NOT for main). Method: read `HitabilityPage.jsx`, `HitabilityCanvas.jsx`,
`HitBreakdownList.jsx`, `HitabilityAnalyticsSection.jsx`, `useLandscapeMode.js`, `theme.js` + the live evidence from the
just-closed counting-bug instrumentation.

---

## #1 — LANDMINE: canvas sizing + coordinate transform across orientation — **VERDICT: SAFE (with one invariant to preserve)**

**How it sizes today (post `c6359353`, `HitabilityCanvas.jsx:84-100`):** a `ResizeObserver` observes the **WRAPPER**
(`wrapRef`, not the canvas), reads `wrap.getBoundingClientRect()` (`:89`), contain-fits the field `aspect` within
`availW × min(availH, maxHeight)`, and `setSize({w,h})` (`:95`). The `<canvas>` then gets an **EXPLICIT px size**
(`width: size.w px / height: size.h px`, `:246-247`) and the drawing buffer is `size × dpr` (`:108-109`,
`dpr = min(devicePixelRatio, 2)`). Effect deps `[aspect, maxHeight]`. **This replaced the old `width:auto` self-feeding
loop** (canvas measured itself → buffer fed back into intrinsic size → ×dpr growth/frame = the desktop "slow scale-up").

**Tap → field-coordinate transform (`relPos`, `:186-192`):** `nx = (clientX − rect.left)/rect.width`,
`ny = (clientY − rect.top)/rect.height`, clamped 0–1, using a **LIVE** `canvasRef.getBoundingClientRect()` per event. No
viewBox, no DPR in the tap path (DPR only scales the buffer, not the CSS rect). `collectHits` (`:195`) compares the tap
(in `nx*w, ny*h`) to each marker at `p.x*w, p.y*h` where `w,h` are the **live rect** passed from `relPos`. Markers are
DRAWN at `p.x*size.w` (`size` = RO-measured wrapper fit).

**The invariant that makes it correct:** both the **draw** (`p.x*size.w`) and the **hit-test** (`p.x*rect.width`) derive
from the **same rendered canvas box** — `size` is the RO measurement of that box, `rect` is the live measurement of the
same box. As long as `size ≈ rect` (true once the RO has fired), a tap on a drawn marker maps back to it. DPR never
enters the tap math, so retina is fine.

**Across an orientation change / container resize:**
- The RO observes the **wrapper**, so it fires on the actual layout resize (rotate changes the wrapper box) → `size`
  refreshes. ✅ It is NOT keyed off `window.innerWidth/innerHeight` (the iOS-staleness vector) for the box itself.
- `maxHeight` = `canvasMaxHeight(178,178)` (`HitabilityPage.jsx:234`), which IS `window.innerHeight − offset`
  (`useLandscapeMode.js:68-75`, memoised on `immersive`). On rotate, `isLandscape` flips → `immersive` flips →
  `canvasMaxHeight` recreated → `maxHeight` prop changes → the RO effect re-runs anyway. So even if `innerHeight` is
  briefly stale on iOS, **it only affects the fit CAP, not the coordinate mapping** — because draw + hit-test both use
  the resulting `size`, they stay consistent (the field may be sized slightly off for a beat, taps still land).
- **Residual risk:** a sub-second window immediately after rotate, before the RO fires, where `size` is the old
  orientation. A tap in that window could miss. It self-corrects on the next frame. Low severity; worth a guard if the
  redesign animates the reflow.

**Real-path evidence (not just static reading):** the counting-saga instrumentation already produced a landscape
readout — `targetsHit=1, dist=9/22` — i.e. a tap mapped to the correct target in landscape. **The bug was a stale
`layoutId=null` in the WRITE, NOT the coordinate transform.** So the transform is confirmed-correct in steady-state
landscape on Jacek's device.

**Verdict + redesign guardrail:** the coordinate transform is **safe to build on** — no fix required first.
The redesign MUST preserve the invariant: **(a)** size the canvas from its own RESIZE-OBSERVED container, never
`width:auto` and never from `window.inner*` for the box; **(b)** keep `relPos` on a LIVE `getBoundingClientRect`;
**(c)** draw + hit-test both from the same `size`. A short post-rotate spike (re-add a 1-line log, rotate, tap, confirm
`targetsHit=1`) is cheap insurance if Opus wants certainty before building the reflow — recommended but not blocking.

---

## #2 — current module shell / layout (`HitabilityPage.jsx`)
Full-screen `position:fixed; inset:0; zIndex:120; flex column` (`:256`). Top→bottom: **top bar** (back ‹ + title +
`saveError` chip, `:257-271`); **mode switcher** (3 equal-flex pills Config/Tracking/Summary, full-width row, `:273-287`);
**body** (per mode, `:290-314`); **hint** line (`:315-319`); `ActionSheet` (chooser, `:322`). The "small centered canvas
+ full-width tabs + bottom helper" we want to replace = exactly this fixed top-stack + the canvas living inside `canvasEl`
(`:237-251`) whose wrapper is `flex:1` centered.

---

## #3 — orientation wiring (clean-replacement scope)
- `useLandscapeMode()` → `{ isLandscape, canvasMaxHeight }` (`:35`).
- **HARD landscape-force gate** (`:229-230`): `if (!isLandscape && !device.isDesktop) return <KioskRotatePrompt …/>`.
  → portrait phone gets the rotate prompt, NO portrait UI. **This is what the redesign removes.**
- `canvasMaxHeight(178,178)` → `maxH` (`:234`), passed as the canvas `maxHeight`.
- **Replacement touches:** delete the `:229-230` gate; drop the `KioskRotatePrompt` import (`:9`) + the
  `hitability_rotate_title/msg` i18n if unused elsewhere; keep `useLandscapeMode` for `isLandscape` (reflow signal) +
  `canvasMaxHeight`. No other module references the gate — clean removal, no dead path left.

---

## #4 — `responsive()` helper (`theme.js:411-440`)
`responsive(deviceType='mobile')` returns one of three **device-TIER** packs (`mobile`/`tablet`/`desktop`, keyed off
`useDevice().type`): `font {xs..xxl}`, `touch {minTarget,targetLg,btnPad*}`, `layout {maxWidth,padding,gap,cardPad}`,
`canvas {maxHeight}`, `modal {maxWidth,borderRadius}`, `icon {size,btn}`. It is **tier-based, NOT fluid** (no viewport-
width interpolation, no DPR). Consumers: most pages do `const R = responsive(device.type)` (LayoutAnalyticsPage,
TournamentPicker, …) and read `R.font.base` etc.; many other screens use the static `FONT_SIZE` constants instead
(`theme.js:204-212`) → **two parallel type scales coexist** (also flagged in `STYLE_AUDIT.md §1`). **The Hitability
module uses NEITHER `responsive()` nor `FONT_SIZE` consistently** — it hardcodes sizes inline + uses `canvasMaxHeight`.
For the redesign: orientation reflow needs `isLandscape` (from `useLandscapeMode`, device-aware), and tier scaling
(field-bigger-on-desktop, rail ~constant) maps to `responsive(device.type)`.

---

## #5 — shared canvas components reusability — **the module is STANDALONE (does NOT use the shared stack)**
`HitabilityCanvas.jsx` imports ONLY `{ COLORS }` (`:2`). It does **NOT** use `BaseCanvas`, `InteractiveCanvas`,
`touchHandler`, `drawField`, `drawPlayers`, or a `drawLineFromTo` (the last doesn't exist — still the deferred DRY
extraction). It is a bespoke `<canvas>` with its own draw pipeline (field image + bunker dots + links + markers, inline)
and its own pointer handlers (`handleDown/Move/Up`, `:201-235`) with a local collect-all-hits (NOT the scouting
`touchHandler`'s first-hit-only — deliberate, per the STAGE-0 decision). **Field render in both box shapes:** because it
contain-fits the field `aspect` into the measured container (`:88-95`), it renders correctly in a short-wide box
(portrait, field on top) AND a tall box (landscape, field full-height) — the fit math is orientation-agnostic. So the
redesign can reflow the container freely; the canvas adapts. (Reusing `BaseCanvas` later is possible but would re-open
the gesture-model question we already settled — not needed for the responsive shell.)

---

## #6 — controls inventory per mode (what slots into rail vs bottom-stack)
- **Config** (`:290`): NO side controls — all interaction is ON the canvas (tap left=add position, right=add target,
  tap→link, tap-line=delete, drag). Only chrome = the hint line + the disambiguation `ActionSheet`. → in the shell,
  Config = field + (optional) a thin legend/help; nothing heavy for the rail.
- **Tracking** (`:291-296`): canvas (flex 1) + **`HitList`** (deletable hit rows, 210px side panel, `:294`/`:326`) +
  the position-pick **`ActionSheet`** (0-connection only). → rail/stack candidate: the hit-list.
- **Summary** (`:297-313`): canvas (heatmap, `weightTargets`, `:247`) + **`HitBreakdownList`** (obstacle-ranked +
  position sub-breakdown, 232px panel, `:305`) + total line. → rail/stack candidate: the breakdown.
- Cross-mode: top bar (back/title/saveError), the 3-pill **mode switcher**, the hint line. These are the shell's
  persistent chrome (move switcher to a rail tab-strip in landscape, top bar in portrait).

---

## #7 — density at N>5 (informs shell-only vs shell+density-UX)
- **Position-pick `ActionSheet`** (0-conn): lists ALL positions; the shared `ActionSheet` scrolls (`maxHeight:80dvh`,
  `ui.jsx:137`) → functional but a long flat list at >5 positions. Note: with RECORD-THEN-ATTRIBUTE this pick only fires
  for **un-connected** targets; connected targets never prompt — so density pressure here is bounded by how many targets
  the coach leaves un-linked.
- **Hit-list / breakdown:** both scroll (`overflowY:auto`) → fine at volume; the breakdown's obstacle-grouping actually
  improves readability as hits grow.
- **Canvas crowding (the real strain):** markers are fixed px (positions r≈10, targets r≈11; targets weighted up to
  ~+14 in Summary) + every link drawn as a line + every label. At >5×>5 with many connections in a SMALL portrait box,
  markers/labels/lines **overlap** → hard to tap a specific target, lines become a hairball. `collectHits` returns ALL
  within `TAP_R=22px` (so overlaps are detected), but Tracking uses `targets[0]` and Config disambiguates via the
  chooser. **Implication:** the redesign's portrait (small field) will strain most; the proper density UX (tap a
  connection LINE to record + skip the pick; or a rail list of obstacles to tap instead of the field) is worth scoping —
  but the responsive SHELL alone (bigger field in landscape/desktop) already relieves much of it. Recommend: shell first,
  density-UX as a fast-follow only if portrait crowding proves blocking.

---

## #8 — theme / §27 deviations in the module (for the design-system migration)
- **No shared `<Screen>` shell** — the module is a custom `position:fixed inset:0` full-screen (`:256`); the Canvas
  archetype intentionally won't use the standard page shell, so flag it as module-specific.
- **Hardcoded hex (mostly in the canvas draw, acceptable-but-noted):** `HitabilityCanvas` — `#94a3b8`/`#475569` (target
  stroke states), `COLORS.field || '#0a1410'` fallback, `rgba(148,163,184,…)` (centre line/bunker dots); `'#fff'` label.
  `HitabilityPage` — `rgba(239,68,68,…)` (saveError chip), `COLORS.surfaceLight || COLORS.surface` (active pill — note
  `surfaceLight` IS a token, the `||` is defensive). `HitBreakdownList` — `${COLORS.border}55` (alpha-suffixed token).
  These are minor; the canvas-draw hex is the same class as `drawPlayers`/`drawZones` (computed-color layer, low
  migration priority per STYLE_AUDIT §3).
- Pair/weight colours come from `COLORS_ZONE_PALETTE` (amber excluded) — §27-correct.

---

## Net verdict for Opus + Jacek
- **#1 is SAFE** — build the responsive shell without a coordinate-transform fix first; just preserve the invariant
  (RO-on-container + explicit px + live-rect `relPos` + draw/hit-test from the same `size`). The recent live readout
  already proved correct mapping in landscape. (Optional cheap post-rotate spike for certainty.)
- **Clean-replacement scope is small:** remove the hard landscape gate (`:229-230`) + `KioskRotatePrompt` import; keep
  `useLandscapeMode`/`canvasMaxHeight`; the canvas already contain-fits any box shape, so the reflow is mostly a
  page-shell rearrange (top-stack → portrait stack / landscape rail) + moving the mode switcher + the per-mode side
  panels (HitList / HitBreakdownList) into the rail-or-stack slot.
- **Density:** shell-first relieves most crowding; scope tap-a-line density UX as a fast-follow, gated on portrait
  testing.
- **Module is standalone** (not on BaseCanvas/touchHandler) — the redesign can reflow it freely without touching the
  shared canvas stack.

**No build performed. Awaiting Opus + Jacek's build-scope decision.**
