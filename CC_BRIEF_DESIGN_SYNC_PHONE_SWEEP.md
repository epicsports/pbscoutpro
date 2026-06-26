# CC BRIEF — Design-sync render sweep (phone-first)

**Author:** Opus · **Date:** 2026-06-26 · **Tier:** mostly Tier-1 (presentational/i18n), read-side
**Goal:** finish aligning the shipped redesign screens with the prototype, screen by screen, using the RENDER-FIRST method this session established. The redesign is mostly shipped but several screens diverged at **phone width** because they were only ever *code-compared*, never *rendered*.

---

## 0. THE METHOD — render-first (mandatory, this is the whole point)

DONE = **the prod render matches the prototype render**, not "the code looks similar." Do not declare a screen aligned without a screenshot.

Tooling (already built, throwaway — NOT in the suite):
- `tests/e2e/_render-harness.spec.js` — Playwright tests that screenshot PROD at **390 / 834 (tablet portrait) / 1280** into `data-export/render/`. It logs in, seeds the active tournament/workspace, navigates a route, screenshots. Add a test per screen following the existing pattern (look at the opponent/pstats/training/layouts/drawer tests already in it).
- Run one test: `export JAVA_HOME="/c/Users/JacekPARCZEWSKI/AppData/Local/jre-temurin"; export PATH="$JAVA_HOME/bin:$PATH"; npx playwright test --config playwright.emulator.config.js tests/e2e/_render-harness.spec.js -g "<name>"`
- Prototype = ground truth: `C:\Users\JacekPARCZEWSKI\Downloads\_HANDOFF_TONIGHT\prototype\redesign*.jsx` (+ `TABLET_SPEC.md`). `window.REDESIGN` exports the component per screen (MatchListPremium, OpponentAnalysisPremium, PlayerStatsPremium, LivePhonePremium/RdLiveFieldCard, NavDrawerPremium, …). **Read the matching prototype component, diff the JSX STRUCTURE against prod, fix the divergence, re-render to verify.**

Per screen, the loop:
1. Render prod @390 (phone = the priority; also 834/1280 if the screen has a wide variant).
2. Read the screenshot; open the prototype component; list divergences (layout/hierarchy · components old-vs-new · responsiveness/overflow · text EN-in-PL/raw keys).
3. Fix prod. 4. Re-render to confirm. 5. Full gate.

Verifying long DATA that test fixtures lack (e.g. long NXL team names "Toulouse Purple"): inject via the harness — `page.evaluate(() => document.querySelectorAll('div,span').forEach(d => { if (!d.children.length && d.textContent.trim()==='Team Alpha') d.textContent='Toulouse Purple'; }))` then screenshot. (See the `live long-name` test — it caught that a first fix was insufficient.)

---

## 1. SCOPE — screens NOT yet render-swept (do these)

Render @390, compare to the prototype, fix divergences:
1. **Quick-log** (`QuickLogView`) — vs prototype quick-log.
2. **Settings / More tab** content (`MoreTabContent` beyond the drawer section).
3. **Training**: results (`TrainingResultsPage`), squads (`TrainingSquadsPage`), setup detail.
4. **Player self-claim / catalog** (the "kliknij swoje imię" / roster claim flow).
5. **Coach team-list wide** + **player-stats wide** (834/1280 variants) if not covered.
6. Anything else surfaced while sweeping (the leaks cluster — Coach tab had 4 hardcoded EN titles in one file).

## 2. KNOWN RESIDUALS — fix these (already found, not yet done)

- **Review point-row short codes clip.** `shortNameOf` (`MatchPage.jsx:1664`) = first word → first 6 chars uppercase → "TOULOU", which clips to "TOU…" in the narrow `SideZone` (~`MatchPage.jsx:2438`). Decide + implement: a shorter code (3-4 chars, or the team's real `short` field if present) OR widen the zone. **Render-verify with injected long names** (the SideZone uses shortNameOf computed from real data, so inject at the TEAM level or shorten the helper). Read-side only.
- **Deeper i18n.** A `pl===en` scan flagged ~166 keys; **most are intentional** (proper nouns Dorito/Snake/Breakout, roles Admin/Coach/Scout, abbreviations WIN RATE/KILLS, brand). Only fix what **renders as English in the PL UI** (render-first — that's how scout_tab + the coach `Teams/Matches/Standings/Tactics board` + training `tap_to_mark` were caught). Do NOT blind-translate the 166.

## 3. RULES (hard — non-negotiable)

- **Prototype wins** conflicts. Don't invent; if something's missing or a decision is needed, flag it (NIGHT_QUESTIONS-style) and move on — don't guess.
- **NEVER touch the capture/save write path.** All of this is read-side CHROME (display/layout/i18n). Payload/handlers byte-identical. If a fix would change a save shape → STOP and escalate (that's a separate data-migration brief, not chrome).
- **Phone <720 must not regress tablet/landscape.** The landscape/tablet Live + the deep coach/scout screens already match the prototype — keep them byte-identical (gate them).
- **i18n:** PL values genuinely Polish (a recent bug left English in PL slots); the file has a PL block then an EN block (first=pl); reuse keys (grep before adding); wrap hardcoded strings in `t()`.
- §27 (amber only on interactive), ≥44px touch, theme tokens.

## 4. VERIFICATION (per change)

- `npx vite build` + `npm run precommit` (Bash) green.
- **FULL e2e** (`--grep-invert "render harness"`) green — especially `phase-view` / `matchreview-rail` / `matchpage-modes` + the capture suite (`capture-parity`/`concurrent-merge`/`offline-sync`) + the relevant goldens (`layout-tactic-freehand`) for any MatchPage/tactic touch. Update a spec only if a testid/text genuinely moved — TRUTHFULLY (quote before/after), never weaken.
- The harness is for VISUAL verification, not a gate. Delete `_render-harness.spec.js` (untracked throwaway) at final closeout.

## 5. ALREADY DONE THIS SESSION — do NOT redo

- **Live scoring:** phone scoreboard truncation fixed (`1fbe3bec`); phone field-card rebuilt to `RdLiveFieldCard` — Warstwy popover + attached OŚ PUNKTU axis (`feat/live-field-card`, shipping). Landscape/tablet review = `TabletLiveScoringPremium` 1:1 (shipped earlier).
- **i18n (render-caught + fixed):** scout_tab (`e73f94b4`), coach tab Teams/Matches/Standings/Tactics board (`e0d556d6`), training tap_to_mark (`1fbe3bec`).
- **Render-verified aligned @phone (leave alone):** opponent analysis · player-stats · profile · layouts.
- **Tactic editor** → TacticWorkspace, save byte-identical (`7c56bf70`, Q2=A). **Menu "Wyświetlanie"** super-admin display toggles (`ecf59b55`, Q1=A). **Match-list** HeroLive/Fixture (shipped earlier).

**Start with §1 quick-log + §2 short-code residual** (highest-traffic + already-scoped), render-first, one screen per branch, full gate each.
