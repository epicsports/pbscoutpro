# CC BRIEF — cc76f9ad: catalog version-bump refetch (architecture, discovery-first)

**Status:** queued item, run when the day's priority chain allows (it's below sweeps). Logic-only territory (Tier 1), but STEP 2 picks an architecture — that decision returns to Opus with the discovery numbers before any code.

## Context
Today a global-catalog version bump causes clients to refetch the catalog from Firestore. At current scale it's invisible; at tournament scale (many clients, same weekend, possibly several bumps) it's a read-cost multiplier — and the productization direction (PRODUCTIZATION_STRATEGY: local-first cost flip, catalog as versioned static pack) eventually removes Firestore from this path entirely. This brief decides the interim.

## STEP 1 — Discovery (read-only, report numbers)
1. Where the catalog version lives (doc/field), what watches it, and what exactly a bump triggers (which collections, how many docs today: bunkers? layouts? zones? names?).
2. Refetch granularity today: everything vs per-collection; cache layer (memory/localStorage/IndexedDB?); does a mid-session bump refetch live?
3. Real read cost: docs-per-client-per-bump now, and projected at 50 active clients × tournament weekend.
4. How often bumps actually happen (DEPLOY_LOG / authoring habits).

## STEP 2 — Options (Opus decides on the numbers; pre-analysis)
- **A. Per-section versions:** version manifest doc {bunkers: v, layouts: v, …}; bump marks only changed sections; clients refetch only those. Small change, Firestore stays the source. Cuts most waste if bumps are usually single-section.
- **B. Static pack (the productization endgame, pulled forward):** authoring stays in Firestore; a build/export step publishes `catalog-v{N}.json` (+ images already static) to GitHub Pages; clients fetch ONE static file (free bandwidth, CDN-cached, SW-cacheable, offline-friendly) and only the version manifest lives in Firestore (1 read) or even in the app shell. Bigger step, kills the cost class permanently, and is a productization milestone delivered early.
- **C. Delta sync:** `updatedAt > lastSyncedAt` incremental queries per collection. Flexible but adds index + sync-state complexity, and still pays Firestore reads proportional to change size.

**Opus pre-recommendation (to confirm with STEP 1 numbers):** B if the catalog is reasonably bounded (export pipeline ~a day of work, aligns with strategy, removes the problem class); A as the cheap interim only if B's export step collides with current authoring flow. C likely over-engineered for a rarely-changing catalog.

## STEP 3 — Implementation (after Opus verdict)
Staged per the chosen option with: fail-first test on "bump → only expected fetches happen", SW-cache interaction check (no stale-catalog trap — version manifest must bypass long cache), DEPLOY_LOG note, and a read-volume register update (this closes one of its known hotspots).

## Out of scope
In-app pack bundling (Capacitor-era), paid-tier gating, catalog authoring UX.
