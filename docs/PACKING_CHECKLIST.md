# Packing Checklist — "Checklista wyjazdowa" (player feature)

> CC_BRIEF_PACKING_CHECKLIST v1. Approved prototype (Jacek). Shipped on `feat/packing-checklist`
> (branch only until GO). A player-facing travel/packing checklist with templates, critical
> items, custom items, and per-user persistence.

## Data model
- **Static catalog** — `src/data/packingChecklist.js` (`CATALOG_VERSION`, `TEMPLATES`, `CATS`).
  Versioned, global, import-free (string `icon` → lucide via the screen's registry).
  - `TEMPLATES`: `full` (max 2) · `oneday` (max 1) · `training` (max 0).
  - Item `{ id, label, lvl, crit?, target? }` — visible when `activeTemplate.max >= item.lvl`
    (lvl 0 = even training; 1 = oneday+; 2 = full only). `crit:true` = critical;
    `target:n` = counted (stepper, auto-done at n); else binary.
- **Per-user state** — `users/{uid}/appState/packing`:
  `{ template, done:{id:true}, counts:{id:n}, customItems:{catId:[{id,label}]}, collapsed:{catId:true}, catalogVersion, updatedAt }`.

## Behaviour
- Template switch filters visible items + recomputes progress over visible items only.
- Binary = tap to check; counted = stepper (clamped 0..target; checkbox toggles 0↔target).
- Per-category collapse + progress sliver + `{packed}/{total}` or "komplet"; overall progress ring.
- Hide-completed toggle (hides done rows; empty category hides its card).
- Custom add/remove per category (persisted).
- Critical bottom sheet ("Zanim wyjedziesz") lists visible critical items; success state when none missing.
- Reset (confirm) clears `done`+`counts`, KEEPS `customItems`+`template`.
- Bottom-bar critical badge = visible critical items still unpacked.

## Persistence + graceful degradation (Stage D)
- Read once on mount; absent doc → fresh defaults (`template:'full'`, empty maps).
- Debounced ~600ms `setDoc(ref, {...}, {merge:true})` with **nested-map literals** (setDoc+merge
  does NOT parse dot-notation as nested paths — unlike updateDoc).
- All reads/writes try/catch → **degrade silently to in-memory** (React state is source of truth).
  The UI never breaks because persistence is unavailable.
- Forward-compat: `done`/`counts` for catalog items no longer present are ignored on render;
  `catalogVersion` stored for future migrations.
- **Rules:** owner-only `users/{uid}/appState/{doc}` — STAGED in `firestore.rules`, deploy with GO.

## v1 scope
Route + KONTO menu entry (linkedPlayer-gated) · static catalog · 3 templates · binary + counted
items · per-category collapse/progress · progress ring · hide-completed · custom add/remove ·
critical sheet · reset · per-user persistence (degrade-to-memory) · rotation/landscape reflow.

## Phase 2 (parked — NOT built)
- Trip-context card auto-filled from the tournament calendar.
- Weather-aware suggestions (forecast API + venue geocoding).
- Editing item quantities/targets in-app.
- Coach-pushed / team-shared templates.
- Promote checkbox/stepper/sheet/ring into shared `ui.jsx` primitives.
- 2-column category grid on wide viewports.

## Anchors
`src/data/packingChecklist.js` (catalog) · `src/pages/PackingChecklistPage.jsx` (screen) ·
`dataService.getPackingState`/`savePackingState` · `MoreTabContent.jsx` KONTO entry ·
`App.jsx` `/player/checklist` · `firestore.rules` staged `appState` rule ·
`tests/e2e/packing-checklist.spec.js`.
