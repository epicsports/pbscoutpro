# CC BRIEF — REASD SPLASH: welcome animation integration (tomorrow, after morning merge train)

**Role:** CC, implementer. Design is PRE-APPROVED (Jacek co-authored the animation; reference file from him: `reads_welcome_animation.html` — geometry locked to the approved `reads-lockup.svg`). UI work ⇒ branch + morning/evening smoke gate per §7.6. This is the FIRST visible brick of the "reads" rebrand — scope is deliberately narrow.

## Scope decision (Jacek):
- BASE = (a) splash animation on cold start only.
- IF Jacek says (b): also swap the login-screen logo to the reads mini-lockup (FLAT dot rendition — small-size rule below). Nothing else of the rebrand (manifest, app name, icons, store) — that is a separate arc decision.

## STEP 1 — Assets to repo
- Commit `docs/brand/reads-lockup.svg` (extract the approved lockup geometry from the reference HTML if the svg file isn't provided) + the reference HTML as `docs/brand/reads-welcome-animation.html`.
- Record the rendition rule in DESIGN_DECISIONS (new Brand section): large lockup (splash) = rich-B radial dot; small lockup (≤~160px wide: login mini, future chrome) = FLAT amber dot. Dot = `#f59e0b` family only; seam = bg token.

## STEP 2 — SplashIntro component
- Plays on COLD START only (PWA launch / full document load), once per session — never on SPA navigation. Session flag, not persisted.
- Overlays the boot: mounts immediately over the app shell, dismisses at max(animation end ≈1.6 s, app-ready) — i.e. it MASKS auth/workspace resolve up to its duration, but never blocks an already-ready app beyond the animation, and never spins indefinitely (if app not ready at animation end, splash fades anyway to whatever loading state exists — no double splash).
- Implementation: port the reference CSS animation 1:1 (timings, easings, keyframes — including the track draw, dot pop with overshoot cubic-bezier, seam, word/desc rise). Use the motion tokens from theme.js where durations match; do NOT retime.
- `prefers-reduced-motion`: port the reference's fade-only variant exactly.
- Z-index/layout: full-viewport fixed, bg token `#0a0e17`; safe-area aware.
- No bundle bloat: inline SVG component, zero new deps.

## STEP 3 — Tests + gate
- e2e: cold load → splash visible → gone ≤2.5 s → app interactive; SPA nav → no splash; reduced-motion emulation → fade-only variant (no transform animations).
- Build/lint/precommit standard. §27 self-review (it's brand chrome: color tokens only, no interactive elements on splash).
- **[GO GATE — Jacek]**: smoke on real iPhone cold start (PWA standalone: note iOS shows the static system splash first, then ours — verify the hand-off doesn't double-flash) + desktop. Merge on GO.

## Out of scope (record in NEXT_TASKS under a new "Rebrand: reads" arc row)
Manifest/app name/iOS+Android icons/store listing rename · in-app brand strings · LP branding alignment · nav identity-pill using the reads ball (ties into the arc-B nav restructure — the "kulka" becomes the drawer trigger there).
