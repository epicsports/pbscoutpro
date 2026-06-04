# Productization Strategy — PbScoutPro (DEFERRED)

> **Status: DEFERRED — forward-looking.** Revisit after **FIT-readiness**.
> FIT = the first external team to get the app *cold* (no prior familiarity with it
> or with us) — the beachhead that must work before any productization push is worth
> starting. Nothing here is actionable now; it's the recorded direction so the
> day-to-day build (cost, data shape, catalog cache) doesn't accidentally foreclose it.
>
> Author: Opus · Owner/GO: Jacek · Recorded 2026-06-04.

## Goal
A closed/compiled, installable app for external **PAID** distribution — not the current
open PWA on GitHub Pages, but a store-distributable product a paying external team
installs and uses.

## Distribution — wrap, don't rewrite
- **Mobile:** **Capacitor** wraps the existing React/Vite PWA into iOS/Android store
  apps — one codebase, no rewrite.
- **Desktop:** **Tauri 2** for a desktop build off the same web app.
- **"Closed" is a spectrum.** The wrapper hides the code from public view-source but is
  **not impenetrable** — a determined party can still unpack a bundle. So the code is
  not the moat:
- **🔑 The DATA is the moat, not the code.** The real defensible asset is the
  **pbleagues catalog** (leagues / teams / players / photos / logos) compiled into the
  distributed pack — curated, maintained, and kept current by us. Strategy decisions
  should protect the data pipeline + freshness, not over-invest in code obfuscation.

## Cost-flip — the heart of it (local-first, "bulk-first, diff-later")
The current cost driver is Firestore reads. The flip:
- Move the **global catalog** (leagues / teams / players / photos / logos) into a
  **versioned STATIC pack** served from a CDN / shipped in-app, **downloaded once**
  (cost moves to user-side bandwidth, not per-read Firestore billing).
- Firestore is then used **only for dynamic / personal writes** (scouting points,
  rosters-in-tournament, self-logs, notes) — the things that genuinely change per user.
- **This extends the existing §90 `catalogCache`** (version-gated IndexedDB cache of
  players/teams) — same "near-static catalog, version marker" idea, taken to its
  conclusion: the catalog stops being a Firestore collection the client reads at all
  and becomes a downloaded data pack.
- **What remains on Firestore after the static-catalog move** = the **analytics sweeps**
  (the read-volume audit targets, all in `dataService.js`): coach-heatmap
  (`getScoutedTeamHeatmap`-family, `ds:829` / `fetchPointsForMatches`), PlayerStats
  global/layout walk (`ds:1991`), LayoutAnalytics `fetchLayoutDeaths` (`ds:2115` area)
  and the `collectionGroup` queries (`ds:1835` selfReports / shots). Those are addressed
  separately by the read-volume audit's rollup lever — independent of, but complementary
  to, the static-catalog move.

## Data pipeline
- **pbleagues pre-event import → versioned data packs (build step).** Before an event,
  pull the relevant pbleagues catalog slice, compile it into a versioned pack, ship it.
  This is the productized form of the current CSV/import flow — automated, versioned,
  build-time.

## Paid rail
- **RevenueCat** for billing: StoreKit (iOS) + Play Billing (Android) + web checkout.
- **App-to-web option** to steer purchases to web checkout where possible and reduce the
  app-store cut.

## Updates
- **Capacitor OTA via Capgo** — ship JS bundle + data-pack updates **without app-store
  resubmission**. Keeps the catalog fresh and lets fixes land fast inside a wrapped app.

## Sequencing (when un-deferred)
1. **FIT first** — prove a cold external team can pick up the current app and get value.
   Productization is wasted effort before that signal.
2. **Static-catalog cost-flip** — extend §90 into a downloaded data pack (also the
   biggest Firestore-cost win; partially de-risked by the read-volume audit's rollups).
3. **Capacitor/Tauri wrap** + data-pipeline build step.
4. **RevenueCat paid rail** + Capgo OTA.

## Cross-references
- §90 `catalogCache` (the cache this strategy extends) — `src/hooks/useFirestore.js`,
  `src/services/catalogCache.js`, `docs/architecture/COST_PROJECTION_SPARK.md`.
- Read-volume audit (analytics-sweep reductions) — session report; targets in
  `dataService.js` (heatmap / PlayerStats / LayoutAnalytics / collectionGroup).
- Data-footprint baseline (assets vs reads) — session report.
- Team branding §107 (logos/colors that would ship inside the data pack).
