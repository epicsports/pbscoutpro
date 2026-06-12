# i18n extraction worklist — §H1 inventory (2026-06-12)

> Read-only inventory per `CC_BRIEF_OVERNIGHT_2026-06-11.md` §H1, produced 2026-06-12.
> Input for the H1 extraction batches (5–8 files each, NO copy changes, existing key
> convention) and for the arc-B language work. Counts are estimates from a code sweep.

## Coverage estimate

**~45% of user-visible strings go through `t()`** (sample ~400 strings across 15 major
files): ~45% i18n'd · ~35% hardcoded EN · ~12.5% hardcoded PL · ~7.5% data/URLs (out of
scope). Skipped per §H1: canvas-draw strings, fixtures, DEBUG, ids/hex/URLs.

## Per-file hotspots (hardcoded-string counts, examples verbatim)

| File | ~Count | Examples | Notes |
|---|---|---|---|
| Admin form modals (LeagueFormModal, PlayerFormModal, TeamFormModal, WorkspacesAdminPage) | ~40 | "Division name", "Full name", "Jersey #", "e.g. Ranger Warsaw" | hard — placeholders + enum-like options |
| LayoutDetailPage | ~25 | "Dorito side", "Snake side", "Layout name *", "Bunker callout, e.g. ORANGE" | hard — state-init defaults + form labels |
| TeamsPage | ~15 | "Teams", "Add your first team", "ROSTER MANAGEMENT", "2nd roster" | medium — mixed PL/EN |
| PlayersPage | ~12 | "Players", "Add your first player", "Pro", "Semi-Pro", "D1–D5", "Coach", "Staff" | medium — class/role chips repeated |
| MatchPage | ~20 | "Zaloguj swój punkt", "Quick note (optional)", stage/reason selectors | medium — some have keys but render fallbacks |
| PlayerStatsPage | ~10 | metric-label fallbacks, position-name fallbacks | medium — interpolations |
| QuickLogView | ~10 | title has key; zone names synthetic | low |
| LayoutsPage | ~8 | "Layouts", "FIELD MAPS", "Add a field from the library", "Browse library" | easy |
| ScoutedTeamPage | ~8 | section-header fallbacks, canvas-adjacent labels | medium |
| ProfilePage | ~6 | EN/PL fallbacks behind existing keys, "Jan Kowalski" placeholder | low |
| TrainingResultsPage | ~5 | "All"/"Scout"/"Coach"/"Player" SOURCE_PILLS | medium — pills reused |
| HitabilityPage | ~5 | mode enums (user-visible only via t already) | low |

## Batch plan (5–8 files, coupling respected; recommended order)

1. **Batch 1 — Navigation & core UI** (~40 strings, easy): TeamsPage, PlayersPage,
   LayoutsPage, ProfilePage, MainPage. Shared filter labels ("wszystkie", "Liga",
   "Dywizja") land here once.
2. **Batch 6 — Modal & action strings** (~30, easy): NewTournamentModal,
   EntityPickerModal, SwipeDelete/"Delete" in ui.jsx, shared Btn labels. Pairs with
   Batch 1 (same shared keys).
3. **Batch 4 — Match & scout pages** (~25, medium): MatchPage, ScoutedTeamPage,
   QuickLogView. Depends on Batch 1 keys.
4. **Batch 2 — Admin forms** (~45, hard): LeagueFormModal, PlayerFormModal,
   TeamFormModal, WorkspacesAdminPage, BunkerEditorPage. Self-contained; placeholders
   need context-aware keys; enum options need a decision (translate vs data).
5. **Batch 3 — Canvas & layout config** (~35, hard): LayoutDetailPage, LayoutWizardPage.
   State-init defaults ("Dorito side") — extraction must not change persisted values
   (display-resolve only). Highest risk, last.
6. **Batch 5 — Training pages** (~20, medium): TrainingResultsPage, TrainingSetupPage,
   TrainingSquadsPage. Reuses Batch 1 filter labels.

## Flags / decisions for the batch briefs

- **Enum-like options** ("Pro", "Semi-Pro", "D1–D5", league names): translate labels or
  keep as data? Needs a one-line ruling before Batch 2.
- **State-init defaults** in LayoutDetailPage ("Dorito side"): persisted values must NOT
  change — extract at display only.
- **Per-batch gate** (per §H1): build · lint-ui · full e2e · pixel-diff 0 → commit.
- Precommit already guards NEW Polish strings in UI; consider extending the guard to the
  swept files for EN hardcodes after each batch.
