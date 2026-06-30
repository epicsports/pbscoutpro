# Render-verify harness — scout editor

`_render-scout.spec.js` is a **reusable render-verify tool**, not a deploy-gate spec.
It exists to kill the *login-stall trap*: prior throwaway render checks used
`npm run dev` + a fresh (unauthenticated) browser, which boots to the **login
screen** — so every "render-verified" screenshot was the login form, not the
actual screen. This spec runs under the **emulator** Playwright config (seeded
auth + fixtures), reuses the SAME auth + nav path as `matchpage-modes.spec.js`,
and **self-asserts** it reached the real editor (URL `scout=` + editor controls +
no login form). If it lands on login, it FAILS loudly.

## How to run

Requires the Firestore-emulator JRE (this machine has a portable Temurin JRE):

```bash
export JAVA_HOME="$LOCALAPPDATA/jre-temurin"
export PATH="$JAVA_HOME/bin:$PATH"

# either:
npx playwright test --config playwright.emulator.config.js _render-scout
# or the npm alias:
npm run render:scout
```

The config's `webServer` boots `firebase emulators:exec` → seeds the fixtures →
starts Vite on **:5199** with `VITE_USE_EMULATOR=true`. No manual server needed.

## Where screenshots land

`data-export/render/scout-<width>.png` (gitignored). One per case:

| File                  | Viewport   | Device class                         |
|-----------------------|------------|--------------------------------------|
| `scout-390.png`       | 390×844    | phone portrait                       |
| `scout-834.png`       | 834×1112   | tablet portrait                      |
| `scout-1280.png`      | 1280×800   | desktop                              |
| `scout-1000.png`      | 1000×720   | tablet-landscape → **immersive rail**|

(`useDevice`: `w<1024` → `tablet`, `w>h` → landscape → MatchPage `immersive`.)

## Locale

The app defaults to **Polish**. The harness pins the UI to English via
`addInitScript(localStorage['pbscoutpro_lang']='en')` before mount (pure test
setup, no src change) so the English-label self-asserts hold across every width —
including the immersive rail, whose Save button is localized
(`t('quicklog_save_point')` → "Zapisz punkt" in PL). Screenshots therefore show
the English editor.

## The rule

**Render-verify the scout editor ONLY via this seeded spec — never `npm run dev`
+ a fresh browser.** A fresh browser is unauthenticated and stalls on login, so
its screenshots are hollow. This harness authenticates against the emulator and
self-asserts it cleared login before capturing.

## Gate exclusion

The deploy gate runs `npm run test:e2e`, which is
`playwright test … --grep-invert "pixel-diff|model C|render-verify"`. This spec's
`test.describe` title contains **`render-verify`**, so the gate skips it (same
mechanism that excludes the pixel-diff / model-C diff specs). Confirm with:

```bash
npx playwright test --config playwright.emulator.config.js \
  --grep-invert "pixel-diff|model C|render-verify" --list | grep _render-scout
# → no output = excluded from the gate
```

---

# Current-state screenshots — `/screenshots/` (committed)

`_screenshots.spec.js` GENERALIZES the harness above into a multi-screen capture
tool. It authenticates (seeded, emulator) and walks a SET of key screens —
scout point editor · match review · live scoring · opponent analysis
(ScoutedTeam) · player stats · coach tab · scout tab · team detail · admin teams
· layouts · profile — writing one PNG per screen × width to the **repo-root
`/screenshots/`** folder. Unlike `data-export/render/` (gitignored), these PNGs
are **committed artifacts** — a visual snapshot of *what prod looks like now*.

## How to run

```bash
export JAVA_HOME="$LOCALAPPDATA/jre-temurin"
export PATH="$JAVA_HOME/bin:$PATH"
npm run screenshots
#  = playwright test --config playwright.emulator.config.js _screenshots
```

**Refresh `/screenshots/` after any visual change**, then **commit the PNGs** in
the same change. They are the human-readable "current UI" reference.

## Widths

390 (phone) · 834 (tablet portrait) · 1280 (desktop) · 1000×720 (tablet-landscape
→ immersive scout rail / live-scoring sidebar). Each screen captures the widths
relevant to it (the field/immersive screens add 1000; the live-scoring layout
only renders landscape, so it captures 1280 + 1000). Files: `<screen>-<width>.png`.

## VS-intro

The scout editor's VS-intro splash would cover the field chrome, so the harness
disables it before capture via `addInitScript(localStorage['pbscoutpro-vsintro']='off')`
(pure test setup, no src change) — so the base labels + side-swap strip are visible.

## Gate exclusion

Same mechanism as `_render-scout`: the `test.describe` title contains
**`render-verify`**, so `npm run test:e2e` (`--grep-invert "pixel-diff|model C|render-verify"`)
skips it. Confirm:

```bash
npx playwright test --config playwright.emulator.config.js \
  --grep-invert "pixel-diff|model C|render-verify" --list | grep _screenshots
# → no output = excluded from the gate
```
